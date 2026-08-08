import React, { useState, useEffect, useRef } from "react";
import { safeFetchJson } from "../lib/fetchUtils";
import {
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Check,
  Volume2,
  VolumeX,
  Play,
  Square,
  MessageSquare,
  Sparkles,
  Bot,
  Send,
  Zap,
  Wrench,
  RotateCcw
} from "lucide-react";
import { WindowCopyButton } from "./WindowCopyButton";
import { DeveloperAgentChat } from "./DeveloperAgentChat";

interface TabAiDiagnosticsProps {
  tabId?: string;
  tabTitle?: string;
  tabDescription?: string;
  contextData?: any;
  activeTabName?: string;
  getIdTokenHelper?: () => string;
}

const TAB_ID_MAP: Record<string, { id: string; title: string; desc: string }> = {
  appMap: { id: "1001", title: "خريطة التطبيق", desc: "فحص أداء خريطة الخادم والمستودعات وسجلات الأحداث الحية" },
  envManager: { id: "1002", title: "إدارة المفاتيح", desc: "موزع أحمال الـ 10 مفاتيح لـ Groq API والمفاتيح الموزعة" },
  publish: { id: "1003", title: "نشر ومراجعة التطبيقات", desc: "محرك كشط المتاجر وتوليد مقال صحفي 1500+ كلمة بـ Gemini" },
  manage: { id: "1004", title: "إدارة المقالات المنشورة", desc: "تعديل المراجعات والروابط النظيفة الموزعة بالـ Clean Slug" },
  firebaseStatus: { id: "1005", title: "حالة الفايربيز", desc: "مراقبة كوتا قراءات Firestore اليومية وقواعد الأمان" },
  r2Status: { id: "1006", title: "تخزين Cloudflare R2", desc: "مراقبة ملف approved-apps.json والمقالات الاستاتيكية" },
  indexing: { id: "1007", title: "الأرشفة الفورية", desc: "إرسال الأرشفة المباشرة لجوجل وتحديث sitemap.xml" },
  moderate: { id: "1008", title: "اعتماد التطبيقات المعلقة", desc: "مراجعة واعتماد طلبيات المراجعات من الزوار والمستكشف" },
  userSearched: { id: "1009", title: "سجل بحوث الزوار", desc: "أرشيف التطبيقات المستوردة تلقائياً من بحث الزوار" },
  adsense: { id: "1010", title: "إدارة الإعلانات", desc: "إدارة المساحات الإعلانية وأكواد الهيدر والمقالات" },
  notifications: { id: "1011", title: "إشعارات البوش", desc: "بث الإشعارات الحية لجميع المشتركين عبر REST API" },
  requests: { id: "1012", title: "طلبات التطبيقات", desc: "استقبال ومعالجة طلبات الألعاب والتطبيقات المفقودة" },
  reviews: { id: "1013", title: "تقييمات الزوار", desc: "مراقبة وتقييم وتصفية تعليقات الزوار والنجوم" },
  links: { id: "1014", title: "روابط التواصل", desc: "قنوات التليجرام والتواصل وروابط التحميل المباشرة" },
};

