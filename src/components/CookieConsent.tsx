import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie, ShieldCheck, Settings, Check, X, ShieldAlert, ArrowLeftRight } from "lucide-react";

interface CookieConsentProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onVisibilityChange }) => {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefEssential] = useState(true); // Always required
  const [prefAnalytical, setPrefAnalytical] = useState(true);
  const [prefMarketing, setPrefMarketing] = useState(true);

  useEffect(() => {
    // Check if user already provided cookie consent
    const consent = localStorage.getItem("cookie_consent_accepted");
    if (!consent) {
      // Small delay for natural entrance sensation
      const timer = setTimeout(() => {
        setShow(true);
        if (onVisibilityChange) onVisibilityChange(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      if (onVisibilityChange) onVisibilityChange(false);
    }
  }, [onVisibilityChange]);

  const saveConsent = (essential: boolean, analytical: boolean, marketing: boolean) => {
    const consentData = {
      essential,
      analytical,
      marketing,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem("cookie_consent_accepted", JSON.stringify(consentData));
    setShow(false);
    if (onVisibilityChange) onVisibilityChange(false);
  };

  const handleAcceptAll = () => {
    saveConsent(true, true, true);
  };

  const handleDeclineAll = () => {
    saveConsent(true, false, false);
  };

  const handleSavePreferences = () => {
    saveConsent(true, prefAnalytical, prefMarketing);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-zinc-950/95 backdrop-blur-xl rounded-[28px] border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[9999] overflow-hidden select-none text-white"
          style={{ direction: "rtl" }}
        >
          {/* Symmetrical glowing top badge decoration */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />

          <div className="p-5 sm:p-6 space-y-4">
            {/* Header section */}
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl shrink-0 border border-amber-500/30">
                <Cookie className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-1.5">
                  ملفات تعريف الارتباط والكوكيز
                </h3>
                <p className="text-xs text-zinc-300 font-bold">
                  نهتم بخصوصيتك لتوفير تجربة تصفح آمنة ومخصصة بالكامل.
                </p>
              </div>
            </div>

            {/* General message description or details options */}
            {!showDetails ? (
              <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                نستخدم ملفات الكوكيز (Cookies) لضمان تشغيل الموقع بكفاءة عالية، وتحسين أدائه، وتخصيص تجربة عرض الإعلانات والمحتوى بما يناسب اهتماماتك. يمكنك الموافقة على جميع الملفات أو تعديل خياراتك.
              </p>
            ) : (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-1 border-t border-zinc-900"
              >
                <span className="text-[10px] font-black text-amber-400 block uppercase tracking-wider mb-2">تخصيص ملفات التعريف :</span>
                
                {/* 1. Essential Cookies (Locked Active) */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      الكوكيز الضرورية والأمنية
                      <span className="text-[9px] bg-zinc-800 text-amber-400 px-1.5 py-0.5 rounded-md font-bold">إجباري</span>
                    </span>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">ملفات حتمية لحماية حسابك وتصفح أقسام الموقع واستعادة جلساتك بأمان.</p>
                  </div>
                  <div className="h-6 w-11 bg-amber-500 rounded-full flex items-center justify-end p-1 shadow-xs cursor-not-allowed opacity-80">
                    <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-amber-500 font-bold" />
                    </div>
                  </div>
                </div>

                {/* 2. Analytical Cookies Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-black text-white">الكوكيز التحليلية والتحسينية</span>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">تساعدنا على تحليل عدد الزيارات ومصادر الترافيك لقياس كفاءة وسرعة الخدمة وتطويرها.</p>
                  </div>
                  <button 
                    onClick={() => setPrefAnalytical(!prefAnalytical)}
                    className={`h-6 w-11 rounded-full flex items-center p-1 shadow-xs transition-colors cursor-pointer ${prefAnalytical ? 'bg-amber-500 justify-end' : 'bg-zinc-800 justify-start'}`}
                  >
                    <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center" />
                  </button>
                </div>

                {/* 3. Marketing/Ad Cookies Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="text-xs font-black text-white">الكوكيز الإعلانية والترويجية</span>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">تستخدم لتقديم إعلانات أدسنس مدمجة ملائمة لاهتماماتك ومنع تكرار نفس الإعلان.</p>
                  </div>
                  <button 
                    onClick={() => setPrefMarketing(!prefMarketing)}
                    className={`h-6 w-11 rounded-full flex items-center p-1 shadow-xs transition-colors cursor-pointer ${prefMarketing ? 'bg-amber-500 justify-end' : 'bg-zinc-800 justify-start'}`}
                  >
                    <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Actions Panel Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              {!showDetails ? (
                <>
                  <button
                    onClick={handleAcceptAll}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs shadow-md transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    الموافقة وقبول الجميع
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowDetails(true)}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-[11px] font-black border border-zinc-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      إعدادات الكوكيز
                    </button>
                    <button
                      onClick={handleDeclineAll}
                      className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-[11px] font-black border border-zinc-800 transition-colors cursor-pointer"
                    >
                      رفض الملفات الاختيارية
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSavePreferences}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs shadow-md transition-all duration-200 cursor-pointer text-center"
                  >
                    حفظ وإقرار الاختيارات الحالية
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-xs font-black border border-zinc-800 transition-colors cursor-pointer text-center"
                  >
                    العودة للخلف
                  </button>
                </div>
              )}
            </div>

            {/* Bottom mini privacy note */}
            <div className="text-[9px] text-zinc-400 text-center flex items-center justify-center gap-1 select-none">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>بياناتك مشفرة بالكامل ومتوافقة مع المعايير الدولية لحماية البيانات GDPR</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
