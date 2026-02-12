"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  QrCode, 
  X, 
  Link as LinkIcon 
} from "lucide-react";

// --- 1. Custom Hook: クリップボード管理 ---
// コピー処理と「コピーしました！」の表示状態（2秒後に戻る）を管理
const useClipboard = (timeout = 2000) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn("Clipboard not supported");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return { isCopied, copyToClipboard };
};

// --- 2. Component: 招待QRモーダル ---
interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  roomId: string;
}

const InviteModal = ({ isOpen, onClose, inviteUrl, roomId }: InviteModalProps) => {
  const { isCopied: isUrlCopied, copyToClipboard: copyUrl } = useClipboard();
  const { isCopied: isIdCopied, copyToClipboard: copyId } = useClipboard();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl flex flex-col items-center w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
        >
          <X size={20} className="text-slate-500" />
        </button>

        <h2 className="text-xl font-black mb-1">招待コード</h2>
        <p className="text-slate-500 text-xs font-bold mb-6">SCAN OR COPY</p>
        
        {/* QRコード */}
        <div className="p-3 border-4 border-slate-900 rounded-2xl mb-6 bg-white shadow-sm">
          <QRCodeSVG value={inviteUrl} size={180} />
        </div>
        
        {/* 招待リンクコピー (メインアクション) */}
        <button 
          onClick={() => copyUrl(inviteUrl)}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-3 transition-all active:scale-95 shadow-lg ${
            isUrlCopied 
              ? "bg-green-600 text-white border-green-600" 
              : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}
        >
          {isUrlCopied ? <Check size={18} /> : <LinkIcon size={18} />}
          {isUrlCopied ? "リンクをコピーしました！" : "招待リンクをコピー"}
        </button>

        {/* ルームIDコピー (サブアクション) */}
        <button 
          onClick={() => copyId(roomId)}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <span className="text-slate-400 text-xs">ID:</span>
          <span className="font-mono text-lg tracking-widest">{roomId}</span>
          {isIdCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
};

// --- 3. Component: メインのID表示バッジ ---
interface RoomIdDisplayProps {
  roomId: string;
}

export const RoomIdDisplay = ({ roomId }: RoomIdDisplayProps) => {
  // デフォルトは非表示（配信者モード）
  const [isVisible, setIsVisible] = useState(false);
  const [showQr, setShowQr] = useState(false);
  
  // URL生成 (SSR対策)
  const [inviteUrl, setInviteUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteUrl(`${window.location.origin}/room/${roomId}`);
    }
  }, [roomId]);

  const { isCopied, copyToClipboard } = useClipboard();

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="bg-slate-800 border border-slate-700 pl-4 pr-1 py-1.5 rounded-full shadow-inner flex items-center gap-3 transition-colors hover:border-slate-600">
          
          {/* 左側: ラベルとID表示部 */}
          <div className="flex flex-col items-start min-w-[80px]">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-0.5">
              Room ID
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-mono font-black leading-none ${isVisible ? "text-blue-400" : "text-slate-500 tracking-widest"}`}>
                {isVisible ? roomId : "••••••"}
              </p>
            </div>
          </div>

          {/* 右側: アクションボタン群 */}
          <div className="flex items-center gap-1">
            {/* 1. 表示/非表示切り替え */}
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-all"
              title={isVisible ? "IDを隠す" : "IDを表示"}
            >
              {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            {/* 2. コピーボタン (伏せ字でもコピー可能) */}
            <button
              onClick={() => copyToClipboard(inviteUrl)} // IDではなくURLをコピーする設定
              className={`p-2 rounded-full transition-all ${
                isCopied 
                  ? "bg-green-500/20 text-green-400" 
                  : "hover:bg-slate-700 text-slate-400 hover:text-white"
              }`}
              title="招待リンクをコピー"
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>

            {/* 3. QRコードモーダル起動 */}
            <button
              onClick={() => setShowQr(true)}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all shadow-lg active:scale-95 ml-1"
              title="QRコードを表示"
            >
              <QrCode size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* QRモーダル */}
      <InviteModal 
        isOpen={showQr} 
        onClose={() => setShowQr(false)} 
        inviteUrl={inviteUrl} 
        roomId={roomId}
      />
    </>
  );
};