export const TabAiDiagnostics: React.FC<TabAiDiagnosticsProps> = ({
  tabId: propTabId,
  tabTitle: propTabTitle,
  tabDescription: propTabDescription,
  contextData,
  activeTabName,
  getIdTokenHelper
}) => {
  const resolvedMeta = activeTabName && TAB_ID_MAP[activeTabName] ? TAB_ID_MAP[activeTabName] : null;
  const tabId = propTabId || resolvedMeta?.id || "1000";
  const tabTitle = propTabTitle || resolvedMeta?.title || activeTabName || "نافذة النظام";
  const tabDescription = propTabDescription || resolvedMeta?.desc || `فحص مباشر للخدمات والربط البرمجي والمفاتيح والتأكد من سلامتها في هذه النافذة`;

  const [isOpen, setIsOpen] = useState(false);
  const [showFullChat, setShowFullChat] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [copiedReport, setCopiedReport] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(true);
  const [isPlayingReportAudio, setIsPlayingReportAudio] = useState(false);
  const [reportAudioBase64, setReportAudioBase64] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleGlobalCopy = (e: any) => {
      if (e.detail && e.detail.tabId) {
        setCustomPrompt(`#TAB-${e.detail.tabId} [${e.detail.tabName || tabTitle}]`);
      }
    };
    window.addEventListener("rooh:copy-tab-id", handleGlobalCopy);
    return () => window.removeEventListener("rooh:copy-tab-id", handleGlobalCopy);
  }, [tabTitle]);

  const handleCopyReportText = () => {
    if (!report) return;
    const fullText = `[تقرير تشخيص الوكيل الذكي - كود النافذة #${tabId} ${tabTitle}]\n\n${report}`;
    navigator.clipboard.writeText(fullText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const playReportAudio = (audioBase64: string) => {
    if (!isVoiceActive) return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
    }

    try {
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      setIsPlayingReportAudio(true);

      audio.onended = () => setIsPlayingReportAudio(false);
      audio.onerror = () => setIsPlayingReportAudio(false);
      audio.play().catch((err) => {
        console.warn("Audio play blocked by browser policy:", err);
        setIsPlayingReportAudio(false);
      });
    } catch (err) {
      console.warn("Audio player init notice:", err);
      setIsPlayingReportAudio(false);
    }
  };

  const stopReportAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsPlayingReportAudio(false);
  };

  const toggleVoice = () => {
    if (isPlayingReportAudio) {
      stopReportAudio();
    }
    setIsVoiceActive((prev) => !prev);
  };

  const handleRunDiagnosis = async (promptOverride?: string) => {
    setAnalyzing(true);
    setIsOpen(true);
    stopReportAudio();

    try {
      const activeQuery = promptOverride || customPrompt || `#TAB-${tabId} تشخيص الحالة الفنية وتدفق العمل والمفاتيح المرتبطة بنافذة ${tabTitle}`;
      const idToken = getIdTokenHelper ? getIdTokenHelper() : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const { ok, data } = await safeFetchJson("/api/admin/analyze-diagnostics", {
        method: "POST",
        headers,
        body: JSON.stringify({
          serviceId: `tab_${tabId}`,
          serviceName: `نافذة ${tabTitle}`,
          status: "active",
          latencyMs: 12,
          customQuery: activeQuery,
          contextData
        })
      });

      if (ok && data && data.analysis) {
        setReport(data.analysis);

        // If audio returned or synthesized, store and optionally play
        if (data.audioBase64) {
          setReportAudioBase64(data.audioBase64);
          if (isVoiceActive) {
            playReportAudio(data.audioBase64);
          }
        }
      } else {
        setReport("تعذر جلب التقرير المباشر، يرجى المحاولة لاحقاً.");
      }
    } catch (err: any) {
      setReport(`حدث خطأ أثناء إجراء التشخيص: ${err?.message || err}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div data-window-container="true" className="my-3 bg-zinc-950/90 border border-indigo-500/25 rounded-xl p-2.5 sm:p-3 shadow-lg backdrop-blur-xs transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Compact 🤖Ai Trigger Button */}
          <button
            onClick={() => handleRunDiagnosis()}
            disabled={analyzing}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50 active:scale-95 border border-indigo-400/30"
            title="تشخيص الذكاء الاصطناعي السريع للنافذة (Groq LLaMA 3.3)"
          >
            {analyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-200" />
            ) : (
              <span className="text-xs font-black tracking-wider flex items-center gap-1">
                <span>🤖Ai</span>
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-xs font-bold text-slate-200 truncate">{tabTitle}</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-md font-mono shrink-0">
              #{tabId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Toggle Button */}
          <button
            onClick={toggleVoice}
            className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 ${
              isVoiceActive
                ? "bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
                : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800"
            }`}
            title={isVoiceActive ? "الصوت مفعل (ElevenLabs) - انقر للكتم" : "الصوت مكتوم - انقر للتفعيل"}
          >
            {isVoiceActive ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
          </button>

          {/* Direct Conversational Chat Toggle Button */}
          <button
            onClick={() => {
              setShowFullChat(!showFullChat);
              if (!isOpen) setIsOpen(true);
            }}
            className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showFullChat
                ? "bg-indigo-600 text-white border-indigo-400"
                : "bg-zinc-900 hover:bg-indigo-900/40 text-indigo-300 border-zinc-800"
            }`}
            title="فتح محادثة كاملة ومفتوحة مع وكيل المطور"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline text-[11px]">محادثة الوكيل</span>
          </button>

          {/* Compact 🔗 Window Copy Button */}
          <WindowCopyButton windowId={`WINDOW_TAB_${tabId}_${activeTabName || 'DIAG'}`} />

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-slate-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors cursor-pointer text-xs"
            title={isOpen ? "إخفاء التفاصيل" : "عرض التفاصيل والأوامر"}
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 space-y-3 animate-fadeIn text-xs">
          {showFullChat ? (
            /* Full Conversational Workspace */
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>محادثة مفتوحة مع وكيل المطور (LLaMA 3.3 70B & ElevenLabs)</span>
                </span>
                <button
                  onClick={() => setShowFullChat(false)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                >
                  العودة للتشخيص السريع
                </button>
              </div>
              <DeveloperAgentChat
                getIdTokenHelper={getIdTokenHelper}
                initialContext={{
                  activeTab: activeTabName,
                  tabId,
                  tabTitle,
                  contextData
                }}
              />
            </div>
          ) : (
            /* Compact Diagnostic View */
            <>
              {/* Direct Prompt Input Box */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-indigo-500/30 shadow-inner focus-within:border-indigo-500 transition-all">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customPrompt.trim()) {
                        handleRunDiagnosis();
                      }
                    }}
                    placeholder={`اكتب أي سؤال أو استفسار أو أمر تشخيصي لنافذة #${tabId}...`}
                    className="w-full bg-transparent border-none text-xs text-white placeholder-zinc-500 focus:outline-none px-1 font-sans"
                    dir="rtl"
                  />
                  <button
                    onClick={() => handleRunDiagnosis()}
                    disabled={analyzing}
                    className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    {analyzing ? <RefreshCw className="w-3 h-3 animate-spin text-white" /> : <span>🤖Ai تحليل</span>}
                  </button>
                </div>

                {/* Quick Action Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold">أوامر سريعة:</span>
                  <button
                    type="button"
                    onClick={() => handleRunDiagnosis(`#TAB-${tabId} فحص سلامة النافذة والخدمات المرتبطة بها والتحقق من المشاكل البرمجية`)}
                    className="px-2 py-0.5 text-[10px] rounded bg-zinc-900 hover:bg-indigo-900/50 text-indigo-300 border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    <span>فحص سلامة النافذة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunDiagnosis(`قم بفحص الأخطاء وحلها جذرياً في هذا القسم`)}
                    className="px-2 py-0.5 text-[10px] rounded bg-zinc-900 hover:bg-emerald-900/50 text-emerald-300 border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Wrench className="w-3 h-3 text-emerald-400" />
                    <span>إصلاح جذري للأخطاء</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFullChat(true)}
                    className="px-2 py-0.5 text-[10px] rounded bg-purple-900/30 hover:bg-purple-900/60 text-purple-300 border border-purple-800/40 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3 text-purple-400" />
                    <span>تحدث مع الوكيل</span>
                  </button>
                </div>
              </div>

              {analyzing ? (
                <div className="py-4 text-center space-y-2 bg-zinc-900/80 rounded-lg border border-indigo-900/30">
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-[11px] text-indigo-300 font-medium">جاري التحليل الفني عبر LLaMA 3.3 70B وتوليد الصوت...</p>
                </div>
              ) : report ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>تقرير الذكاء الاصطناعي (Proq LLaMA):</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {reportAudioBase64 && (
                        <button
                          onClick={() => {
                            if (isPlayingReportAudio) {
                              stopReportAudio();
                            } else {
                              playReportAudio(reportAudioBase64);
                            }
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border flex items-center gap-1 transition-all cursor-pointer ${
                            isPlayingReportAudio
                              ? "bg-purple-600 text-white border-purple-400 animate-pulse"
                              : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30"
                          }`}
                        >
                          {isPlayingReportAudio ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                          <span>{isPlayingReportAudio ? "إيقاف الصوت" : "استماع للتقرير"}</span>
                        </button>
                      )}

                      <button
                        onClick={handleCopyReportText}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span className="text-xs">🔗</span>
                        <span>{copiedReport ? "تم النسخ" : "نسخ التقرير"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-900/90 border border-indigo-900/40 rounded-lg p-3 text-[11px] text-zinc-200 leading-relaxed font-sans whitespace-pre-line shadow-inner max-h-60 overflow-y-auto">
                    {report}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
};


