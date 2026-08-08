import React, { useEffect, useRef } from "react";

interface AdSenseSlotProps {
  code?: string;
  slotName: string;
  enableAds: boolean;
  app?: any;
  isSquare?: boolean;
  isBottomBanner?: boolean;
}

export const AdSenseSlot: React.FC<AdSenseSlotProps> = ({ code, slotName, enableAds, isSquare, isBottomBanner }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCode = !!code && code.trim().length > 0 && !code.includes("Placeholder");

  useEffect(() => {
    if (!enableAds || !hasCode || !containerRef.current) return;

    try {
      containerRef.current.innerHTML = "";
      const range = document.createRange();
      const documentFragment = range.createContextualFragment(code);
      containerRef.current.appendChild(documentFragment);

      // Execute scripts in the injected fragment safely
      const scripts = containerRef.current.querySelectorAll("script");
      scripts.forEach((script) => {
        try {
          const newScript = document.createElement("script");
          Array.from(script.attributes).forEach((attr: any) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.async = true;
          newScript.onerror = () => {
            // Silently suppress cross-origin / blocked ad script errors
          };
          if (script.src) {
            newScript.src = script.src;
          } else {
            newScript.text = script.innerHTML;
          }
          script.parentNode?.replaceChild(newScript, script);
        } catch (scriptErr) {
          console.warn("[AdSenseSlot script warning]:", scriptErr);
        }
      });

      // Push adsbygoogle arrays if required
      try {
        const unpushedIns = containerRef.current.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
        if (unpushedIns.length > 0) {
          if (typeof window !== "undefined") {
            if (!(window as any).adsbygoogle) {
              (window as any).adsbygoogle = [];
            }
            ((window as any).adsbygoogle).push({});
          }
        }
      } catch (e) {
        // Ignore push errors as they're handled by adsbygoogle script
      }
    } catch (e) {
      console.warn("Notice in executing AdSense scripts for slot:", slotName, e);
    }
  }, [code, enableAds, hasCode, slotName]);

  if (!enableAds) return null;

  if (hasCode) {
    return (
      <div 
        className={`w-full flex justify-center items-center overflow-hidden ${
          isBottomBanner 
            ? "h-[150px] min-h-[150px] max-h-[150px] my-0 w-full" 
            : isSquare 
            ? "aspect-square w-full h-full" 
            : "my-4"
        }`} 
        id={`adsense-${slotName.replace(/\s+/g, '-')}`}
      >
        <div 
          ref={containerRef} 
          className={`w-full flex justify-center items-center ${isBottomBanner ? "h-[150px] max-h-[150px] overflow-hidden" : "h-full"}`} 
        />
      </div>
    );
  }

  // 📱 Special 150px Full-Width Horizontal Banner Mode for Bottom Stickies (Mobile & Desktop)
  if (isBottomBanner) {
    return (
      <div 
        className="w-full h-[150px] min-h-[150px] max-h-[150px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/98 border-t-2 border-amber-500/50 flex items-center justify-between px-4 sm:px-8 relative select-none overflow-hidden shadow-2xl" 
        id={`adsense-${slotName.replace(/\s+/g, '-')}`}
      >
        {/* Glow Effects */}
        <div className="absolute -top-10 right-1/4 w-72 h-32 bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-72 h-32 bg-indigo-500/15 blur-3xl pointer-events-none" />

        {/* Content: App / Ad Info */}
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 pr-8 sm:pr-0 z-10">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-base sm:text-lg flex flex-col items-center justify-center shadow-xl shadow-amber-500/30 shrink-0 border-2 border-amber-300/60 ring-2 ring-amber-400/20">
            <span>AD</span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider -mt-0.5">Top App</span>
          </div>
          <div className="min-w-0 flex flex-col justify-center text-right space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs bg-amber-500/25 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-500/40 shrink-0">
                إعلان ممول • AdSense
              </span>
              <span className="hidden sm:inline-block text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                موثوق 100%
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-extrabold text-white truncate drop-shadow-sm">
              متجر التطبيقات والألعاب المباشرة المجانية
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 truncate font-medium">
              تصفح وحمل آلاف التطبيقات الحصرية والآمنة بروابط مباشرة وسريعة مع تحديثات فورية
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 pl-1 sm:pl-4 z-10 flex flex-col sm:flex-row items-center gap-2">
          <button 
            type="button"
            className="py-2.5 sm:py-3 px-5 sm:px-7 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap border border-yellow-200/60"
          >
            تثبيت مجاناً 🚀
          </button>
        </div>
      </div>
    );
  }

  // Integrated Ad Card / AdSense Simulator Unit when no custom script is provided
  return (
    <div 
      className={`w-full flex justify-center items-center overflow-hidden ${isSquare ? "aspect-square w-full h-full" : "my-2 w-full"}`} 
      id={`adsense-${slotName.replace(/\s+/g, '-')}`}
    >
      <div className="w-full h-full min-h-[200px] bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between items-center text-center relative group overflow-hidden select-none shadow-md hover:border-amber-500/60 transition-all duration-300">
        
        {/* Ad Badge Header */}
        <div className="w-full flex items-center justify-between gap-2 text-[11px] font-black text-amber-400">
          <span className="bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>إعلان ممول • AdSense</span>
          </span>
          <span className="text-slate-400 font-mono text-[10px] bg-slate-800/80 px-2 py-0.5 rounded">
            {slotName}
          </span>
        </div>

        {/* Ad Content / Illustration */}
        <div className="my-auto py-3 flex flex-col items-center justify-center gap-2">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-lg sm:text-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            AD
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white tracking-tight">
              متجر تطبيقات الأندرويد والآيفون الموثوق
            </h4>
            <p className="text-[11px] text-slate-300 mt-1 max-w-xs line-clamp-2 leading-relaxed font-semibold">
              تصفح وحمل آلاف الألعاب والتطبيقات المباشرة مع فحص أمني شامل مجاني 100%.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full">
          <button 
            type="button"
            className="w-full py-2 sm:py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>عرض المزيد والتحميل الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};

