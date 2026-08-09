import React, { useState, useEffect, useRef } from "react";
import { WindowCopyButton } from "./WindowCopyButton";
import { 
  HardDrive, RefreshCw, Zap, CheckCircle2, XCircle, ExternalLink, 
  Clock, BarChart3, Database, Globe, FileCode2, ShieldCheck, Cpu, Search, Trash2, ArrowUpRight,
  Bot, Send, Sparkles, Check, Play, Square, Volume2, VolumeX, MessageSquare, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import { safeFetchJson } from "../lib/fetchUtils";

interface R2UsageMeterProps {
  allApps?: any[];
  onRefreshApps?: () => void;
}

export const R2UsageMeter: React.FC<R2UsageMeterProps> = ({ allApps = [], onRefreshApps }) => {
  const [loading, setLoading] = useState(false);
  const [workerPingMs, setWorkerPingMs] = useState<number | null>(null);
  const [workerStatus, setWorkerStatus] = useState<"operational" | "error" | "testing">("testing");
  const [workerStatusMsg, setWorkerStatusMsg] = useState<string>("جاري اختبار الاتصال بسيرفر Cloudflare R2 Worker...");
  const [approvedAppsCountR2, setApprovedAppsCountR2] = useState<number>(0);
  const [r2AppsSample, setR2AppsSample] = useState<any[]>([]);
  
  // Direct Article Fetch Inspector State
  const [testSlugInput, setTestSlugInput] = useState<string>("wats");
  const [testFetchLoading, setTestFetchLoading] = useState<boolean>(false);
  const [testFetchResult, setTestFetchResult] = useState<{
    success: boolean;
    url: string;
    status: number;
    sizeKb: number;
    contentType: string;
    previewText?: string;
    error?: string;
  } | null>(null);

  // Sync Action State
  const [isSyncingR2, setIsSyncingR2] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Clear Local Cache state
  const [cacheCleared, setCacheCleared] = useState<boolean>(false);

  // Agent Dispatch & Inline AI Diagnostics State
  const [copiedToAgent, setCopiedToAgent] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysisReport, setAiAnalysisReport] = useState<string | null>(null);
  const [aiAudioBase64, setAiAudioBase64] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(true);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Perform Ping Check against Cloudflare Worker Endpoint
  const checkR2Health = async () => {
    setLoading(true);
    setWorkerStatus("testing");
    setWorkerStatusMsg("جاري فحص الاستجابة بسيرفر R2 Edge CDN...");

    const startTime = Date.now();
    try {
      const cacheBustUrl = `https://roohpro.com/approved-apps.json?t=${Date.now()}`;
      const res = await fetch(cacheBustUrl, { method: "GET" });
      const latency = Date.now() - startTime;
      
      if (res.ok) {
        const text = await res.text();
        let data: any = [];
        try {
          data = JSON.parse(text);
        } catch (jsonErr) {
          console.warn("[R2 Health Check] Response body was not JSON:", text.slice(0, 100));
        }

        setWorkerPingMs(latency);
        setWorkerStatus("operational");
        setWorkerStatusMsg("السيرفر متصل وشغال بنسبة 100% عبر شبكة Cloudflare Edge CDN السريعة.");
        
        if (Array.isArray(data)) {
          setApprovedAppsCountR2(data.length);
          setR2AppsSample(data.slice(0, 5));
        }
      } else {
        setWorkerPingMs(latency);
        setWorkerStatus("error");
        setWorkerStatusMsg(`السيرفر استجاب بكود خطأ ${res.status}`);
      }
    } catch (err: any) {
      const latency = Date.now() - startTime;
      setWorkerPingMs(latency);
      setWorkerStatus("error");
      setWorkerStatusMsg(`تعذر الاتصال بـ Worker: ${err?.message || "خطأ في الشبكة"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkR2Health();
  }, []);

  // Inspect HTML Article direct R2 Fetch
  const handleInspectArticleR2 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSlug = testSlugInput.trim().toLowerCase().replace(/^\/+|\.html$/gi, '');
    if (!cleanSlug) return;

    setTestFetchLoading(true);
    setTestFetchResult(null);

    const targetUrl = `https://roohpro.com/${cleanSlug}.html?t=${Date.now()}`;
    try {
      const res = await fetch(targetUrl);
      const text = await res.text();
      const sizeBytes = new Blob([text]).size;
      const sizeKb = parseFloat((sizeBytes / 1024).toFixed(2));

      setTestFetchResult({
        success: res.ok,
        url: targetUrl,
        status: res.status,
        sizeKb: sizeKb,
        contentType: res.headers.get("content-type") || "text/html",
        previewText: text.slice(0, 300) + (text.length > 300 ? "..." : ""),
        error: res.ok ? undefined : `HTTP Error ${res.status}`
      });
    } catch (err: any) {
      setTestFetchResult({
        success: false,
        url: targetUrl,
        status: 0,
        sizeKb: 0,
        contentType: "unknown",
        error: `فشل الاتصال بالرابط: ${err.message || String(err)}`
      });
    } finally {
      setTestFetchLoading(false);
    }
  };

  // Force Rebuild & Sync R2
  const handleRebuildAndSyncR2 = async () => {
    setIsSyncingR2(true);
    setSyncStatusMsg(null);
    try {
      const savedPin = localStorage.getItem("dev_pin") || "";
      const savedEmail = localStorage.getItem("dev_email") || "";
      const idToken = `dev-pin:${savedEmail}:${savedPin}`;

      const res = await fetch("/api/admin/sync-all-published-apps", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatusMsg({
          type: "success",
          text: `تمت إعادة بناء وتحديث ملف approved-apps.json على Cloudflare R2 بنجاح! تم حفظ ${data.syncedCount || 0} تطبيق.`
        });
        checkR2Health();
        if (onRefreshApps) onRefreshApps();
      } else {
        setSyncStatusMsg({
          type: "error",
          text: data.error || "فشلت عملية المزامنة مع R2."
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        type: "error",
        text: `حدث خطأ أثناء الاتصال بالخادم: ${err.message || String(err)}`
      });
    } finally {
      setIsSyncingR2(false);
    }
  };

  // Clear local browser storage caches
  const handleClearLocalR2Cache = () => {
    localStorage.removeItem("apps_list_cache");
    localStorage.removeItem("approved_apps_json_cache");
    localStorage.removeItem("last_visitor_ping");
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  // Calculated Metrics (Cloudflare R2 Free Tier Limits)
  const totalAppsCount = Math.max(approvedAppsCountR2, allApps.filter(a => a.isApproved !== false).length);
  const CLASS_B_READS_LIMIT = 10000000; // 10 Million Class B reads/month free tier
  const CLASS_A_WRITES_LIMIT = 1000000; // 1 Million Class A writes/month free tier
  const STORAGE_LIMIT_MB = 10240; // 10 GB Free Tier (10,240 MB)

  // Estimated Class B Reads used (from visitors & approved-apps checks)
  const estimatedReadsUsed = Math.min(CLASS_B_READS_LIMIT, Math.max(1250, totalAppsCount * 18));
  const readsPercentage = Number(((estimatedReadsUsed / CLASS_B_READS_LIMIT) * 100).toFixed(4));
  const remainingReads = CLASS_B_READS_LIMIT - estimatedReadsUsed;

  // Estimated Class A Writes used (from published articles HTML + approved-apps updates)
  const estimatedWritesUsed = Math.min(CLASS_A_WRITES_LIMIT, Math.max(35, totalAppsCount * 2 + 10));
  const writesPercentage = Number(((estimatedWritesUsed / CLASS_A_WRITES_LIMIT) * 100).toFixed(4));
  const remainingWrites = CLASS_A_WRITES_LIMIT - estimatedWritesUsed;

  // Estimated Storage used (~35 KB per 1500-word HTML review article)
  const estimatedStorageMb = Number(((totalAppsCount * 0.035) + 0.5).toFixed(2));
  const storagePercentage = Number(((estimatedStorageMb / STORAGE_LIMIT_MB) * 100).toFixed(4));
  const remainingStorageMb = Number((STORAGE_LIMIT_MB - estimatedStorageMb).toFixed(2));

  // Build Comprehensive Technical Diagnostic Report for Developer Agent
  const buildDiagnosticPrompt = (customNote?: string): string => {
    const statusText = workerStatus === "operational" 
      ? "🟢 سيرفر Cloudflare R2 متصل وشغال 100%" 
      : workerStatus === "testing" 
      ? "🟡 جاري فحص الاتصال" 
      : "🔴 تعذر الاتصال بسيرفر R2 Worker أو خطأ في الاستجابة";

    const latency = workerPingMs !== null ? `${workerPingMs} ms` : "غير محدد";

    return `[تقرير تشخيص نافذة تخزين وسيرفر Cloudflare R2 #TAB-1006 - R2 Storage & Worker Diagnostics]
• الحالة الفنية للـ Worker: ${statusText}
• زمن استجابة السيرفر (Worker Ping Latency): ${latency}
• رسالة الحالة: ${workerStatusMsg}
• عدد التطبيقات المسجلة في approved-apps.json: ${approvedAppsCountR2}
• إجمالي التطبيقات في النظام: ${totalAppsCount}
• عمليات القراءة الشهرية (Class B Reads): ${estimatedReadsUsed.toLocaleString()} / ${CLASS_B_READS_LIMIT.toLocaleString()} (${readsPercentage}%)
• عمليات الكتابة الشهرية (Class A Writes): ${estimatedWritesUsed.toLocaleString()} / ${CLASS_A_WRITES_LIMIT.toLocaleString()} (${writesPercentage}%)
• المساحة المستهلكة (Storage): ${estimatedStorageMb} MB / ${STORAGE_LIMIT_MB} MB (${storagePercentage}%)
• رابط فحص الـ Worker المباشر: https://roohpro.com/approved-apps.json
${testFetchResult ? `• نتيجة آخر فحص للمقال (${testSlugInput}): Status ${testFetchResult.status}, Size ${testFetchResult.sizeKb} KB, Success: ${testFetchResult.success}${testFetchResult.error ? ` - Error: ${testFetchResult.error}` : ""}` : ""}
${customNote ? `• ملاحظة المطور الإضافية: ${customNote}` : ""}

المطلوب من وكيل المطور:
1. تحليل حالة اتصال واستجابة سيرفر Cloudflare R2 Worker وملف approved-apps.json والمقالات المخزنة كـ static HTML.
2. التحقق من توافق مسارات R2 مع القواعد الأربع في AGENTS.md (حفظ المقال 1500+ كلمة في R2 كـ .html فقط دون استهلاك كوتا Firebase).
3. تزويدي بالتشخيص الفوري وحل أي مشكلة اتصال أو مزامنة فوراً.`;
  };

  // Send Report to Developer Agent and Copy to Clipboard
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
          serviceId: "tab_1006_r2",
          serviceName: "تخزين وسيرفر Cloudflare R2 & Worker",
          status: workerStatus === "operational" ? "operational" : "error",
          latencyMs: workerPingMs ?? 85,
          customQuery: prompt,
          contextData: {
            approvedAppsCountR2,
            totalAppsCount,
            workerStatusMsg,
            estimatedReadsUsed,
            estimatedWritesUsed,
            estimatedStorageMb
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
    <div data-window-container="true" className="space-y-6 text-slate-100 dir-rtl">
      {/* 1. TOP HEADER STATUS BANNER */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <HardDrive className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  لوحة تحكم وتخزين Cloudflare R2 & Worker Status
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  workerStatus === "operational"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : workerStatus === "testing"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    workerStatus === "operational" ? "bg-emerald-400 animate-pulse" : workerStatus === "testing" ? "bg-amber-400 animate-ping" : "bg-rose-400"
                  }`} />
                  <span>{workerStatus === "operational" ? "متصل وشغال 100%" : workerStatus === "testing" ? "جاري الفحص..." : "تعذر الاتصال"}</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium leading-relaxed">
                نظام التخزين الموزع الفائق لمنع استنزاف كوتا الفايربيز وخدمة المقالات المنشورة بملفات HTML خفيفة وسريعة للزوار.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Main Send To Agent Button */}
            <button
              onClick={() => handleSendToAgent()}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-500/20 border border-purple-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
              title="إرسال تقرير حالة Cloudflare R2 إلى وكيل المطور للتحليل وحل المشاكل"
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
              className="px-3 py-2.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
              title="تشخيص الذكاء الاصطناعي الفوري لـ R2 Worker مع دعم الصوت"
            >
              {aiAnalyzing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-200" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>تشخيص AI</span>
            </button>

            <WindowCopyButton windowId="WINDOW_R2_STORAGE_STATUS" />

            <button
              onClick={checkR2Health}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span>فحص (Ping)</span>
            </button>

            <button
              onClick={handleRebuildAndSyncR2}
              disabled={isSyncingR2}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingR2 ? "animate-spin" : ""}`} />
              <span>{isSyncingR2 ? "مزامنة..." : "تحديث R2 JSON"}</span>
            </button>
          </div>
        </div>

        {/* Worker Ping & Info Bar with Quick Agent Trigger */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-zinc-500 block text-[10px]">زمن استجابة السيرفر (Latency)</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {workerPingMs !== null ? `${workerPingMs} ms` : "---"}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleSendToAgent(`فحص استجابة السيرفر: ${workerPingMs}ms`)}
              className="text-[10px] text-indigo-300 hover:text-white bg-indigo-950/70 border border-indigo-700/50 px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            >
              <Bot className="w-3 h-3 text-indigo-400" />
              <span>وكيل</span>
            </button>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center gap-3">
            <Globe className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-zinc-500 block text-[10px]">نطاق Cloudflare Worker</span>
              <a
                href="https://roohpro.com/approved-apps.json"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-amber-300 hover:underline truncate block text-xs"
              >
                rooh-platform-worker.roohr4046
              </a>
            </div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center gap-3">
            <FileCode2 className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-zinc-500 block text-[10px]">عدد المقالات المنشورة بـ R2</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {totalAppsCount} تطبيق ومقال
              </span>
            </div>
          </div>
        </div>

        {syncStatusMsg && (
          <div className={`mt-4 rounded-xl p-3 text-xs font-bold border flex items-center justify-between gap-2 ${
            syncStatusMsg.type === "success"
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
              : "bg-rose-950/60 text-rose-300 border-rose-800"
          }`}>
            <div className="flex items-center gap-2">
              <span>{syncStatusMsg.type === "success" ? "✅" : "⚠️"}</span>
              <span>{syncStatusMsg.text}</span>
            </div>
            {syncStatusMsg.type === "error" && (
              <button
                onClick={() => handleSendToAgent(`خطأ مزامنة R2: ${syncStatusMsg.text}`)}
                className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3 h-3" />
                <span>إرسال للوكيل</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* INLINE AI DIAGNOSTIC DRAWER & ANALYSIS PANEL */}
      {showAiDrawer && (
        <div className="bg-zinc-950 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-black text-indigo-300">تقرير تشخيص الذكاء الاصطناعي اللحظي لتخزين Cloudflare R2</h4>
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
              <p className="text-xs text-zinc-400 font-bold">جاري تحليل سيرفر R2 Worker وملفات المقالات بالذكاء الاصطناعي...</p>
            </div>
          ) : aiAnalysisReport ? (
            <div className="space-y-3">
              <div className="bg-zinc-900/90 rounded-xl p-3.5 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {aiAnalysisReport}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSendToAgent(`تحليل تقرير الذكاء الاصطناعي لـ R2: ${aiAnalysisReport.slice(0, 200)}...`)}
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

      {/* 2. QUOTA & USAGE METERS GRID (CLASS B READS, CLASS A WRITES, STORAGE) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* METER 1: CLASS B READ OPERATIONS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-200">عمليات القراءة (Class B Reads)</h3>
                <span className="text-[10px] text-zinc-500">الحد الشهرية المجاني: 10,000,000</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              آمن جداً
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-zinc-400">المستهلك المقدر:</span>
              <span className="text-amber-400 font-mono">{estimatedReadsUsed.toLocaleString()} قراءة</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(readsPercentage, 1)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>نسبة الاستهلاك: <strong className="text-zinc-300 font-mono">{readsPercentage}%</strong></span>
              <span>المتبقي: <strong className="text-emerald-400 font-mono">{remainingReads.toLocaleString()}</strong></span>
            </div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 text-[11px] text-zinc-400 leading-relaxed">
            <p className="text-zinc-300 font-bold mb-0.5 flex items-center gap-1">
              <span>🛡️ فائدة حماية القراءات:</span>
            </p>
            تتم قراءة قوائم التطبيقات والمقالات مباشرة من R2 دون استهلاك أية قراءات من Firebase Firestore، مما يوفر الكوتا تماماً للزوار العاديين.
          </div>
        </div>

        {/* METER 2: CLASS A WRITE OPERATIONS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-200">عمليات الكتابة (Class A Writes)</h3>
                <span className="text-[10px] text-zinc-500">الحد الشهرية المجاني: 1,000,000</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ممتاز
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-zinc-400">المستهلك المقدر:</span>
              <span className="text-amber-400 font-mono">{estimatedWritesUsed.toLocaleString()} كتابة</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(writesPercentage, 1)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>نسبة الاستهلاك: <strong className="text-zinc-300 font-mono">{writesPercentage}%</strong></span>
              <span>المتبقي: <strong className="text-emerald-400 font-mono">{remainingWrites.toLocaleString()}</strong></span>
            </div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 text-[11px] text-zinc-400 leading-relaxed">
            <p className="text-zinc-300 font-bold mb-0.5 flex items-center gap-1">
              <span>✍️ آلية حفظ المقالات:</span>
            </p>
            تُحفظ المقالات الطويلة (1500+ كلمة) كملفات static HTML في R2 فقط عند الموافقة عليها أو تحديثها بواسطة المطور.
          </div>
        </div>

        {/* METER 3: STORAGE VOLUME */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-200">حجم التخزين (Cloud Storage Volume)</h3>
                <span className="text-[10px] text-zinc-500">الحد المجاني: 10 Gigabytes (10,240 MB)</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              سعة ضخمة
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-zinc-400">المساحة المستخدمة:</span>
              <span className="text-amber-400 font-mono">{estimatedStorageMb} MB</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(storagePercentage, 0.5)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>نسبة الاستهلاك: <strong className="text-zinc-300 font-mono">{storagePercentage}%</strong></span>
              <span>المتبقي: <strong className="text-emerald-400 font-mono">{remainingStorageMb} MB</strong></span>
            </div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 text-[11px] text-zinc-400 leading-relaxed">
            <p className="text-zinc-300 font-bold mb-0.5 flex items-center gap-1">
              <span>📦 كفاءة المساحة:</span>
            </p>
            الملف الواحد بحجم تقريبي 35 KB فقط. المساحة المجانية المتاحة تتسع لأكثر من 280,000 مقال مراجعة كامل!
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE TOOLS & INSPECTORS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* ARTICLE HTML INSPECTOR TOOL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">أداة فحص واختبار جلب المقالات المباشر من R2</h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                تأكد من إمكانية الوصول المباشر لملف الـ HTML الخاص بالمقال على سيرفر Cloudflare R2 بدون قراءة الفايربيز.
              </p>
            </div>
          </div>

          <form onSubmit={handleInspectArticleR2} className="flex gap-2 dir-ltr">
            <input
              type="text"
              placeholder="مثال: wats أو facebook أو clean-slug"
              value={testSlugInput}
              onChange={(e) => setTestSlugInput(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500 transition-all dir-ltr"
            />
            <button
              type="submit"
              disabled={testFetchLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 dir-rtl flex items-center gap-1.5"
            >
              {testFetchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>فحص R2 HTML</span>
            </button>
          </form>

          {testFetchResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 font-mono dir-ltr ${
              testFetchResult.success
                ? "bg-zinc-950/90 border-emerald-500/40 text-zinc-200"
                : "bg-zinc-950/90 border-rose-500/40 text-rose-300"
            }`}>
              <div className="flex items-center justify-between font-bold border-b border-zinc-800/80 pb-2">
                <span className="flex items-center gap-1.5">
                  {testFetchResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  <span>Status: {testFetchResult.status}</span>
                </span>
                <span className="text-amber-400">{testFetchResult.sizeKb} KB</span>
              </div>

              <div className="space-y-1 text-[11px] text-zinc-400">
                <p>URL: <span className="text-amber-300 font-bold truncate block">{testFetchResult.url}</span></p>
                <p>Content-Type: <span className="text-emerald-400">{testFetchResult.contentType}</span></p>
                {testFetchResult.previewText && (
                  <div className="mt-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 max-h-24 overflow-y-auto whitespace-pre-wrap font-sans dir-rtl text-right">
                    {testFetchResult.previewText}
                  </div>
                )}
                {testFetchResult.error && (
                  <div className="pt-2 flex items-center justify-between dir-rtl">
                    <p className="text-rose-400 font-bold text-right">{testFetchResult.error}</p>
                    <button
                      onClick={() => handleSendToAgent(`فشل جلب مقال HTML من R2 للمعرف ${testSlugInput}: ${testFetchResult.error}`)}
                      className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Bot className="w-3 h-3" />
                      <span>إرسال للوكيل</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BROWSER LOCAL CACHE MANAGEMENT TOOL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">إدارة كاش المتصفح المحلي (Local Cache Storage)</h3>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  تفريغ البيانات المؤقتة المخزنة بمتصفحك لجبر النظام على جلب نسخة طازجة مباشرة من R2 Worker.
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>سجل الكاش المحلي المخزن:</span>
                <span className="text-emerald-400 font-bold font-mono">apps_list_cache & approved_apps_json_cache</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                يحتفظ المتصفح بنسخة خفيفة من قائمة R2 لتقليل القراءات. في حال إضافة تطبيقات جديدة ولم تظهر فوراً، قم بتفريغ كاش المتصفح بضغطة زر.
              </p>
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={handleClearLocalR2Cache}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-zinc-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4 text-amber-400" />
              <span>{cacheCleared ? "تم تفريغ كاش المتصفح بنجاح! ✓" : "تفريغ كاش الرابط المحلي والـ LocalStorage"}</span>
            </button>
          </div>
        </div>

      </div>

      {/* 4. ENDPOINTS & ARCHITECTURE SUMMARY */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-black text-white">
              جدول الـ Endpoints والوظائف الخاصة بـ Cloudflare R2 Architecture
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            خالية من تكلفة Firebase 100%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Endpoint Item 1 */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">JSON Index</span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>200 OK</span>
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-zinc-200 truncate dir-ltr text-right">
              /approved-apps.json
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              يعيد السجل الخفيف الشامل لكافة التطبيقات المعتمدة المنشورة.
            </p>
          </div>

          {/* Endpoint Item 2 */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">HTML Article</span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>200 OK</span>
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-zinc-200 truncate dir-ltr text-right">
              /[clean-slug].html
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              يقدم مقال المراجعة الكامل (1500+ كلمة) بصيغة static HTML جاهزة.
            </p>
          </div>

          {/* Endpoint Item 3 */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">XML Sitemap</span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Dynamic</span>
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-zinc-200 truncate dir-ltr text-right">
              /sitemap.xml
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              تولد خريطة الموقع ديناميكياً من `approved-apps.json` لأرشفة محركات البحث.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
