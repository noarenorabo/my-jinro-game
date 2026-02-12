"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { translations, Language } from "@/lib/i18n";
import { ArrowLeft, Globe, Shield, ExternalLink } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("ja");
  const t = translations[lang];

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-300 font-sans pb-20">
      
      {/* ナビゲーションバー (固定) */}
      <nav className="sticky top-0 z-50 w-full bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
            {t.privacy.back}
          </button>
          
          <button 
            onClick={() => setLang(l => l === "ja" ? "en" : "ja")} 
            className="flex items-center gap-2 text-xs bg-slate-800 border border-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-700 transition-all active:scale-95 text-white"
          >
            <Globe size={14} /> {lang === "ja" ? "English" : "日本語"}
          </button>
        </div>
      </nav>

      {/* コンテンツエリア */}
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
        
        {/* タイトルカード */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl mb-8 flex flex-col items-center text-center relative overflow-hidden">
          {/* 背景装飾 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <Shield className="text-emerald-500 w-12 h-12 mb-4" />
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide z-10">
            {t.privacy.title}
          </h1>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest z-10">Last Updated: 2026.02</p>
        </div>
        
        {/* 本文 (HTMLレンダリング) */}
        <div className="bg-slate-900/50 p-6 md:p-10 rounded-3xl border border-slate-800 shadow-lg">
          <div 
            dangerouslySetInnerHTML={{ __html: t.privacy.content }}
          />
        </div>

        {/* フッターコピーライト */}
        <div className="mt-12 text-center text-[10px] text-slate-600 uppercase tracking-widest">
          {t.footer.copyright}
        </div>
      </div>
    </main>
  );
}