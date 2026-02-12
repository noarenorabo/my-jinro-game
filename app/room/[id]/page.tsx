"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, deleteField } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

// ゲームコンポーネント
import WerewolfGame from "@/components/games/WerewolfGame";
import SukiKiraiGame from "@/components/games/SukikiraiGame"; 
import { AdRectangle } from "@/components/Ads"; 
import { translations, Language } from "@/lib/i18n";
import { RoomIdDisplay } from "@/components/room/RoomIdDisplay";
// ★ アイコンを追加
import { Globe, DoorOpen, Twitter, Mail, Shield } from "lucide-react";

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string; 
  
  // --- 1. State Hooks ---
  const [roomData, setRoomData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("ja");
  const [authLoading, setAuthLoading] = useState(true);
  const [userName, setUserName] = useState(""); 
  
  const [hasJoined, setHasJoined] = useState(false);
  const isExiting = useRef(false);

  // 広告制御用のState
  const [adKey, setAdKey] = useState(0); 
  const [lastRefreshAt, setLastRefreshAt] = useState(0); 

  const t = translations[lang];

  // --- 2. Effect Hooks ---

  // SEO
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
  }, []);

  // ★ 修正: 認証監視（URL直打ち対応）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // すでにログインしている場合
        setUserId(user.uid);
        setAuthLoading(false);
      } else {
        // ★ 追加: ログインしていない場合は、その場で匿名ログインを実行！
        console.log("No user found, signing in anonymously...");
        try {
          await signInAnonymously(auth);
          // 成功すると自動的に上の if(user) ブロックが再度呼ばれます
        } catch (error) {
          console.error("Login failed:", error);
          setAuthLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 認証監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 部屋データ監視
  useEffect(() => {
    if (!roomId || !userId) return;
    const docRef = doc(db, "rooms", roomId);
    
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const members = data.members || [];
        
        if (!members.includes(userId)) {
          if (!hasJoined) {
            // 自動参加
            try {
              await updateDoc(docRef, { members: arrayUnion(userId) });
              setHasJoined(true);
            } catch (e) {
              console.error("参加エラー:", e);
            }
          } else {
            // 退出・追放判定
            if (isExiting.current) return;
            alert(lang === "ja" ? "部屋から退出させられました。" : "You have been removed from the room.");
            router.push("/");
          }
        } else {
          setHasJoined(true);
          setRoomData(data);
        }
      } else {
        if (!isExiting.current) {
           alert(lang === "ja" ? "部屋が見つかりません。" : "Room not found.");
        }
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [roomId, userId, router, lang, hasJoined]);

  // --- 3. Logic & Functions ---

  const handleAdRefreshRequest = () => {
    const now = Date.now();
    const COOL_DOWN = 50 * 1000; 
    if (now - lastRefreshAt > COOL_DOWN) {
      setAdKey(prev => prev + 1); 
      setLastRefreshAt(now);
    }
  };

  useEffect(() => {
    if (roomData?.phase) {
      handleAdRefreshRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData?.phase]);

  useEffect(() => {
    if (userId && roomData?.names?.[userId] && userName === "") {
      setUserName(roomData.names[userId]);
    }
  }, [roomData, userId]); 

  if (authLoading || !roomData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>{t.lobby.loading}</p>
        </div>
      </div>
    );
  }

  const isHost = userId === roomData.hostId;
  const gameMode = roomData.gameMode || "werewolf";
  const isWaiting = roomData.status === "waiting";

  const isGlobalAdBlocked = roomData.isAdBlocked;
  const isPersonalAdBlocked = roomData.adBlockedUsers?.includes(userId);
  const isAdVisible = !isGlobalAdBlocked && !isPersonalAdBlocked && (isWaiting || !roomData.isTabooActive);

  const getDisplayName = (uid: string) => {
    return roomData.names?.[uid] || `👤 ${uid.substring(0, 5)}...`;
  };

  const startGame = async () => {
    const docRef = doc(db, "rooms", roomId);
    if (gameMode === "sukikirai") {
      await updateDoc(docRef, {
        status: "playing", phase: "setup", answers: {}, votes: {}, finishVotes: [], extensionsUsed: {}, isTabooActive: false
      });
    } else {
      await updateDoc(docRef, { status: "playing" });
    }
    handleAdRefreshRequest();
  };

  const saveName = async () => {
    if (!userId || !userName.trim()) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), { [`names.${userId}`]: userName.trim() });
      alert(t.lobby.nameUpdated);
    } catch (e) { console.error(e); }
  };

  const changeGameMode = async (mode: string) => {
    await updateDoc(doc(db, "rooms", roomId), { gameMode: mode });
  };

  const leaveRoom = async () => {
    const confirmLeave = confirm(lang === "ja" ? "村を退室しますか？" : "Leave this village?");
    if (!confirmLeave) return;
    
    isExiting.current = true;

    try {
      const docRef = doc(db, "rooms", roomId);
      const updatedMembers = (roomData.members || []).filter((m: string) => m !== userId);
      
      if (updatedMembers.length === 0) {
        router.push("/");
        return;
      }
      
      await updateDoc(docRef, { 
        hostId: isHost ? updatedMembers[0] : roomData.hostId,
        members: arrayRemove(userId),
        [`names.${userId}`]: deleteField()
      });
      
      router.push("/");
    } catch (e) { 
      console.error("退室エラー:", e);
      isExiting.current = false;
    }
  };

  const kickMember = async (targetUid: string) => {
    const confirmKick = confirm(lang === "ja" ? "このプレイヤーを追放しますか？" : "Kick this player?");
    if (!confirmKick) return;
    try {
      const docRef = doc(db, "rooms", roomId);
      await updateDoc(docRef, { 
        members: arrayRemove(targetUid),
        [`names.${targetUid}`]: deleteField()
      });
    } catch (e) { console.error("追放エラー:", e); }
  };

  const handlePurchaseAdBlock = async () => {
    const message = isHost ? t.lobby.adBlockConfirm : t.lobby.adBlockPersonalConfirm;

    if (confirm(message)) {
      try {
        const docRef = doc(db, "rooms", roomId);
        if (isHost) {
          await updateDoc(docRef, { isAdBlocked: true });
          alert(t.lobby.adBlockSuccess);
        } else {
          await updateDoc(docRef, { adBlockedUsers: arrayUnion(userId) });
          alert(t.lobby.adBlockPersonalSuccess);
        }
      } catch (e) { console.error("購入エラー:", e); }
    }
  };

  // --- 5. Main Render ---
  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 text-white bg-slate-900 pb-24 relative">
      
      {/* 共通ヘッダー */}
      <div className="w-full max-w-md space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <RoomIdDisplay roomId={roomId} />

          <button onClick={() => setLang(l => l === "ja" ? "en" : "ja")} className="flex items-center gap-1 text-xs bg-slate-800 border border-slate-600 px-3 py-2 rounded-full shadow-lg active:scale-95 transition-all">
            <Globe size={12} /> {lang === "ja" ? "English" : "日本語"}
          </button>
        </div>
        
        <div className="flex justify-start">
          <button onClick={leaveRoom} className="flex items-center gap-1 text-xs bg-slate-800/50 border border-red-900/30 text-red-500/70 px-4 py-2 rounded-full hover:bg-red-900/20 transition-all">
            <DoorOpen size={14} /> {lang === "ja" ? "退室" : "Leave"}
          </button>
        </div>
      </div>

      {isWaiting ? (
        <div className="w-full max-w-sm flex flex-col items-center mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold mb-6">{t.phases.waiting}</h1>
          
          {isHost && (
            <button 
              onClick={startGame} 
              className="w-full py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xl mb-8 shadow-[0_6px_0_rgb(185,28,28)] active:shadow-none active:translate-y-1 transition-all animate-bounce"
            >
              🚀 {t.actions.startGame}
            </button>
          )}

          <div className="w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6 shadow-xl">
            <label className="text-xs text-slate-400 block mb-2 uppercase tracking-widest">{t.lobby.yourName}</label>
            <div className="flex gap-2">
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder={t.lobby.inputNamePlaceholder} className="flex-1 bg-slate-900 border border-slate-600 p-3 rounded-xl text-white outline-none focus:border-red-500" maxLength={10} />
              <button onClick={saveName} className="bg-red-600 px-4 rounded-xl font-bold active:scale-95 text-sm">OK</button>
            </div>
          </div>

          <div className="w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6">
            <label className="text-xs text-slate-400 block mb-2 uppercase tracking-widest">{t.lobby.gameMode}</label>
            {isHost ? (
              <select value={gameMode} onChange={(e) => changeGameMode(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-3 rounded-xl text-white font-bold outline-none cursor-pointer">
                <option value="werewolf">{t.lobby.modes.werewolf}</option>
                <option value="sukikirai">{t.lobby.modes.sukikirai}</option>
              </select>
            ) : <p className="text-lg font-bold text-red-500">{gameMode === "werewolf" ? t.lobby.modes.werewolf : t.lobby.modes.sukikirai}</p>}
          </div>

          <div className="w-full bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h2 className="text-xs text-slate-400 mb-4 uppercase tracking-widest">{t.lobby.memberList}</h2>
            <ul className="space-y-2">
              {(roomData.members || []).map((m: string) => (
                <li key={m} className="bg-slate-900 p-3 rounded-xl flex justify-between text-sm border border-slate-700">
                  <span className="font-bold text-slate-200">{m === roomData.hostId ? "👑 " : "👤 "}{getDisplayName(m)}</span>
                  <div className="flex gap-2">
                    {m === userId && <span className="text-[10px] bg-blue-600 px-2 py-0.5 rounded text-white self-center">YOU</span>}
                    {isHost && m !== userId && <button onClick={() => kickMember(m)} className="text-[10px] bg-red-600/20 text-red-400 border border-red-600/50 px-2 py-0.5 rounded hover:bg-red-600/40 font-bold transition-all">Kick</button>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {isAdVisible && (
            <div className="mt-8 w-full flex flex-col items-center gap-4 border-t border-slate-800 pt-6">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">Sponsored</p>
              <div className="flex justify-center w-full min-h-[250px] items-center bg-slate-800/50 rounded-xl">
                <AdRectangle key={adKey} />
              </div>
              <button onClick={handlePurchaseAdBlock} className="w-full max-w-sm py-3 bg-emerald-700 hover:bg-emerald-600 rounded-xl font-bold text-sm border border-emerald-500 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                {isHost ? t.lobby.adBlockBtn : t.lobby.adBlockPersonalBtn}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-sm animate-fade-in">
          {gameMode === "werewolf" ? (
            <WerewolfGame 
              roomId={roomId} 
              userId={userId || ""} 
              roomData={roomData} 
              isHost={isHost} 
              lang={lang}
              onAdRefreshRequest={handleAdRefreshRequest} 
              adKey={adKey}
            />
          ) : (
            <SukiKiraiGame 
              roomId={roomId} 
              userId={userId || ""} 
              roomData={roomData} 
              isHost={isHost} 
              lang={lang}
              onAdRefreshRequest={handleAdRefreshRequest}
              adKey={adKey}
            />
          )}
        </div>
      )}

      {/* ★ 追加: フッターエリア */}
      <footer className="mt-auto pt-10 flex flex-col items-center gap-6 z-10 w-full max-w-md animate-fade-in opacity-80">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[10px] sm:text-xs font-bold tracking-widest text-slate-500">
          
          {/* X (Twitter) */}
          <a 
            href="https://x.com/YOUR_ACCOUNT_ID" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
          >
            <Twitter size={14} />
            {t.footer.x}
          </a>

          {/* 問い合わせ */}
          <a 
            href="https://forms.gle/YOUR_FORM_ID" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
          >
            <Mail size={14} />
            {t.footer.contact}
          </a>

          {/* プライバシーポリシー */}
          <button 
            onClick={() => router.push("/privacy")}
            className="flex items-center gap-2 hover:text-slate-300 transition-colors"
          >
            <Shield size={14} />
            {t.footer.privacy}
          </button>
        </div>

        <p className="text-[9px] text-slate-700 uppercase tracking-[0.2em]">
          {t.footer.copyright}
        </p>
      </footer>
    </div>
  );
}