import React from "react";
import { X, Shield, ChevronLeft, Flame, MessageSquarePlus, MessageCircle, Facebook, Youtube, Instagram, AlertTriangle, Music, Ghost, Twitter } from "lucide-react";
import { GlobalSettings } from "../types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onNavigate: (view: "home" | "admin" | "privacy" | "app") => void;
  globalSettings: GlobalSettings;
  onRequestAppClick: () => void;
  onComplaintsClick: () => void;
  onAboutClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  onNavigate,
  globalSettings,
  onRequestAppClick,
  onComplaintsClick,
  onAboutClick
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <aside 
        className="fixed bottom-0 right-0 top-0 z-50 w-80 max-w-xs bg-white dark:bg-[#0b0f19] p-6 shadow-2xl flex flex-col justify-between transition-all duration-300 ease-out transform border-l-2 border-slate-200 dark:border-zinc-800 overflow-y-auto"
        style={{ direction: "rtl" }}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-slate-200 dark:border-zinc-850">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black shadow-md shadow-blue-500/20">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-black dark:text-white text-lg">قائمة التصنيفات</span>
            </div>
            <button 
              onClick={onClose}
              className="rounded-xl p-2 text-black hover:bg-slate-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white focus:outline-none transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Categories Title in Pure Black */}
          <div className="mb-3">
            <span className="text-sm font-black text-black dark:text-slate-300 tracking-wider uppercase block">قائمة التصنيفات</span>
          </div>

            {/* Categories list */}
            <nav className="space-y-1.5 mb-6">
              <button
                onClick={() => {
                  onSelectCategory(null);
                  onNavigate("home");
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-base transition-all cursor-pointer active:scale-95 ${
                  selectedCategory === null
                    ? "bg-blue-100 dark:bg-blue-950/50 text-black dark:text-blue-400 font-black border-2 border-blue-600 dark:border-blue-900/50 shadow-xs"
                    : "text-black dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900/60 hover:text-blue-700 dark:hover:text-white font-black"
                }`}
              >
                <span className="text-black dark:text-white font-black">جميع التطبيقات</span>
                <ChevronLeft className={`w-4 h-4 transition-transform ${selectedCategory === null ? "translate-x-1 text-black dark:text-blue-400" : "text-black"}`} />
              </button>

              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    onSelectCategory(category);
                    onNavigate("home");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-base transition-all cursor-pointer active:scale-95 ${
                    selectedCategory === category
                      ? "bg-blue-100 dark:bg-blue-950/50 text-black dark:text-blue-400 font-black border-2 border-blue-600 dark:border-blue-900/50 shadow-xs"
                      : "text-black dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900/60 hover:text-blue-700 dark:hover:text-white font-black"
                  }`}
                >
                  <span className="text-black dark:text-white font-black">{category}</span>
                  <ChevronLeft className={`w-4 h-4 transition-transform ${selectedCategory === category ? "translate-x-1 text-black dark:text-blue-400" : "text-black"}`} />
                </button>
              ))}
            </nav>

          {/* About Us Quick Button */}
          <div className="mb-4 pt-1">
            <button
              onClick={onAboutClick}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 duration-150"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm">✨</span>
                <span>من نحن - بوابة اكتشف تطبيقك</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-white/80 animate-pulse" />
            </button>
          </div>

          {/* Website Social Media Section */}
          <div className="mb-4 border-t-2 border-slate-100 dark:border-slate-800 pt-4">
            <span className="text-xs font-black text-black dark:text-slate-300 tracking-wider uppercase block mb-3">وسائل التواصل الخاصة بالموقع</span>
            
            <div className="border-2 border-blue-500 border-l-red-500 dark:border-slate-800 p-2.5 rounded-2xl bg-white dark:bg-transparent shadow-xs">
              <div className="grid grid-cols-3 gap-2">
                {/* Facebook */}
                <a 
                  href={globalSettings.facebookUrl || "#"} 
                  target={globalSettings.facebookUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 border-2 active:scale-95 ${
                    globalSettings.facebookUrl 
                      ? "bg-blue-50 dark:bg-blue-500/10 border-blue-400 border-l-red-400 dark:border-blue-500/30 text-blue-900 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:scale-105 shadow-xs" 
                      : "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                  title="فيسبوك"
                >
                  <Facebook className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-black text-black dark:text-white mt-1">فيسبوك</span>
                </a>

                {/* YouTube */}
                <a 
                  href={globalSettings.youtubeUrl || "#"} 
                  target={globalSettings.youtubeUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 border-2 active:scale-95 ${
                    globalSettings.youtubeUrl 
                      ? "bg-red-50 dark:bg-red-500/10 border-blue-400 border-l-red-400 dark:border-red-500/30 text-red-900 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:scale-105 shadow-xs" 
                      : "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                  title="يوتيوب"
                >
                  <Youtube className="w-5 h-5 text-red-600" />
                  <span className="text-[10px] font-black text-black dark:text-white mt-1">يوتيوب</span>
                </a>

                {/* Snapchat */}
                <a 
                  href={globalSettings.snapchatUrl || "#"} 
                  target={globalSettings.snapchatUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 border-2 active:scale-95 ${
                    globalSettings.snapchatUrl 
                      ? "bg-amber-50 dark:bg-amber-400/10 border-blue-400 border-l-red-400 dark:border-amber-400/30 text-amber-950 dark:text-yellow-400 hover:bg-amber-100 dark:hover:bg-amber-400/20 hover:scale-105 shadow-xs" 
                      : "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                  title="سناب شات"
                >
                  <Ghost className="w-5 h-5 text-amber-500" />
                  <span className="text-[10px] font-black text-black dark:text-white mt-1">سناب</span>
                </a>

                {/* WhatsApp */}
                <a 
                  href={globalSettings.whatsappUrl || "#"} 
                  target={globalSettings.whatsappUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 border-2 active:scale-95 ${
                    globalSettings.whatsappUrl 
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-blue-400 border-l-red-400 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:scale-105 shadow-xs" 
                      : "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                  title="واتساب"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-[10px] font-black text-black dark:text-white mt-1">واتساب</span>
                </a>

                {/* X / Twitter */}
                <a 
                  href={globalSettings.xUrl || "#"} 
                  target={globalSettings.xUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 border-2 active:scale-95 ${
                    globalSettings.xUrl 
                      ? "bg-slate-100 dark:bg-slate-900/40 border-blue-400 border-l-red-400 dark:border-slate-700 text-black dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-900/60 hover:scale-105 shadow-xs" 
                      : "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                  title="إكس / تويتر"
                >
                  <Twitter className="w-5 h-5 text-slate-900 dark:text-slate-100" />
                  <span className="text-[10px] font-black text-black dark:text-white mt-1">إكس</span>
                </a>

                {/* TikTok */}
                <a 
                  href={globalSettings.tiktokUrl || "#"} 
                  target={globalSettings.tiktokUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 border-2 active:scale-95 ${
                    globalSettings.tiktokUrl 
                      ? "bg-rose-50 dark:bg-cyan-500/10 border-blue-400 border-l-red-400 dark:border-rose-500/20 text-rose-950 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 hover:scale-105 shadow-xs" 
                      : "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                  title="تيك توك"
                >
                  <Music className="w-5 h-5 text-rose-600" />
                  <span className="text-[10px] font-black text-black dark:text-white mt-1">تيك</span>
                </a>
              </div>
            </div>
          </div>

          {/* Contact & Help Section */}
          <div className="mb-3 border-t-2 border-slate-100 dark:border-slate-800 pt-4">
            <span className="text-xs font-black text-black dark:text-slate-400 tracking-wider uppercase">تواصل ومساعدة</span>
          </div>
          <nav className="space-y-1 mb-6">
            {/* About Us Menu Button */}
            <button
              onClick={onAboutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-black text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-blue-600 dark:hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <span className="text-lg w-5 h-5 flex items-center justify-center">✨</span>
              <span>من نحن (رؤيتنا البشرية)</span>
            </button>

            {/* Request App Button */}
            <button
              onClick={onRequestAppClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-black text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-indigo-600 dark:hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <MessageSquarePlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>طلب تطبيق جديد</span>
            </button>

            {/* Complaints Button */}
            <button
              onClick={onComplaintsClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-black text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-rose-600 dark:hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>تقديم شكوى أو مقترح</span>
            </button>
          </nav>
        </div>

        {/* Bottom links */}
        <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-4 space-y-2">
          
          <button
            onClick={() => {
              onNavigate("privacy");
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-black text-black dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-blue-600 dark:hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <Shield className="w-5 h-5 text-blue-600 dark:text-slate-500" />
            <span>سياسة الخصوصية</span>
          </button>

          <div className="text-center pt-3 border-t border-slate-100 dark:border-slate-800/50 mt-2">
            <p className="text-[10px] text-black dark:text-slate-400 font-black">© {new Date().getFullYear()} اكتشف تطبيقك</p>
            <p className="text-[9px] text-black dark:text-slate-600 font-black mt-1">متوافق مع شروط Google AdSense</p>
          </div>
        </div>
      </aside>
    </>
  );
};
