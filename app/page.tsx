"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react"; 
import { db, auth } from "@/lib/firebase"; 
import { signInAnonymously, onAuthStateChanged } from "firebase/auth"; 
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { translations, Language } from "@/lib/i18n";
import { Globe, Plus, Users, Twitter, Mail, Shield } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  
  // 言語状態の管理
  const [lang, setLang] = useState<Language>("ja");
  const t = translations[lang];

  // 認証監視 & 匿名ログイン
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(auth).catch((e) => console.error("Login error:", e));
      }
    });
    return () => unsubscribe();
  }, []);

  // 部屋を作る処理
  const createRoom = async () => {
    if (!userId) return;

    try {
      const docRef = await addDoc(collection(db, "rooms"), {
        hostId: userId,
        status: "waiting",
        gameMode: "werewolf", // デフォルト
        createdAt: serverTimestamp(),
        members: [userId],
        names: {}, // 名前マップ初期化
        isAdBlocked: false, // 広告ブロック初期値
      });
      
      router.push(`/room/${docRef.id}`); 
    } catch (e) {
      console.error("作成エラー:", e);
    }
  };

  // 村に参加する処理
  const joinRoom = async () => {
    // 簡易的なプロンプト（本来はモーダル等が望ましいが、シンプルに実装）
    const promptMsg = lang === "ja" ? "参加したい村のIDを入力してください" : "Enter the Room ID";
    const roomId = prompt(promptMsg); 
    
    if (!roomId || !userId) return;

    try {
      // 存在確認などはRoomPage側でも行うが、ここでも簡易チェックしても良い
      // 今回は直接遷移させる（RoomPageで参加処理を行うため）
      router.push(`/room/${roomId}`);
    } catch (e) {
      console.error("参加エラー:", e);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-4 relative overflow-hidden">
      
      {/* 背景装飾 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-600 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-red-600 rounded-full blur-[80px]"></div>
      </div>

      {/* 言語切り替えボタン */}
      <div className="fixed top-4 right-4 z-10">
        <button 
          onClick={() => setLang(l => l === "ja" ? "en" : "ja")} 
          className="flex items-center gap-2 text-xs bg-slate-800/80 border border-slate-600 px-4 py-2 rounded-full hover:bg-slate-700 transition-all shadow-lg active:scale-95 backdrop-blur-sm"
        >
          <Globe size={14} />
          {lang === "ja" ? "English" : "日本語"}
        </button>
      </div>

      {/* タイトルエリア */}
      <div className="flex flex-col items-center gap-2 mb-12 z-10">
        <span className="text-6xl mb-4 animate-bounce">🐺</span>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600 tracking-tighter drop-shadow-sm">
          {t.landing.title}
        </h1>
        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">
          {t.landing.subtitle}
        </p>
      </div>

      {/* メインカード */}
      <div className="w-full max-w-sm bg-slate-900/60 border border-slate-700/50 p-8 rounded-3xl shadow-2xl backdrop-blur-xl z-10">
        <div className="flex flex-col gap-4">
          {/* 新しく村を作るボタン */}
          <button 
            onClick={createRoom}
            className="group w-full py-5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-900/30 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Plus className="group-hover:rotate-90 transition-transform" />
            <span className="text-lg">{t.landing.createVillage}</span>
          </button>
          
          {/* 村に参加するボタン */}
          <button 
            onClick={joinRoom}
            className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all border border-slate-700 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Users className="text-slate-400" />
            <span className="text-lg">{t.landing.joinVillage}</span>
          </button>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-slate-500">
          ID: {userId ? userId.substring(0, 8) + "..." : "Authenticating..."}
        </p>
      </div>

      {/* ★ 追加: フッターエリア */}
      <footer className="mt-16 flex flex-col items-center gap-6 z-10 w-full max-w-md animate-fade-in">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[10px] sm:text-xs font-bold tracking-widest text-slate-500">
          
          {/* X (Twitter) - URLを自分のものに書き換えてください */}
          <a 
            href="https://x.com/YOUR_ACCOUNT_ID" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
          >
            <Twitter size={14} />
            {t.footer.x}
          </a>

          {/* 問い合わせ - Googleフォーム等のURL */}
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
    </main>
  );
}