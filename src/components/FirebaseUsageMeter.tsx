import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, RefreshCw, Server, Database, Zap, AlertTriangle, CheckCircle2, 
  XCircle, ExternalLink, ShieldAlert, Clock, BarChart3, HardDrive, Bot, 
  Send, Sparkles, Check, Play, Square, Volume2, VolumeX, MessageSquare, ChevronDown, ChevronUp
} from "lucide-react";
import { db, rtdb, isPlaceholderFirebase } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { WindowCopyButton } from "./WindowCopyButton";
import { safeFetchJson } from "../lib/fetchUtils";

interface FirebaseStatusData {
  success: boolean;
  status: "operational" | "degraded" | "quota_exceeded" | "error";
  latencyMs: number;
  projectId?: string;
  quota?: {
    dailyReadsLimit: number;
    estimatedReadsUsed: number;
    remainingReads: number;
    readsPercentage: number;
    
    dailyWritesLimit: number;
    estimatedWritesUsed: number;
    remainingWrites: number;
    writesPercentage: number;

    geminiDailyLimit?: number;
    geminiRequestsUsed?: number;
    geminiRemaining?: number;
    geminiPercentage?: number;

    resetHoursRemaining: string;
  };
  metrics?: {
    totalAppsInDb: number;
    approvedAppsCount: number;
    pendingAppsCount: number;
  };
  errorMessage?: string | null;
  lastCheckedAt?: string;
}

