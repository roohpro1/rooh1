import React, { useState } from 'react';
import { Link2, Check, Share2 } from 'lucide-react';
import { AppReview } from '../types';

interface CopyLinkButtonProps {
  app: AppReview;
  className?: string;
  variant?: 'button' | 'icon' | 'badge';
  label?: string;
}

export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({
  app,
  className = '',
  variant = 'button',
  label = 'نسخ الرابط الفريد'
}) => {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const siteUrl = typeof window !== 'undefined' ? (window.location.hostname.includes('rooh') ? 'https://roohpro.com' : window.location.origin) : 'https://roohpro.com';
    const rawSlug = app.cleanSlug || app.slug || app.appCode || (/^\d{5}$/.test(app.id) ? app.id : app.packageId || app.id);
    let cleanSlug = String(rawSlug).split('?')[0].split('#')[0].replace(/\.html$/i, "").replace(/-review$/i, "").trim();
    if (cleanSlug.startsWith("app/")) cleanSlug = cleanSlug.replace(/^app\//, "");
    
    // Construct dynamic clean share link (e.g. https://roohpro.com/app/wats)
    const dynamicLink = `${siteUrl}/app/${cleanSlug}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(dynamicLink);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = dynamicLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setShowToast(true);

      setTimeout(() => setCopied(false), 2500);
      setTimeout(() => setShowToast(false), 3500);
    } catch (err) {
      console.error('Failed to copy dynamic link:', err);
    }
  };

  if (variant === 'icon') {
    return (
      <div className="relative inline-block">
        <button
          onClick={handleCopyLink}
          title="نسخ الرابط الفريد للمقال والتطبيق"
          className={`p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-amber-500/10 hover:border-amber-500/50 text-slate-700 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-400 transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center ${className}`}
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
          ) : (
            <Link2 className="w-4 h-4 text-amber-500" />
          )}
        </button>

        {showToast && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-black shadow-lg animate-fade-in flex items-center gap-1.5 pointer-events-none">
            <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
            <span>تم نسخ الرابط بنجاح! 🔗</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className="relative inline-block">
        <button
          onClick={handleCopyLink}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95 cursor-pointer ${className}`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
              <span className="text-emerald-600 dark:text-emerald-400">تم النسخ!</span>
            </>
          ) : (
            <>
              <Link2 className="w-3.5 h-3.5 text-amber-500" />
              <span>رابط فريد 🔗</span>
            </>
          )}
        </button>

        {showToast && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-black shadow-lg animate-fade-in flex items-center gap-1.5 pointer-events-none">
            <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
            <span>تم نسخ رابط المقال والصفحة بنجاح! 🔗</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block w-full sm:w-auto">
      <button
        onClick={handleCopyLink}
        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 hover:border-amber-500/60 text-slate-900 dark:text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer ${className}`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
            <span className="text-emerald-600 dark:text-emerald-400 font-black">تم نسخ الرابط بنجاح! 🔗</span>
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{label}</span>
            <Share2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </>
        )}
      </button>

      {showToast && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 px-3.5 py-2 rounded-xl bg-slate-950 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black shadow-xl animate-fade-in flex items-center gap-2 border border-slate-800 dark:border-zinc-200 pointer-events-none">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
          <span>تم نسخ رابط التطبيق والمقال الفريد، يمكنك الآن مشاركته! 🔗</span>
        </div>
      )}
    </div>
  );
};
