"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { AdRectangle } from "@/components/Ads";
import { Role, ROLES, TEAMS } from "@/lib/gameConstants";
import { translations, Language } from "@/lib/i18n";

// --- 配役設定 ---
const ROLE_PRESETS: { [key: number]: string[] } = {
  4: [ROLES.WEREWOLF, ROLES.SEER, ROLES.VILLAGER, ROLES.VILLAGER],
  5: [ROLES.WEREWOLF, ROLES.SEER, ROLES.HUNTER, ROLES.VILLAGER, ROLES.VILLAGER],
  6: [ROLES.WEREWOLF, ROLES.MADMAN, ROLES.SEER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER],
  7: [ROLES.WEREWOLF, ROLES.MADMAN, ROLES.SEER, ROLES.MEDIUM, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER],
  8: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.SEER, ROLES.MEDIUM, ROLES.HUNTER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER],
  9: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.MADMAN, ROLES.SEER, ROLES.MEDIUM, ROLES.HUNTER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER],
  10: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.MADMAN, ROLES.SEER, ROLES.MEDIUM, ROLES.HUNTER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER],
  12: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.MADMAN, ROLES.SEER, ROLES.MEDIUM, ROLES.HUNTER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.TWINS, ROLES.TWINS],
  13: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.MADMAN, ROLES.SEER, ROLES.MEDIUM, ROLES.HUNTER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.TWINS, ROLES.TWINS, ROLES.FOX],
  14: [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.MADMAN, ROLES.SEER, ROLES.MEDIUM, ROLES.HUNTER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER,ROLES.VILLAGER, ROLES.TWINS, ROLES.TWINS, ROLES.FOX],
};

const FAKE_ROLE_OPTIONS = [ROLES.VILLAGER, ROLES.SEER, ROLES.MEDIUM, ROLES.HUNTER, ROLES.MADMAN, ROLES.TWINS];

interface Props {
  roomId: string;
  userId: string;
  roomData: any;
  isHost: boolean;
  lang: Language;
  onAdRefreshRequest: () => void;
  adKey: number;
}