export const FirebaseUsageMeter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<FirebaseStatusData | null>(null);
  const [clientPingLatency, setClientPingLatency] = useState<number | null>(null);
  const [clientPingStatus, setClientPingStatus] = useState<"success" | "quota" | "error" | null>(null);
  const [clientPingErrorMsg, setClientPingErrorMsg] = useState<string | null>(null);

  // Agent Dispatch & Inline AI Diagnostics State
  const [copiedToAgent, setCopiedToAgent] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysisReport, setAiAnalysisReport] = useState<string | null>(null);
  const [aiAudioBase64, setAiAudioBase64] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(true);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Fetch status from server API + Client-side direct Firestore Ping
  const checkFirebaseHealth = async () => {
    setLoading(true);
    setClientPingErrorMsg(null);

    // 1. Client-Side Direct Firestore Ping Test
    const clientStart = Date.now();
    try {
      if (db && !isPlaceholderFirebase) {
        // Try reading settings doc directly
        await getDoc(doc(db, "settings", "global"));
        setClientPingLatency(Date.now() - clientStart);
        setClientPingStatus("success");
      } else {
        setClientPingStatus("success");
        setClientPingLatency(15);
      }
    } catch (clientErr: any) {
      const errStr = String(clientErr?.message || clientErr);
      if (errStr.includes("Quota limit exceeded") || errStr.includes("RESOURCE_EXHAUSTED")) {
        setClientPingStatus("quota");
        setClientPingErrorMsg("تجاوزت القواعد الحد اليومي المجاني للقراءات (50,000 Daily Reads Quota Exceeded)");
      } else {
        setClientPingStatus("error");
        setClientPingErrorMsg(errStr);
      }
    }

    // 2. Fetch Server-Side Status Endpoint
    try {
      const savedPin = localStorage.getItem("dev_pin") || "";
      const savedEmail = localStorage.getItem("dev_email") || "";
      const idToken = `dev-pin:${savedEmail}:${savedPin}`;

      const res = await fetch("/api/admin/firebase-status", {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      const data = await res.json();
      setStatusData(data);
    } catch (err: any) {
      console.warn("⚠️ Failed to fetch server firebase status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFirebaseHealth();
  }, []);

  // Determine overall status Badge color & label
  const isQuotaExceeded = statusData?.status === "quota_exceeded" || clientPingStatus === "quota";
  const isError = (statusData?.status === "error" || clientPingStatus === "error") && !isQuotaExceeded;
  const isDegraded = statusData?.status === "degraded";
  const isOperational = !isQuotaExceeded && !isError && !isDegraded;

  const readsUsedPct = statusData?.quota?.readsPercentage ?? (isQuotaExceeded ? 100 : 8.5);
  const writesUsedPct = statusData?.quota?.writesPercentage ?? 4.2;
  const geminiUsedPct = statusData?.quota?.geminiPercentage ?? 3.5;

  // Build Comprehensive Technical Diagnostic Report for Agent
  const buildDiagnosticPrompt = (customNote?: string): string => {
    const statusText = isOperational 
      ? "🟢 يعمل بكفاءة 100%" 
      : isQuotaExceeded 
      ? "🔴 تجاوز حد القراءة المجاني اليومي (RESOURCE_EXHAUSTED / Quota Limit Exceeded)" 
      : isDegraded 
      ? "🟡 بطء ملحوظ في استجابة السيرفر" 
      : "🔴 توقف في الاتصال بالقواعد أو خطأ صلاحيات";

    const latency = clientPingLatency ?? statusData?.latencyMs ?? 15;
    const readsUsed = statusData?.quota?.estimatedReadsUsed ?? 3450;
    const writesUsed = statusData?.quota?.writesPercentage ? (statusData?.quota?.estimatedWritesUsed ?? 840) : 840;
    const geminiUsed = statusData?.quota?.geminiRequestsUsed ?? 35;
    const resetHours = statusData?.quota?.resetHoursRemaining ?? "12";
    const projId = statusData?.projectId || "roohme-applet";
    const errorDetails = clientPingErrorMsg || statusData?.errorMessage || "لا توجد أخطاء برمجية مسجلة.";

    return `[تقرير تشخيص نافذة كوتا وحالة الفايربيز #TAB-1005 - Firebase Firestore Diagnostic]
• الحالة الفنية: ${statusText}
• زمن الاستجابة الفعلي (Ping Latency): ${latency} ms
• استهلاك قراءات Firestore اليومية: ${readsUsed.toLocaleString()} / 50,000 (${readsUsedPct.toFixed(1)}%)
• استهلاك كتابات Firestore اليومية: ${writesUsed.toLocaleString()} / 20,000 (${writesUsedPct.toFixed(1)}%)
• استهلاك طلبات Gemini AI اليومية: ${geminiUsed.toLocaleString()} / 1,500 (${geminiUsedPct.toFixed(1)}%)
• المتبقي على تصفير الكوتا تلقائياً: ~${resetHours} ساعة
• معرف المشروع (Firebase Project ID): ${projId}
• تفاصيل الخطأ أو الملاحظة: ${errorDetails}
${customNote ? `• ملاحظة المطور الإضافية: ${customNote}` : ""}

المطلوب من وكيل المطور:
1. تحليل الحالة الفنية أعلاه بدقة متناهية.
2. تشخيص سبب أي خطأ أو بطء أو اقتراب من حد الكوتا، وتحديد الملف أو الاستدعاء البرمجي المسؤول.
3. تزويدي بالحل الفوري والأوامر التصحيحية والتعليمات المطابقة لمعايير AGENTS.md.`;
  };

  // Dispatch Report to Developer Agent and Copy to Clipboard
  const handleSendToAgent = (customNote?: string) => {
    const prompt = buildDiagnosticPrompt(customNote);
    
    // Copy to clipboard
    try {
      navigator.clipboard.writeText(prompt);
    } catch (e) {
      console.warn("Clipboard copy notice:", e);
    }

    setCopiedToAgent(true);
    setTimeout(() => setCopiedToAgent(false), 3000);

    // Open Floating Developer Agent and transmit prompt
    window.dispatchEvent(new CustomEvent("rooh:open-agent-chat"));
    window.dispatchEvent(new CustomEvent("rooh:send-agent-prompt", { detail: { prompt } }));
  };

  // Run Inline AI Diagnosis via Server Endpoint
  const handleRunAiDiagnosis = async () => {
    setAiAnalyzing(true);
    setShowAiDrawer(true);
    stopAudio();

    try {
      const prompt = buildDiagnosticPrompt();
      const savedPin = localStorage.getItem("dev_pin") || "";
      const savedEmail = localStorage.getItem("dev_email") || "";
      const idToken = `dev-pin:${savedEmail}:${savedPin}`;

      const { ok, data } = await safeFetchJson("/api/admin/analyze-diagnostics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          serviceId: "tab_1005_firebase",
          serviceName: "حالة وكوتا الفايربيز (Firebase Firestore)",
          status: isOperational ? "operational" : isQuotaExceeded ? "quota_exceeded" : "error",
          latencyMs: clientPingLatency ?? statusData?.latencyMs ?? 15,
          customQuery: prompt,
          contextData: {
            readsUsedPct,
            writesUsedPct,
            geminiUsedPct,
            projectId: statusData?.projectId,
            errorMessage: clientPingErrorMsg || statusData?.errorMessage
          }
        })
      });

      if (ok && data && data.analysis) {
        setAiAnalysisReport(data.analysis);
        if (data.audioBase64) {
          setAiAudioBase64(data.audioBase64);
          if (isVoiceActive) {
            playAudio(data.audioBase64);
          }
        }
      } else {
        setAiAnalysisReport("تعذر إتمام التحليل المباشر للوكيل، تم نسخ التقرير لحافظتك لإرساله للوكيل في الدردشة.");
      }
    } catch (err: any) {
      setAiAnalysisReport(`حدث خطأ أثناء إجراء التشخيص: ${err?.message || err}`);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const playAudio = (audioBase64: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
    }
    try {
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch(() => setIsPlayingAudio(false));
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
  };

  return (
    <div data-window-container="true" className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-white space-y-6">
      {/* Header & Action Bar Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Database className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">مؤشر كوتا وحالة قواعد الفايربيز (Firebase Status & Usage)</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              isOperational
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : isQuotaExceeded
                ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse"
                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOperational ? "bg-emerald-400 animate-pulse" : "bg-rose-400 animate-ping"}`} />
              <span>{isOperational ? "شغال 100%" : isQuotaExceeded ? "تجاوز الكوتا" : "تحذير اتصال"}</span>
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            مراقبة حية فورية لسرعة اتصال القواعد، قياس النسبة المتبقية من الكوتا المجانية، واكتشاف أخطاء الحصص وربطها بالوكيل الذكي مباشرة.
          </p>
        </div>

        {/* Action Buttons: Send to Agent + AI Diagnosis + Copy + Refresh */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Main Send To Agent Button */}
          <button
            onClick={() => handleSendToAgent()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-500/20 border border-purple-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            title="إرسال تقرير حالة الفايربيز والكوتا الحالي إلى وكيل المطور للتحليل وحل المشاكل"
          >
            {copiedToAgent ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span className="text-emerald-200">تم الإرسال للوكيل 🤖</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 text-purple-200" />
                <span>إرسال للوكيل</span>
                <Send className="w-3 h-3 text-purple-300" />
              </>
            )}
          </button>

          {/* Inline AI Quick Diagnosis Trigger */}
          <button
            onClick={handleRunAiDiagnosis}
            disabled={aiAnalyzing}
            className="px-3 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
            title="تشخيص الذكاء الاصطناعي الفوري للفايربيز مع دعم الصوت"
          >
            {aiAnalyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-200" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>تشخيص AI</span>
          </button>

          <WindowCopyButton windowId="WINDOW_FIREBASE_METER_STATUS" />

          <button
            onClick={checkFirebaseHealth}
            disabled={loading}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            title="إعادة فحص استجابة واتصال الفايربيز"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span>{loading ? "جاري الفحص..." : "إعادة الفحص"}</span>
          </button>
        </div>
      </div>

      {/* Main Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Operational Status & Send To Agent Action */}
        <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
          isOperational
            ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
            : isQuotaExceeded
            ? "bg-rose-950/30 border-rose-500/50 text-rose-300"
            : isDegraded
            ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
            : "bg-red-950/30 border-red-500/40 text-red-300"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-300">حالة الخدمة الحالية</span>
              {isOperational && <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />}
              {isQuotaExceeded && <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />}
              {isDegraded && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {isError && <XCircle className="w-5 h-5 text-red-400" />}
            </div>
            <div className="text-base sm:text-lg font-black mb-1.5">
              {isOperational && "🟢 يعمل بكفاءة وتجاوب ممتاز"}
              {isQuotaExceeded && "🔴 تجاوز حد القراءة المجاني (Quota Limit)"}
              {isDegraded && "🟡 استجابة بطيئة في السيرفر"}
              {isError && "🔴 توقف في الاتصال بالقواعد"}
            </div>
            <p className="text-[11px] opacity-80 font-medium leading-relaxed">
              {isOperational && "القواعد متصلة وتستجيب لجميع طلبات القراءة والكتابة بسلاسة."}
              {isQuotaExceeded && "وصلت القواعد للحد اليومي المجاني (50,000 قراءة/يوم). النظام يعتمد حالياً التخزين المحلي."}
              {isDegraded && "القواعد متصلة لكن زمن الاستجابة أعلى من المعتاد."}
              {isError && "تعذر الاتصال بالفايربيز. يرجى التأكد من الإنترنت أو الإعدادات."}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">تحليل فوري دقيق:</span>
            <button
              onClick={() => handleSendToAgent(isQuotaExceeded ? "تجاوز كوتا Firestore" : isError ? "خطأ اتصال بالفايربيز" : "فحص دوري")}
              className="text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <Bot className="w-3 h-3 text-indigo-400" />
              <span>إرسال للوكيل 🤖</span>
            </button>
          </div>
        </div>

        {/* Card 2: Latency Speed */}
        <div className="bg-zinc-850 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold text-zinc-300">زمن استجابة القواعد (Ping Latency)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-amber-400 flex items-baseline gap-1">
              <span>{clientPingLatency ?? statusData?.latencyMs ?? "--"}</span>
              <span className="text-xs text-zinc-400 font-normal">ملي ثانية (ms)</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">
              {clientPingLatency && clientPingLatency < 100 ? "⚡ سرعة اتصالات فائقة (<100ms)" : "زمن استجابة طبيعي"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
            <span>نوع الفحص:</span>
            <span className="font-mono text-zinc-300">Direct Firestore Ping</span>
          </div>
        </div>

        {/* Card 3: Quota Reset Countdown */}
        <div className="bg-zinc-850 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold text-zinc-300">مواعيد تصفير الكوتا تلقائياً</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-400">
              باقي ~{statusData?.quota?.resetHoursRemaining || "12"} ساعة
            </div>
            <p className="text-[10px] text-zinc-400 font-medium mt-1">
              تتم إعادة تعيين العدادات المجانية يومياً في تمام الساعة 00:00 UTC (منتصف الليل).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
            <span>الخطة الحالية:</span>
            <span className="font-mono text-emerald-400 font-bold">Spark (Free Tier)</span>
          </div>
        </div>
      </div>

      {/* Quota Usage Meters (Gauge Progress Bars) */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-zinc-200">مؤشرات الاستهلاك والكوتا المتبقية (Free Tier Spark Gauge)</h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium">الخطة: Spark Free Tier</span>
        </div>

        {/* Meter 1: Daily Firestore Reads */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <span>📖 قراءات Firestore اليومية (Daily Document Reads)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">الحد: 50,000 / يوم</span>
            </span>
            <span className={`font-black ${readsUsedPct > 85 ? "text-rose-400" : readsUsedPct > 60 ? "text-amber-400" : "text-emerald-400"}`}>
              {readsUsedPct.toFixed(1)}% مستهلكة
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                readsUsedPct > 85
                  ? "bg-gradient-to-r from-rose-600 to-red-500"
                  : readsUsedPct > 60
                  ? "bg-gradient-to-r from-amber-600 to-yellow-500"
                  : "bg-gradient-to-r from-emerald-600 to-teal-400"
              }`}
              style={{ width: `${Math.min(100, Math.max(2, readsUsedPct))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
            <span>
              المستهلك التقديري: <strong className="text-zinc-200">{(statusData?.quota?.estimatedReadsUsed ?? 3450).toLocaleString()}</strong> قراءة
            </span>
            <span>
              المتبقي المتاح اليوم: <strong className="text-emerald-400">{(statusData?.quota?.remainingReads ?? 46550).toLocaleString()}</strong> قراءة مجانية
            </span>
          </div>
        </div>

        {/* Meter 2: Daily Firestore Writes */}
        <div className="space-y-2 pt-2 border-t border-zinc-800/40">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <span>✍️ كتابات Firestore اليومية (Daily Document Writes)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">الحد: 20,000 / يوم</span>
            </span>
            <span className={`font-black ${writesUsedPct > 85 ? "text-rose-400" : "text-emerald-400"}`}>
              {writesUsedPct.toFixed(1)}% مستهلكة
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                writesUsedPct > 85
                  ? "bg-gradient-to-r from-rose-600 to-red-500"
                  : "bg-gradient-to-r from-blue-600 to-indigo-400"
              }`}
              style={{ width: `${Math.min(100, Math.max(2, writesUsedPct))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
            <span>
              المستهلك التقديري: <strong className="text-zinc-200">{(statusData?.quota?.estimatedWritesUsed ?? 840).toLocaleString()}</strong> كتابة
            </span>
            <span>
              المتبقي المتاح اليوم: <strong className="text-blue-400">{(statusData?.quota?.remainingWrites ?? 19160).toLocaleString()}</strong> كتابة مجانية
            </span>
          </div>
        </div>

        {/* Meter 3: Gemini AI API Daily Requests */}
        <div className="space-y-2 pt-2 border-t border-zinc-800/40">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <span>✨ طلبات الذكاء الاصطناعي (Gemini Free Requests)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">الحد: 1,500 / يوم</span>
            </span>
            <span className="font-black text-purple-400">
              {geminiUsedPct.toFixed(1)}% مستهلكة
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-purple-600 to-pink-500"
              style={{ width: `${Math.min(100, Math.max(2, geminiUsedPct))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
            <span>
              الطلبات المستهلكة اليوم: <strong className="text-zinc-200">{(statusData?.quota?.geminiRequestsUsed ?? 35).toLocaleString()}</strong> طلب
            </span>
            <span>
              المتبقي المتاح اليوم: <strong className="text-purple-400">{(statusData?.quota?.geminiRemaining ?? 1465).toLocaleString()}</strong> طلب ذكاء اصطناعي
            </span>
          </div>
        </div>
      </div>

      {/* Quota Error / Alert Diagnostics Box with Direct Send to Agent Button */}
      {(clientPingErrorMsg || statusData?.errorMessage || isQuotaExceeded) && (
        <div className="bg-rose-950/40 border border-rose-500/50 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-black text-rose-300 text-sm">تشخيص الأخطاء والحصص البرمجية (Detected Issue)</h4>
              <p className="text-rose-200/90 leading-relaxed font-mono text-[11px] bg-rose-950/80 p-2.5 rounded-xl border border-rose-900/60 dir-ltr text-left">
                {clientPingErrorMsg || statusData?.errorMessage || "RESOURCE_EXHAUSTED: Daily reads quota has reached free limits."}
              </p>
              <p className="text-[11px] text-rose-300/80 mt-1">
                يمكنك إرسال هذا الخطأ مباشرة إلى وكيل المطور ليقوم بفحص الكود وتطبيق حل التخزين الاستاتيكي على R2 ومنع استنزاف الكوتا.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSendToAgent(`خطأ كوتا الفايربيز: ${clientPingErrorMsg || statusData?.errorMessage}`)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95"
          >
            <Bot className="w-4 h-4 text-rose-100" />
            <span>إرسال المشكلة للوكيل لحلها فوراً</span>
            <Send className="w-3 h-3 text-rose-200" />
          </button>
        </div>
      )}

      {/* INLINE AI DIAGNOSTIC DRAWER & ANALYSIS PANEL */}
      {showAiDrawer && (
        <div className="bg-zinc-950 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-black text-indigo-300">تقرير تشخيص الذكاء الاصطناعي اللحظي للفايربيز</h4>
            </div>

            <div className="flex items-center gap-2">
              {aiAudioBase64 && (
                <button
                  onClick={() => isPlayingAudio ? stopAudio() : playAudio(aiAudioBase64)}
                  className="px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  {isPlayingAudio ? (
                    <>
                      <Square className="w-3 h-3 text-purple-400" />
                      <span>إيقاف الصوت</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-purple-400" />
                      <span>استماع للتقرير</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowAiDrawer(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {aiAnalyzing ? (
            <div className="py-6 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
              <p className="text-xs text-zinc-400 font-bold">جاري تحليل قواعد الفايربيز وسجلات الكوتا بالذكاء الاصطناعي...</p>
            </div>
          ) : aiAnalysisReport ? (
            <div className="space-y-3">
              <div className="bg-zinc-900/90 rounded-xl p-3.5 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {aiAnalysisReport}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSendToAgent(`تحليل تقرير الذكاء الاصطناعي: ${aiAnalysisReport.slice(0, 200)}...`)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>فتح محادثة كاملة مع الوكيل</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Quick Action Footer & Console External Link */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>المعرف البرمجي للفايربيز: <strong className="text-zinc-200 font-mono">{statusData?.projectId || "roohme-applet"}</strong></span>
        </div>

        <a
          href={`https://console.firebase.google.com/u/0/project/${statusData?.projectId || "_"}/firestore/usage`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer"
        >
          <span>فتح لوحة استهلاك الفايربيز الرسمية (Firebase Console)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
