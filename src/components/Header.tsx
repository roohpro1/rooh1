import React, { useState, useEffect, useRef } from "react";
import { Menu, Search, Smartphone, Award, Star, Sparkles, ChevronLeft, Globe, Sun, Moon, Home, UploadCloud, CheckCircle2, Download, Share2, PlusSquare, X, Bell } from "lucide-react";
import { AppReview } from "../types";
import { promptPwaInstall, isStandaloneMode } from "../lib/pwaInstaller";

interface HeaderProps {
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onToggleSidebar: () => void;
  onNavigate: (view: "home" | "admin" | "privacy" | "app", id?: string) => void;
  currentView: string;
  onLogoClick?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  currentLang?: "ar" | "en";
  onToggleLanguage?: () => void;
  onSubscribeClick: () => void;
  appsList?: AppReview[];
  onTriggerSearchAndScrape?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchChange,
  searchQuery,
  onToggleSidebar,
  onNavigate,
  currentView,
  onLogoClick,
  isDarkMode = true,
  onToggleDarkMode,
  currentLang = "ar",
  onToggleLanguage,
  onSubscribeClick,
  appsList = [],
  onTriggerSearchAndScrape
}) => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [hasSubscribed, setHasSubscribed] = useState(() => {
    return typeof localStorage !== "undefined" && localStorage.getItem("user_subscribed") === "true";
  });

  const handleSubscribeAction = () => {
    setHasSubscribed(true);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("user_subscribed", "true");
    }
    promptPwaInstall(() => setShowIosGuide(true));
    if (onSubscribeClick) onSubscribeClick();
  };

  // Check if mobile or desktop
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const matchesMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobileDevice(matchesMobile || isSmallScreen);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get matching apps based on English/Arabic search in description, tags, category and details
  const getSuggestions = () => {
    if (!searchQuery || searchQuery.trim().length === 0) return [];
    
    // Normalize text for Arabic search
    const normalize = (txt: string) => 
      txt.toLowerCase()
        .replace(/[\u064B-\u0652]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .trim();

    const query = normalize(searchQuery);
    const queryWords = query.split(/\s+/).filter(Boolean);

    return appsList.filter((app) => {
      const normName = normalize(app.name);
      const normDesc = normalize(app.description);
      const normCat = normalize(app.category);
      const normTags = app.tags.map(t => normalize(t)).join(" ");
      const appCode = app.appCode || (Math.floor((app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 900) + 100)).toString();
      const normCode = normalize(appCode);
      const normId = normalize(app.id);

      // Instant match on barcode/code or package ID
      if (normCode === query || appCode.toLowerCase().trim() === searchQuery.toLowerCase().trim()) return true;
      if (normId === query || app.id.toLowerCase().trim() === searchQuery.toLowerCase().trim()) return true;

      const combined = `${normName} ${normCat} ${normTags} ${normDesc} ${normCode} ${normId}`;

      return queryWords.length > 0 && queryWords.every(w => combined.includes(w));
    }).slice(0, 6); // display up to 6 smart suggestions
  };

  const suggestions = getSuggestions();

  // Dynamic header styles according to Dark / White mode
  const headerTheme = isDarkMode 
    ? {
        row1: "bg-black/95 border-b border-zinc-800 text-white",
        row2: "bg-zinc-950/95 border-b border-zinc-800",
        input: "bg-slate-900 border-2 border-blue-500 text-white font-black placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-900/40",
      }
    : {
        row1: "bg-white/95 border-b border-slate-200 text-slate-900 shadow-xs",
        row2: "bg-slate-50/95 border-b border-slate-200",
        input: "bg-white border-2 border-blue-600 hover:border-blue-700 text-black font-black placeholder:text-slate-600 focus:border-blue-700 focus:ring-2 focus:ring-blue-300/50 shadow-sm",
      };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md transition-all duration-300">
      {/* Row 1: Logo, Site Name, Theme Switcher Button, and Language Switcher */}
      <div className={`w-full border-b transition-colors duration-300 ${headerTheme.row1}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          
          {/* Right side: Menu button, Logo & Site name */}
          <div className="flex items-center gap-3">
            {/* Burger/Sidebar Trigger */}
            <button
              onClick={onToggleSidebar}
              id="toggle-sidebar-btn"
              className={`rounded-lg p-2 focus:outline-none transition-colors cursor-pointer ${
                isDarkMode
                  ? "text-zinc-300 hover:bg-zinc-900/50 hover:text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
              title="القائمة والتصنيفات"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Site Logo - clicking any part triggers secret access */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (onLogoClick) onLogoClick();
                else onNavigate("home");
              }} 
              className="flex cursor-pointer items-center gap-2 select-none animate-in fade-in slide-in-from-right-3 duration-300"
              title="انقر 5 مرات للدخول السري"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-200 dark:shadow-blue-900/20 text-white font-bold text-lg active:scale-95 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black tracking-tight text-sm sm:text-base leading-none text-black dark:text-white">اكتشف تطبيقك</span>
                <span className="text-[10px] text-slate-800 dark:text-zinc-300 font-black leading-none mt-1">مراجعات وتحميل آمن</span>
              </div>
            </div>
          </div>

          {/* Left side: Compact Theme Switcher (Icon Only) & Sync Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* 🌓 Direct Single Theme Switcher Button - ICON ONLY */}
            <button
              onClick={onToggleDarkMode}
              id="theme-toggle-btn"
              className={`flex items-center justify-center p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 shadow-xs shrink-0 border ${
                isDarkMode
                  ? "bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 border-zinc-700 hover:border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-300 hover:border-indigo-400 shadow-xs"
              }`}
              title={isDarkMode ? "التبديل إلى الوضع الأبيض (Light Mode)" : "التبديل إلى الوضع الداكن (Dark Mode)"}
              aria-label={isDarkMode ? "التبديل إلى الوضع الأبيض" : "التبديل إلى الوضع الداكن"}
            >
              {isDarkMode ? (
                <div className="flex items-center gap-1">
                  {/* Colorful mini dots representing cheerful color accents */}
                  <div className="flex items-center -space-x-0.5 space-x-reverse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  </div>
                  <Sun className="w-4 h-4 text-amber-400 animate-spin-slow shrink-0" />
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="flex items-center -space-x-0.5 space-x-reverse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  </div>
                  <Moon className="w-4 h-4 text-indigo-700 shrink-0" />
                </div>
              )}
            </button>

            {/* Sync / Upload Changes Button */}
            <button
              onClick={() => {
                if (onToggleLanguage) onToggleLanguage();
                alert("⚡ تم توثيق وحفظ جميع الملفات! جاهز للتصدير والمزامنة مباشرة عبر قائمة الإعدادات (Export to GitHub).");
              }}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer focus:outline-none select-none active:scale-95 shrink-0 shadow-xs bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-300 border border-emerald-500/30"
              title="رفع وتأكيد كافة التعديلات الأخيرة إلى GitHub"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>مزامنة</span>
            </button>
          </div>

        </div>
      </div>

      {/* Row 2: Dynamic Action Button (Subscribe on Home, Home on other pages) & Elevated Search Box */}
      <div className={`w-full border-b py-3 transition-colors duration-300 ${headerTheme.row2}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between gap-3">
          
          {/* Right/Main action group: 
              - If on Home view: Show Subscribe button (اشتراك)
              - If on other views (app details, admin, privacy): Show Home button (الرئيسية)
          */}
          <div className="flex items-center gap-2 shrink-0">
            {currentView === "home" ? (
              <button
                onClick={handleSubscribeAction}
                id="header-subscribe-btn"
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black text-white shadow-lg active:scale-95 transition-all cursor-pointer shrink-0 border ${
                  hasSubscribed
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 border-emerald-400/40"
                    : "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/30 border-red-400/40 animate-pulse"
                }`}
                title="اشترك وتحميل التطبيق على الهاتف أو الكمبيوتر"
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span>اشتراك</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate("home")}
                  id="header-home-btn"
                  className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-md shadow-yellow-400/30 border border-yellow-300 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="العودة إلى الصفحة الرئيسية"
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span>الرئيسية</span>
                </button>
                <button
                  onClick={handleSubscribeAction}
                  id="header-page-subscribe-btn"
                  className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black text-white shadow-lg active:scale-95 transition-all cursor-pointer shrink-0 border ${
                    hasSubscribed
                      ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 border-emerald-400/40"
                      : "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/30 border-red-400/40 animate-pulse"
                  }`}
                  title="اشترك وتحميل التطبيق على الهاتف أو الكمبيوتر"
                >
                  <Bell className="w-4 h-4 shrink-0" />
                  <span>اشتراك</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Bar Input elevated with Autocomplete suggestions */}
          <div ref={searchContainerRef} className="flex-1 max-w-md relative">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim() && onTriggerSearchAndScrape) {
                  onTriggerSearchAndScrape(searchQuery);
                  setShowSuggestions(false);
                }
              }}
              className="relative"
            >
              <input
                type="text"
                placeholder="ابحث باسم التطبيق أو اشرح الميزة المطلوب العثور عليها..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowSuggestions(true);
                  if (currentView !== "home" && currentView !== "app") {
                    onNavigate("home");
                  }
                }}
                className={`w-full text-right rounded-xl py-2 pl-4 pr-10 text-xs sm:text-sm outline-none transition-all ${headerTheme.input}`}
              />
              <button
                type="submit"
                className="absolute right-2.5 top-2 p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
                title="بحث"
              >
                <Search className="h-4 w-4 stroke-[2.5]" />
              </button>
            </form>

            {/* Suggestions Dropdown panel */}
            {showSuggestions && searchQuery.trim() !== "" && (
              <div 
                className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-250/80 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ direction: "rtl" }}
              >
                <div className="p-3 bg-slate-50/60 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800/60 flex justify-between items-center">
                  <span className="text-[10px] font-black text-black dark:text-zinc-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    نتائج البحث المقترحة ({suggestions.length})
                  </span>
                  <span className="text-[9px] font-black text-black dark:text-blue-400">مراجعات رسمية حية</span>
                </div>

                {suggestions.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-xs font-black text-black dark:text-zinc-300">لم نعثر على مطابقة دقيقة للاسم في المراجعات المنشورة</p>
                    <p className="text-[10px] text-black dark:text-zinc-400 mt-1 font-black">سوف يتم البحث عن التطبيق وإعداده داخل الموقع حالا عند الضغط على الزر أدناه!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-[320px] overflow-y-auto">
                    {suggestions.map((app) => (
                      <div
                        key={`suggestion-${app.id}`}
                        onClick={() => {
                          onNavigate("app", app.id);
                          setShowSuggestions(false);
                        }}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Mini Icon */}
                          <div className="h-9 w-9 min-w-[36px] rounded-lg border border-slate-100 dark:border-zinc-800 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-zinc-900 shrink-0">
                            {app.iconUrl && app.iconUrl.trim() !== "" ? (
                              <img 
                                src={app.iconUrl} 
                                alt="" 
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-xs font-bold text-blue-500">{app.name.charAt(0)}</span>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex flex-col text-right justify-center overflow-hidden">
                            <span className="text-xs font-black text-black dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {app.name}
                            </span>
                            <span className="text-[9px] text-black dark:text-zinc-400 font-black mt-0.5 flex items-center gap-1.5">
                              <span>{app.category}</span>
                              <span className="text-slate-300 dark:text-zinc-800">•</span>
                              <span className="flex items-center text-amber-500">
                                <Star className="w-2.5 h-2.5 fill-amber-500 mr-0.5" />
                                {app.rating.toFixed(1)}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Navigation indicator */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                          <ChevronLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Real-time search scraper call CTA */}
                <div className="p-3 bg-blue-50/20 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    onClick={() => {
                      if (onTriggerSearchAndScrape) {
                        onTriggerSearchAndScrape(searchQuery);
                        setShowSuggestions(false);
                      }
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>سوف يتم البحث عنه داخل الموقع حالا ⚡</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* iOS Safari PWA Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-right text-white">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-white">تثبيت تطبيق منصة روح على الآيفون 📱</h3>
                <p className="text-xs text-slate-400">تطبيق حقيقي بدون شريط متصفح وبأيقونة على الشاشة الرئيسية</p>
              </div>
            </div>

            <div className="space-y-3 my-5 text-xs font-semibold leading-relaxed text-slate-200">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                <p>اضغط على زر المشاركة <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 text-blue-400 font-bold"><Share2 className="w-3.5 h-3.5 inline ml-1" /> مشاركة</span> في أسفل متصفح Safari.</p>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                <p>مرر للأسفل واختر <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 text-amber-400 font-bold"><PlusSquare className="w-3.5 h-3.5 inline ml-1" /> الإضافة إلى الشاشة الرئيسية</span>.</p>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                <p>اضغط على <span className="font-black text-emerald-400">"إضافة" (Add)</span> في أعلى اليمين، وسيعمل التطبيق فوراً بشاشة كاملة (Full Screen)! 🚀</p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg transition-all cursor-pointer"
            >
              فهمت ذلك، إغلاق الدليل 👍
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