export default function WerewolfGame({ roomId, userId, roomData, isHost, lang, onAdRefreshRequest, adKey }: Props) {
  const router = useRouter();
  const t = translations[lang];

  // --- State ---
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [fakeRole, setFakeRole] = useState<string>(ROLES.VILLAGER);
  const [priority, setPriority] = useState<number>(0);
  
  // 初期値を99に設定（読み込み直後の0秒判定防止）
  const [timeLeft, setTimeLeft] = useState<number>(99); 
  const [hasExtended, setHasExtended] = useState<boolean>(false);
  
  // 演出管理用
  const [showWinnerBanner, setShowWinnerBanner] = useState(false); 
  const [foxReveal, setFoxReveal] = useState(false); 

  // --- Derived State (広告ロジック同期) ---
  const isNightActionDone = !!roomData.nightActions?.[userId];
  const isVoteActionDone = !!roomData.voteActions?.[userId];
  const isAnyActionDone = isNightActionDone || isVoteActionDone;
  const isFinishVoteDone = roomData.finishVotes?.includes(userId);
  
  const isGlobalAdBlocked = roomData.isAdBlocked;
  const isPersonalAdBlocked = roomData.adBlockedUsers?.includes(userId);
  const isAdVisible = !isGlobalAdBlocked && !isPersonalAdBlocked;

  // --- Helper ---
  const getDisplayName = (uid: string) => {
    if (!uid) return "";
    return roomData.names?.[uid] || `P-${uid.substring(0, 4)}`;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Effects ---

  // タイマー管理
  useEffect(() => {
    if (!roomData?.phaseEndTime) return;

    const tick = () => {
      const remain = Math.ceil((roomData.phaseEndTime - Date.now()) / 1000);
      setTimeLeft(remain > 0 ? remain : 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [roomData?.phaseEndTime]);

  // 演出シーケンス管理
  useEffect(() => {
    const phase = roomData?.phase;
    if (phase !== "day_result" && phase !== "night_result") {
      setShowWinnerBanner(false);
      setFoxReveal(false);
      return;
    }
    if (phase === "day_result" || phase === "night_result") {
      setShowWinnerBanner(false);
      setFoxReveal(false);

      if (roomData.winner) {
        const winnerTimer = setTimeout(() => {
          setShowWinnerBanner(true);
        }, 4000);

        let foxTimer: NodeJS.Timeout;
        if (roomData.winner === TEAMS.FOX) {
          foxTimer = setTimeout(() => {
            setFoxReveal(true);
          }, 7500); 
        }

        return () => {
          clearTimeout(winnerTimer);
          if (foxTimer) clearTimeout(foxTimer);
        };
      }
    }
  }, [roomData?.phase, roomData?.winner]);

  // 自動配役処理
  useEffect(() => {
    if (isHost && roomData.status === "playing" && !roomData.phase) {
      console.log("Initializing roles...");
      initRolesAndStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, roomData.status, roomData.phase]);

  // 状態リセット
  useEffect(() => {
    setSelectedTarget("");
    setFakeRole(ROLES.VILLAGER);
    setHasExtended(!!(userId && roomData.extensionsUsed?.[userId]));
    
    // フェーズ切り替え時に広告リフレッシュ要求
    if(roomData.phase) {
        onAdRefreshRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData.phase, userId]); 

  // ★ ホスト用進行管理
  useEffect(() => {
    if (!roomData || !isHost || roomData.status !== "playing" || !roomData.phase) return;

    const now = Date.now();
    const isTimeUp = roomData.phaseEndTime && now >= roomData.phaseEndTime;
    const aliveMembers = (roomData.members || []).filter((m: string) => 
      !(roomData.deadPlayers || []).includes(m)
    );
    
    // 配役確認 -> 夜アナウンス
    if (roomData.phase === "role_check") {
      if (isTimeUp) proceedToNightAnnounce();
    }

    // 夜アナウンス -> 夜
    if (roomData.phase === "night_announce") {
      if (isTimeUp) startNightAction();
    }

    // 夜 -> 朝の結果発表
    if (roomData.phase === "night") {
      const allActioned = Object.keys(roomData.nightActions || {}).length >= aliveMembers.length;
      if (allActioned || isTimeUp) calculateNightResult();
    }
    
    // 朝の結果発表 -> 議論アナウンス
    if (roomData.phase === "night_result") {
      if (isTimeUp) proceedToDiscussionAnnounce();
    }

    // 議論アナウンス -> 議論開始
    if (roomData.phase === "discussion_announce") {
      if (isTimeUp) startActualDiscussion();
    }

    // 議論 -> 投票アナウンス
    if (roomData.phase === "day_discussion") {
      const finishVotes = (roomData.finishVotes || []).length;
      if (finishVotes > aliveMembers.length / 2 || isTimeUp) proceedToVotingAnnounce();
    }

    // 投票アナウンス -> 投票開始
    if (roomData.phase === "voting_announce") {
      if (isTimeUp) startActualVoting();
    }

    // 投票 -> 投票結果発表
    if (roomData.phase === "day_voting") {
      const allVoted = Object.keys(roomData.voteActions || {}).length >= aliveMembers.length;
      if (allVoted || isTimeUp) calculateVoteResult();
    }

    // 投票結果発表 -> 夜アナウンス
    if (roomData.phase === "day_result") {
      if (isTimeUp) proceedToNightAnnounce();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData, isHost, timeLeft]);

  // --- Actions ---

  const initRolesAndStart = async () => {
    if (!roomData) return;
    const count = roomData.members.length;
    if (!ROLE_PRESETS[count]) { alert(`Players count ${count} not supported.`); return; }

    let roles = [...ROLE_PRESETS[count]].sort(() => Math.random() - 0.5);
    const assignments: { [key: string]: string } = {};
    roomData.members.forEach((uid: string, i: number) => assignments[uid] = roles[i]);

    const seerUid = Object.keys(assignments).find(uid => assignments[uid] === ROLES.SEER);
    let initialSeerResult = null;
    if (seerUid) {
      const whiteCandidates = roomData.members.filter((uid: string) => uid !== seerUid && assignments[uid] !== ROLES.WEREWOLF && assignments[uid] !== ROLES.FOX);
      if (whiteCandidates.length > 0) {
        const targetId = whiteCandidates[Math.floor(Math.random() * whiteCandidates.length)];
        initialSeerResult = { 
          targetName: getDisplayName(targetId), 
          isWolf: false, 
          targetId 
        };
      }
    }

    await updateDoc(doc(db, "rooms", roomId), {
      roleAssignment: assignments,
      phase: "role_check", 
      phaseEndTime: Date.now() + 10 * 1000 + 1000, 
      dayCount: 1,
      nightActions: {},
      voteActions: {},
      deadPlayers: [],
      extensionsUsed: {},
      finishVotes: [],
      lastExiled: null,
      lastVictim: null,
      lastCursed: null,
      lastSeerResult: initialSeerResult,
      lastMediumResult: null,
      lastGuardedId: null,
      winner: null,
      apparentWinner: null,
    });
  };

  const proceedToNightAnnounce = async () => {
    if (roomData.winner) {
      await updateDoc(doc(db, "rooms", roomId), { status: "finished" });
      return;
    }
    await updateDoc(doc(db, "rooms", roomId), {
      phase: "night_announce",
      phaseEndTime: Date.now() + 4 * 1000 + 1000, 
      voteActions: {},
      lastVictim: null,
      lastCursed: null,
    });
  };

  const startNightAction = async () => {
    await updateDoc(doc(db, "rooms", roomId), {
      phase: "night",
      phaseEndTime: Date.now() + 60 * 1000 + 2000,
    });
  };

  const proceedToDiscussionAnnounce = async () => {
    if (roomData.winner) {
      await updateDoc(doc(db, "rooms", roomId), { status: "finished" });
      return;
    }
    await updateDoc(doc(db, "rooms", roomId), {
      phase: "discussion_announce",
      phaseEndTime: Date.now() + 4 * 1000 + 1000, 
    });
  };

  const startActualDiscussion = async () => {
    const currentAliveCount = roomData.members.length - (roomData.deadPlayers || []).length;
    const discussionDuration = getDiscussionTime(currentAliveCount);
    await updateDoc(doc(db, "rooms", roomId), {
      phase: "day_discussion",
      phaseEndTime: Date.now() + discussionDuration + 2000,
      nightActions: {},
      finishVotes: [],
    });
  };

  const proceedToVotingAnnounce = async () => {
    await updateDoc(doc(db, "rooms", roomId), {
      phase: "voting_announce",
      phaseEndTime: Date.now() + 4 * 1000 + 1000, 
    });
  };

  const startActualVoting = async () => {
    await updateDoc(doc(db, "rooms", roomId), {
      phase: "day_voting",
      phaseEndTime: Date.now() + 60 * 1000 + 2000,
      finishVotes: []
    });
  };

  const backToLobby = async () => {
    if (!roomId) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        status: "waiting",
        phase: null,
        dayCount: 0,
        roleAssignment: {},
        deadPlayers: [],
        nightActions: {},
        voteActions: {},
        finishVotes: [],
        lastExiled: null,
        lastVictim: null,
        lastCursed: null,
        lastSeerResult: null,
        lastMediumResult: null,
        lastGuardedId: null,
        winner: null,
        apparentWinner: null,
        extensionsUsed: {},
      });
      onAdRefreshRequest();
    } catch (e) { console.error(e); }
  };

  const restartGame = async () => {
    if (!roomId) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        status: "playing",
        phase: null,
        dayCount: 0,
        roleAssignment: {},
        deadPlayers: [],
        nightActions: {},
        voteActions: {},
        finishVotes: [],
        lastExiled: null,
        lastVictim: null,
        lastCursed: null,
        lastSeerResult: null,
        lastMediumResult: null,
        lastGuardedId: null,
        winner: null,
        apparentWinner: null,
        extensionsUsed: {},
      });
      onAdRefreshRequest();
    } catch (e) { console.error(e); }
  };

  const getDiscussionTime = (count: number) => {
    if (count <= 6) return 4 * 60 * 1000;
    if (count <= 10) return 7 * 60 * 1000;
    return 10 * 60 * 1000;
  };

  const submitFinishVote = async () => {
    if (!userId || !roomId || isFinishVoteDone) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        finishVotes: arrayUnion(userId)
      });
      onAdRefreshRequest();
    } catch (e) { console.error(e); }
  };

  const extendDiscussion = async () => {
    if (hasExtended) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        phaseEndTime: (roomData.phaseEndTime || Date.now()) + 60 * 1000,
        [`extensionsUsed.${userId}`]: true
      });
      setHasExtended(true);
      onAdRefreshRequest();
    } catch(e) { console.error(e); }
  };

  const calculateNightResult = async () => {
    const actions = roomData.nightActions || {};
    const assignments = roomData.roleAssignment;
    const currentDead = [...(roomData.deadPlayers || [])];

    // 人狼の襲撃処理
    let wolfTarget = "";
    if (roomData.dayCount > 1) {
      const wolfUids = Object.keys(assignments).filter(uid => assignments[uid] === ROLES.WEREWOLF);
      const wolfActions = wolfUids.map(uid => actions[uid]).filter(a => a && a.targetId !== "none");
      
      if (wolfActions.length > 0) {
        const priorityActions = wolfActions.filter((a: any) => a.priority === 1);
        const candidates = priorityActions.length > 0 ? priorityActions : wolfActions;
        wolfTarget = candidates[Math.floor(Math.random() * candidates.length)].targetId;
      } else {
        // ランダム襲撃
        const potentialTargets = roomData.members.filter((uid: string) => 
            !currentDead.includes(uid) && assignments[uid] !== ROLES.WEREWOLF
        );
        if (potentialTargets.length > 0) {
            wolfTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        }
      }
    }

    const hunterUid = Object.keys(assignments).find(uid => assignments[uid] === ROLES.HUNTER);
    const hunterAction = actions[hunterUid || ""];
    let isGuarded = (hunterAction?.targetId === wolfTarget && wolfTarget !== "");

    let victim = "";
    if (wolfTarget && !isGuarded && assignments[wolfTarget] !== ROLES.FOX) victim = wolfTarget;

    const seerUid = Object.keys(assignments).find(uid => assignments[uid] === ROLES.SEER);
    const seerAction = actions[seerUid || ""];
    let seerResult = roomData.dayCount === 1 ? roomData.lastSeerResult : null;
    let cursedId = null;

    if (roomData.dayCount > 1 && seerAction && seerAction.targetId !== "none") {
      const targetRole = assignments[seerAction.targetId];
      seerResult = { 
        targetName: getDisplayName(seerAction.targetId), 
        isWolf: targetRole === ROLES.WEREWOLF,
        targetId: seerAction.targetId 
      };
      if (targetRole === ROLES.FOX) cursedId = seerAction.targetId;
    }

    if (victim && !currentDead.includes(victim)) currentDead.push(victim);
    if (cursedId && !currentDead.includes(cursedId)) currentDead.push(cursedId);

    const apparentWinner = checkApparentWinner(roomData.members, assignments, currentDead);
    let realWinner = null;
    if (apparentWinner) {
      const foxAlive = roomData.members.some((uid: string) => !currentDead.includes(uid) && assignments[uid] === ROLES.FOX);
      realWinner = foxAlive ? TEAMS.FOX : apparentWinner;
    }

    const duration = realWinner ? 12 * 1000 : 6 * 1000;

    await updateDoc(doc(db, "rooms", roomId), {
      phase: "night_result", 
      phaseEndTime: Date.now() + duration + 1000, 
      lastVictim: victim,
      lastCursed: cursedId,
      lastSeerResult: seerResult,
      lastGuardedId: hunterAction?.targetId || null,
      deadPlayers: currentDead,
      status: "playing",
      winner: realWinner, 
      apparentWinner: apparentWinner,
      dayCount: roomData.dayCount + 1
    });
  };

  const calculateVoteResult = async () => {
    const votes = roomData.voteActions || {};
    const assignments = roomData.roleAssignment;
    const currentDead = [...(roomData.deadPlayers || [])];

    const voteCounts: { [key: string]: number } = {};
    Object.values(votes).forEach((targetId: any) => voteCounts[targetId] = (voteCounts[targetId] || 0) + 1);

    let maxVotes = 0;
    let candidates: string[] = [];
    Object.entries(voteCounts).forEach(([targetId, count]) => {
      if (count > maxVotes) { maxVotes = count; candidates = [targetId]; }
      else if (count === maxVotes) candidates.push(targetId);
    });

    // ランダム追放
    if (candidates.length === 0) {
        candidates = roomData.members.filter((m: string) => !currentDead.includes(m));
    }

    const exiledId = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    let mediumResult = null;

    if (exiledId) {
      if (!currentDead.includes(exiledId)) currentDead.push(exiledId);
      const targetRole = assignments[exiledId];
      mediumResult = { 
        targetName: getDisplayName(exiledId), 
        isWolf: targetRole === ROLES.WEREWOLF,
        targetId: exiledId 
      };
    }

    const apparentWinner = checkApparentWinner(roomData.members, assignments, currentDead);
    let realWinner = null;
    if (apparentWinner) {
      const foxAlive = roomData.members.some((uid: string) => !currentDead.includes(uid) && assignments[uid] === ROLES.FOX);
      realWinner = foxAlive ? TEAMS.FOX : apparentWinner;
    }

    const duration = realWinner ? 12 * 1000 : 6 * 1000;

    await updateDoc(doc(db, "rooms", roomId), {
      phase: "day_result", 
      phaseEndTime: Date.now() + duration + 1000, 
      lastExiled: exiledId,
      lastMediumResult: mediumResult,
      deadPlayers: currentDead,
      status: "playing",
      winner: realWinner, 
      apparentWinner: apparentWinner,
    });
  };

  const submitNightAction = async () => {
    const myRole = roomData.roleAssignment[userId];
    const isFirstNightWolf = roomData.dayCount === 1 && myRole === ROLES.WEREWOLF;
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        [`nightActions.${userId}`]: {
          userId,
          targetId: isFirstNightWolf ? "none" : (selectedTarget || "none"),
          fakeRole: isFirstNightWolf ? fakeRole : null,
          priority, role: myRole
        }
      });
      onAdRefreshRequest();
    } catch (e) { console.error(e); }
  };

  const submitVote = async () => {
    if (!selectedTarget) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), { [`voteActions.${userId}`]: selectedTarget });
      onAdRefreshRequest();
    } catch (e) { console.error(e); }
  };

  const checkApparentWinner = (members: string[], assignments: any, deadList: string[]) => {
    const aliveMembers = members.filter(uid => !deadList.includes(uid));
    const aliveWolves = aliveMembers.filter(uid => assignments[uid] === ROLES.WEREWOLF).length;
    const aliveHumans = aliveMembers.length - aliveWolves;
    
    if (aliveWolves === 0) return TEAMS.VILLAGERS;
    if (aliveWolves >= aliveHumans) return TEAMS.WEREWOLVES;
    return null;
  };

  // --- Render Helpers ---

  const myRole = roomData.roleAssignment ? roomData.roleAssignment[userId || ""] : null;
  const isNight = roomData.status === "playing" && roomData.phase === "night";
  const isDiscussion = roomData.status === "playing" && roomData.phase === "day_discussion";
  const isVoting = roomData.status === "playing" && roomData.phase === "day_voting";
  const isDayResult = roomData.status === "playing" && roomData.phase === "day_result";
  const isNightResult = roomData.status === "playing" && roomData.phase === "night_result";
  const isRoleCheck = roomData.status === "playing" && roomData.phase === "role_check";
  const isNightAnnounce = roomData.status === "playing" && roomData.phase === "night_announce";
  const isDiscussionAnnounce = roomData.status === "playing" && roomData.phase === "discussion_announce";
  const isVotingAnnounce = roomData.status === "playing" && roomData.phase === "voting_announce";
  
  const isAlive = !roomData.deadPlayers?.includes(userId);
  const aliveMembers = roomData.members.filter((m: string) => !roomData.deadPlayers?.includes(m));
  
  const otherWolvesActions = isNight && myRole === ROLES.WEREWOLF ? roomData.members.filter((uid: string) => roomData.roleAssignment[uid] === ROLES.WEREWOLF && uid !== userId).map((uid: string) => ({ uid, action: roomData.nightActions?.[uid] })) : [];

  let phaseText = t.phases.waiting;
  const timerDisplay = formatTime(timeLeft);

  if (isNight) phaseText = `🌃 ${t.phases.night} (${timerDisplay})`;
  if (isDiscussion) phaseText = `🗣️ ${t.phases.discussion} (${timerDisplay})`;
  if (isVoting) phaseText = `🗳️ ${t.phases.voting} (${timerDisplay})`;
  if (isDayResult) phaseText = `⚖️ ${t.phases.day_result} (${timerDisplay})`;
  if (isNightResult) phaseText = `🌅 ${t.phases.night_result} (${timerDisplay})`;
  if (isRoleCheck) phaseText = `📋 ${t.phases.role_check} (${timerDisplay})`;
  if (isNightAnnounce) phaseText = `🌙 ${t.phases.night_announce}`;
  if (isDiscussionAnnounce) phaseText = `📢 ${t.phases.discussion_announce}`;
  if (isVotingAnnounce) phaseText = `👉 ${t.phases.voting_announce}`;

  const immediateSeerResult = (isNight && myRole === ROLES.SEER && isNightActionDone) ? (() => {
      if (roomData.dayCount === 1) return roomData.lastSeerResult;
      const myAction = roomData.nightActions?.[userId];
      if (!myAction?.targetId || myAction.targetId === "none") return null;
      const targetRole = roomData.roleAssignment[myAction.targetId];
      return {
          targetId: myAction.targetId,
          isWolf: targetRole === ROLES.WEREWOLF
      };
  })() : null;

  const renderWinnerAnnouncement = () => {
    if (!roomData.winner) return null;
    
    const isFoxWin = roomData.winner === TEAMS.FOX;
    const apparent = roomData.apparentWinner; 
    const displayWinner = (isFoxWin && !foxReveal) ? apparent : roomData.winner;

    return (
      <div className="mt-6 animate-fade-in w-full max-w-sm">
        <div className={`p-6 rounded-xl text-center border-4 shadow-xl transition-all duration-500 transform ${
          displayWinner === TEAMS.FOX ? "bg-purple-900 border-purple-400 scale-110" :
          displayWinner === TEAMS.VILLAGERS ? "bg-green-900 border-green-400" :
          "bg-red-900 border-red-400"
        }`}>
          <p className="text-sm text-white opacity-80 mb-2 font-bold tracking-widest">VICTORY</p>
          <h2 className="text-3xl font-black text-white animate-bounce">
            {t.messages.winner(displayWinner)}
          </h2>
          {isFoxWin && !foxReveal && (
             <p className="text-xs text-purple-500 mt-2 animate-pulse opacity-50">Something is wrong...</p>
          )}
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (roomData.status === "finished") {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="text-center z-10 w-full max-w-md">
          <h1 className="text-4xl font-black mb-4 text-yellow-400 animate-bounce">{t.messages.winner(roomData.winner)}</h1>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-slate-600 pb-2">{t.messages.roleCheck}</h2>
            <ul className="space-y-2">
              {roomData.members.map((m: string) => (
                <li key={m} className="flex justify-between">
                  <span>{getDisplayName(m)}</span>
                  <span className="font-bold">{t.roles[roomData.roleAssignment[m] as Role]}</span>
                </li>
              ))}
            </ul>
          </div>
          {isAdVisible && <AdRectangle key={adKey} />}
          <div className="flex flex-col gap-3 w-full px-8 mt-6">
            {isHost ? (
              <>
                <button onClick={restartGame} className="py-4 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 transition-all shadow-lg active:scale-95">
                  {t.actions.playAgain}
                </button>
                <button onClick={backToLobby} className="py-4 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 transition-all shadow-lg active:scale-95">
                  {t.actions.backToLobby}
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm animate-pulse">
                  {t.messages.waitingForHost}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ローディング画面
  if (roomData.status === "playing" && !roomData.phase) {
    return (
      <div className="py-20 text-center animate-pulse">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 font-bold tracking-widest mb-8">{isHost ? "配役を準備中..." : "村の様子を伺っています..."}</p>
        {isAdVisible && <AdRectangle key={adKey} />}
      </div>
    );
  }

  // ★ ゲームプレイ画面
  return (
    <div className="w-full flex flex-col items-center animate-fade-in pb-12">
      <div className="mb-2 text-center w-full">
        <h1 className="text-2xl font-bold">{`${phaseText} ${(isNightAnnounce || isDiscussionAnnounce || isVotingAnnounce) ? "" : `- Day ${roomData.dayCount}`}`}</h1>
      </div>
      
      {/* ★ 配役確認フェーズ */}
      {isRoleCheck && (
        <div className="w-full max-w-sm my-4 animate-fade-in">
          {timeLeft > 5 ? (
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
               <h2 className="text-center text-lg font-bold mb-4 border-b border-slate-600 pb-2">配役内訳</h2>
               <div className="grid grid-cols-2 gap-3">
                 {Object.entries(
                    ROLE_PRESETS[roomData.members.length]?.reduce((acc: any, role: string) => {
                      acc[role] = (acc[role] || 0) + 1;
                      return acc;
                    }, {}) || {}
                 ).map(([role, count]: any) => (
                   <div key={role} className="flex justify-between bg-slate-700 p-3 rounded-lg">
                     <span className="font-bold">{t.roles[role as Role]}</span>
                     <span className="font-mono text-lg">x{count}</span>
                   </div>
                 ))}
               </div>
               <p className="text-center mt-4 text-xs text-slate-400 animate-pulse">Game starting soon...</p>
            </div>
          ) : (
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-600 shadow-2xl text-center animate-zoom-in">
               <p className="text-sm text-slate-400 mb-2 uppercase tracking-widest">Your Role</p>
               <h2 className={`text-4xl font-black mb-4 ${myRole === ROLES.WEREWOLF ? "text-red-500" : myRole === ROLES.FOX ? "text-purple-400" : "text-white"}`}>
                 {t.roles[myRole as Role]}
               </h2>
               <p className="text-xs text-slate-500">周りに見られないように注意してください</p>
            </div>
          )}
        </div>
      )}

      {/* ★ 夜のアナウンス */}
      {isNightAnnounce && (
        <div className="w-full max-w-sm my-20 animate-fade-in flex justify-center">
           <div className="text-center animate-pulse">
             <div className="text-6xl mb-4">🌙</div>
             <h2 className="text-2xl font-black tracking-widest text-indigo-300">{t.phases.night_announce}</h2>
             <p className="text-slate-500 text-sm mt-2">Night is coming...</p>
           </div>
        </div>
      )}

      {/* ★ 議論のアナウンス */}
      {isDiscussionAnnounce && (
        <div className="w-full max-w-sm my-20 animate-fade-in flex justify-center">
           <div className="text-center animate-pulse">
             <div className="text-6xl mb-4">🗣️</div>
             <h2 className="text-2xl font-black tracking-widest text-yellow-300">{t.phases.discussion_announce}</h2>
             <p className="text-slate-500 text-sm mt-2">Get ready to talk!</p>
           </div>
        </div>
      )}

      {/* ★ 投票のアナウンス */}
      {isVotingAnnounce && (
        <div className="w-full max-w-sm my-20 animate-fade-in flex justify-center">
           <div className="text-center animate-pulse">
             <div className="text-6xl mb-4">🗳️</div>
             <h2 className="text-2xl font-black tracking-widest text-red-300">{t.phases.voting_announce}</h2>
             <p className="text-slate-500 text-sm mt-2">Time to decide...</p>
           </div>
        </div>
      )}

      {/* ★ 投票結果発表 */}
      {isDayResult && (
        <div className="w-full max-w-sm my-8 animate-fade-in flex flex-col items-center">
          {!showWinnerBanner && (
            <div className="bg-slate-900 border-2 border-red-600 p-8 rounded-2xl text-center shadow-2xl w-full">
              <h2 className="text-lg text-red-500 font-bold mb-4 tracking-widest uppercase">Judgement</h2>
              {roomData.lastExiled ? (
                <div className="animate-bounce">
                  <p className="text-slate-400 text-sm mb-2">追放されたのは...</p>
                  <p className="text-3xl font-black text-white">{getDisplayName(roomData.lastExiled)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 text-sm">追放者はいませんでした</p>
                </div>
              )}
            </div>
          )}
          {showWinnerBanner && renderWinnerAnnouncement()}
        </div>
      )}

      {/* ★ 朝の結果発表 */}
      {isNightResult && (
        <div className="w-full max-w-sm my-8 animate-fade-in flex flex-col items-center">
          {!showWinnerBanner && (
            <div className="bg-slate-900 border-2 border-blue-600 p-8 rounded-2xl text-center shadow-2xl w-full">
              <h2 className="text-lg text-blue-500 font-bold mb-4 tracking-widest uppercase">Morning Report</h2>
              {roomData.lastVictim || roomData.lastCursed ? (
                <div className="animate-bounce space-y-4">
                  {roomData.lastVictim && (
                    <div>
                      <p className="text-slate-400 text-sm mb-1">無残な姿で発見された...</p>
                      <p className="text-3xl font-black text-red-500">{getDisplayName(roomData.lastVictim)}</p>
                    </div>
                  )}
                  {roomData.lastCursed && (
                    <div>
                      <p className="text-slate-400 text-sm mb-1">謎の死を遂げた...</p>
                      <p className="text-3xl font-black text-purple-500">{getDisplayName(roomData.lastCursed)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-green-400 text-xl font-bold">平和な朝を迎えました！</p>
                </div>
              )}
            </div>
          )}
          {showWinnerBanner && renderWinnerAnnouncement()}
        </div>
      )}

      {/* 通常フェーズ */}
      {!isDayResult && !isNightResult && !isRoleCheck && !isNightAnnounce && !isDiscussionAnnounce && !isVotingAnnounce && (
        <>
          {!isAlive && (
            <div className="w-full max-w-sm flex flex-col items-center mb-4">
              <div className="w-full bg-red-900/50 border-2 border-red-600 p-2 rounded-xl text-center">
                <h2 className="text-lg font-black text-red-500">{t.messages.youDied}</h2>
              </div>
            </div>
          )}

          {isDiscussion && isAlive && (
            <div className="w-full max-w-sm flex gap-2 mb-4">
              <button onClick={extendDiscussion} disabled={hasExtended} className={`flex-1 py-3 rounded-xl font-bold border transition-all ${hasExtended ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-blue-900 border-blue-500 hover:bg-blue-800"}`}>{hasExtended ? t.actions.extended : t.actions.extend}</button>
              <button onClick={submitFinishVote} disabled={isFinishVoteDone} className={`flex-1 py-3 rounded-xl font-bold border transition-all ${isFinishVoteDone ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed" : "bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"}`}>{isFinishVoteDone ? t.actions.finishVoted : t.actions.finishVote}</button>
            </div>
          )}

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full max-w-sm mb-4">
            {isDiscussion && (
              <div className="mb-4 p-4 bg-slate-900 rounded-xl border-l-4 border-yellow-500">
                <h3 className="text-yellow-500 font-bold mb-2">{t.messages.morningNews}</h3>
                {roomData.lastVictim || roomData.lastCursed ? (
                  <div>
                    {roomData.lastVictim && <p dangerouslySetInnerHTML={{ __html: t.messages.victim(getDisplayName(roomData.lastVictim)) }} />}
                    {roomData.lastCursed && <p dangerouslySetInnerHTML={{ __html: t.messages.cursed(getDisplayName(roomData.lastCursed)) }} />}
                  </div>
                ) : <p className="text-green-400 font-bold">{t.messages.peaceful}</p>}
              </div>
            )}
            
            <ul className="space-y-1 mb-4">
              {roomData.members.map((m: string, i: number) => {
                const isDead = roomData.deadPlayers?.includes(m);
                const done = !isDead && ((isNight && roomData.nightActions?.[m]) || (isVoting && roomData.voteActions?.[m]));
                return (
                  <li key={i} className={`text-sm font-mono p-2 rounded flex justify-between ${isDead ? "bg-slate-900 text-slate-600 line-through" : "bg-slate-700"}`}>
                    <span>{m === roomData.hostId ? "👑 " : "👤 "}{getDisplayName(m)}</span>
                    {done && <span className="text-green-400 text-xs">OK</span>}
                  </li>
                );
              })}
            </ul>
          </div>

          {myRole && isAlive && (
            <div className="p-4 bg-slate-800 rounded-2xl border border-slate-600 text-center w-full max-w-sm">
              <p className="text-xs uppercase text-slate-400">YOUR ROLE</p>
              <h2 className={`text-2xl font-black mb-2 ${myRole === ROLES.FOX ? "text-purple-400" : myRole === ROLES.WEREWOLF ? "text-red-500" : "text-white"}`}>{t.roles[myRole as Role]}</h2>
              
              {myRole === ROLES.MEDIUM && isNight && roomData.lastMediumResult && (
                  <div className="mb-2 p-2 bg-purple-900/50 border border-purple-500 rounded text-xs animate-pulse">
                    <p className="font-bold text-purple-300">{t.messages.mediumTitle}</p>
                    <p>{getDisplayName(roomData.lastMediumResult.targetId)} : <span className={roomData.lastMediumResult.isWolf ? "text-red-500 font-bold" : "text-white font-bold"}>{roomData.lastMediumResult.isWolf ? t.messages.isWolf : t.messages.isHuman}</span></p>
                  </div>
              )}

              {myRole === ROLES.SEER && (
                <>
                  {isNight && immediateSeerResult && (
                      <div className="mb-2 p-2 bg-indigo-900/50 border border-indigo-500 rounded text-xs animate-pulse">
                        <p className="font-bold text-indigo-300">{t.messages.seerTitle} (Now)</p>
                        <p>{getDisplayName(immediateSeerResult.targetId)} : <span className={immediateSeerResult.isWolf ? "text-red-500 font-bold" : "text-green-400 font-bold"}>{immediateSeerResult.isWolf ? t.messages.isWolf : t.messages.isHuman}</span></p>
                      </div>
                  )}
                  {isDiscussion && roomData.lastSeerResult && (
                    <div className="mb-2 p-2 bg-indigo-900/50 border border-indigo-500 rounded text-xs">
                      <p className="font-bold text-indigo-300">{t.messages.seerTitle} (Last Night)</p>
                      <p>{getDisplayName(roomData.lastSeerResult.targetId)} : <span className={roomData.lastSeerResult.isWolf ? "text-red-500 font-bold" : "text-green-400 font-bold"}>{roomData.lastSeerResult.isWolf ? t.messages.isWolf : t.messages.isHuman}</span></p>
                    </div>
                  )}
                </>
              )}

              {myRole === ROLES.WEREWOLF && otherWolvesActions.length > 0 && (
                  <div className="mb-2 p-2 bg-red-900/30 border border-red-500 rounded text-left text-xs">
                    <p className="font-bold text-red-300 mb-1">{t.messages.wolfTitle}</p>
                    {otherWolvesActions.map((w: any) => (
                      <p key={w.uid}>{getDisplayName(w.uid)}: <span className="font-bold text-white ml-2">{roomData.dayCount === 1 ? (w.action?.fakeRole ? `[${t.roles[w.action.fakeRole as Role]}]` : "...") : (w.action?.targetId ? getDisplayName(w.action.targetId) : "...")}</span></p>
                    ))}
                  </div>
              )}

              {!isAnyActionDone && (isNight || isVoting) && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  {isNight && roomData.dayCount === 1 && myRole === ROLES.WEREWOLF ? (
                    <>
                      <p className="text-xs mb-2 text-slate-300">{t.actions.fakeRole}</p>
                      <div className="grid grid-cols-3 gap-1 mb-2">
                        {FAKE_ROLE_OPTIONS.map(role => (<button key={role} onClick={() => setFakeRole(role)} className={`p-1 text-xs rounded border ${fakeRole === role ? "bg-red-600 border-red-500 text-white font-bold" : "border-slate-600 hover:bg-slate-700"}`}>{t.roles[role as Role]}</button>))}
                      </div>
                      <button onClick={submitNightAction} className="w-full py-2 bg-red-700 rounded-xl font-bold text-sm">{t.actions.decide}</button>
                    </>
                  ) : (
                    <>
                      {isNight && roomData.dayCount === 1 && myRole === ROLES.SEER ? (
                          <div className="mb-2"><p className="text-xs text-yellow-400">{t.messages.firstDaySeer}</p><button onClick={submitNightAction} className="w-full py-2 mt-1 bg-indigo-600 rounded-xl font-bold text-sm">{t.actions.confirm}</button></div>
                      ) : (
                          <>
                            <p className="text-xs mb-2 text-slate-300">{isNight ? ([ROLES.WEREWOLF, ROLES.SEER, ROLES.HUNTER].includes(myRole) ? t.messages.selectTarget : t.actions.sleep) : t.messages.selectExile}</p>
                            {((isNight && [ROLES.WEREWOLF, ROLES.SEER, ROLES.HUNTER].includes(myRole)) || isVoting) && (
                              <div className="grid grid-cols-2 gap-1 mb-2">
                                {aliveMembers.filter((m: string) => m !== userId).map((m: string) => {
                                  const isGuardBan = isNight && myRole === ROLES.HUNTER && roomData.lastGuardedId === m;
                                  return (<button key={m} onClick={() => !isGuardBan && setSelectedTarget(m)} disabled={isGuardBan} className={`p-1 text-xs rounded border flex justify-between ${selectedTarget === m ? "bg-white text-slate-900 font-bold" : "border-slate-600 hover:bg-slate-700"} ${isGuardBan ? "opacity-30 cursor-not-allowed" : ""}`}><span>👤 {getDisplayName(m)}</span></button>);
                                })}
                              </div>
                            )}
                            {isNight && myRole === ROLES.WEREWOLF && roomData.dayCount > 1 && (
                              <div className="flex gap-2 mb-2 text-xs justify-center">{t.messages.priority.map((label: string, idx: number) => (<label key={idx} className="flex items-center gap-1 cursor-pointer"><input type="radio" value={idx} checked={priority === idx} onChange={() => setPriority(idx)} /> {label}</label>))}</div>
                            )}
                            <button onClick={isNight ? submitNightAction : submitVote} disabled={((isNight && [ROLES.WEREWOLF, ROLES.SEER, ROLES.HUNTER].includes(myRole)) || isVoting) && !selectedTarget} className={`w-full py-2 rounded-xl font-bold text-sm ${((isNight && [ROLES.WEREWOLF, ROLES.SEER, ROLES.HUNTER].includes(myRole)) || isVoting) && !selectedTarget ? "bg-slate-600 text-slate-400" : isNight ? "bg-indigo-600" : "bg-red-600"}`}>{isNight ? ([ROLES.WEREWOLF, ROLES.SEER, ROLES.HUNTER].includes(myRole) ? t.actions.nightAction : t.actions.sleep) : t.actions.vote}</button>
                          </>
                      )}
                    </>
                  )}
                </div>
              )}
              {isAnyActionDone && (isNight || isVoting) && <p className="mt-2 text-xs animate-pulse text-slate-400">{t.messages.waiting}</p>}
            </div>
          )}
        </>
      )}

      {isAdVisible && (
        <div className="mt-8 mb-4 w-full flex justify-center">
          <AdRectangle key={adKey} />
        </div>
      )}
    </div>
  );
}