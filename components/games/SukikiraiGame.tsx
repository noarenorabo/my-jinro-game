"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { translations, Language } from "@/lib/i18n";
import { AdRectangle } from "@/components/Ads";
import { Eye, EyeOff, List, RotateCcw, Search } from "lucide-react";

const isUnderReview = process.env.NEXT_PUBLIC_AD_REVIEW_MODE === "true";

interface Props {
  roomId: string;
  userId: string;
  roomData: any;
  isHost: boolean;
  lang: Language;
  onAdRefreshRequest: () => void;
  adKey: number;
}

type Genre = "normal" | "romance" | "taboo";

export default function SukiKiraiGame({ 
  roomId, userId, roomData, isHost, lang, onAdRefreshRequest, adKey 
}: Props) {
  const t = translations[lang];
  
  // --- State ---
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showDetails, setShowDetails] = useState(true);
  const [selectedVotes, setSelectedVotes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<Genre>("normal");
  
  // 一覧表示モードかどうか
  const [showFullList, setShowFullList] = useState(false);
  
  // 役職（陣営）の表示/非表示管理
  const [isRoleVisible, setIsRoleVisible] = useState(false);
  
  const [genreCandidates, setGenreCandidates] = useState<Record<Genre, { text: string, genre: Genre }[]>>({
    normal: [], romance: [], taboo: []
  });

  // --- Derived State ---
  const isGlobalAdBlocked = roomData.isAdBlocked;
  const isPersonalAdBlocked = roomData.adBlockedUsers?.includes(userId);
  const isAdVisible = !isGlobalAdBlocked && !isPersonalAdBlocked && !roomData.isTabooActive;

  const getDisplayName = (uid: string) => roomData.names?.[uid] || `👤 ${uid.substring(0, 5)}`;

  const phase = roomData.phase;
  const members: string[] = roomData.members || [];
  const answers: Record<string, boolean> = roomData.answers || {};
  const votes: Record<string, string[]> = roomData.votes || {}; 
  const exiledPlayers: string[] = roomData.exiledPlayers || [];
  
  const yesCount = Object.values(answers).filter((v: boolean) => v === true).length;
  const noCount = Object.values(answers).filter((v: boolean) => v === false).length;
  const majorityValue = yesCount >= noCount;
  
  const minorityUIDs = members.filter((uid: string) => answers[uid] !== majorityValue);
  const minorityCount = minorityUIDs.length;

  // 割合計算用
  const totalCount = yesCount + noCount;
  const yesRatio = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0;
  const noRatio = totalCount > 0 ? Math.round((noCount / totalCount) * 100) : 0;

  // --- Logic & Helpers ---

  const tryRefreshAd = () => {
    onAdRefreshRequest();
  };

  // ★ 修正: お題リストを t.topics から取得するように変更
  const allTopics = useMemo(() => {
    // i18n.ts で定義された t.topics から直接文字列の配列を取得できるようになったと仮定しても良いが、
    // 現在の i18n 実装では { ja: string, en: string } の配列が t.topics.normal に入っているわけではなく、
    // t.topics.normal 自体が string[] (翻訳済み) になっています。
    // そのため、構造を単純化できます。

    const list = [
      ...(t.topics?.normal || []).map((text: string) => ({ text, genre: "normal" as Genre })),
      ...(t.topics?.romance || []).map((text: string) => ({ text, genre: "romance" as Genre })),
    ];
    
    if (isGlobalAdBlocked && !isUnderReview) {
      list.push(...(t.topics?.taboo || []).map((text: string) => ({ text, genre: "taboo" as Genre })));
    }
    return list;
  }, [isGlobalAdBlocked, t.topics]); // t.topics が言語切り替えで変わる

  const currentPicks = useMemo(() => {
    if (showFullList || searchQuery.trim()) {
      return allTopics.filter(topic => 
        topic.genre === activeGenre && 
        topic.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return genreCandidates[activeGenre];
  }, [showFullList, searchQuery, allTopics, activeGenre, genreCandidates]);

  const refreshCandidates = (targetGenre: Genre) => {
    const pool = allTopics.filter((t) => t.genre === targetGenre);
    if (pool.length === 0) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    setGenreCandidates((prev) => ({ ...prev, [targetGenre]: shuffled }));
  };

  const voteAnalysis = useMemo(() => {
    const counts: Record<string, { majority: number, total: number }> = {};
    members.forEach((uid: string) => { counts[uid] = { majority: 0, total: 0 }; });
    Object.entries(votes).forEach(([voterUid, targetUids]) => {
      const isMaj = answers[voterUid] === majorityValue;
      (targetUids as string[]).forEach((tUid: string) => {
        if (counts[tUid]) {
          counts[tUid].total += 1;
          if (isMaj) counts[tUid].majority += 1;
        }
      });
    });
    return counts;
  }, [members, votes, answers, majorityValue]);

  const startExileAnnouncement = async () => {
    if (!isHost) return;
    const sorted = [...members].sort((a: string, b: string) => {
      const aD = voteAnalysis[a];
      const bD = voteAnalysis[b];
      if (bD.majority !== aD.majority) return bD.majority - aD.majority;
      if (bD.total !== aD.total) return bD.total - aD.total;
      return Math.random() - 0.5;
    });
    const exiled = sorted.slice(0, minorityCount);
    await updateDoc(doc(db, "rooms", roomId), { phase: "exileAnnouncement", exiledPlayers: exiled, phaseEndTime: Date.now() + 5000 });
  };

  // --- Effects ---

  useEffect(() => {
    tryRefreshAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 初期化 & 言語切り替え時に候補を更新
  useEffect(() => {
    if (phase === "setup") {
       refreshCandidates(activeGenre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeGenre, allTopics]);

  useEffect(() => {
    if (phase === "setup" || phase === "answering") {
      setSelectedVotes([]);
      setSearchQuery("");
      setShowFullList(false); 
      setIsRoleVisible(false);
    }
  }, [phase]);

  useEffect(() => {
    if (isHost && phase === "discussion" && roomData.phaseEndTime) {
      const timer = setInterval(() => {
        if (Date.now() >= roomData.phaseEndTime) {
          updateDoc(doc(db, "rooms", roomId), { 
            phase: "voting", 
            phaseEndTime: Date.now() + 60000 
          });
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isHost, phase, roomData.phaseEndTime, roomId]);

  useEffect(() => {
    if (isHost && phase === "exileAnnouncement" && roomData.phaseEndTime) {
      const timer = setInterval(() => {
        if (Date.now() >= roomData.phaseEndTime) {
          updateDoc(doc(db, "rooms", roomId), { phase: "results", phaseEndTime: null });
          clearInterval(timer);
        }
      }, 500);
      return () => clearInterval(timer);
    }
  }, [isHost, phase, roomData.phaseEndTime, roomId]);

  useEffect(() => {
    if (isHost && phase === "voting") {
      if (Object.keys(votes).length > 0 && Object.keys(votes).length === members.length) {
        setTimeout(() => startExileAnnouncement(), 1500);
      }
    }
  }, [votes, isHost, phase, members.length]);

  useEffect(() => {
    if (isHost && phase === "discussion") {
      if ((roomData.finishVotes?.length || 0) > members.length / 2) {
        updateDoc(doc(db, "rooms", roomId), { phase: "voting", phaseEndTime: Date.now() + 60000 });
      }
    }
  }, [roomData.finishVotes, isHost, phase, members.length]);

  useEffect(() => {
    if (!roomData?.phaseEndTime) { setTimeLeft(0); return; }
    const interval = setInterval(() => {
      const remain = Math.ceil((roomData.phaseEndTime - Date.now()) / 1000);
      setTimeLeft(remain > 0 ? remain : 0);
    }, 500);
    return () => clearInterval(interval);
  }, [roomData?.phaseEndTime]);

  // --- Actions ---

  const sendTopic = async (topic: string, isTaboo: boolean = false) => {
    tryRefreshAd();
    await updateDoc(doc(db, "rooms", roomId), { phase: "answering", topic, answers: {}, votes: {}, isTabooActive: isTaboo, showAnswerDetails: showDetails });
  };

  const handleUpgrade = async () => {
    if (confirm(t.lobby.adBlockConfirm)) {
      await updateDoc(doc(db, "rooms", roomId), { isAdBlocked: true });
    }
  };

  const toggleVote = (targetUid: string) => {
    if (selectedVotes.includes(targetUid)) {
      setSelectedVotes(selectedVotes.filter(id => id !== targetUid));
    } else if (selectedVotes.length < minorityCount) {
      setSelectedVotes([...selectedVotes, targetUid]);
    }
  };

  const submitAnswer = async (value: boolean) => {
    tryRefreshAd();
    await updateDoc(doc(db, "rooms", roomId), { [`answers.${userId}`]: value });
  };

  const submitMultiVote = async () => {
    tryRefreshAd();
    if (selectedVotes.length !== minorityCount) return;
    await updateDoc(doc(db, "rooms", roomId), { [`votes.${userId}`]: selectedVotes });
  };

  const handleRefreshClick = () => {
    refreshCandidates(activeGenre);
  };

  const handleRandomDistribute = () => {
    // 検索などで絞り込まれた currentPicks から選ぶか、なければ全トピックから
    const filteredPool = searchQuery.trim() ? currentPicks : allTopics.filter(t => t.genre === activeGenre);

    if (filteredPool.length > 0) {
      tryRefreshAd();
      const topic = filteredPool[Math.floor(Math.random() * filteredPool.length)];
      sendTopic(topic.text, activeGenre === "taboo");
    }
  };

  const proceedToDiscussion = async () => {
    tryRefreshAd();
    await updateDoc(doc(db, "rooms", roomId), { phase: "discussion", phaseEndTime: Date.now() + members.length * 60000, finishVotes: [], extensionsUsed: {}, finishVote: {} });
  };

  const extendDiscussion = async () => {
    tryRefreshAd();
    if (roomData.extensionsUsed?.[userId]) return;
    await updateDoc(doc(db, "rooms", roomId), { phaseEndTime: (roomData.phaseEndTime || Date.now()) + 60000, [`extensionsUsed.${userId}`]: true });
  };

  const finishDiscussionVote = async () => {
    tryRefreshAd();
    if (roomData.finishVotes?.includes(userId)) return;
    await updateDoc(doc(db, "rooms", roomId), { finishVotes: arrayUnion(userId) });
  };

  const resetGame = async () => {
    tryRefreshAd();
    await updateDoc(doc(db, "rooms", roomId), { phase: "setup", topic: null, answers: {}, votes: {}, exiledPlayers: [] });
  };

  const backToLobbyFull = async () => {
    tryRefreshAd();
    await updateDoc(doc(db, "rooms", roomId), { status: "waiting", phase: null, topic: null, answers: {}, votes: {}, exiledPlayers: [], isTabooActive: false });
  };

  // --- UI Components ---

  // 1. Setup
  if (phase === "setup") {
    return (
      <div className="w-full bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl animate-fade-in space-y-5">
        <h2 className="text-xl font-black text-center text-white">🎭 {t.sukikirai.reselectTopic}</h2>
        {isHost ? (
          <>
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700">
              {(["normal", "romance", "taboo"] as Genre[]).map((g: Genre) => {
                if (g === "taboo" && (!isGlobalAdBlocked || isUnderReview)) return null; 
                return (
                  <button 
                    key={g} 
                    onClick={() => { setActiveGenre(g); setSearchQuery(""); setShowFullList(false); refreshCandidates(g); }} 
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeGenre === g ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                  >
                    {g === "normal" ? (lang === "ja" ? "😊 通常" : "😊 Normal") : 
                     g === "romance" ? (lang === "ja" ? "💖 恋愛" : "💖 Love") : 
                     (lang === "ja" ? "🔞 タブー" : "🔞 Taboo")}
                  </button>
                );
              })}
            </div>
            
            {showFullList && (
              <div className="relative group animate-fade-in">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none opacity-50 text-xs"><Search size={14} /></div>
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder={lang === "ja" ? "お題を検索..." : "Search topics..."} 
                  className="w-full bg-slate-900 border border-slate-600 p-3 pl-10 rounded-xl text-xs outline-none focus:border-blue-500" 
                />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleRandomDistribute} className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group animate-pulse">
                <span className="text-lg group-hover:rotate-12 transition-transform">🎲</span>
                <span>{lang === "ja" ? "ランダム配布" : "Random Pick"}</span>
              </button>
              
              {isGlobalAdBlocked && !showFullList && (
                <button onClick={() => setShowFullList(true)} className="px-4 py-4 bg-slate-700 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-slate-600 transition-all flex items-center justify-center gap-2 active:scale-95">
                  <List size={18} />
                  <span className="text-[10px]">{lang === "ja" ? "一覧" : "List"}</span>
                </button>
              )}
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {showFullList ? (searchQuery ? "Search Results" : "All Topics") : "Random 3 Picks"}
              </span>
              
              {showFullList ? (
                <button onClick={() => { setShowFullList(false); setSearchQuery(""); }} className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1">
                  <RotateCcw size={10} /> {lang === "ja" ? "3択に戻す" : "Back to 3"}
                </button>
              ) : (
                <button onClick={handleRefreshClick} className="text-[10px] font-bold text-blue-400">
                  {lang === "ja" ? "🔄 更新" : "🔄 Refresh"}
                </button>
              )}
            </div>

            <div className="grid gap-2 max-h-60 overflow-y-auto custom-scrollbar">
              {currentPicks.length > 0 ? (
                currentPicks.map((topic, index: number) => (
                  <button key={index} onClick={() => sendTopic(topic.text, topic.genre === "taboo")} className="p-4 rounded-xl text-left border-2 border-slate-700 bg-slate-900 hover:border-blue-500 transition-all font-bold text-white text-sm">
                    {topic.text}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs italic">
                  {lang === "ja" ? "見つかりませんでした" : "No topics found"}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
               <label className="flex items-center justify-between px-2 cursor-pointer group text-[10px]">
                 <span className="text-slate-500 font-bold group-hover:text-slate-400">{t.sukikirai.showAnswerDetails}</span>
                 <input type="checkbox" checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} className="w-3 h-3 accent-emerald-500" />
               </label>
               <button onClick={backToLobbyFull} className="w-full py-3 bg-slate-200 text-black font-bold rounded-xl text-xs">{t.actions.backToLobby}</button>
            </div>
          </>
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-500 font-bold tracking-widest animate-pulse">{t.messages.waitingForHost}</p>
          </div>
        )}
        {isAdVisible && <div className="mt-6 flex justify-center"><AdRectangle key={adKey} /></div>}
      </div>
    );
  }

  // 2. Answering
  if (phase === "answering") {
    const allAnswered = members.length === Object.keys(answers).length;
    return (
      <div className="flex flex-col items-center w-full">
        <div className={`w-full p-8 rounded-3xl border text-center transition-colors ${roomData.isTabooActive ? "bg-red-950/30 border-red-900" : "bg-slate-800 border-slate-700"}`}>
          <h2 className="text-2xl font-black mb-10 text-white leading-tight">「{roomData.topic}」</h2>
          {!allAnswered ? (
            answers[userId] === undefined ? (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => submitAnswer(true)} className="py-10 bg-blue-600 rounded-2xl font-black text-2xl shadow-[0_6px_0_rgb(29,78,216)] active:translate-y-1 transition-all">{t.sukikirai.selectYes}</button>
                <button onClick={() => submitAnswer(false)} className="py-10 bg-red-600 rounded-2xl font-black text-2xl shadow-[0_6px_0_rgb(185,28,28)] active:translate-y-1 transition-all">{t.sukikirai.selectNo}</button>
              </div>
            ) : <p className="text-slate-400 py-10 animate-pulse italic">{t.messages.waiting} ({Object.keys(answers).length}/{members.length})</p>
          ) : (
            <div className="animate-fade-in">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-blue-900/40 rounded-2xl border border-blue-500/50"><p className="text-4xl font-black text-blue-400">{yesCount}</p><p className="text-xs text-blue-300 font-bold">{t.sukikirai.selectYes}</p></div>
                <div className="p-5 bg-red-900/40 rounded-2xl border border-red-500/50"><p className="text-4xl font-black text-red-400">{noCount}</p><p className="text-xs text-red-300 font-bold">{t.sukikirai.selectNo}</p></div>
              </div>
              {isHost && <button onClick={proceedToDiscussion} className="w-full py-4 bg-white text-black rounded-xl font-bold animate-bounce shadow-xl">{t.sukikirai.startDiscussion}</button>}
            </div>
          )}
          {isAdVisible && <div className="mt-6 flex justify-center"><AdRectangle key={adKey} /></div>}
        </div>
      </div>
    );
  }

  // 3. Discussion
  if (phase === "discussion") {
    const hasExt = !!(roomData.extensionsUsed || {})[userId];
    const hasFin = (roomData.finishVotes || []).includes(userId);
    const isMin = answers[userId] !== majorityValue;
    return (
      <div className={`w-full p-6 rounded-3xl border text-center ${roomData.isTabooActive ? "bg-red-950/30 border-red-900" : "bg-slate-800 border-slate-700"}`}>
        <div className="mb-6 pb-6 border-b border-white/10"><h2 className="text-xl font-black text-white leading-tight">「{roomData.topic}」</h2></div>
        <div className="flex justify-between items-center mb-6"><h2 className="text-sm font-bold text-slate-400">🗣️ {t.sukikirai.discussion}</h2><span className="font-mono bg-black/40 px-3 py-1 rounded-full text-red-500 font-bold text-sm">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span></div>
        
        {/* 多数派/少数派の人数・割合表示 */}
        <div className="flex flex-col items-center justify-center gap-2 mb-6 animate-fade-in">
           {/* Majority Panel */}
           <div className={`px-8 py-4 rounded-2xl border-2 shadow-lg text-center w-full max-w-xs ${majorityValue ? "bg-blue-900/20 border-blue-500/50" : "bg-red-900/20 border-red-500/50"}`}>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.sukikirai.majority}</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className={`text-3xl font-black ${majorityValue ? "text-blue-400" : "text-red-400"}`}>
                  {majorityValue ? t.sukikirai.selectYes : t.sukikirai.selectNo}
                </span>
                <span className="text-xl font-bold text-white">
                  {majorityValue ? yesCount : noCount} <span className="text-xs text-slate-400">players</span>
                </span>
              </div>
           </div>

           {/* Ratio Bar (人数表示) */}
           <div className="w-full max-w-xs mt-2 px-2">
             <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                <span>{t.sukikirai.selectYes}</span>
                <span className="text-base text-white">{yesCount} : {noCount}</span>
                <span>{t.sukikirai.selectNo}</span>
             </div>
             <div className="flex h-3 rounded-full overflow-hidden bg-slate-800 border border-slate-700">
               <div style={{ width: `${yesRatio}%` }} className="bg-blue-500 transition-all duration-1000" />
               <div style={{ width: `${noRatio}%` }} className="bg-red-500 transition-all duration-1000" />
             </div>
           </div>
        </div>

        {/* 役職表示 */}
        <div className="bg-slate-900/50 p-6 rounded-2xl mb-6 border border-white/5">
          <div className="flex flex-col items-center mb-6">
            <span className="text-[10px] font-bold text-slate-500 mb-2 tracking-widest uppercase">Your Role</span>
            <div className="flex items-center gap-4 bg-slate-950 px-6 py-3 rounded-xl border border-slate-700 shadow-inner">
               <span className={`text-2xl font-black ${isRoleVisible ? (isMin ? "text-red-500 animate-pulse" : "text-blue-400") : "text-slate-600 tracking-[0.2em]"}`}>
                  {isRoleVisible ? (isMin ? t.sukikirai.minority : t.sukikirai.majority) : "•••••••"}
               </span>
               <button onClick={() => setIsRoleVisible(!isRoleVisible)} className="text-slate-400 hover:text-white transition-colors">
                  {isRoleVisible ? <EyeOff size={20} /> : <Eye size={20} />}
               </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={extendDiscussion} disabled={hasExt} className={`flex-1 py-3 rounded-xl text-xs font-bold ${hasExt ? "bg-slate-800" : "bg-indigo-600 shadow-lg"}`}>{t.actions.extend}</button>
            <button onClick={finishDiscussionVote} disabled={hasFin} className={`flex-1 py-3 rounded-xl text-xs font-bold ${hasFin ? "bg-slate-800" : "bg-emerald-600 shadow-lg"}`}>{t.actions.finishVote}</button>
          </div>
        </div>
        
        {isAdVisible && <div className="mt-6 flex justify-center items-center"><AdRectangle key={adKey} /></div>}
      </div>
    );
  }

  // 4. Voting
  if (phase === "voting") {
    const hasVoted = !!votes[userId];
    return (
      <div className="w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center animate-fade-in space-y-4">
        <h2 className="text-xl font-bold">🗳️ {t.phases.voting}</h2>
        {!hasVoted ? (
          <div className="space-y-4">
            <div className="grid gap-2">{members.filter((m: string) => m !== userId).map((m: string) => (<button key={m} onClick={() => toggleVote(m)} className={`p-4 rounded-xl border transition-all ${selectedVotes.includes(m) ? "bg-red-900/30 border-red-500 shadow-lg" : "bg-slate-900 border-slate-700"}`}>{getDisplayName(m)}</button>))}</div>
            <button disabled={selectedVotes.length !== minorityCount} onClick={submitMultiVote} className="w-full py-4 bg-white text-black rounded-xl font-bold">{t.sukikirai.voteSubmit} ({selectedVotes.length}/{minorityCount})</button>
          </div>
        ) : <p className="py-10 animate-pulse text-slate-500 italic">{t.messages.waiting}</p>}
        {isAdVisible && <div className="mt-6 flex justify-center"><AdRectangle key={adKey} /></div>}
      </div>
    );
  }

  // 4.5. Exile Announcement
  if (phase === "exileAnnouncement") {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
        <div className="text-center space-y-10">
          <p className="text-red-600 text-xs font-black tracking-[0.3em] uppercase animate-pulse">Elimination Protocol</p>
          <h2 className="text-4xl font-black text-white mb-2">{lang === "ja" ? "今回の追放者は..." : "The Exiled Player is..."}</h2>
          <div className="space-y-4">
            {exiledPlayers.map((uid: string) => (
              <div key={uid} className="px-10 py-8 bg-white text-black rounded-3xl transform -rotate-2 shadow-[0_0_50px_rgba(255,255,255,0.2)] animate-in zoom-in spin-in-1 duration-500">
                <span className="text-3xl font-black">{getDisplayName(uid)}</span>
              </div>
            ))}
          </div>
          <div className="pt-10 flex justify-center gap-2">
            {[...Array(5)].map((_, i: number) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < timeLeft ? 'bg-red-600' : 'bg-slate-800'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 5. Results
  if (phase === "results") {
    const isMajorityWon = exiledPlayers.length === minorityCount && exiledPlayers.every((id: string) => minorityUIDs.includes(id));
    return (
      <div className="w-full bg-slate-800 p-6 rounded-3xl border border-slate-700 text-center shadow-2xl animate-fade-in space-y-8">
        <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">{t.sukikirai.resultTitle}</h2>
        <div className={`p-8 rounded-2xl border-4 ${isMajorityWon ? "border-blue-500 bg-blue-900/30" : "border-red-500 bg-red-900/30"}`}>
          <h3 className={`text-3xl font-black mb-2 ${isMajorityWon ? "text-blue-400" : "text-red-500"}`}>{isMajorityWon ? t.sukikirai.winnerMajority : t.sukikirai.winnerMinority}</h3>
          <p className="text-xs text-slate-400">{isMajorityWon ? t.sukikirai.perfectWin : t.sukikirai.minorityEscaped}</p>
        </div>
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">{lang === "ja" ? "追放されたプレイヤー" : "Exiled Player"}</h4>
          <div className="flex flex-wrap justify-center gap-4">
            {exiledPlayers.map((uid: string) => (
              <div key={uid} className="px-10 py-6 bg-slate-900 rounded-3xl border-2 border-red-600/50 shadow-lg"><span className="text-2xl font-black text-white">{getDisplayName(uid)}</span></div>
            ))}
          </div>
        </div>
        {roomData.showAnswerDetails && (
          <div className="p-4 bg-slate-900/40 rounded-2xl border border-white/5 text-left">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">{t.sukikirai.showAnswerDetails}</p>
            <div className="grid grid-cols-2 gap-4">
              {([true, false] as boolean[]).map((val: boolean) => (
                <div key={val.toString()}>
                  <p className={`text-[10px] font-bold mb-2 ${val ? "text-blue-400" : "text-red-400"}`}>{val ? "YES" : "NO"} : {Object.values(answers).filter((a: boolean) => a === val).length}人</p>
                  <div className="flex flex-wrap gap-1">
                    {members.filter((u: string) => answers[u] === val).map((u: string) => (<span key={u} className="text-[9px] bg-slate-800 text-slate-300 px-2 py-1 rounded">{getDisplayName(u)}</span>))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {isHost && (
          <div className="flex flex-col gap-3">
            <button onClick={resetGame} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-xl hover:bg-red-500 transition-all active:scale-95">🎮 {t.actions.playAgain}</button>
            <button onClick={backToLobbyFull} className="w-full py-3 bg-slate-200 text-black font-bold rounded-xl text-xs hover:bg-white transition-all">🏠 {t.actions.backToLobby}</button>
          </div>
        )}
        {isAdVisible && <div className="mt-6 flex justify-center"><AdRectangle key={adKey} /></div>}
      </div>
    );
  }

  return <div className="text-center py-20 text-slate-600 italic">...</div>;
}