import React from "react";
import { Star, ArrowLeft, CheckCircle2, Copy, Check } from "lucide-react";
import { AppReview } from "../types";
import { CopyLinkButton } from "./CopyLinkButton";

interface AppCardProps {
  app: AppReview;
  onViewDetails: (id: string) => void;
  isSquareDesktop?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({ app, onViewDetails, isSquareDesktop }) => {
  const [copied, setCopied] = React.useState(false);

  // Deterministic codes and downloads so existing database items look full and highly realistic
  const appCode = app.appCode || (Math.floor((app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 900) + 100)).toString();
  const downloadsCount = app.downloadsCount || (Math.floor((app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 15) + 15) * 10000);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(appCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render stars based on rating
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-0.5" style={{ direction: "ltr" }}>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />;
          } else if (i === fullStars && hasHalf) {
            return (
              <div key={i} className="relative w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400">
                <Star className="absolute inset-0 w-full h-full text-slate-200 dark:text-slate-800" />
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                </div>
              </div>
            );
          } else {
            return <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-200 dark:text-slate-800" />;
          }
        })}
      </div>
    );
  };

  return (
    <div 
      className={`group relative flex flex-col justify-between bg-white dark:bg-zinc-950 rounded-2xl border-2 border-amber-300/80 dark:border-amber-500/40 hover:border-amber-400 dark:hover:border-amber-400 p-4 sm:p-5 pt-8 sm:pt-9 shadow-xs hover:shadow-md transition-all duration-300 w-full min-w-0 ${
        isSquareDesktop ? "md:aspect-square md:p-4 md:pt-6 md:flex-col md:items-center md:justify-between md:text-center" : ""
      }`}
      style={{ direction: "rtl" }}
    >
      {/* أزرار النسخ والربط - أعلى اليمين وأعلى اليسار مع إطارات رفيعة زرقاء وحمراء */}
      <div className="absolute top-2.5 right-2.5 left-2.5 z-10 flex items-center justify-between pointer-events-auto">
        <CopyLinkButton app={app} variant="icon" />

        <button 
          onClick={handleCopyCode}
          className="p-1.5 text-black bg-amber-200 hover:bg-amber-300 border border-blue-500 border-l-rose-500 rounded-lg transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center font-black"
          title="انقر لنسخ رمز التطبيق"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 stroke-[3]" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-950 shrink-0 stroke-[2.5]" />
          )}
        </button>
      </div>

      <div className={`flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 w-full min-w-0 ${
        isSquareDesktop ? "md:flex-col md:items-center md:text-center md:gap-2.5 md:my-auto" : ""
      }`}>
        {/* App Icon */}
        <div 
          onClick={() => onViewDetails(app.id)}
          className={`relative rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-amber-300/70 dark:border-amber-500/40 overflow-hidden group-hover:scale-105 transition-transform duration-300 shrink-0 cursor-pointer shadow-xs ${
          isSquareDesktop 
            ? "h-20 w-20 sm:h-24 sm:w-24 min-w-[80px] sm:min-w-[96px] md:h-20 md:w-20 md:min-w-[80px] lg:h-24 lg:w-24 lg:min-w-[96px]" 
            : "h-20 w-20 sm:h-24 sm:w-24 min-w-[80px] sm:min-w-[96px]"
        }`}>
          {app.iconUrl && app.iconUrl.trim() !== "" ? (
            <img 
              src={app.iconUrl} 
              alt={app.name} 
              className="h-full w-full object-cover" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const next = target.nextElementSibling as HTMLElement;
                if (next) next.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="flex h-full w-full items-center justify-center bg-amber-100 dark:bg-amber-950/40 text-black dark:text-amber-300 font-black text-xl"
            style={{ display: (app.iconUrl && app.iconUrl.trim() !== "") ? 'none' : 'flex' }}
          >
            {app.name ? app.name.charAt(0) : "A"}
          </div>
        </div>

        {/* Content details with cheerful badges and black text */}
        <div className={`flex-1 min-w-0 w-full text-center sm:text-right ${
          isSquareDesktop ? "md:text-center md:flex md:flex-col md:items-center" : ""
        }`}>
          <div className={`flex flex-wrap justify-center sm:justify-start items-center gap-1.5 ${
            isSquareDesktop ? "md:justify-center" : ""
          }`}>
            <span className="inline-block px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-black bg-gradient-to-r from-blue-100 to-rose-100 border border-blue-500 border-l-rose-500 rounded-md truncate max-w-full shadow-3xs">
              {app.category}
            </span>
            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-black bg-emerald-100 border border-emerald-500 border-r-rose-400 px-2 py-0.5 rounded-md font-black shadow-3xs">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
              <span>موثوق</span>
            </span>
          </div>

          <h3 
            onClick={() => onViewDetails(app.id)}
            className="mt-2 text-sm sm:text-base md:text-[17px] font-black text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 break-all cursor-pointer"
          >
            {app.name.split(/[-:|–]/)[0].trim()}
          </h3>

          <div className={`mt-1.5 flex items-center justify-center sm:justify-start gap-1.5 ${
            isSquareDesktop ? "md:justify-center" : ""
          }`}>
            {renderStars(app.rating)}
            <span className="text-xs sm:text-sm text-black dark:text-white font-black bg-amber-200 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-400 dark:border-amber-500/40">
              {app.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Trigger */}
      <div className="mt-3 w-full shrink-0">
        <button 
          onClick={() => onViewDetails(app.id)}
          className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-black text-black bg-yellow-400 hover:bg-yellow-300 px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer w-full shadow-[0_0_12px_rgba(234,179,8,0.3)] hover:shadow-[0_0_18px_rgba(234,179,8,0.6)] border border-yellow-500 dark:border-yellow-400/40 hover:scale-[1.01] active:scale-95 duration-200"
        >
          <span className="text-black font-black">عرض التفاصيل</span>
          <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5] text-black" />
        </button>
      </div>
    </div>
  );
};
