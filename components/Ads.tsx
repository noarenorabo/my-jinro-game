"use client";

import { useEffect } from "react";

// 実行環境が本番か開発かを判定
// 'npm run dev' の時は false, Vercelなどでデプロイされた本番環境では true になります
const isProd = process.env.NODE_ENV === "production";

// あなたのAdSenseパブリッシャーID (共通)
const AD_CLIENT_ID = "ca-pub-XXXXXXXXXXXXXXXX"; 

// 広告ユニットID (AdSense管理画面で作成して書き換えてください)
const AD_SLOT_RECTANGLE = "1234567890"; // レクタングル用
const AD_SLOT_ANCHOR = "0987654321";    // アンカー用

// TypeScriptのエラー回避用
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

/**
 * 開発環境用のプレースホルダーコンポーネント
 * 誤クリック防止のため、あえて広告っぽくないデザインにしています
 */
const AdPlaceholder = ({ type, label }: { type: "rectangle" | "anchor"; label: string }) => {
  if (type === "rectangle") {
    return (
      <div className="my-8 flex flex-col items-center animate-fade-in opacity-70">
        <span className="text-[10px] text-slate-500 mb-1 tracking-widest">AD SAMPLE (DEV)</span>
        <div className="w-[300px] h-[250px] bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-400 text-sm shadow-lg rounded-xl">
          <div className="text-center p-4">
            <p className="font-bold mb-2 text-yellow-500">🚧 {label}</p>
            <p className="text-xs text-slate-500">本番環境ではここに<br/>AdSenseが表示されます</p>
            <p className="text-[10px] mt-4 font-mono text-slate-600">300x250 unit</p>
          </div>
        </div>
      </div>
    );
  }

  // アンカー用プレースホルダー
  return (
    <div className="fixed bottom-0 left-0 w-full h-[60px] bg-slate-900/90 border-t-2 border-dashed border-yellow-600/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="text-center">
        <p className="text-xs font-bold text-yellow-500">🚧 {label} (DEV MODE)</p>
        <span className="text-[8px] text-slate-500">画面下固定・高さ自動調整</span>
      </div>
    </div>
  );
};

/**
 * レクタングル広告 (300x250)
 * 議論画面などで使用
 */
export const AdRectangle = () => {
  // 開発環境なら見本を表示
  if (!isProd) return <AdPlaceholder type="rectangle" label="レクタングル広告" />;

  // 本番用 AdSense
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className="my-8 flex flex-col items-center animate-fade-in min-h-[250px]">
      <span className="text-[10px] text-slate-500 mb-1 tracking-widest">SPONSORED</span>
      <ins
        className="adsbygoogle"
        style={{ display: "inline-block", width: "300px", height: "250px" }}
        data-ad-client={AD_CLIENT_ID}
        data-ad-slot={AD_SLOT_RECTANGLE}
      ></ins>
    </div>
  );
};

/**
 * アンカー広告 (画面下固定)
 * ロビーや投票画面などで使用
 */
export const AdAnchor = () => {
  // 開発環境なら見本を表示
  if (!isProd) return <AdPlaceholder type="anchor" label="アンカー広告" />;

  // 本番用 AdSense
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className="w-full flex justify-center bg-black/20">
      {/* アンカー広告の場合、AdSense側で自動的に高さが調整されるため
        styleに固定の高さを指定しないのが一般的ですが、
        デザイン崩れ防止のために最低高さを確保するケースもあります。
        ここではレスポンシブ設定としています。
      */}
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", maxHeight: "100px" }}
        data-ad-client={AD_CLIENT_ID}
        data-ad-slot={AD_SLOT_ANCHOR}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};