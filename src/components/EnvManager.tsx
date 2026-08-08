import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { safeFetchJson } from "../lib/fetchUtils";
import { WindowCopyButton } from "./WindowCopyButton";
import {
  Key,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Github,
  Bell,
  Globe,
  Activity,
  Sparkles,
  Copy,
  Sliders,
  Zap,
  Lock,
  Volume2,
  Mic,
  Headphones
} from "lucide-react";

export interface KeyItem {
  id: string;
  key: string;
  status: "active" | "exhausted" | "low" | "invalid" | "unknown";
  label?: string;
  lastChecked?: string;
  errorMessage?: string;
  responseTimeMs?: number;
  remainingQuota?: number | string;
}

export interface EnvConfigState {
  geminiKeys: KeyItem[];
  groqKeys: KeyItem[];
  elevenlabsKeys?: KeyItem[];
  openaiKeys?: KeyItem[];
  onesignalAppIds: KeyItem[];
  onesignalRestKeys: KeyItem[];
  googleRefreshTokens: KeyItem[];
  githubTokens: KeyItem[];
  githubRepo: string;
  lastSyncedAt?: string;
  activeRotationMessage?: string;
}

interface EnvManagerProps {
  getIdTokenHelper: () => string;
}

export const EnvManager: React.FC<EnvManagerProps> = ({ getIdTokenHelper }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [switchingGroq, setSwitchingGroq] = useState(false);
  const [testingElevenLabs, setTestingElevenLabs] = useState(false);
  const [switchingElevenLabs, setSwitchingElevenLabs] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingOpenAi, setTestingOpenAi] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState(false);

  // Visibility map for hiding/showing secret keys
  const [showKeys, setShowKeys] = useState<{ [id: string]: boolean }>({});

  // Toast State
  const [toast, setToast] = useState<{
    type: "success" | "warning" | "error" | "info";
    message: string;
  } | null>(null);

  // Config State
  const [config, setConfig] = useState<EnvConfigState>({
    geminiKeys: [],
    groqKeys: [],
    elevenlabsKeys: Array.from({ length: 11 }, (_, idx) => ({
      id: `key_elevenlabs_${idx + 1}`,
      key: "",
      label: `مفتاح ElevenLabs #${idx + 1}`,
      status: "unknown"
    })),
    onesignalAppIds: [],
    onesignalRestKeys: [],
    googleRefreshTokens: [],
    githubTokens: [],
    githubRepo: "dodorooh/rooh"
  });

  // Show Toast Helper
  const showToast = (message: string, type: "success" | "warning" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Toggle key visibility
  const toggleVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch Config on Load
  const fetchConfig = async (retryCount = 0) => {
    setLoading(true);
    let loaded = false;
    try {
      const idToken = getIdTokenHelper ? getIdTokenHelper() : "";
      const headers: Record<string, string> = {};
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }
      const { ok, data } = await safeFetchJson("/api/env/config?full=true", { headers });
      if (ok && data && data.config) {
        setConfig(data.config);
        loaded = true;
        if (data.config.activeRotationMessage) {
          showToast(data.config.activeRotationMessage, "warning");
        }
      }
    } catch (err) {
      console.warn("Server API fetch for env config failed, trying client Firestore fallback:", err);
    }

    // Direct Firestore Client Fallback if server API did not return config
    if (!loaded && db) {
      try {
        const docRef = doc(db, "system", "config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as EnvConfigState;
          if (data) {
            setConfig((prev) => ({
              ...prev,
              ...data
            }));
            loaded = true;
          }
        }
      } catch (fsErr) {
        console.warn("Direct Firestore fetch error:", fsErr);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Save Config to Server & Firestore
  const handleSaveConfig = async () => {
    setSaving(true);
    let firestoreSavedDirectly = false;

    // 1. Direct Client-side Firestore Save (Ensures key persistence even on external hosts like GitHub/Vercel)
    if (db) {
      try {
        await setDoc(doc(db, "system", "config"), {
          ...config,
          lastSyncedAt: new Date().toISOString()
        }, { merge: true });

        const activeGemini = config.geminiKeys?.find((k) => k.status === "active")?.key || config.geminiKeys?.[0]?.key || "";
        const activeOpenai = config.openaiKeys?.find((k) => k.status === "active")?.key || config.openaiKeys?.[0]?.key || "";
        const activeOsApp = config.onesignalAppIds?.find((k) => k.status === "active")?.key || config.onesignalAppIds?.[0]?.key || "";
        const activeOsRest = config.onesignalRestKeys?.find((k) => k.status === "active")?.key || config.onesignalRestKeys?.[0]?.key || "";

        await setDoc(doc(db, "settings", "global"), {
          geminiApiKey: activeGemini,
          openaiApiKey: activeOpenai,
          oneSignalAppId: activeOsApp,
          oneSignalRestKey: activeOsRest,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        firestoreSavedDirectly = true;
      } catch (fsErr) {
        console.warn("Direct client Firestore save error:", fsErr);
      }
    }

    // 2. Server API Save & GitHub Secrets Sync
    try {
      const idToken = getIdTokenHelper();
      const { ok, data, error } = await safeFetchJson("/api/env/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(config)
      });

      if (ok && data && data.success) {
        showToast("تم إضافة وتحديث المفاتيح وحفظها بنجاح داخل قواعد البيانات! 🚀", "success");
        if (data.githubSynced) {
          showToast("تم الحفظ والمزامنة مع GitHub Secrets بنجاح! 🔐", "success");
        }
        if (data.config) {
          setConfig(data.config);
        }
      } else if (firestoreSavedDirectly) {
        showToast("تم حفظ المفاتيح بنجاح داخل قاعدة بيانات Firebase Firestore 🚀", "success");
      } else {
        showToast(data?.message || error || "فشل في حفظ الإعدادات", "error");
      }
    } catch (err) {
      console.warn("Notice: Server API save env config notice:", err);
      if (firestoreSavedDirectly) {
        showToast("تم حفظ المفاتيح بنجاح داخل قاعدة بيانات Firebase Firestore 🚀", "success");
      } else {
        showToast("حدث خطأ أثناء حفظ الإعدادات في السيرفر", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Test Gemini Keys (Primary AI Engine)
  const handleTestGeminiKeys = async () => {
    setTestingGemini(true);
    try {
      const idToken = getIdTokenHelper();
      const { ok, data } = await safeFetchJson("/api/env/gemini-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ keys: config.geminiKeys })
      });
      if (ok && data && data.results) {
        setConfig((prev) => ({
          ...prev,
          geminiKeys: data.results
        }));

        if (data.rotated) {
          showToast("تنبيه: تم التبديل للمفتاح الاحتياطي لـ Gemini API نظراً لانتهاء الكووتا ⚠️", "warning");
        } else {
          showToast("تم فحص واختبار جميع مفاتيح Gemini API بنجاح! ✨", "success");
        }
      } else {
        showToast("فشل في اختبار مفاتيح Gemini API", "error");
      }
    } catch (err) {
      console.warn("Notice: Gemini keys test notice:", err);
      showToast("خطأ أثناء اختبار مفاتيح Gemini API", "error");
    } finally {
      setTestingGemini(false);
    }
  };

  // Test All AI Keys (Gemini & Groq / Proq)
  const handleTestAllAiKeys = async () => {
    await handleTestGeminiKeys();
    if (config.groqKeys && config.groqKeys.length > 0) {
      await handleTestGroqKeys();
    }
  };

  // Test Groq / Proq Keys
  const handleTestGroqKeys = async () => {
    setTestingGroq(true);
    try {
      const idToken = getIdTokenHelper();
      const { ok, data } = await safeFetchJson("/api/env/groq-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ keys: config.groqKeys })
      });
      if (ok && data && data.results) {
        setConfig((prev) => ({
          ...prev,
          groqKeys: data.results
        }));

        if (data.rotated) {
          showToast("تنبيه: تم التبديل لمفتاح Proq/Groq الاحتياطي نظراً لاستنفاد أحد المفاتيح ⚠️", "warning");
        } else {
          showToast("تم فحص واختبار جميع مفاتيح Proq / Groq بنجاح! ✨", "success");
        }
      } else {
        showToast("فشل في اختبار مفاتيح Proq / Groq", "error");
      }
    } catch (err) {
      console.warn("Notice: Groq keys test notice:", err);
      showToast("خطأ أثناء اختبار مفاتيح Proq / Groq", "error");
    } finally {
      setTestingGroq(false);
    }
  };

  // Switch Active Groq API Key
  const handleSwitchGroqKey = async (targetIndex?: number) => {
    setSwitchingGroq(true);
    try {
      const idToken = getIdTokenHelper();
      const { ok, data } = await safeFetchJson("/api/env/switch-groq-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          target_index: targetIndex,
          reason: "طلب المطور التبديل اليدوي من لوحة التحكم"
        })
      });

      if (ok && data && data.success) {
        showToast(`⚙️ ${data.message}`, "success");
        await fetchConfig();
      } else {
        showToast(data?.message || "فشل في التبديل بين مفاتيح Groq API", "error");
      }
    } catch (err) {
      console.warn("Notice: Switch Groq key exception:", err);
      showToast("خطأ أثناء التبديل بين مفاتيح Groq API", "error");
    } finally {
      setSwitchingGroq(false);
    }
  };

  // Test ElevenLabs (11 Keys) Quota & Status
  const handleTestElevenLabsKeys = async () => {
    setTestingElevenLabs(true);
    try {
      const idToken = getIdTokenHelper();
      const { ok, data } = await safeFetchJson("/api/env/elevenlabs-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ keys: config.elevenlabsKeys })
      });
      if (ok && data && data.results) {
        setConfig((prev) => ({
          ...prev,
          elevenlabsKeys: data.results
        }));

        if (data.rotated) {
          showToast("تنبيه: تم رصد نفاد كوتا أحد مفاتيح ElevenLabs وجاهزية التبديل التلقائي 🎙️⚠️", "warning");
        } else {
          showToast("تم فحص واختبار جميع مفاتيح ElevenLabs بنجاح! 🎙️✨", "success");
        }
      } else {
        showToast("فشل في اختبار مفاتيح ElevenLabs", "error");
      }
    } catch (err) {
      console.warn("Notice: ElevenLabs keys test notice:", err);
      showToast("خطأ أثناء اختبار مفاتيح ElevenLabs", "error");
    } finally {
      setTestingElevenLabs(false);
    }
  };

  // Switch Active ElevenLabs API Key
  const handleSwitchElevenLabsKey = async (targetIndex?: number) => {
    setSwitchingElevenLabs(true);
    try {
      const idToken = getIdTokenHelper();
      const { ok, data } = await safeFetchJson("/api/env/switch-elevenlabs-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          target_index: targetIndex,
          reason: "طلب المطور التبديل اليدوي من لوحة التحكم"
        })
      });

      if (ok && data && data.success) {
        showToast(`🎙️ ${data.message}`, "success");
        await fetchConfig();
      } else {
        showToast(data?.message || "فشل في التبديل بين مفاتيح ElevenLabs API", "error");
      }
    } catch (err) {
      console.warn("Notice: Switch ElevenLabs key exception:", err);
      showToast("خطأ أثناء التبديل بين مفاتيح ElevenLabs API", "error");
    } finally {
      setSwitchingElevenLabs(false);
    }
  };

  // Test GitHub Tokens Status
  const handleTestGithubTokens = async () => {
    setTestingGithub(true);
    try {
      const idToken = getIdTokenHelper();
      const { ok, data } = await safeFetchJson("/api/env/github-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ tokens: config.githubTokens, repo: config.githubRepo })
      });
      if (ok && data && data.results) {
        setConfig((prev) => ({
          ...prev,
          githubTokens: data.results
        }));
        showToast("تم فحص واختبار حالة توكن GitHub وتأكيد عمله بنجاح! 🚀", "success");
      } else {
        showToast("فشل في فحص مفتاح GitHub Token", "error");
      }
    } catch (err) {
      console.warn("Notice: GitHub token test notice:", err);
      showToast("خطأ أثناء فحص مفتاح GitHub Token", "error");
    } finally {
      setTestingGithub(false);
    }
  };

  // Manual GitHub Sync
  const handleSyncGithub = async () => {
    setSyncingGithub(true);
    try {
      const idToken = getIdTokenHelper();
      const { ok, data } = await safeFetchJson("/api/env/sync-github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          githubRepo: config.githubRepo,
          githubTokens: config.githubTokens
        })
      });
      if (ok && data && data.success) {
        showToast(`تمت المزامنة بنجاح مع GitHub Secrets! (${data.count || 0} مفاتيح) 🔐`, "success");
      } else {
        showToast(data?.message || "فشل في المزامنة مع GitHub", "error");
      }
    } catch (err) {
      console.warn("Notice: GitHub sync notice:", err);
      showToast("حدث خطأ أثناء المزامنة مع GitHub Secrets", "error");
    } finally {
      setSyncingGithub(false);
    }
  };

  // Add Item Helper
  const addItem = (category: keyof Omit<EnvConfigState, "githubRepo" | "lastSyncedAt" | "activeRotationMessage">) => {
    const newItem: KeyItem = {
      id: "key_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      key: "",
      status: "active"
    };
    setConfig((prev) => ({
      ...prev,
      [category]: [...(prev[category] as KeyItem[]), newItem]
    }));
  };

  // Update Item Key Helper
  const updateItemKey = (
    category: keyof Omit<EnvConfigState, "githubRepo" | "lastSyncedAt" | "activeRotationMessage">,
    id: string,
    value: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      [category]: (prev[category] as KeyItem[]).map((item) =>
        item.id === id ? { ...item, key: value, status: "active" } : item
      )
    }));
  };

  // Remove Item Helper
  const removeItem = (
    category: keyof Omit<EnvConfigState, "githubRepo" | "lastSyncedAt" | "activeRotationMessage">,
    id: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      [category]: (prev[category] as KeyItem[]).filter((item) => item.id !== id)
    }));
  };

  // Render Status Badge
  const renderStatusBadge = (status: KeyItem["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>نشط (جاهز)</span>
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>قارب على الانتهاء</span>
          </span>
        );
      case "exhausted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <XCircle className="w-3 h-3" />
            <span>مستنفد (انتهى الرصيد)</span>
          </span>
        );
      case "invalid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" />
            <span>غير صالح</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            <span>لم يفحص</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-bold">جاري تحميل منظومة إدارة متغيرات البيئة والمفاتيح الحساسة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right font-sans" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 left-5 z-50 max-w-md px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
              : toast.type === "warning"
              ? "bg-amber-950/90 border-amber-500/40 text-amber-200"
              : toast.type === "error"
              ? "bg-rose-950/90 border-rose-500/40 text-rose-200"
              : "bg-zinc-900/90 border-zinc-700 text-zinc-200"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
          {toast.type === "error" && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === "info" && <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />}
          <div className="text-xs sm:text-sm font-bold leading-relaxed">{toast.message}</div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 border border-zinc-800 shadow-2xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black">
              <ShieldCheck className="w-4 h-4" />
              <span>نظام الأمان والتبديل التلقائي (Auto-Rotation & Fallback)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>إدارة متغيرات البيئة والمفاتيح الحساسة</span>
              <Sliders className="w-7 h-7 text-blue-500" />
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              قم بإضافة وتتبع مفاتيح الذكاء الاصطناعي والخدمات البرمجية (Gemini API, OpenAI, OneSignal, Google Indexing, GitHub) مع دعم التناوب والتكرار للتبديل التلقائي عند استنفاذ الرصيد، والمزامنة اللحظية مع GitHub Secrets و Firestore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-600/25 flex items-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ الإعدادات والمزامنة</span>
            </button>

            <button
              onClick={handleTestAllAiKeys}
              disabled={testingGemini || testingOpenAi}
              className="px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {testingGemini || testingOpenAi ? <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> : <Activity className="w-4 h-4 text-purple-400" />}
              <span>فحص مفاتيح AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Gemini API Multi-Key Management & Dashboard (Primary AI Provider) */}
      <div className="rounded-3xl bg-zinc-950 p-6 sm:p-8 border border-purple-500/30 shadow-2xl shadow-purple-950/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>مفاتيح Gemini API (المُحرّك الأساسي الرئيسي للذكاء الاصطناعي)</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2.5 py-0.5 rounded-full">
                  GEMINI_API_KEYS (الأساسي) ({config.geminiKeys ? config.geminiKeys.length : 0})
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                تعتمد المنظومة كلياً على Gemini لإنشاء المقالات الصحفية والشروحات واستخراج الكلمات المفتاحية مع دعم التبديل التلقائي بين المفاتيح في حال انتهاء الكووتا.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <WindowCopyButton windowId="WINDOW_ENV_GEMINI_KEYS" />
            <button
              onClick={handleTestGeminiKeys}
              disabled={testingGemini}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {testingGemini ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>فحص مفاتيح Gemini</span>
            </button>

            <button
              onClick={() => addItem("geminiKeys")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مفتاح Gemini جديد</span>
            </button>
          </div>
        </div>

        {/* Gemini Keys List */}
        <div className="space-y-4">
          {!config.geminiKeys || config.geminiKeys.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-dashed border-purple-500/20 text-center text-zinc-400 text-xs font-bold space-y-2">
              <p>لا يوجد أي مفتاح Gemini مسجل حالياً في النظام.</p>
              <p className="text-purple-400">انقر على زر "إضافة مفتاح Gemini جديد" لإضافة المفتاح الأساسي وتأمين المحرك الذكي.</p>
            </div>
          ) : (
            config.geminiKeys.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                  index === 0
                    ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-500/5"
                    : "bg-zinc-900/40 border-zinc-800"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30">
                      {index === 0 ? "★ المفتاح الأساسي الرئيسي (#1)" : `مفتاح Gemini احتياطي (#${index + 1})`}
                    </span>
                    {renderStatusBadge(item.status)}
                    {item.responseTimeMs && (
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        {item.responseTimeMs}ms
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {showKeys[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showKeys[item.id] ? "إخفاء" : "إظهار"}</span>
                    </button>

                    <button
                      onClick={() => removeItem("geminiKeys", item.id)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-all cursor-pointer"
                      title="حذف المفتاح"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showKeys[item.id] ? "text" : "password"}
                    value={item.key}
                    onChange={(e) => updateItemKey("geminiKeys", item.id, e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-zinc-100 focus:outline-none focus:border-purple-500 transition-all ltr"
                    dir="ltr"
                  />
                </div>

                {item.errorMessage && (
                  <p className="text-[11px] font-bold text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>سبب التوقف/الخطأ: {item.errorMessage}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: Proq / Groq Multi-Key Management & Rotation Engine */}
      <div className="rounded-3xl bg-zinc-950 p-6 sm:p-8 border border-emerald-500/30 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>مفاتيح شركة Proq / Groq (التبديل التلقائي والحالة اللحظية)</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  PROQ_GROQ_KEYS ({config.groqKeys ? config.groqKeys.length : 0})
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                تدار المفاتيح بنظام التناوب الديناميكي بدقة وبدون توقف مع عرض حالة كل مفتاح (يعمل / لا يعمل) وسبب التوقف إن وجد.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <WindowCopyButton windowId="WINDOW_ENV_GROQ_KEYS" />
            <button
              onClick={() => handleSwitchGroqKey()}
              disabled={switchingGroq}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/5"
              title="التبديل الفوري إلى مفتاح Groq/Proq التالي لتبادل الأحمال (switch_groq_key)"
            >
              {switchingGroq ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
              <span>التبديل للمفتاح التالي (switch_groq_key)</span>
            </button>

            <button
              onClick={handleTestGroqKeys}
              disabled={testingGroq}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {testingGroq ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>فحص مفاتيح Groq</span>
            </button>

            <button
              onClick={() => addItem("groqKeys")}
              className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مفتاح Groq جديد</span>
            </button>
          </div>
        </div>

        {/* Proq / Groq Keys List */}
        <div className="space-y-4">
          {!config.groqKeys || config.groqKeys.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-dashed border-zinc-800 text-center text-zinc-500 text-xs font-bold">
              لا يوجد أي مفتاح Proq مسجل حالياً. انقر على زر "إضافة مفتاح Proq جديد" للبدء.
            </div>
          ) : (
            config.groqKeys.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                  index === 0
                    ? "bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                    : "bg-zinc-900/40 border-zinc-800"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                      item.status === 'active'
                        ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 shadow-sm'
                        : 'text-zinc-400 bg-zinc-800/80 border-zinc-700'
                    }`}>
                      {item.status === 'active' ? `★ المفتاح النشط (#${index + 1})` : `مفتاح Groq (#${index + 1})`}
                    </span>
                    {renderStatusBadge(item.status)}
                    {item.responseTimeMs && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {item.responseTimeMs}ms
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status !== 'active' && (
                      <button
                        onClick={() => handleSwitchGroqKey(index + 1)}
                        disabled={switchingGroq}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="تفعيل هذا المفتاح كمفتاح نشط حالي"
                      >
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span>تفعيل الآن</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {showKeys[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showKeys[item.id] ? "إخفاء" : "إظهار"}</span>
                    </button>

                    <button
                      onClick={() => removeItem("groqKeys", item.id)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-all cursor-pointer"
                      title="حذف المفتاح"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showKeys[item.id] ? "text" : "password"}
                    value={item.key}
                    onChange={(e) => updateItemKey("groqKeys", item.id, e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-black/60 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500 transition-all ltr"
                    dir="ltr"
                  />
                </div>

                {item.errorMessage && (
                  <p className="text-[11px] font-bold text-rose-400 bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>سبب عدم التشغيل / التوقف: {item.errorMessage}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 3: ElevenLabs Voice Multi-Key Engine (11 Keys Auto-Failover) */}
      <div className="rounded-3xl bg-zinc-950 p-6 sm:p-8 border border-purple-500/30 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>مفاتيح الذكاء الصوتي ElevenLabs (مصفوفة الـ 11 مفتاحاً للتبديل التلقائي)</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2.5 py-0.5 rounded-full border border-purple-500/30">
                  ELEVENLABS_KEYS ({config.elevenlabsKeys ? config.elevenlabsKeys.length : 0} / 11)
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                نظام تبديل ذكي بين 11 مفتاح مجاني لـ ElevenLabs. عند استنفاد كوتا أي مفتاح، يتم التبديل تلقائياً للمفتاح التالي، وفي حال نفاذ جميع المفاتيح يواصل المساعد الكتابة النصية بدون توقف.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <WindowCopyButton windowId="WINDOW_ENV_ELEVENLABS_KEYS" />
            <button
              onClick={() => handleSwitchElevenLabsKey()}
              disabled={switchingElevenLabs}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-500/5"
              title="التبديل الفوري إلى مفتاح ElevenLabs التالي"
            >
              {switchingElevenLabs ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <RefreshCw className="w-3.5 h-3.5 text-purple-400" />}
              <span>التبديل للمفتاح التالي</span>
            </button>

            <button
              onClick={handleTestElevenLabsKeys}
              disabled={testingElevenLabs}
              className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {testingElevenLabs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>فحص كوتا المفاتيح (11 Keys)</span>
            </button>

            <button
              onClick={() => addItem("elevenlabsKeys")}
              className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مفتاح جديد</span>
            </button>
          </div>
        </div>

        {/* ElevenLabs Keys List */}
        <div className="space-y-4">
          {!config.elevenlabsKeys || config.elevenlabsKeys.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-dashed border-zinc-800 text-center text-zinc-500 text-xs font-bold">
              لا توجد مفاتيح مسجلة. انقر على "إضافة مفتاح جديد" لوضع مفاتيح ElevenLabs الـ 11.
            </div>
          ) : (
            config.elevenlabsKeys.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                  item.status === 'active'
                    ? "bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-500/5"
                    : "bg-zinc-900/40 border-zinc-800"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                      item.status === 'active'
                        ? 'text-purple-300 bg-purple-500/20 border-purple-500/40 shadow-sm'
                        : 'text-zinc-400 bg-zinc-800/80 border-zinc-700'
                    }`}>
                      {item.status === 'active' ? `★ الصوت النشط (#${index + 1})` : `مفتاح ElevenLabs (#${index + 1})`}
                    </span>
                    {renderStatusBadge(item.status)}
                    {item.remainingQuota && (
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                        الرصيد: {item.remainingQuota}
                      </span>
                    )}
                    {item.responseTimeMs && (
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        {item.responseTimeMs}ms
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status !== 'active' && item.key && (
                      <button
                        onClick={() => handleSwitchElevenLabsKey(index + 1)}
                        disabled={switchingElevenLabs}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="تفعيل هذا المفتاح كمفتاح صوت نشط حالي"
                      >
                        <Zap className="w-3.5 h-3.5 text-purple-400" />
                        <span>تفعيل الآن</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {showKeys[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showKeys[item.id] ? "إخفاء" : "إظهار"}</span>
                    </button>

                    <button
                      onClick={() => removeItem("elevenlabsKeys", item.id)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-all cursor-pointer"
                      title="حذف المفتاح"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showKeys[item.id] ? "text" : "password"}
                    value={item.key}
                    onChange={(e) => updateItemKey("elevenlabsKeys", item.id, e.target.value)}
                    placeholder="sk_... أو مفتاح ElevenLabs API"
                    className="w-full bg-black/60 border border-purple-500/20 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-zinc-100 focus:outline-none focus:border-purple-500 transition-all ltr"
                    dir="ltr"
                  />
                </div>

                {item.errorMessage && (
                  <p className="text-[11px] font-bold text-rose-400 bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>سبب التوقف / الرصيد: {item.errorMessage}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: OneSignal Credentials (APP IDs & REST Keys) */}
      <div className="rounded-3xl bg-zinc-950 p-6 sm:p-8 border border-zinc-800/80 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>إشغارات OneSignal (App IDs & REST API Keys)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              إدارة معرفات ومفاتيح الإشعارات الفورية لربط التطبيق مع عدة حسابات OneSignal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OneSignal App IDs */}
          <div className="space-y-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-200">ONESIGNAL_APP_IDS</span>
              <button
                onClick={() => addItem("onesignalAppIds")}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة App ID</span>
              </button>
            </div>

            <div className="space-y-3">
              {config.onesignalAppIds.length === 0 ? (
                <div className="p-4 rounded-xl bg-black/40 text-center text-zinc-500 text-xs">
                  لا توجد معرفات App ID مضافة.
                </div>
              ) : (
                config.onesignalAppIds.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type={showKeys[item.id] ? "text" : "password"}
                      value={item.key}
                      onChange={(e) => updateItemKey("onesignalAppIds", item.id, e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="flex-1 bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-500 transition-all ltr"
                      dir="ltr"
                    />
                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                    >
                      {showKeys[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => removeItem("onesignalAppIds", item.id)}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* OneSignal REST API Keys */}
          <div className="space-y-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-200">ONESIGNAL_REST_API_KEYS</span>
              <button
                onClick={() => addItem("onesignalRestKeys")}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة REST Key</span>
              </button>
            </div>

            <div className="space-y-3">
              {config.onesignalRestKeys.length === 0 ? (
                <div className="p-4 rounded-xl bg-black/40 text-center text-zinc-500 text-xs">
                  لا توجد مفاتيح REST Key مضافة.
                </div>
              ) : (
                config.onesignalRestKeys.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type={showKeys[item.id] ? "text" : "password"}
                      value={item.key}
                      onChange={(e) => updateItemKey("onesignalRestKeys", item.id, e.target.value)}
                      placeholder="os_v2_app_..."
                      className="flex-1 bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-500 transition-all ltr"
                      dir="ltr"
                    />
                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                    >
                      {showKeys[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => removeItem("onesignalRestKeys", item.id)}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Google Indexing API Tokens */}
      <div className="rounded-3xl bg-zinc-950 p-6 sm:p-8 border border-zinc-800/80 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>أرشفة Google Indexing API (GOOGLE_REFRESH_TOKENS)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                مفاتيح الـ Refresh Token للأرشفة الفورية والمباشرة للصفحات في Google Search Console.
              </p>
            </div>
          </div>

          <button
            onClick={() => addItem("googleRefreshTokens")}
            className="px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة Token أرشفة إضافي</span>
          </button>
        </div>

        <div className="space-y-3">
          {config.googleRefreshTokens.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-dashed border-zinc-800 text-center text-zinc-500 text-xs font-bold">
              لا توجد رموز Google Refresh Token مضافة حالياً.
            </div>
          ) : (
            config.googleRefreshTokens.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-lg shrink-0">
                  #{index + 1}
                </span>
                <input
                  type={showKeys[item.id] ? "text" : "password"}
                  value={item.key}
                  onChange={(e) => updateItemKey("googleRefreshTokens", item.id, e.target.value)}
                  placeholder="1//04..."
                  className="flex-1 bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500 transition-all ltr"
                  dir="ltr"
                />
                <button
                  onClick={() => toggleVisibility(item.id)}
                  className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                >
                  {showKeys[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => removeItem("googleRefreshTokens", item.id)}
                  className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 4: GitHub Tokens & Auto-Sync Secrets */}
      <div className="rounded-3xl bg-zinc-950 p-6 sm:p-8 border border-zinc-800/80 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>مزامنة GitHub Secrets و GITHUB_TOKENS</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                تحديث مفاتيح المشروع تلقائياً كـ Repository Secrets في GitHub باستخدام خوارزمية التشفير Libsodium.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestGithubTokens}
              disabled={testingGithub}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {testingGithub ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              <span>فحص حالة GitHub Token</span>
            </button>

            <button
              onClick={handleSyncGithub}
              disabled={syncingGithub}
              className="px-5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              {syncingGithub ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-purple-400" />}
              <span>مزامنة GitHub Secrets الآن</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800 space-y-2">
            <label className="text-xs font-black text-zinc-300 block">اسم مستودع GitHub (Repository Path):</label>
            <input
              type="text"
              value={config.githubRepo}
              onChange={(e) => setConfig((prev) => ({ ...prev, githubRepo: e.target.value }))}
              placeholder="username/repository-name"
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-purple-500 transition-all ltr"
              dir="ltr"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-200">GITHUB_TOKENS (Personal Access Tokens)</span>
              <button
                onClick={() => addItem("githubTokens")}
                className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة Token</span>
              </button>
            </div>

            {config.githubTokens.length === 0 ? (
              <div className="p-4 rounded-xl bg-black/40 text-center text-zinc-500 text-xs">
                لا توجد رموز GitHub Token مضافة.
              </div>
            ) : (
              config.githubTokens.map((item, index) => (
                <div key={item.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-lg shrink-0">
                        #{index + 1} {item.label ? `- ${item.label}` : ''}
                      </span>
                      {renderStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleVisibility(item.id)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                      >
                        {showKeys[item.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => removeItem("githubTokens", item.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <input
                    type={showKeys[item.id] ? "text" : "password"}
                    value={item.key}
                    onChange={(e) => updateItemKey("githubTokens", item.id, e.target.value)}
                    placeholder="ghp_..."
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-purple-500 transition-all ltr"
                    dir="ltr"
                  />
                  {item.errorMessage && (
                    <p className="text-[11px] font-bold text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>سبب عدم التفعيل: {item.errorMessage}</span>
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
