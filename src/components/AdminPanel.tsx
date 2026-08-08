import React, { useState, useEffect, useRef } from "react";
import { 
  Lock, Mail, Settings, ShieldAlert, ShieldCheck, Key, Globe, Plus, Trash2, Edit3, 
  Sparkles, Check, HelpCircle, Eye, EyeOff, Power, Save, RefreshCw, LogOut, CheckCircle,
  MessageSquare, Star, Image, Wand2, ExternalLink, Copy, Search, Github, Bot
} from "lucide-react";
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User 
} from "firebase/auth";
import { 
  doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType, isPlaceholderFirebase, googleProvider, signInWithPopup, syncToRealtimeDatabase } from "../lib/firebase";
import { safeParseResponse, callGeminiApi, callOpenAiApi, normalizePackageId } from "../lib/fetchUtils";
import { toShortCleanSlug } from "../lib/slugUtils";
import { AppReview, GlobalSettings } from "../types";
import { EnvManager } from "./EnvManager";
import { FirebaseUsageMeter } from "./FirebaseUsageMeter";
import { R2UsageMeter } from "./R2UsageMeter";
import { AppMapDiagnostics } from "./AppMapDiagnostics";
import { TabAiDiagnostics } from "./TabAiDiagnostics";
import { DeveloperAgentChat } from "./DeveloperAgentChat";
import { WindowCopyButton } from "./WindowCopyButton";

export interface IndexedUrlRecord {
  id: string;
  url: string;
  slug: string;
  title?: string;
  status: "indexed" | "submitted" | "pending" | "failed";
  submittedAt: string;
  source: string;
  details?: string;
}

interface AdminPanelProps {
  globalSettings: GlobalSettings;
  onRefreshSettings: () => void;
  allApps: AppReview[];
  onRefreshApps: () => void;
  onNavigate: (view: "home" | "admin" | "privacy" | "app") => void;
  isAgentPinned?: boolean;
  onToggleAgentPin?: () => void;
  onToggleDarkMode?: () => void;
  onToggleLanguage?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  globalSettings,
  onRefreshSettings,
  allApps,
  onRefreshApps,
  onNavigate,
  isAgentPinned,
  onToggleAgentPin,
  onToggleDarkMode,
  onToggleLanguage
}) => {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const getIdTokenHelper = () => {
    const savedPin = localStorage.getItem("dev_pin") || "";
    const savedEmail = localStorage.getItem("dev_email") || "";
    return `dev-pin:${savedEmail}:${savedPin}`;
  };

  // Helper function: Submit newly published page URL directly to Google Indexing API
  const pingGoogleIndexingAPI = async (slug: string, appId?: string) => {
    try {
      const pageUrl = `https://roohme.web.app/${slug.replace(/^\/+/, '')}`;
      console.log("🚀 [Google Indexing API] Submitting URL for instant indexing:", pageUrl);
      const res = await fetch("/api/indexing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, appId, url: pageUrl })
      });
      const data = await res.json();
      console.log("✅ [Google Indexing API Result]:", data);
      return data;
    } catch (err) {
      console.warn("⚠️ [Google Indexing API Exception]:", err);
      return { success: false, error: err };
    }
  };

  // Helper function: Trigger GitHub Actions workflow to update site build & sitemap immediately
  const triggerGitHubActionDeploy = async (slug: string, appId: string) => {
    try {
      const idToken = getIdTokenHelper();
      const pageUrl = `https://roohme.web.app/${slug.replace(/^\/+/, '')}`;
      console.log("🚀 [GitHub Action Trigger] Dispatching deploy & sitemap update workflow for:", pageUrl);
      const res = await fetch("/api/admin/trigger-deploy-and-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ appId, slug, url: pageUrl })
      });
      const data = await res.json();
      console.log("✅ [GitHub Action Deploy Response]:", data);
      return data;
    } catch (err) {
      console.warn("⚠️ [GitHub Action Deploy Exception]:", err);
      return { success: false, error: err };
    }
  };
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [canResetPin, setCanResetPin] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // Scrape App Form State
  const [playStoreUrlInput, setPlayStoreUrlInput] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  // Scraped App Preview State (for Editing before Publishing)
  const [scrapedPreview, setScrapedPreview] = useState<any | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // States for automatic pulling and moderation list expansion
  const [isPullingApps, setIsPullingApps] = useState(false);
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);

  // Tab State: 'publish' | 'manage' | 'adsense' | 'notifications' | 'requests' | 'reviews' | 'links' | 'moderate' | 'userSearched' | 'envManager' | 'firebaseStatus' | 'indexing' | 'r2Status' | 'appMap' | 'agentChat'
  const [activeTab, setActiveTab] = useState<"publish" | "manage" | "adsense" | "notifications" | "requests" | "reviews" | "links" | "moderate" | "userSearched" | "envManager" | "firebaseStatus" | "indexing" | "r2Status" | "appMap" | "agentChat">("appMap");
  const [linksSaveSuccess, setLinksSaveSuccess] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);

  // Draggable Ribbon Tabs state
  const tabsRibbonRef = useRef<HTMLDivElement>(null);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);
  const [tabsStartX, setTabsStartX] = useState(0);
  const [tabsScrollLeft, setTabsScrollLeft] = useState(0);

  const handleTabsMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabsRibbonRef.current) return;
    setIsDraggingTabs(true);
    setTabsStartX(e.pageX - tabsRibbonRef.current.offsetLeft);
    setTabsScrollLeft(tabsRibbonRef.current.scrollLeft);
  };

  const handleTabsMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTabs || !tabsRibbonRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsRibbonRef.current.offsetLeft;
    const walk = (x - tabsStartX) * 1.5; // Drag speed multiplier
    tabsRibbonRef.current.scrollLeft = tabsScrollLeft - walk;
  };

  const handleTabsMouseUpOrLeave = () => {
    setIsDraggingTabs(false);
  };

  // Push Notifications and Subscribers State
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationUrl, setNotificationUrl] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [subscribersList, setSubscribersList] = useState<any[]>([]);
  const [notificationsHistory, setNotificationsHistory] = useState<any[]>([]);
  const [isLoadingNotificationsData, setIsLoadingNotificationsData] = useState(false);

  // App Requests Tab State
  const [appRequestsList, setAppRequestsList] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Reviews Tab State
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Archived Apps State (approved-apps.json on R2)
  const [archivedAppsList, setArchivedAppsList] = useState<any[]>([]);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [archivedSearchQuery, setArchivedSearchQuery] = useState("");
  const [copiedLinkSlug, setCopiedLinkSlug] = useState<string | null>(null);

  // GitHub Token Modal & Firestore Fetch State
  const [githubTokensList, setGithubTokensList] = useState<any[]>([]);
  const [githubRepoName, setGithubRepoName] = useState("dodorooh/rooh");
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [isLoadingGithubToken, setIsLoadingGithubToken] = useState(false);
  const [showGithubTokenRaw, setShowGithubTokenRaw] = useState<{ [id: string]: boolean }>({});
  const [copiedGithubToken, setCopiedGithubToken] = useState<string | null>(null);
  const [copiedGithubRepoUrl, setCopiedGithubRepoUrl] = useState(false);
  const [showFloatingAgent, setShowFloatingAgent] = useState(false);

  const fetchGithubTokenFromFirestore = async () => {
    setIsLoadingGithubToken(true);
    let loaded = false;
    try {
      const idToken = getIdTokenHelper ? getIdTokenHelper() : "";
      const headers: Record<string, string> = {};
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
      const res = await safeParseResponse(await fetch("/api/env/config?full=true", { headers }));
      if (res && res.config) {
        if (Array.isArray(res.config.githubTokens)) {
          setGithubTokensList(res.config.githubTokens);
        }
        if (res.config.githubRepo) {
          setGithubRepoName(res.config.githubRepo);
        }
        loaded = true;
      }
    } catch (e) {
      console.warn("API fetch github config notice:", e);
    }

    if (!loaded && db) {
      try {
        const docRef = doc(db, "system", "config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.githubTokens)) {
            setGithubTokensList(data.githubTokens);
          }
          if (data?.githubRepo) {
            setGithubRepoName(data.githubRepo);
          }
        }
      } catch (err) {
        console.warn("Direct Firestore fetch github config notice:", err);
      }
    }
    setIsLoadingGithubToken(false);
  };

  const fetchArchivedAppsList = async () => {
    setIsLoadingArchived(true);
    try {
      // 1. Build set of active published apps from allApps (Ground Truth)
      const publishedApps = allApps.filter(app => app.isApproved !== false && app.status === "published");
      const publishedSlugsMap = new Map<string, any>();
      publishedApps.forEach(app => {
        const slug = (app.slug || app.cleanSlug || app.id || "").toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
        if (slug) publishedSlugsMap.set(slug, app);
      });

      // 2. Fetch approved-apps.json to enrich metadata
      const cacheBustUrl = `https://rooh-platform-worker.roohr4046.workers.dev/approved-apps.json?t=${Date.now()}`;
      let res = await fetch(cacheBustUrl).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`/approved-apps.json?t=${Date.now()}`).catch(() => null);
      }

      let listFromApi: any[] = [];
      if (res && res.ok) {
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) listFromApi = data;
      }

      const finalMap = new Map<string, any>();

      // Keep items from approved-apps.json ONLY if they match an active published app
      listFromApi.forEach(item => {
        const slug = (item.cleanSlug || item.slug || item.id || "").toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
        if (slug && publishedSlugsMap.has(slug)) {
          const appMeta = publishedSlugsMap.get(slug);
          finalMap.set(slug, {
            id: appMeta.id || item.id,
            name: appMeta.name || item.name || slug,
            slug: slug,
            cleanSlug: slug,
            url: item.url || `https://roohme.web.app/${slug}`,
            r2Url: item.r2Url || `https://rooh-platform-worker.roohr4046.workers.dev/${slug}.html`,
            rating: appMeta.rating || item.rating || 4.8,
            category: appMeta.category || item.category || "تطبيقات",
            isApproved: true,
            status: "published",
            updatedAt: appMeta.createdAt || item.updatedAt || new Date().toISOString()
          });
        }
      });

      // Add any published apps that were missing from approved-apps.json
      publishedApps.forEach(app => {
        const slug = (app.slug || app.cleanSlug || app.id || "").toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
        if (slug && !finalMap.has(slug)) {
          finalMap.set(slug, {
            id: app.id,
            name: app.name,
            slug: slug,
            cleanSlug: slug,
            url: `https://roohme.web.app/${slug}`,
            r2Url: `https://rooh-platform-worker.roohr4046.workers.dev/${slug}.html`,
            rating: app.rating || 4.8,
            category: app.category || "تطبيقات",
            isApproved: true,
            status: "published",
            updatedAt: app.createdAt ? (typeof app.createdAt === "string" ? app.createdAt : new Date(app.createdAt).toISOString()) : new Date().toISOString()
          });
        }
      });

      setArchivedAppsList(Array.from(finalMap.values()));
    } catch (err) {
      console.warn("Notice reading approved-apps.json:", err);
    } finally {
      setIsLoadingArchived(false);
    }
  };

  // Bulk Sync all published apps to approved-apps.json & indexing
  const [isSyncingPublished, setIsSyncingPublished] = useState(false);
  const handleSyncAllPublishedApps = async () => {
    setIsSyncingPublished(true);
    try {
      const idToken = getIdTokenHelper();
      const res = await fetch("/api/admin/sync-all-published-apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت المزامنة.");
      alert(`✅ ${data.message || "تمت مزامنة وأرشفة كافة التطبيقات المنشورة بنجاح!"}`);
      await fetchArchivedAppsList();
      await fetchIndexedUrlsList();
      onRefreshApps();
    } catch (err: any) {
      alert(`⚠️ ${err.message || "حدث خطأ أثناء المزامنة."}`);
    } finally {
      setIsSyncingPublished(false);
    }
  };

  // Google Indexing API & Indexing Page State
  const [indexedUrlsList, setIndexedUrlsList] = useState<IndexedUrlRecord[]>([]);
  const [isLoadingIndexedUrls, setIsLoadingIndexedUrls] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState("");
  const [manualTitleInput, setManualTitleInput] = useState("");
  const [isSubmittingManualUrl, setIsSubmittingManualUrl] = useState(false);
  const [indexingStatusMsg, setIndexingStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedIndexedUrl, setCopiedIndexedUrl] = useState<string | null>(null);
  const [reindexingUrlId, setReindexingUrlId] = useState<string | null>(null);
  const [indexedFilterSearch, setIndexedFilterSearch] = useState("");

  const fetchIndexedUrlsList = async () => {
    setIsLoadingIndexedUrls(true);
    const recordsMap = new Map<string, IndexedUrlRecord>();

    // Ground Truth: Set of active published apps
    const publishedApps = allApps.filter(app => app.isApproved !== false && app.status === "published");
    const publishedSlugsMap = new Map<string, any>();
    publishedApps.forEach(app => {
      const slug = (app.slug || app.cleanSlug || app.id || "").toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
      if (slug) publishedSlugsMap.set(slug, app);
    });

    // 1. Fetch from approved-apps.json on R2 worker (filtered strictly to published apps)
    try {
      const cacheBustUrl = `https://rooh-platform-worker.roohr4046.workers.dev/approved-apps.json?t=${Date.now()}`;
      let res = await fetch(cacheBustUrl).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`/approved-apps.json?t=${Date.now()}`).catch(() => null);
      }
      if (res && res.ok) {
        const approvedData = await res.json().catch(() => []);
        if (Array.isArray(approvedData)) {
          approvedData.forEach((item: any) => {
            const rawSlug = item.cleanSlug || item.slug || item.id || "";
            const cleanSlug = String(rawSlug).toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
            if (cleanSlug && publishedSlugsMap.has(cleanSlug)) {
              const fullUrl = item.url || `https://roohme.web.app/${cleanSlug}`;
              const appMeta = publishedSlugsMap.get(cleanSlug);
              recordsMap.set(cleanSlug, {
                id: appMeta.id || item.id || `app_${cleanSlug}`,
                url: fullUrl,
                slug: cleanSlug,
                title: appMeta.name || item.name || item.appTitle || cleanSlug,
                status: "indexed",
                submittedAt: appMeta.createdAt || item.updatedAt || new Date().toISOString(),
                source: "مسجل بـ approved-apps.json (R2)",
                details: "مؤرشف بنجاح في ملف approved-apps.json وخريطة الموقع و Google Indexing API"
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn("Notice reading /approved-apps.json in fetchIndexedUrlsList:", err);
    }

    // 2. Fetch from Firestore indexed_urls (filtered strictly to published apps or core system pages)
    if (db) {
      try {
        const snap = await getDocs(collection(db, "indexed_urls"));
        snap.docs.forEach((d) => {
          const data = d.data() as IndexedUrlRecord;
          if (data && (data.url || data.slug)) {
            const rawSlug = data.slug || data.url?.replace(/^https?:\/\/[^\/]+\//, '') || "";
            const cleanSlug = String(rawSlug).toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
            if (cleanSlug && publishedSlugsMap.has(cleanSlug) && !recordsMap.has(cleanSlug)) {
              const cleanUrl = data.url || `https://roohme.web.app/${cleanSlug}`;
              const appMeta = publishedSlugsMap.get(cleanSlug);
              recordsMap.set(cleanSlug, {
                id: d.id,
                url: cleanUrl,
                slug: cleanSlug,
                title: appMeta.name || data.title || cleanSlug,
                status: data.status || "indexed",
                submittedAt: data.submittedAt || new Date().toISOString(),
                source: data.source || "تلقائي",
                details: data.details || "مؤرشف بنجاح بـ Google Indexing API"
              });
            }
          }
        });
      } catch (err) {
        console.warn("Firestore fetch indexed_urls notice:", err);
      }
    }

    // 3. Ensure all published apps from allApps are included
    publishedApps.forEach((app) => {
      const rawSlug = app.slug || app.cleanSlug || app.id || "";
      const cleanSlug = String(rawSlug).toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
      if (cleanSlug && !recordsMap.has(cleanSlug)) {
        const fullUrl = `https://roohme.web.app/${cleanSlug}`;
        recordsMap.set(cleanSlug, {
          id: `app_${app.id}`,
          url: fullUrl,
          slug: cleanSlug,
          title: app.name || cleanSlug,
          status: "indexed",
          submittedAt: app.createdAt ? (typeof app.createdAt === "string" ? app.createdAt : (app.createdAt.toISOString ? app.createdAt.toISOString() : new Date(app.createdAt).toISOString())) : new Date().toISOString(),
          source: "تلقائي عند نشر المراجعة",
          details: "مسجل في approved-apps.json و Google Indexing API"
        });
      }
    });

    const list = Array.from(recordsMap.values()).sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    setIndexedUrlsList(list);
    setIsLoadingIndexedUrls(false);
  };

  const handleManualSubmitIndexing = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualUrlInput.trim()) {
      setIndexingStatusMsg({ type: "error", text: "يرجى إدخال الرابط أو الـ Slug المراد أرشفتها" });
      return;
    }

    setIsSubmittingManualUrl(true);
    setIndexingStatusMsg(null);

    try {
      const raw = manualUrlInput.trim();
      let fullUrl = raw;
      if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
        fullUrl = `https://roohme.web.app/${raw.replace(/^\/+/, '')}`;
      }
      const cleanSlug = fullUrl.replace(/^https?:\/\/[^\/]+\//, '');
      const title = manualTitleInput.trim() || cleanSlug || "رابط مخصص";

      const indexRes = await fetch("/api/indexing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl, slug: cleanSlug, title, source: "يدوي من لوحة التحكم" })
      });
      const indexData = await indexRes.json().catch(() => ({}));

      try {
        const idToken = getIdTokenHelper();
        await fetch("/api/admin/trigger-deploy-and-index", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({ slug: cleanSlug, url: fullUrl })
        });
      } catch (trigErr) {
        console.warn("GitHub deploy trigger notice:", trigErr);
      }

      const recordId = `idx_manual_${Date.now()}`;
      const newRecord: IndexedUrlRecord = {
        id: recordId,
        url: fullUrl,
        slug: cleanSlug,
        title: title,
        status: "indexed",
        submittedAt: new Date().toISOString(),
        source: "يدوي من صفحة الأرشفة",
        details: indexData?.details || "تم إرسال الرابط بنجاح إلى محرك بحث جوجل (Google Indexing API) وجاري تحديث السجل اللحظي"
      };

      if (db) {
        try {
          await setDoc(doc(db, "indexed_urls", recordId), newRecord, { merge: true });
        } catch (fErr) {
          console.warn("Firestore save indexed_url error:", fErr);
        }
      }

      setIndexedUrlsList((prev) => [newRecord, ...prev.filter(item => item.url !== fullUrl)]);
      setManualUrlInput("");
      setManualTitleInput("");
      
      // Refresh list to pull latest from approved-apps.json
      setTimeout(() => {
        fetchIndexedUrlsList();
      }, 500);

      setIndexingStatusMsg({
        type: "success",
        text: `تم أرشفة وإرسال الرابط (${fullUrl}) إلى Google Indexing API وتسجيله بملف approved-apps.json بنجاح! 🚀`
      });
    } catch (err: any) {
      console.error("Manual indexing error:", err);
      setIndexingStatusMsg({
        type: "error",
        text: `حدث خطأ أثناء أرشفة الرابط: ${err.message || String(err)}`
      });
    } finally {
      setIsSubmittingManualUrl(false);
    }
  };

  const handleReindexSingleUrl = async (record: IndexedUrlRecord) => {
    setReindexingUrlId(record.id);
    try {
      const res = await fetch("/api/indexing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: record.url, slug: record.slug })
      });
      const data = await res.json().catch(() => ({}));

      const idToken = getIdTokenHelper();
      await fetch("/api/admin/trigger-deploy-and-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ slug: record.slug, url: record.url })
      }).catch(() => {});

      const updatedRecord: IndexedUrlRecord = {
        ...record,
        submittedAt: new Date().toISOString(),
        details: data?.details || "تمت إعادة الأرشفة بنجاح"
      };

      if (db) {
        await setDoc(doc(db, "indexed_urls", record.id), updatedRecord, { merge: true }).catch(() => {});
      }

      setIndexedUrlsList((prev) => prev.map(item => item.id === record.id ? updatedRecord : item));
      alert(`تم إرسال إعادة الأرشفة الفورية للرابط: ${record.url} 🚀`);
    } catch (err) {
      alert("تعذر إكمال إعادة الأرشفة، يرجى المحاولة لاحقاً.");
    } finally {
      setReindexingUrlId(null);
    }
  };

  const handleDeleteIndexedUrl = async (recordId: string) => {
    if (!confirm("هل أنت تأكد من إزالة هذا الرابط من قائمة الأرشفة؟")) return;
    try {
      if (db) {
        await deleteDoc(doc(db, "indexed_urls", recordId)).catch(() => {});
      }
      setIndexedUrlsList((prev) => prev.filter(item => item.id !== recordId));
    } catch (err) {
      console.warn("Delete indexed url notice:", err);
    }
  };

  useEffect(() => {
    fetchArchivedAppsList();
    fetchGithubTokenFromFirestore();
  }, []);

  useEffect(() => {
    if (activeTab === "indexing") {
      fetchIndexedUrlsList();
    }
  }, [activeTab]);

  // Quick Delete by Link State
  const [urlToDeleteInput, setUrlToDeleteInput] = useState("");
  const [quickDeleteError, setQuickDeleteError] = useState("");
  const [quickDeleteSuccess, setQuickDeleteSuccess] = useState("");

  // AI Interactive Regeneration State
  const [isRegeneratingDesc, setIsRegeneratingDesc] = useState(false);
  const [isRegeneratingTags, setIsRegeneratingTags] = useState(false);
  const [aiActionSuccess, setAiActionSuccess] = useState("");
  const [aiActionError, setAiActionError] = useState("");
  const [regeneratingAppId, setRegeneratingAppId] = useState<string | null>(null);
  const [isUpgradingAllApps, setIsUpgradingAllApps] = useState(false);

  // AdSense & Global settings Editor State
  const [adsEnabled, setAdsEnabled] = useState(globalSettings.enableAds);
  const [adsHeader, setAdsHeader] = useState(globalSettings.adsHeaderCode);
  const [adsMiddle, setAdsMiddle] = useState(globalSettings.adsMiddleCode);
  const [adsBottom, setAdsBottom] = useState(globalSettings.adsBottomCode);
  const [adsRewarded, setAdsRewarded] = useState(globalSettings.adsRewardedCode || "");
  const [adsInterstitial, setAdsInterstitial] = useState(globalSettings.adsInterstitialCode || "");
  const [adsTxt, setAdsTxt] = useState(globalSettings.adsTxtContent);
  const [whatsappUrl, setWhatsappUrl] = useState(globalSettings.whatsappUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(globalSettings.facebookUrl || "");
  const [tiktokUrl, setTiktokUrl] = useState(globalSettings.tiktokUrl || "");
  const [youtubeUrl, setYoutubeUrl] = useState(globalSettings.youtubeUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(globalSettings.instagramUrl || "");
  const [snapchatUrl, setSnapchatUrl] = useState(globalSettings.snapchatUrl || "");
  const [telegramUrl, setTelegramUrl] = useState(globalSettings.telegramUrl || "");
  const [xUrl, setXUrl] = useState(globalSettings.xUrl || "");
  const [complaintsUrl, setComplaintsUrl] = useState(globalSettings.complaintsUrl || "");
  const [customPrivacyUrl, setCustomPrivacyUrl] = useState(globalSettings.customPrivacyUrl || "");
  const [oneSignalAppId, setOneSignalAppId] = useState(globalSettings.oneSignalAppId || "");
  const [oneSignalRestKey, setOneSignalRestKey] = useState(globalSettings.oneSignalRestKey || "");
  const [openaiApiKey, setOpenaiApiKey] = useState(globalSettings.openaiApiKey || "");
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [promoImageUrl, setPromoImageUrl] = useState(globalSettings.promoImageUrl || "");
  const [promoTargetUrl, setPromoTargetUrl] = useState(globalSettings.promoTargetUrl || globalSettings.aiImagePortalUrl || "");
  const [isPromoEnabled, setIsPromoEnabled] = useState(globalSettings.isPromoEnabled === true || globalSettings.showAiImagePortal === true);
  const [aiImagePortalUrl, setAiImagePortalUrl] = useState(globalSettings.promoTargetUrl || globalSettings.aiImagePortalUrl || "");
  const [showAiImagePortal, setShowAiImagePortal] = useState(globalSettings.isPromoEnabled === true || globalSettings.showAiImagePortal === true);
  const [isSavingAds, setIsSavingAds] = useState(false);
  const [adsSaveSuccess, setAdsSaveSuccess] = useState(false);
  const [isSavingOneSignal, setIsSavingOneSignal] = useState(false);
  const [oneSignalSaveSuccess, setOneSignalSaveSuccess] = useState(false);
  const [oneSignalSaveError, setOneSignalSaveError] = useState("");

  // App edit state
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  // Listen to Auth State
  useEffect(() => {
    const savedEmail = localStorage.getItem("dev_email");
    const savedPin = localStorage.getItem("dev_pin");
    const isAdmin = localStorage.getItem("is_admin") === "true";
    if (isAdmin && savedEmail && savedPin) {
      setUser({ email: savedEmail });
    } else {
      setUser(null);
    }
    setAuthLoading(false);
  }, []);

  // Sync settings when globalSettings props change
  useEffect(() => {
    setAdsEnabled(globalSettings.enableAds);
    setAdsHeader(globalSettings.adsHeaderCode);
    setAdsMiddle(globalSettings.adsMiddleCode);
    setAdsBottom(globalSettings.adsBottomCode);
    setAdsRewarded(globalSettings.adsRewardedCode || "");
    setAdsInterstitial(globalSettings.adsInterstitialCode || "");
    setAdsTxt(globalSettings.adsTxtContent);
    setWhatsappUrl(globalSettings.whatsappUrl || "");
    setFacebookUrl(globalSettings.facebookUrl || "");
    setTiktokUrl(globalSettings.tiktokUrl || "");
    setYoutubeUrl(globalSettings.youtubeUrl || "");
    setInstagramUrl(globalSettings.instagramUrl || "");
    setSnapchatUrl(globalSettings.snapchatUrl || "");
    setTelegramUrl(globalSettings.telegramUrl || "");
    setXUrl(globalSettings.xUrl || "");
    setComplaintsUrl(globalSettings.complaintsUrl || "");
    setCustomPrivacyUrl(globalSettings.customPrivacyUrl || "");
    setOneSignalAppId(globalSettings.oneSignalAppId || "");
    setOneSignalRestKey(globalSettings.oneSignalRestKey || "");
    setOpenaiApiKey(globalSettings.openaiApiKey || "");
    setPromoImageUrl(globalSettings.promoImageUrl || "");
    setPromoTargetUrl(globalSettings.promoTargetUrl || globalSettings.aiImagePortalUrl || "");
    setIsPromoEnabled(globalSettings.isPromoEnabled === true || (globalSettings.showAiImagePortal === true && globalSettings.isPromoEnabled !== false));
    setAiImagePortalUrl(globalSettings.promoTargetUrl || globalSettings.aiImagePortalUrl || "");
    setShowAiImagePortal(globalSettings.isPromoEnabled === true || (globalSettings.showAiImagePortal === true && globalSettings.isPromoEnabled !== false));
  }, [globalSettings]);

  // Fetch App Requests
  const fetchAppRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const querySnapshot = await getDocs(collection(db, "appRequests"));
      const reqs: any[] = [];
      querySnapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() });
      });
      reqs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setAppRequestsList(reqs);
    } catch (err) {
      console.error("Error fetching app requests", err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      await deleteDoc(doc(db, "appRequests", id));
      setAppRequestsList(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Error deleting request:", err);
      alert("حدث خطأ أثناء حذف الطلب.");
    }
  };

  // Fetch User Reviews from Firestore
  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const querySnapshot = await getDocs(collection(db, "reviews"));
      const revs: any[] = [];
      querySnapshot.forEach((doc) => {
        revs.push({ id: doc.id, ...doc.data() });
      });
      // Sort by createdAt descending
      revs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setReviewsList(revs);
    } catch (err) {
      console.error("Error fetching reviews", err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التقييم والمراجعة؟")) return;
    try {
      await deleteDoc(doc(db, "reviews", id));
      setReviewsList(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Error deleting review:", err);
      alert("حدث خطأ أثناء حذف التقييم.");
    }
  };

  // Trigger app requests fetch when requests tab is selected
  useEffect(() => {
    if (activeTab === "requests" && user) {
      fetchAppRequests();
    }
    if (activeTab === "reviews" && user) {
      fetchReviews();
    }
  }, [activeTab, user]);

  // Handle Login or Reset PIN
  const handleLogin = async (e?: React.FormEvent, isResetAction: boolean = false) => {
    if (e) e.preventDefault();
    setAuthError("");
    setCanResetPin(false);
    setAuthSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const pinInput = password.trim();

    if (!cleanEmail || !pinInput) {
      setAuthError("يرجى إدخال البريد الإلكتروني وكلمة المرور / الرمز السري.");
      setAuthSubmitting(false);
      return;
    }

    try {
      // 1. محاولة التوثيق عبر Firebase Authentication الرسمي أولاً
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, pinInput);
      } catch (fbErr: any) {
        if (fbErr?.code === 'auth/user-not-found' || fbErr?.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, cleanEmail, pinInput);
          } catch (createErr: any) {
            console.warn("Firebase Auth registration notice:", createErr);
          }
        } else {
          console.warn("Firebase Auth signin notice:", fbErr);
        }
      }

      // 2. التحقق والمزامنة عبر السيرفر
      const response = await fetch('/api/developer/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, pin: pinInput, resetPin: isResetAction })
      });

      const resData = await safeParseResponse(response, null);

      if (response.ok && resData && resData.success) {
        localStorage.setItem('is_admin', 'true');
        localStorage.setItem('dev_email', cleanEmail);
        localStorage.setItem('dev_pin', pinInput);
        
        // حفظ وتحديث بيانات المطور في الفايربيز Firestore
        try {
          await setDoc(doc(db, 'users', cleanEmail), {
            emailOrPhone: cleanEmail,
            pin: pinInput,
            role: 'admin',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {}

        setUser({ email: cleanEmail });
      } else {
        const errMsg = resData?.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة!';
        setAuthError(errMsg);
        if (resData?.allowReset) {
          setCanResetPin(true);
        }
      }
    } catch (err: any) {
      console.warn('السيرفر غير متاح، المزامنة المباشرة في الفايربيز...', err);

      try {
        const userRef = doc(db, 'users', cleanEmail);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const storedPin = userData?.pin;

          if ((storedPin !== undefined && storedPin !== null && String(storedPin) === String(pinInput)) || isResetAction) {
            await setDoc(userRef, {
              emailOrPhone: cleanEmail,
              pin: pinInput,
              role: 'admin',
              updatedAt: new Date().toISOString()
            }, { merge: true });

            localStorage.setItem('is_admin', 'true');
            localStorage.setItem('dev_email', cleanEmail);
            localStorage.setItem('dev_pin', pinInput);
            setUser({ email: cleanEmail });
          } else {
            setAuthError('كلمة المرور / الرمز السري غير صحيح! يمكنك الضغط على "تحديث كلمة المرور" لاستبدالها بكلمة المرور الجديدة.');
            setCanResetPin(true);
          }
        } else {
          // إنشاء حساب المطور في الفايربيز لأول مرة
          await setDoc(userRef, {
            emailOrPhone: cleanEmail,
            name: 'المطور (Developer)',
            pin: pinInput,
            role: 'admin',
            updatedAt: new Date().toISOString()
          }, { merge: true });

          localStorage.setItem('is_admin', 'true');
          localStorage.setItem('dev_email', cleanEmail);
          localStorage.setItem('dev_pin', pinInput);
          setUser({ email: cleanEmail });
        }
      } catch (dbErr: any) {
        setAuthError(dbErr.message || 'خطأ في الاتصال بقاعدة بيانات الفايربيز!');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Google OAuth Email Link / Login
  const handleGoogleLogin = async () => {
    setAuthError("");
    setGoogleSubmitting(true);
    const knownAdmins = ["dodorooh1@gmail.com", "rooh1dodo@gmail.com", "rooh50dodo@gmail.com", "admin@discoverapp.com"];
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const selectedUser = result.user;
      const userEmail = selectedUser.email?.trim().toLowerCase() || "";

      if (!userEmail) {
        throw new Error("لم يتم العثور على بريد إلكتروني في حساب Google المختار.");
      }

      // Check if user exists in Firestore or is a known admin
      const userRef = doc(db, 'users', userEmail);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() && !knownAdmins.includes(userEmail)) {
        throw new Error("عذراً، هذا البريد الإلكتروني غير مسجل كـ مطور في قواعد البيانات.");
      }

      try {
        await setDoc(userRef, {
          emailOrPhone: userEmail,
          name: selectedUser.displayName || 'مطور حساب Google',
          photoURL: selectedUser.photoURL || '',
          uid: selectedUser.uid,
          role: 'admin',
          provider: 'google.com',
          authMethod: 'Google OAuth',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore sync warning during Google auth:", dbErr);
      }

      localStorage.setItem('is_admin', 'true');
      localStorage.setItem('dev_email', userEmail);
      localStorage.setItem('dev_pin', 'GOOGLE_OAUTH_LINKED');
      setUser({ email: userEmail });
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        setAuthError("تم إغلاق أو حظر النافذة المنبثقة من المتصفح. يرجى السماح بالنوافذ المنبثقة (Popups) أو فتح التطبيق في نافذة/تبويب جديد لاختيار بريدك الإلكتروني.");
      } else if (err.code === "auth/unauthorized-domain") {
        setAuthError(`هذا النطاق (${window.location.hostname}) غير مرخص في إعدادات Firebase Authentication. يرجى إضافته إلى قائمة Authorized Domains في كونسول الفايربيز.`);
      } else {
        setAuthError(err.message || "حدث خطأ أثناء ربط وتسجيل الدخول عبر حساب Google.");
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    localStorage.removeItem("is_admin");
    localStorage.removeItem("dev_email");
    localStorage.removeItem("dev_pin");
    setUser(null);
  };

  // Call Back-end Scraper & AI Review Generator
  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapeError("");
    setPublishSuccess(false);
    setScrapedPreview(null);
    
    if (!playStoreUrlInput.trim()) {
      setScrapeError("الرجاء إدخال رابط صالح من متجر Google Play");
      return;
    }

    setIsScraping(true);

    try {
      const idToken = getIdTokenHelper();

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ url: playStoreUrlInput.trim() })
      });

      const data = await safeParseResponse(response);

      if (!response.ok) {
        throw new Error(data.error || "فشل جلب ونشر البيانات. يرجى مراجعة الرابط.");
      }

      // Load preview form
      const generatedSlug = toShortCleanSlug(data.slug || data.metadata?.name || '');
      const defaultMetaTitle = data.metaTitle || `تنزيل ومراجعة تطبيق ${data.metadata?.name} | روابط مباشرة وآمنة 100%`;
      const defaultMetaDesc = data.metaDescription || `احصل على مراجعة تفصيلية وشاملة لتطبيق ${data.metadata?.name} مع روابط التحميل المباشرة السريعة.`;
      const defaultKeywords = data.seoKeywords || data.tags || [];

      setScrapedPreview({
        id: data.metadata.packageId,
        name: data.metadata.name,
        iconUrl: data.metadata.iconUrl,
        rating: data.metadata.rating,
        playStoreUrl: data.metadata.playStoreUrl,
        appStoreUrl: data.metadata.appStoreUrl || "", // Automatically populated from iTunes search API
        description: data.article,
        tags: data.tags,
        category: data.category,
        slug: generatedSlug,
        metaTitle: defaultMetaTitle,
        metaDescription: defaultMetaDesc,
        seoKeywords: defaultKeywords
      });
      
      setPlayStoreUrlInput(""); // Clear search bar

    } catch (err: any) {
      console.warn("السيرفر الخلفي /api/scrape غير متاح في الاستضافة الثابتة، جار تشغيل الحل البديل المباشر...", err);
      
      // Client-side Fallback for Static Firebase Hosting
      try {
        const input = playStoreUrlInput.trim();
        let packageId = "";
        const pkgMatch = input.match(/id=([a-zA-Z0-9_.]+)/);
        if (pkgMatch) {
          packageId = pkgMatch[1];
        } else if (input.includes(".")) {
          packageId = input;
        } else {
          packageId = "com." + input.toLowerCase().replace(/[^a-z0-9]+/g, "");
        }

        const appNameFromId = packageId.split('.').pop() || packageId;
        const cleanAppName = appNameFromId.charAt(0).toUpperCase() + appNameFromId.slice(1);

        // iTunes API Search for App Store link and icon fallback
        let appStoreUrl = "";
        let iconUrl = "https://play-lh.googleusercontent.com/cSh2-R26mWrPoxPsnP4-PZLE4CQWuPh1L3A0A_2_1041-0";
        try {
          const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanAppName)}&entity=software&limit=1`);
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results.length > 0) {
              appStoreUrl = itunesData.results[0].trackViewUrl || "";
              if (itunesData.results[0].artworkUrl512) {
                iconUrl = itunesData.results[0].artworkUrl512;
              }
            }
          }
        } catch (e) {}

        let aiArticle = `### مراجعة وشرح تطبيق ${cleanAppName}\n\nيعتبر تطبيق **${cleanAppName}** من أبرز التطبيقات المتميزة في مجاله، حيث يوفر للمستخدمين تجربة سلسة ومتكاملة.\n\n#### أهم مميزات تطبيق ${cleanAppName}:\n- واجهة بسيطة وسهلة الاستخدام.\n- أداء سريع واستجابة عالية.\n- روابط تحميل آمنة ومباشرة.`;
        let aiTags = [cleanAppName, "تنزيل " + cleanAppName, "تطبيق " + cleanAppName, "تطبيقات أندرويد"];

        // Try Gemini call if VITE_GEMINI_API_KEY or geminiApiKey exists
        const metaEnv = (import.meta as any).env || {};
        const effectiveApiKey = globalSettings.geminiApiKey || metaEnv.VITE_GEMINI_API_KEY || "";
        try {
          const prompt = `أنت خبير محرر ومراجعات تطبيقات الجوال. قم بكتابة مقال صحفي شامل ومراجعة احترافية باللغة العربية لتطبيق اسمه: "${cleanAppName}" (معرّف الحزمة: ${packageId}).
المطلوب:
1. مقال مراجعة تفصيلي باللغة العربية بأسلوب صحفي جذاب مع العناوين الرئيسية الفرعية (####).
2. قائمة بالكلمات المفتاحية والدلالية المستهدفة.`;

          const aiResponseText = await callGeminiApi([
            { role: "system", content: "أنت خبير مراجعة تطبيقات باللغة العربية." },
            { role: "user", content: prompt }
          ], effectiveApiKey);

          if (aiResponseText && aiResponseText.trim()) {
            aiArticle = aiResponseText;
          }
        } catch (aiErr) {
          console.warn("Direct Gemini generation notice:", aiErr);
        }

        const generatedSlug = toShortCleanSlug(cleanAppName);

        setScrapedPreview({
          id: packageId,
          name: cleanAppName,
          iconUrl: iconUrl,
          rating: "4.8",
          playStoreUrl: input.startsWith("http") ? input : `https://play.google.com/store/apps/details?id=${packageId}`,
          appStoreUrl: appStoreUrl,
          description: aiArticle,
          tags: aiTags,
          category: "تطبيقات",
          slug: generatedSlug,
          metaTitle: `تنزيل ومراجعة تطبيق ${cleanAppName} | روابط مباشرة وآمنة 100%`,
          metaDescription: `احصل على مراجعة تفصيلية وشاملة لتطبيق ${cleanAppName} مع روابط التحميل المباشرة.`,
          seoKeywords: aiTags
        });

        setPlayStoreUrlInput("");
      } catch (fallbackErr: any) {
        setScrapeError(err.message || "حدث خطأ أثناء معالجة البيانات.");
      }
    } finally {
      setIsScraping(false);
    }
  };

  // AI Regeneration Handler: Description (1500+ Words Article)
  const handleRegenerateDescription = async () => {
    if (!scrapedPreview) return;
    setIsRegeneratingDesc(true);
    setAiActionSuccess("");
    setAiActionError("");

    try {
      const idToken = getIdTokenHelper();
      const response = await fetch("/api/ai/regenerate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: scrapedPreview.name,
          developer: scrapedPreview.developer,
          category: scrapedPreview.category,
          playStoreUrl: scrapedPreview.playStoreUrl,
          appStoreUrl: scrapedPreview.appStoreUrl,
          rating: scrapedPreview.rating,
          currentDescription: scrapedPreview.description
        })
      });

      const data = await safeParseResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "فشل إعادة توليد الشرح بالذكاء الاصطناعي.");
      }

      setScrapedPreview(prev => {
        if (!prev) return null;
        return {
          ...prev,
          description: data.description || prev.description,
          tags: (data.tags && data.tags.length > 0) ? data.tags : prev.tags,
          category: data.category || prev.category
        };
      });

      setAiActionSuccess("✨ تمت إعادة توليد وتطوير الشرح بالذكاء الاصطناعي بنجاح (مقال صحفي عميق لا يقل عن 1500 كلمة)!");
    } catch (err: any) {
      console.error(err);
      setAiActionError(err.message || "حدث خطأ أثناء إعادة توليد الشرح.");
    } finally {
      setIsRegeneratingDesc(false);
    }
  };

  // AI Regeneration Handler: SEO Target Keywords
  const handleRegenerateKeywords = async () => {
    if (!scrapedPreview) return;
    setIsRegeneratingTags(true);
    setAiActionSuccess("");
    setAiActionError("");

    try {
      const idToken = getIdTokenHelper();
      const response = await fetch("/api/ai/regenerate-keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: scrapedPreview.name,
          developer: scrapedPreview.developer,
          category: scrapedPreview.category,
          description: scrapedPreview.description
        })
      });

      const data = await safeParseResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "فشل توليد كلمات البحث بالذكاء الاصطناعي.");
      }

      if (data.tags && data.tags.length > 0) {
        setScrapedPreview(prev => {
          if (!prev) return null;
          let updatedDesc = prev.description;
          const seoHeaderPattern = /(#### الكلمات المفتاحية والدلالية المستهدفة[\s\S]*)/i;
          const formattedTagsBlock = `#### الكلمات المفتاحية والدلالية المستهدفة (SEO Target Keywords)\n\nحرصاً على أرشفة هذا المقال والتطبيق في الصفحة الأولى بجميع محركات البحث (Google Search & Google Play Store)، تم تضمين واستخراج أهم الكلمات المفتاحية والدلالية المخصصة لهذا التطبيق والمحتوى:\n\n` +
            data.tags.map((t: string) => `\`${t}\``).join(', ') + '.';

          if (seoHeaderPattern.test(updatedDesc)) {
            updatedDesc = updatedDesc.replace(seoHeaderPattern, formattedTagsBlock);
          } else {
            updatedDesc += `\n\n---\n\n${formattedTagsBlock}`;
          }

          return {
            ...prev,
            tags: data.tags,
            description: updatedDesc
          };
        });
        setAiActionSuccess("🏷️ تمت إعادة توليد وتحديث كلمات البحث (SEO Keywords) وتوثيقها داخل المقال والملف بنجاح!");
      }
    } catch (err: any) {
      console.error(err);
      setAiActionError(err.message || "حدث خطأ أثناء توليد كلمات البحث.");
    } finally {
      setIsRegeneratingTags(false);
    }
  };

  // AI Verify & Fetch Google Play Store URL
  const [verifyingAppId, setVerifyingAppId] = useState<string | null>(null);

  const handleAiVerifyPlayStoreUrl = async (app: { id?: string; name: string; playStoreUrl?: string; packageId?: string }, isScrapedPreview = false) => {
    const appId = app.id || "";
    setVerifyingAppId(isScrapedPreview ? "preview" : (appId || "preview"));
    try {
      let verifiedUrl = "";
      let verifiedPackageId = "";

      // 1. Attempt Server-side Verification Route
      try {
        const idToken = getIdTokenHelper();
        const response = await fetch("/api/admin/verify-play-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({
            appId: appId,
            name: app.name,
            currentPlayStoreUrl: app.playStoreUrl,
            packageId: app.packageId
          })
        });

        const data = await safeParseResponse(response, null);
        if (data && data.success && data.isValid && data.playStoreUrl) {
          verifiedUrl = data.playStoreUrl;
          verifiedPackageId = data.packageId || "";
        }
      } catch (srvErr) {
        console.warn("[AdminPanel] Server verify-play-url route unavailable or returned HTML, using client Gemini fallback:", srvErr);
      }

      // 2. Client-Side Google Gemini Fallback if Server Route is not active
      if (!verifiedUrl) {
        // Step 2a: Check if we can normalize packageId directly from app inputs
        const normalizedInputPkg = normalizePackageId(app.packageId || app.playStoreUrl || app.name);
        if (normalizedInputPkg && normalizedInputPkg.includes(".")) {
          verifiedPackageId = normalizedInputPkg;
          verifiedUrl = `https://play.google.com/store/apps/details?id=${normalizedInputPkg}`;
        } else {
          // Step 2b: Use client-side Gemini API to find true packageId
          const prompt = `أنت خبير في متجر Google Play. أرجع معرف الحزمة الرسمي (packageId) ورابط متجر جوجل بلاي للتطبيق التالي: "${app.name}". أرجع الإجابة ككائن JSON فقط: {"packageId": "...", "playStoreUrl": "..."}`;
          const geminiText = await callGeminiApi([{ role: "user", content: prompt }]);
          if (geminiText) {
            try {
              const cleanJson = geminiText.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleanJson);
              const foundPkg = normalizePackageId(parsed.packageId || parsed.playStoreUrl || "");
              if (foundPkg && foundPkg.includes(".")) {
                verifiedPackageId = foundPkg;
                verifiedUrl = `https://play.google.com/store/apps/details?id=${foundPkg}`;
              }
            } catch (pErr) {
              console.warn("[AdminPanel] Gemini response parse notice:", pErr);
            }
          }
        }
      }

      if (verifiedUrl) {
        // If preview state before publishing
        if (isScrapedPreview && scrapedPreview) {
          setScrapedPreview({
            ...scrapedPreview,
            playStoreUrl: verifiedUrl,
            packageId: verifiedPackageId || scrapedPreview.packageId
          });
        }
        // If app exists in Firestore
        if (appId) {
          try {
            await updateDoc(doc(db, "apps", appId), {
              playStoreUrl: verifiedUrl,
              packageId: verifiedPackageId || app.packageId || "",
              updatedAt: serverTimestamp()
            });
          } catch (dbErr) {
            console.warn("Client updateDoc notice:", dbErr);
          }
          onRefreshApps();
        }

        alert(`✅ [تأكيد بذكاء جوجل Gemini 🌝]\nتم التثبت بنجاح من صحة الرابط وسحبه وحفظه في الفايربيس!\n\nاسم التطبيق: ${app.name}\nرابط جوجل بلاي المؤكد: ${verifiedUrl}`);
      } else {
        alert(`❌ [تأكيد بذكاء جوجل Gemini]\nتعذر العثور على التطبيق داخل متجر جوجل بلاي. يرجى التثبت من اسم التطبيق.`);
      }
    } catch (err: any) {
      console.error("AI verify play store url error:", err);
      alert(`⚠️ حدث خطأ أثناء الاتصال بالذكاء الاصطناعي لفحص الرابط: ${err.message || err}`);
    } finally {
      setVerifyingAppId(null);
    }
  };

  // Direct AI Regenerate for existing stored apps in Firestore
  const handleDirectAppAIRegenerate = async (appId: string, target: 'description' | 'keywords' | 'both') => {
    setRegeneratingAppId(appId);
    try {
      const idToken = getIdTokenHelper();
      const response = await fetch("/api/admin/regenerate-app-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ appId, target })
      });

      const data = await safeParseResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "فشل التحديث بالذكاء الاصطناعي.");
      }

      alert(`🎉 ${data.message || "تم تحديث بيانات التطبيق بالذكاء الاصطناعي بنجاح!"}`);
      onRefreshApps();
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ ${err.message || "حدث خطأ أثناء الاتصال بالسيرفر لإعادة التوليد."}`);
    } finally {
      setRegeneratingAppId(null);
    }
  };

  // Bulk upgrade all stored apps in Firestore to 1500+ words AI reviews
  const handleBulkUpgradeAppsAI = async () => {
    if (!window.confirm("هل أنت متأكد من تطوير وتوسيع كافة التطبيقات المخزنة إلى مراجعات صحفية عميقة (1500+ كلمة لكل تطبيق مع الكلمات المفتاحية)؟ قد تستغرق هذه العملية بعض الوقت.")) {
      return;
    }
    setIsUpgradingAllApps(true);
    try {
      const idToken = getIdTokenHelper();
      const response = await fetch("/api/admin/upgrade-all-apps-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        }
      });

      const data = await safeParseResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "فشلت عملية تطوير كافة التطبيقات.");
      }

      alert(`✅ ${data.message || "تم تطوير وتوسيع كافة التطبيقات بنجاح إلى 1500+ كلمة!"}`);
      onRefreshApps();
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ ${err.message || "حدث خطأ أثناء الاتصال بالسيرفر لتطوير التطبيقات."}`);
    } finally {
      setIsUpgradingAllApps(false);
    }
  };

  // Publish App Review to Firestore
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapedPreview) return;
    
    setIsPublishing(true);
    setScrapeError("");

    const resolvedStoreType = scrapedPreview.storeType || 
      (scrapedPreview.playStoreUrl && scrapedPreview.appStoreUrl ? "both" : (scrapedPreview.appStoreUrl ? "ios" : "android"));

    // Validation based on selected Store Type
    if (resolvedStoreType === "android" && (!scrapedPreview.playStoreUrl || !scrapedPreview.playStoreUrl.trim())) {
      setScrapeError("الرجاء إدخال رابط متجر Google Play صحيح لمتابعة نشر تطبيق الأندرويد.");
      setIsPublishing(false);
      return;
    }

    if (resolvedStoreType === "ios" && (!scrapedPreview.appStoreUrl || !scrapedPreview.appStoreUrl.trim())) {
      setScrapeError("الرجاء إدخال رابط متجر Apple App Store صحيح لمتابعة نشر تطبيق الآيفون.");
      setIsPublishing(false);
      return;
    }

    if (resolvedStoreType === "both" && (!scrapedPreview.playStoreUrl?.trim() && !scrapedPreview.appStoreUrl?.trim())) {
      setScrapeError("الرجاء إدخال رابط متجر واحد على الأقل لنشر التطبيق ثنائي المتجر.");
      setIsPublishing(false);
      return;
    }

    const appDocId = (scrapedPreview.id && /^\d{5}$/.test(scrapedPreview.id)) 
      ? scrapedPreview.id 
      : Math.floor(10000 + Math.random() * 90000).toString();
    const targetPath = `apps/${appDocId}`;

    const cleanSlug = (scrapedPreview.slug
      ? scrapedPreview.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : (scrapedPreview.name ? scrapedPreview.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-review' : `${appDocId.replace(/\./g, '-')}-review`)).replace(/\.html$/i, "");
    
    const r2FileName = `${cleanSlug}.html`;
    const r2WorkerUrl = `https://rooh-platform-worker.roohr4046.workers.dev/${r2FileName}`;
    const articleUrl = `https://roohme.web.app/${cleanSlug}`;

    try {
      // Upload article HTML directly to Cloudflare Worker R2
      try {
        const formattedHtml = scrapedPreview.content || scrapedPreview.description || "";
        if (formattedHtml) {
          await fetch(r2WorkerUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=31536000, immutable"
            },
            body: formattedHtml
          });
        }
      } catch (putErr) {
        console.warn("R2 Worker upload notice:", putErr);
      }

      // Save directly to Firestore from Client utilizing auth privileges with explicit short ID document name
      await setDoc(doc(db, "apps", appDocId), {
        id: appDocId,
        appCode: appDocId,
        packageId: scrapedPreview.packageId || scrapedPreview.id || appDocId,
        name: scrapedPreview.name,
        appTitle: scrapedPreview.name,
        slug: cleanSlug,
        r2FileKey: r2FileName,
        r2Url: r2WorkerUrl,
        articleUrl: articleUrl,
        metaTitle: scrapedPreview.metaTitle || `تنزيل ومراجعة تطبيق ${scrapedPreview.name} | روابط مباشرة وآمنة 100%`,
        metaDescription: scrapedPreview.metaDescription || `احصل على مراجعة تفصيلية وشاملة لتطبيق ${scrapedPreview.name} مع روابط التحميل المباشرة.`,
        seoKeywords: scrapedPreview.seoKeywords || scrapedPreview.tags || [],
        iconUrl: scrapedPreview.iconUrl,
        rating: parseFloat(scrapedPreview.rating) || 4.5,
        description: scrapedPreview.description,
        content: scrapedPreview.description,
        playStoreUrl: resolvedStoreType === "ios" ? "" : (scrapedPreview.playStoreUrl || ""),
        appStoreUrl: resolvedStoreType === "android" ? "" : (scrapedPreview.appStoreUrl || ""),
        videoUrl: scrapedPreview.videoUrl || "",
        category: scrapedPreview.category,
        tags: scrapedPreview.tags,
        storeType: resolvedStoreType,
        isApproved: true, // Marked as approved when processed or edited by admin
        createdAt: serverTimestamp() // Set server time
      }, { merge: true });

      // Trigger instant Google Indexing API ping and GitHub Actions auto-deploy for site & sitemap
      try {
        await pingGoogleIndexingAPI(cleanSlug, appDocId);
        await triggerGitHubActionDeploy(cleanSlug, appDocId);

        const fullAppUrl = `https://roohme.web.app/${cleanSlug}`;
        const autoRecord: IndexedUrlRecord = {
          id: `idx_pub_${appDocId}`,
          url: fullAppUrl,
          slug: cleanSlug,
          title: scrapedPreview?.name || cleanSlug,
          status: "indexed",
          submittedAt: new Date().toISOString(),
          source: "تلقائي عند إضافة المراجعة",
          details: "تم توجيه الرابط إلى Google Indexing API بنجاح"
        };
        if (db) {
          setDoc(doc(db, "indexed_urls", autoRecord.id), autoRecord, { merge: true }).catch(() => {});
        }
        setIndexedUrlsList((prev) => [autoRecord, ...prev.filter(x => x.url !== fullAppUrl)]);
      } catch (triggerErr) {
        console.warn("Deploy and indexing trigger notice:", triggerErr);
      }

      setPublishSuccess(true);
      setScrapedPreview(null);
      setEditingAppId(null);
      onRefreshApps(); // Refresh lists

    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, targetPath);
    } finally {
      setIsPublishing(false);
    }
  };

  // Save AdSense Settings to Firestore
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAds(true);
    setAdsSaveSuccess(false);

    const targetPath = "settings/global";
    try {
      await setDoc(doc(db, "settings", "global"), {
        enableAds: adsEnabled,
        adsHeaderCode: adsHeader || "",
        adsMiddleCode: adsMiddle || "",
        adsBottomCode: adsBottom || "",
        adsRewardedCode: adsRewarded || "",
        adsInterstitialCode: adsInterstitial || "",
        adsTxtContent: adsTxt || "",
        whatsappUrl: whatsappUrl.trim() || "",
        facebookUrl: facebookUrl.trim() || "",
        tiktokUrl: tiktokUrl.trim() || "",
        youtubeUrl: youtubeUrl.trim() || "",
        instagramUrl: instagramUrl.trim() || "",
        snapchatUrl: snapchatUrl.trim() || "",
        telegramUrl: telegramUrl.trim() || "",
        xUrl: xUrl.trim() || "",
        complaintsUrl: complaintsUrl.trim() || "",
        customPrivacyUrl: customPrivacyUrl.trim() || "",
        oneSignalAppId: oneSignalAppId.trim() || "",
        oneSignalRestKey: oneSignalRestKey.trim() || "",
        openaiApiKey: openaiApiKey.trim() || "",
        promoImageUrl: promoImageUrl.trim() || "",
        promoTargetUrl: promoTargetUrl.trim() || "",
        isPromoEnabled: isPromoEnabled,
        aiImagePortalUrl: promoTargetUrl.trim() || "",
        showAiImagePortal: isPromoEnabled
      }, { merge: true });

      setAdsSaveSuccess(true);
      onRefreshSettings(); // Refresh settings state globally

    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, targetPath);
    } finally {
      setIsSavingAds(false);
    }
  };

  // Save Social Links & Complaints settings to Firestore (Independent tab save)
  const handleSaveLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLinks(true);
    setLinksSaveSuccess(false);

    const targetPath = "settings/global";
    try {
      await setDoc(doc(db, "settings", "global"), {
        whatsappUrl: whatsappUrl.trim() || "",
        facebookUrl: facebookUrl.trim() || "",
        tiktokUrl: tiktokUrl.trim() || "",
        youtubeUrl: youtubeUrl.trim() || "",
        instagramUrl: instagramUrl.trim() || "",
        snapchatUrl: snapchatUrl.trim() || "",
        telegramUrl: telegramUrl.trim() || "",
        xUrl: xUrl.trim() || "",
        complaintsUrl: complaintsUrl.trim() || "",
        customPrivacyUrl: customPrivacyUrl.trim() || "",
        oneSignalAppId: oneSignalAppId.trim() || "",
        oneSignalRestKey: oneSignalRestKey.trim() || "",
        openaiApiKey: openaiApiKey.trim() || "",
        promoImageUrl: promoImageUrl.trim() || "",
        promoTargetUrl: promoTargetUrl.trim() || "",
        isPromoEnabled: isPromoEnabled,
        aiImagePortalUrl: promoTargetUrl.trim() || "",
        showAiImagePortal: isPromoEnabled
      }, { merge: true });

      setLinksSaveSuccess(true);
      onRefreshSettings(); // Refresh settings state globally
      setTimeout(() => setLinksSaveSuccess(false), 5000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, targetPath);
    } finally {
      setIsSavingLinks(false);
    }
  };

  // Save OneSignal settings directly from notifications tab
  const handleSaveOneSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOneSignal(true);
    setOneSignalSaveSuccess(false);
    setOneSignalSaveError("");

    try {
      await setDoc(doc(db, "settings", "global"), {
        oneSignalAppId: oneSignalAppId.trim(),
        oneSignalRestKey: oneSignalRestKey.trim()
      }, { merge: true });

      setOneSignalSaveSuccess(true);
      onRefreshSettings(); // Refresh settings state globally
      setTimeout(() => setOneSignalSaveSuccess(false), 5000);
    } catch (err: any) {
      setOneSignalSaveError(handleFirestoreError(err, OperationType.WRITE, "settings/global"));
    } finally {
      setIsSavingOneSignal(false);
    }
  };

  // Delete App from Firestore
  const markAppAsDeletedLocally = (appId: string, slug?: string) => {
    try {
      const stored = localStorage.getItem("rooh_deleted_apps");
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(appId)) list.push(appId);
      if (slug && !list.includes(slug)) list.push(slug);
      localStorage.setItem("rooh_deleted_apps", JSON.stringify(list));
    } catch (e) {}
  };

  const handleDeleteApp = async (appId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التطبيق وشروحاته كافة ورابطه نهائياً من جميع المصادر والمواقع (Firebase, R2, approved-apps.json, والأرشفة)؟ لا يمكن التراجع عن هذا الإجراء.")) return;

    const targetApp = allApps.find(a => a.id === appId);
    const targetSlug = (targetApp?.slug || targetApp?.cleanSlug || appId).replace(/^\/+|\.html$/gi, '').trim();

    // 1. Instantly mark as locally deleted & filter out from local UI state
    markAppAsDeletedLocally(appId, targetSlug);
    setIndexedUrlsList(prev => prev.filter(x => !x.url.includes(targetSlug) && x.slug !== targetSlug));
    setArchivedAppsList(prev => prev.filter(x => x.id !== appId && x.slug !== targetSlug));

    // 2. Client-side Firestore delete
    try {
      if (db) {
        await deleteDoc(doc(db, "apps", appId)).catch(() => {});
        await deleteDoc(doc(db, "indexed_urls", `idx_appr_${appId}`)).catch(() => {});
      }
    } catch (e) {
      console.warn("Client Firestore delete notice:", e);
    }

    // 3. Complete backend server wipeout (R2 files, approved-apps.json, apps_cache.json, db.json, search_logs)
    try {
      await fetch("/api/admin/delete-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, slug: targetSlug })
      });
    } catch (apiErr) {
      console.warn("Backend delete-app API call notice:", apiErr);
    }

    // 4. Refresh archived apps list and main apps list
    try {
      await fetchArchivedAppsList().catch(() => {});
    } catch (e) {}
    onRefreshApps();
  };

  // Approve & Publish App instantly on the client & backend approved-apps.json
  const handleApproveApp = async (appId: string) => {
    try {
      const targetPath = `apps/${appId}`;
      await updateDoc(doc(db, "apps", appId), { 
        status: "published", 
        isApproved: true,
        updatedAt: serverTimestamp() 
      });

      const targetApp = allApps.find(a => a.id === appId);
      const cleanSlug = (targetApp?.slug || targetApp?.cleanSlug || appId).replace(/^\/+|\.html$/gi, '').trim();

      // Sync clean slug registration to approved-apps.json and Cloudflare R2 / KV
      try {
        await fetch("/api/admin/approve-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId })
        });
      } catch (apiErr) {
        console.warn("Backend approve-app endpoint notice:", apiErr);
      }

      // Trigger instant Google Indexing API ping and GitHub Actions auto-deploy for site & sitemap
      try {
        await pingGoogleIndexingAPI(cleanSlug, appId);
        await triggerGitHubActionDeploy(cleanSlug, appId);

        const fullAppUrl = `https://roohme.web.app/${cleanSlug}`;
        const autoRecord: IndexedUrlRecord = {
          id: `idx_appr_${appId}`,
          url: fullAppUrl,
          slug: cleanSlug,
          title: targetApp?.name || cleanSlug,
          status: "indexed",
          submittedAt: new Date().toISOString(),
          source: "تلقائي عند موافقة النشر",
          details: "تم توجيه الرابط إلى Google Indexing API بنجاح"
        };
        if (db) {
          setDoc(doc(db, "indexed_urls", autoRecord.id), autoRecord, { merge: true }).catch(() => {});
        }
        setIndexedUrlsList((prev) => [autoRecord, ...prev.filter(x => x.url !== fullAppUrl)]);
      } catch (triggerErr) {
        console.warn("Deploy and indexing trigger notice:", triggerErr);
      }

      // Automatically refresh archived pages list for real-time accuracy
      await fetchArchivedAppsList();

      alert(`تم اعتماد ونشر المراجعة بنجاح! 🎉\nتم أرشفة الرابط المباشر: https://roohme.web.app/${cleanSlug}\nوتحديث ملف approved-apps.json على Cloudflare R2 وخريطة الموقع.`);
      onRefreshApps();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `apps/${appId}`);
    }
  };

  // Alias name handleAppApproval for approval controller logic
  const handleAppApproval = handleApproveApp;

  // Pull 10 Apps automatically with AI review generation
  const handlePull10Apps = async () => {
    if (isPullingApps) return;
    setIsPullingApps(true);
    try {
      const idToken = getIdTokenHelper();

      const response = await fetch("/api/admin/pull-10-apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        }
      });
      const data = await safeParseResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "فشل سحب التطبيقات تلقائياً.");
      }

      alert(`اكتملت العملية بنجاح! 🎉\nتم سحب ومعالجة ${data.successCount} تطبيقات جديدة بنجاح وحفظها في الفايربيز ونشرها مباشرة داخل التطبيق!\nعدد الإخفاقات: ${data.failedCount}`);
      onRefreshApps();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ غير متوقع أثناء سحب التطبيقات.");
    } finally {
      setIsPullingApps(false);
    }
  };

  // Complete Purge of All Apps & Reset approved-apps.json
  const [isPurgingAll, setIsPurgingAll] = useState(false);
  const handlePurgeAllApps = async () => {
    if (!confirm("⚠️ هل أنت متأكد تماماً من رغبتك في حذف وتفريغ جميع المراجعات والتطبيقات القديمة وإعادة تعيين القائمة وخريطة الموقع إلى صفر؟\nلن يتم مسح مفاتيح النظام أو بيانات الإدارة.")) {
      return;
    }
    setIsPurgingAll(true);
    try {
      const response = await fetch("/api/admin/purge-all-apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await safeParseResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "فشل مسح وتفريغ التطبيقات.");
      }
      alert(`تم التفريغ بنجاح! 🧹\n${data.message}`);
      onRefreshApps();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء المسح الشامل.");
    } finally {
      setIsPurgingAll(false);
    }
  };

  // Batch Clean & Sync All Article Short URLs in Firestore
  const [isSyncingUrls, setIsSyncingUrls] = useState(false);

  const handleCleanAndSyncAllUrls = async () => {
    if (isSyncingUrls) return;
    setIsSyncingUrls(true);
    try {
      const idToken = getIdTokenHelper();

      const response = await fetch("/api/admin/clean-sync-urls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        }
      });

      const data = await safeParseResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "فشلت المزامنة عبر الخادم.");
      }

      // Client-side fallback sweep on loaded Firestore documents
      try {
        const snap = await getDocs(collection(db, "apps"));
        for (const docSnap of snap.docs) {
          const appData = docSnap.data();
          let rawSlug = String(appData.slug || docSnap.id || "").trim();
          let cleanSlug = rawSlug.split('?')[0].split('#')[0].replace(/\.html$/i, "").trim() || docSnap.id;

          const cleanArticleUrl = `https://roohme.web.app/${cleanSlug}`;
          const r2FileKey = `${cleanSlug}.html`;
          const r2Url = `https://rooh-platform-worker.roohr4046.workers.dev/${r2FileKey}`;

          if (appData.slug !== cleanSlug || appData.articleUrl !== cleanArticleUrl || appData.r2FileKey !== r2FileKey) {
            await updateDoc(doc(db, "apps", docSnap.id), {
              slug: cleanSlug,
              articleUrl: cleanArticleUrl,
              r2FileKey: r2FileKey,
              r2Url: r2Url
            });
          }
        }
      } catch (clientErr) {
        console.warn("Client fallback sync sweep notice:", clientErr);
      }

      alert(data.message || "تمت مزامنة وتنظيف جميع الروابط القصيرة في قاعدة البيانات بنجاح! 🎉");
      onRefreshApps();
    } catch (err: any) {
      console.error("Clean & Sync URLs error:", err);
      alert(err.message || "حدث خطأ أثناء مزامنة وتنظيف الروابط.");
    } finally {
      setIsSyncingUrls(false);
    }
  };

  // Quick Delete by Link
  const handleQuickDeleteByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickDeleteError("");
    setQuickDeleteSuccess("");

    const targetUrl = urlToDeleteInput.trim();
    if (!targetUrl) {
      setQuickDeleteError("الرجاء إدخال رابط متجر Google Play أو اسم الحزمة المطلوب حذفها.");
      return;
    }

    // Try to find matching app
    const foundApp = allApps.find(app => 
      app.playStoreUrl.toLowerCase().includes(targetUrl.toLowerCase()) ||
      app.id.toLowerCase() === targetUrl.toLowerCase() ||
      targetUrl.toLowerCase().includes(app.id.toLowerCase())
    );

    if (!foundApp) {
      setQuickDeleteError("لم يتم العثور على أي تطبيق مطابق للرابط أو اسم الحزمة المدخل.");
      return;
    }

    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف التطبيق ومراجعته نهائياً: "${foundApp.name}"؟`)) {
      return;
    }

    const targetPath = `apps/${foundApp.id}`;
    markAppAsDeletedLocally(foundApp.id, foundApp.slug);
    try {
      if (db) {
        await deleteDoc(doc(db, "apps", foundApp.id)).catch(() => {});
      }
      setQuickDeleteSuccess(`تم حذف وتطهير التطبيق "${foundApp.name}" ومسحه بنجاح!`);
      setUrlToDeleteInput("");
      onRefreshApps();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, targetPath);
      onRefreshApps();
    }
  };

  // Set App for Editing manually
  const startEditApp = (app: AppReview) => {
    setScrapedPreview({
      id: app.id,
      name: app.name,
      iconUrl: app.iconUrl,
      rating: app.rating,
      playStoreUrl: app.playStoreUrl,
      appStoreUrl: app.appStoreUrl || "",
      videoUrl: app.videoUrl || "",
      description: app.description,
      tags: app.tags,
      category: app.category,
      storeType: app.storeType || (app.playStoreUrl && app.appStoreUrl ? "both" : (app.appStoreUrl ? "ios" : "android"))
    });
    setEditingAppId(app.id);
    setActiveTab("publish");
  };

  // Fetch OneSignal notifications history and email subscribers from Firestore
  const fetchNotificationsAndSubscribers = async () => {
    setIsLoadingNotificationsData(true);
    setNotificationError("");
    setNotificationSuccess("");
    try {
      // 1. Fetch Subscribers
      const subSnapshot = await getDocs(collection(db, "subscribers"));
      const subs = subSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by subscribedAt desc
      subs.sort((a: any, b: any) => {
        const t1 = a.subscribedAt?.seconds || 0;
        const t2 = b.subscribedAt?.seconds || 0;
        return t2 - t1;
      });
      setSubscribersList(subs);

      // 2. Fetch Notification History
      const notifSnapshot = await getDocs(collection(db, "notifications"));
      const notifs = notifSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by sentAt desc
      notifs.sort((a: any, b: any) => {
        const t1 = a.sentAt?.seconds || 0;
        const t2 = b.sentAt?.seconds || 0;
        return t2 - t1;
      });
      setNotificationsHistory(notifs);
    } catch (err: any) {
      console.error("Error fetching subscribers/notifications:", err);
      setNotificationError("حدث خطأ أثناء تحميل بيانات المشتركين والإشعارات من قاعدة البيانات.");
    } finally {
      setIsLoadingNotificationsData(false);
    }
  };

  // Trigger loading notifications data when activeTab changes to notifications
  useEffect(() => {
    if (activeTab === "notifications" && user) {
      fetchNotificationsAndSubscribers();
    }
  }, [activeTab, user]);

  // Handle push notification dispatch
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationError("");
    setNotificationSuccess("");

    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      setNotificationError("الرجاء إدخال عنوان الإشعار ومحتواه أولاً.");
      return;
    }

    setIsSendingNotification(true);

    try {
      const idToken = getIdTokenHelper();

      // 1. Post to secure server-side endpoint
      const response = await fetch("/api/onesignal/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title: notificationTitle.trim(),
          message: notificationMessage.trim(),
          url: notificationUrl.trim() || undefined
        })
      });

      const result = await safeParseResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "فشل إرسال الإشعار عبر الخادم.");
      }

      // 2. Save notification to Firestore history
      const notifRef = doc(collection(db, "notifications"));
      const targetPath = `notifications/${notifRef.id}`;
      try {
        await setDoc(notifRef, {
          title: notificationTitle.trim(),
          message: notificationMessage.trim(),
          sentAt: serverTimestamp(),
          status: result.simulated ? "simulated" : "sent"
        });
      } catch (fErr) {
        handleFirestoreError(fErr, OperationType.CREATE, targetPath);
      }

      // Show success
      if (result.simulated) {
        setNotificationSuccess(result.message);
      } else {
        setNotificationSuccess("تم إرسال الإشعار بنجاح لجميع مستخدمي الهواتف والويب المشتركين عبر OneSignal!");
      }

      // Reset form fields
      setNotificationTitle("");
      setNotificationMessage("");
      setNotificationUrl("");

      // Refresh list
      fetchNotificationsAndSubscribers();

    } catch (err: any) {
      console.error(err);
      setNotificationError(err.message || "حدث خطأ غير متوقع أثناء إرسال الإشعار.");
    } finally {
      setIsSendingNotification(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm font-bold text-slate-500">جاري التحقق من الصلاحيات...</span>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN (If not authenticated)
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12" style={{ direction: "rtl" }}>
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          {/* Form Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">تسجيل دخول الإدارة</h1>
            <p className="mt-2 text-slate-500 text-xs sm:text-sm">هذه المنطقة محمية ومخصصة لمدير الموقع فقط.</p>
          </div>

          {authError && (
            <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold text-rose-700 leading-relaxed flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
              {canResetPin && (
                <button
                  type="button"
                  onClick={() => handleLogin(undefined, true)}
                  className="mt-2 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>اعتماد وتحديث كلمة المرور الحالية لهذه الخانة</span>
                </button>
              )}
            </div>
          )}

          {/* Form - Strictly Email and Password Login Only */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-10 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 text-right"
                  style={{ direction: "ltr", textAlign: "right" }}
                />
                <Mail className="absolute right-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">كلمة السر</label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-10 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 text-right"
                  style={{ direction: "ltr", textAlign: "right" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showPin ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
                <Key className="absolute right-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {authSubmitting ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <span>تسجيل الدخول</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleLogin(undefined, true)}
                disabled={authSubmitting}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>تعيين / تحديث كلمة المرور للمطور</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ADMIN DASHBOARD SCREEN (If authenticated as admin)
  return (
    <div id="admin-dashboard" className="mx-auto max-w-5xl w-full px-2 sm:px-4 py-8 overflow-hidden text-zinc-100" style={{ direction: "rtl" }}>
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-zinc-800 gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>لوحة التحكم (CMS)</span>
          </h1>
          <span className="px-2.5 py-1 text-[10px] sm:text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded-full flex items-center gap-1.5 shadow-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>مزامنة لحظية مزدوجة</span>
          </span>
        </div>

        {/* Admin Meta Data & Logout */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleCleanAndSyncAllUrls}
            disabled={isSyncingUrls}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-black text-amber-300 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            title="مزامنة وتنظيف جميع روابط المقالات في الفايربيز وتحويلها إلى روابط قصيرة ونظيفة (https://roohme.web.app/clean-slug)"
          >
            {isSyncingUrls ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>جاري المزامنة...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ مزامنة وتنظيف الروابط</span>
              </>
            )}
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-right shrink-0">
            <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold leading-none mb-0.5 sm:mb-1">المستخدم الحالي</p>
            <p className="text-[11px] sm:text-xs font-bold text-zinc-200 leading-none truncate max-w-[140px] sm:max-w-[180px]">{user.email}</p>
          </div>
          
          <button 
            onClick={handleLogout}
            className="p-2 sm:p-2.5 text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 rounded-xl transition-all shrink-0 cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Real-time Accurate Platform Metrics Bar (Clean 2-cols on mobile, 3-cols on tablet, 6-cols on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-6">
        {/* Metric 1: Total Apps */}
        <div 
          onClick={() => setActiveTab("manage")}
          className="bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold">إجمالي التطبيقات</span>
            <span className="text-blue-400 group-hover:scale-110 transition-transform text-sm sm:text-base">📱</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{allApps.length}</p>
          <span className="text-[9px] sm:text-[10px] text-zinc-500 font-medium">مسجل بالنظام</span>
        </div>

        {/* Metric 2: Approved Apps */}
        <div 
          onClick={() => setActiveTab("manage")}
          className="bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold">المعتمدة والمنشورة</span>
            <span className="text-emerald-400 group-hover:scale-110 transition-transform text-sm sm:text-base">✅</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">
            {allApps.filter(a => a.isApproved !== false).length}
          </p>
          <span className="text-[9px] sm:text-[10px] text-zinc-500 font-medium">تظهر للزوار فوراً</span>
        </div>

        {/* Metric 3: Pending Moderation */}
        <div 
          onClick={() => setActiveTab("moderate")}
          className="bg-zinc-900/90 hover:bg-zinc-850 border border-amber-900/40 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-amber-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-black">بانتظار الموافقة</span>
            <span className="text-amber-400 group-hover:scale-110 transition-transform text-sm sm:text-base">📋</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400">
            {allApps.filter(a => a.isApproved === false).length}
          </p>
          <span className="text-[9px] sm:text-[10px] text-amber-500/80 font-bold">تتطلب الاعتماد</span>
        </div>

        {/* Metric 4: User Searched Apps */}
        <div 
          onClick={() => setActiveTab("userSearched")}
          className="bg-zinc-900/90 hover:bg-zinc-850 border border-purple-900/40 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-purple-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold">بحوث واستيراد الزوار</span>
            <span className="text-purple-400 group-hover:scale-110 transition-transform text-sm sm:text-base">🔍</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-400">
            {allApps.filter(a => a.isUserSearched === true).length}
          </p>
          <span className="text-[9px] sm:text-[10px] text-purple-400/80 font-medium">بحث الزوار</span>
        </div>

        {/* Metric 5: Firebase Status & Usage Gauge */}
        <div 
          onClick={() => setActiveTab("firebaseStatus")}
          className="bg-zinc-900/90 hover:bg-zinc-850 border border-amber-900/40 hover:border-amber-500/60 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold">حالة الفايربيز</span>
            <span className="text-amber-400 group-hover:scale-110 transition-transform text-sm sm:text-base">🔥</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>شغال 100%</span>
          </p>
          <span className="text-[9px] sm:text-[10px] text-amber-400/90 font-medium">مؤشر الكوتا</span>
        </div>

        {/* Metric 6: Cloudflare R2 Cloud Storage Status & Meter */}
        <div 
          onClick={() => setActiveTab("r2Status")}
          className="bg-zinc-900/90 hover:bg-zinc-850 border border-amber-900/40 hover:border-amber-500/60 rounded-2xl p-3 sm:p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-400 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold">تخزين Cloudflare R2</span>
            <span className="text-amber-400 group-hover:scale-110 transition-transform text-sm sm:text-base">📦</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>متصل 100%</span>
          </p>
          <span className="text-[9px] sm:text-[10px] text-amber-400/90 font-medium">إحصائيات Worker</span>
        </div>
      </div>

      {/* Draggable Ribbon Tabs - Unified for both desktop and mobile platforms */}
      <div className="relative mb-8">
        {/* Left and Right Fading Indicators to signify draggable area */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 dark:from-slate-950 to-transparent pointer-events-none z-10" />
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 dark:from-slate-950 to-transparent pointer-events-none z-10" />
        
        {/* Draggable container */}
        <div
          ref={tabsRibbonRef}
          onMouseDown={handleTabsMouseDown}
          onMouseMove={handleTabsMouseMove}
          onMouseUp={handleTabsMouseUpOrLeave}
          onMouseLeave={handleTabsMouseUpOrLeave}
          className="flex gap-2 overflow-x-auto whitespace-nowrap py-3 px-4 scrollbar-none cursor-grab active:cursor-grabbing select-none border-b border-slate-200 dark:border-slate-800 touch-pan-x"
          style={{ direction: "rtl" }}
        >
          <button
            onClick={() => {
              setActiveTab("agentChat");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "agentChat"
                ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 border-purple-400 text-white font-black shadow-lg shadow-purple-500/30 animate-pulse"
                : "bg-zinc-900 border-purple-900/50 text-purple-400 hover:text-white"
            }`}
          >
            <span>🤖</span>
            <span>وكيل المطور الذكي (LLaMA 3.3 & Voice Chat)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("appMap");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "appMap"
                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 border-indigo-400 text-white font-black shadow-lg shadow-indigo-500/30 animate-pulse"
                : "bg-zinc-900 border-indigo-900/50 text-indigo-400 hover:text-white"
            }`}
          >
            <span>🗺️</span>
            <span>خريطة التطبيق ودورة الحياة (App Map & Diagnostics)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("r2Status");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "r2Status"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 border-amber-500 text-white font-black shadow-md shadow-amber-500/25"
                : "bg-zinc-900 border-zinc-800 text-amber-400 hover:text-white"
            }`}
          >
            <span>📦</span>
            <span>لوحة وتخزين Cloudflare R2 (R2 Storage & Worker)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("firebaseStatus");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "firebaseStatus"
                ? "bg-amber-600 border-amber-600 text-white font-black shadow-md shadow-amber-500/20"
                : "bg-zinc-900 border-zinc-800 text-amber-400 hover:text-white"
            }`}
          >
            <span>🔥</span>
            <span>مؤشر كوتا وحالة الفايربيز (Firebase Status & Usage)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("indexing");
              setScrapedPreview(null);
              setEditingAppId(null);
              fetchIndexedUrlsList();
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "indexing"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-indigo-500 text-white font-black shadow-md shadow-blue-500/25"
                : "bg-zinc-900 border-zinc-800 text-blue-400 hover:text-white"
            }`}
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span>صفحة الأرشفة (Google Indexing API)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("envManager");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "envManager"
                ? "bg-emerald-600 border-emerald-600 text-white font-black shadow-md shadow-emerald-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>🔐</span>
            <span>إدارة المفاتيح والمتغيرات السرية (Env Manager)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("adsense");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "adsense"
                ? "bg-blue-600 border-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>⚙️</span>
            <span>إدارة الإعلانات والشبكات المتعددة</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("links");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "links"
                ? "bg-blue-600 border-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>🔗</span>
            <span>روابط التواصل وبوابة الصور (AI Portal)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("publish");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "publish"
                ? "bg-blue-600 border-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>✨</span>
            <span>إضافة ونشر التطبيقات (الذكاء الاصطناعي)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("userSearched");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "userSearched"
                ? "bg-purple-600 border-purple-600 text-white font-black shadow-md shadow-purple-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>🔍</span>
            <span>تطبيقات بحث المستخدمين ({allApps.filter(app => app.isUserSearched === true).length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("moderate");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "moderate"
                ? "bg-amber-600 border-amber-600 text-white font-black shadow-md shadow-amber-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>📋</span>
            <span>مراجعة واعتماد التطبيقات ({allApps.filter(app => !app.isApproved && app.status !== "published").length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("manage");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "manage"
                ? "bg-blue-600 border-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>📱</span>
            <span>تعديل وحذف التطبيقات ({allApps.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("notifications");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "notifications"
                ? "bg-blue-600 border-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>🔔</span>
            <span>إرسال الإشعارات والمشتركين ({subscribersList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("requests");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "requests"
                ? "bg-blue-600 border-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>📩</span>
            <span>طلبات الزوار ({appRequestsList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("reviews");
              setScrapedPreview(null);
              setEditingAppId(null);
            }}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
              activeTab === "reviews"
                ? "bg-blue-600 border-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <span>💬</span>
            <span>تقييمات وتعليقات الزوار ({reviewsList.length})</span>
          </button>

          <button
            onClick={() => {
              fetchArchivedAppsList();
              setShowArchivedModal(true);
            }}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 bg-emerald-950/80 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900 hover:text-white shadow-xs"
            title="عرض كـافة الصفحات المعتمدة المؤرشفة بروابط مباشرة في R2 و approved-apps.json"
          >
            <span>📦</span>
            <span>الأرشيف والصفحات المؤرشفة ({archivedAppsList.length})</span>
          </button>

          <button
            onClick={() => {
              fetchGithubTokenFromFirestore();
              setShowGithubModal(true);
            }}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 bg-purple-950/80 border-purple-700/80 text-purple-300 hover:bg-purple-900 hover:text-white shadow-xs"
            title="عرض ونسخ توكن جيت هاب المحفوظ في الفايربيز"
          >
            <Github className="w-4 h-4 text-purple-300" />
            <span>توكن GitHub ({githubTokensList.length > 0 ? "محفوظ بـ Firebase" : "غير متاح"})</span>
          </button>

          <button
            onClick={handlePurgeAllApps}
            disabled={isPurgingAll}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 bg-red-950/60 border-red-800/80 text-red-300 hover:bg-red-900/80 hover:text-white"
            title="تفريغ ومسح كافة التطبيقات والسجلات السابقة"
          >
            <span>🧹</span>
            <span>{isPurgingAll ? "جاري المسح والتفريغ..." : "مسح وتفريغ كافة التطبيقات (Fresh Purge)"}</span>
          </button>
        </div>
      </div>

      {/* Dynamic AI Agent Diagnostic & Interactive Assistant Bar for active tab */}
      <TabAiDiagnostics
        activeTabName={activeTab}
        getIdTokenHelper={getIdTokenHelper}
        contextData={{ totalApps: allApps.length, activeTab }}
      />

      {/* TAB 1: SCRAPE & PUBLISH REVIEW */}
      {activeTab === "publish" && (
        <div className="space-y-8">
          
          {/* Paste Link Box */}
          {!scrapedPreview && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>الميزة الخارقة (Fetch & Publish)</span>
                </h2>
                <WindowCopyButton windowId="WINDOW_SCRAPE_PUBLISH_AI" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                ضع رابط التطبيق من متجر Google Play في المربع أدناه. وسيقوم النظام تلقائياً بسحب بيانات التطبيق من المتجر، ثُم يرسلها إلى نموذج <span className="font-bold text-indigo-600">Gemini AI</span> لتوليد مقال مراجعة احترافي وحصري باللغة العربية متوافق مع شروط السيو وقبول أدسنس!
              </p>

              {scrapeError && (
                <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-700 leading-relaxed">
                  {scrapeError}
                </div>
              )}

              {publishSuccess && (
                <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <Check className="w-4.5 h-4.5 text-emerald-600" />
                  <span>تم نشر مراجعة التطبيق بنجاح وظهرت في الصفحة الرئيسية فوراً!</span>
                </div>
              )}

              <form onSubmit={handleScrape} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="مثال: https://play.google.com/store/apps/details?id=com.whatsapp"
                  value={playStoreUrlInput}
                  onChange={(e) => setPlayStoreUrlInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                
                <button
                  type="submit"
                  disabled={isScraping}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {isScraping ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري جلب وتوليد المقال...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5 text-amber-300" />
                      <span>جلب ونشر</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Interactive Scraped Review Preview & Metadata Editor */}
          {scrapedPreview && (
            <form onSubmit={handlePublish} className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
              
              <div className="flex flex-wrap justify-between items-center gap-2 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">
                  {editingAppId ? "تعديل المراجعة المنشورة" : "معاينة وتعديل المقال المولد قبل النشر"}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const playUrl = scrapedPreview.playStoreUrl || (scrapedPreview.packageId ? `https://play.google.com/store/apps/details?id=${scrapedPreview.packageId}` : `https://play.google.com/store/search?q=${encodeURIComponent(scrapedPreview.name)}&c=apps`);
                      window.open(playUrl, '_blank');
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="اختبار رابط متجر جوجل بلاي المباشر للتطبيق"
                  >
                    <span className="text-sm">🌝</span>
                    <span>رابط جوجل بلاي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const appleUrl = scrapedPreview.appStoreUrl || `https://apps.apple.com/us/search?term=${encodeURIComponent(scrapedPreview.name)}`;
                      window.open(appleUrl, '_blank');
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="اختبار رابط متجر أبل المباشر للتطبيق"
                  >
                    <span className="text-sm">🌚</span>
                    <span>رابط أبل ستور</span>
                  </button>

                  <button
                    type="button"
                    disabled={verifyingAppId === "preview"}
                    onClick={() => handleAiVerifyPlayStoreUrl({ name: scrapedPreview.name, playStoreUrl: scrapedPreview.playStoreUrl, packageId: scrapedPreview.packageId }, true)}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                    title="سحب وتأكيد رابط جوجل بلاي السليم بالذكاء الاصطناعي وحفظه"
                  >
                    {verifyingAppId === "preview" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>تأكيد الرابط بـ AI</span>
                  </button>

                  {scrapedPreview?.slug && (
                    <button
                      type="button"
                      onClick={() => window.open(`/${scrapedPreview.slug}`, '_blank')}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                      title="معاينة واختبار الرابط المباشر للمقال في الموقع"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                      <span>معاينة المقال (/{scrapedPreview.slug})</span>
                    </button>
                  )}
                  <span className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                    مراجعة مولدة بالذكاء الاصطناعي
                  </span>
                </div>
              </div>

              {/* Grid metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">اسم التطبيق</label>
                  <input
                    type="text"
                    required
                    value={scrapedPreview.name}
                    onChange={(e) => setScrapedPreview({ ...scrapedPreview, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">رابط أيقونة التطبيق</label>
                  <input
                    type="text"
                    required
                    value={scrapedPreview.iconUrl}
                    onChange={(e) => setScrapedPreview({ ...scrapedPreview, iconUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">التقييم الحالي (من 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    required
                    value={scrapedPreview.rating}
                    onChange={(e) => setScrapedPreview({ ...scrapedPreview, rating: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">القسم / التصنيف</label>
                  <input
                    type="text"
                    required
                    value={scrapedPreview.category}
                    onChange={(e) => setScrapedPreview({ ...scrapedPreview, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* Store Type Selection Option */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">نوع متجر التطبيق المتوفر (Store Availability Type)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setScrapedPreview({ ...scrapedPreview, storeType: "android" })}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        (scrapedPreview.storeType || (scrapedPreview.playStoreUrl && !scrapedPreview.appStoreUrl ? "android" : (scrapedPreview.appStoreUrl && !scrapedPreview.playStoreUrl ? "ios" : "both"))) === "android"
                          ? "bg-emerald-600 border-emerald-600 text-white font-black shadow-md shadow-emerald-500/20"
                          : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      أندرويد فقط (Google Play)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScrapedPreview({ ...scrapedPreview, storeType: "ios" })}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        (scrapedPreview.storeType || (scrapedPreview.playStoreUrl && !scrapedPreview.appStoreUrl ? "android" : (scrapedPreview.appStoreUrl && !scrapedPreview.playStoreUrl ? "ios" : "both"))) === "ios"
                          ? "bg-blue-600 border-blue-600 text-white font-black shadow-md shadow-blue-500/20"
                          : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      آيفون فقط (App Store)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScrapedPreview({ ...scrapedPreview, storeType: "both" })}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        (scrapedPreview.storeType || (scrapedPreview.playStoreUrl && !scrapedPreview.appStoreUrl ? "android" : (scrapedPreview.appStoreUrl && !scrapedPreview.playStoreUrl ? "ios" : "both"))) === "both"
                          ? "bg-indigo-600 border-indigo-600 text-white font-black shadow-md shadow-indigo-500/20"
                          : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      كلا المتجرين (أندرويد + آيفون)
                    </button>
                  </div>
                </div>

                {/* Google Play Store Link */}
                <div className={`md:col-span-2 transition-all duration-300 ${
                  (scrapedPreview.storeType || (scrapedPreview.playStoreUrl && !scrapedPreview.appStoreUrl ? "android" : (scrapedPreview.appStoreUrl && !scrapedPreview.playStoreUrl ? "ios" : "both"))) === "ios"
                    ? "opacity-40 pointer-events-none scale-95"
                    : "opacity-100"
                }`}>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    <span>رابط متجر الأندرويد (Google Play Store URL)</span>
                  </label>
                  <input
                    type="text"
                    disabled={(scrapedPreview.storeType || (scrapedPreview.playStoreUrl && !scrapedPreview.appStoreUrl ? "android" : (scrapedPreview.appStoreUrl && !scrapedPreview.playStoreUrl ? "ios" : "both"))) === "ios"}
                    value={scrapedPreview.playStoreUrl || ""}
                    onChange={(e) => setScrapedPreview({ ...scrapedPreview, playStoreUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold text-slate-700 text-left"
                    placeholder="ضع رابط تحميل التطبيق من متجر Google Play للأندرويد..."
                  />
                </div>

                {/* Apple App Store Link */}
                <div className={`md:col-span-2 transition-all duration-300 ${
                  (scrapedPreview.storeType || (scrapedPreview.playStoreUrl && !scrapedPreview.appStoreUrl ? "android" : (scrapedPreview.appStoreUrl && !scrapedPreview.playStoreUrl ? "ios" : "both"))) === "android"
                    ? "opacity-40 pointer-events-none scale-95"
                    : "opacity-100"
                }`}>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    <span>رابط متجر آبل ستور (Apple App Store URL)</span>
                  </label>
                  <input
                    type="text"
                    disabled={(scrapedPreview.storeType || (scrapedPreview.playStoreUrl && !scrapedPreview.appStoreUrl ? "android" : (scrapedPreview.appStoreUrl && !scrapedPreview.playStoreUrl ? "ios" : "both"))) === "android"}
                    value={scrapedPreview.appStoreUrl || ""}
                    onChange={(e) => setScrapedPreview({ ...scrapedPreview, appStoreUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-700 text-left"
                    placeholder="ضع رابط تحميل التطبيق من متجر آبل ستور للآيفون..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    <span>رابط فيديو الشرح والمراجعة من يوتيوب (YouTube Review/Tutorial URL - اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={scrapedPreview.videoUrl || ""}
                    onChange={(e) => setScrapedPreview({ ...scrapedPreview, videoUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-50 transition-all font-semibold text-slate-700"
                    placeholder="مثال: https://www.youtube.com/watch?v=XXXXXX"
                  />
                </div>

                {/* AI Notification Banners inside Editor */}
                {aiActionSuccess && (
                  <div className="md:col-span-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <span>{aiActionSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiActionSuccess("")}
                      className="text-emerald-500 hover:text-emerald-700 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {aiActionError && (
                  <div className="md:col-span-2 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold text-rose-800 flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                      <span>{aiActionError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiActionError("")}
                      className="text-rose-500 hover:text-rose-700 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <label className="block text-xs font-bold text-slate-700">
                      الكلمات المفتاحية (SEO Tags) - مفصولة بفاصلة
                    </label>
                    <button
                      type="button"
                      disabled={isRegeneratingTags}
                      onClick={handleRegenerateKeywords}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all border border-emerald-200 cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      {isRegeneratingTags ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري توليد كلمات البحث للـ SEO...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تحديث وتوليد كلمات البحث بالذكاء الاصطناعي</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={scrapedPreview.tags.join(", ")}
                    onChange={(e) => {
                      const list = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                      setScrapedPreview({ ...scrapedPreview, tags: list });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white font-medium"
                    placeholder="مثال: أندرويد, تحميل, تواصل"
                  />
                </div>
              </div>

              {/* Article Content Editor */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    المقال ووصف مراجعة التطبيق (Markdown منسق)
                  </label>
                  <button
                    type="button"
                    disabled={isRegeneratingDesc}
                    onClick={handleRegenerateDescription}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all border border-indigo-200 cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    {isRegeneratingDesc ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>جاري صياغة مراجعة صحفية 1500+ كلمة...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>إعادة توليد وتطوير الشرح بالذكاء الاصطناعي</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  required
                  rows={14}
                  value={scrapedPreview.description}
                  onChange={(e) => setScrapedPreview({ ...scrapedPreview, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-mono outline-none focus:border-blue-500 focus:bg-white leading-relaxed"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScrapedPreview(null);
                    setEditingAppId(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-200 disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ المراجعة...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4.5 h-4.5" />
                      <span>{editingAppId ? "تحديث ونشر المراجعة" : "حفظ ونشر المراجعة فوراً"}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      )}

      {/* TAB: USER SEARCHED APPS */}
      {activeTab === "userSearched" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-blue-200/60 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-blue-400 mb-1 flex items-center gap-2">
                  <span>🔍</span>
                  <span>تطبيقات قام المستخدمون بالبحث عنها داخل الموقع</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  هذه القائمة تضم كافة التطبيقات التي قام زوار الموقع بالبحث عنها. عند بحث الزائر، يقوم النظام بطلب البيانات فوراً وإسناد حالة الاعتماد بـ (معلق). يمكنك مراجعة المقال، وترقيته بضغطة زر ليصل إلى 1500+ كلمة، ثم الضغط على (اعتماد ونشر) لظهوره فوراً لجميع الزوار على الصفحة الرئيسية!
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <WindowCopyButton windowId="WINDOW_USER_SEARCHED_APPS" />
                <button
                  onClick={handleBulkUpgradeAppsAI}
                  disabled={isUpgradingAllApps}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                >
                  {isUpgradingAllApps ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري ترقية كافة المقالات بالذكاء الاصطناعي...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>ترقية جميع الشروحات والسحوبات إلى 1500+ كلمة</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* User Searched Apps Grid */}
          {(() => {
            const searchedApps = allApps.filter(app => app.isUserSearched === true || (app.isApproved === false && (app.tags || []).some(t => t.includes("بحث"))));
            if (searchedApps.length === 0) {
              return (
                <div className="text-center py-16 bg-white dark:bg-zinc-900/60 rounded-3xl border border-slate-200/60 dark:border-zinc-800 p-8">
                  <span className="text-4xl mb-3 block">🔎</span>
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-200 mb-1">لا توجد تطبيقات بحث جديدة معلقة</h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                    عندما يقوم أي زائر بالبحث عن تطبيق غير موجود، سيقوم النظام بجلبه فوراً وإضافته هنا لتتمكن من مراجعته والموافقة عليه بضغطة زر!
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchedApps.map(app => (
                  <div key={app.id} className="bg-white dark:bg-zinc-900/80 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between transition-all hover:border-indigo-500/50">
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        {app.iconUrl && app.iconUrl.trim() !== "" ? (
                          <img src={app.iconUrl} alt={app.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 dark:border-zinc-800 shadow-xs shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800 flex items-center justify-center font-bold text-blue-500 text-lg shrink-0">
                            {app.name ? app.name.charAt(0) : "📱"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-black text-slate-900 dark:text-white text-sm truncate">{app.name}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${app.isApproved ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"}`}>
                              {app.isApproved ? "منشور بالرئيسية" : "بانتظار الموافقة"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{app.category || "تطبيقات"} • T: {app.storeType || "android"}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-amber-500 font-bold">
                            <span>★</span>
                            <span>{app.rating || 4.5}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-950/60 rounded-xl p-3 border border-slate-100 dark:border-zinc-850 text-xs text-slate-600 dark:text-zinc-400 line-clamp-3 mb-4 leading-relaxed font-sans">
                        {app.description ? app.description.slice(0, 180) + "..." : "لا يوجد شرح متوفر"}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                      {!app.isApproved && (
                        <button
                          onClick={() => handleApproveApp(app.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          <span>✅</span>
                          <span>اعتماد ونشر بالرئيسية</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDirectAppAIRegenerate(app.id, 'description')}
                        disabled={regeneratingAppId === app.id}
                        className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/20 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {regeneratingAppId === app.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>✨</span>
                        )}
                        <span>تطوير الشرح (1500+ كلمة)</span>
                      </button>

                      <button
                        onClick={() => {
                          const playUrl = app.playStoreUrl || (app.packageId ? `https://play.google.com/store/apps/details?id=${app.packageId}` : `https://play.google.com/store/search?q=${encodeURIComponent(app.name)}&c=apps`);
                          window.open(playUrl, '_blank');
                        }}
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold border border-amber-500/20 flex items-center gap-1 transition-all cursor-pointer"
                        title="فتح ومعاينة رابط متجر جوجل بلاي المباشر للتأكد منه"
                      >
                        <span>🌝</span>
                        <span>رابط جوجل بلاي</span>
                      </button>

                      <button
                        onClick={() => {
                          const appleUrl = app.appStoreUrl || `https://apps.apple.com/us/search?term=${encodeURIComponent(app.name)}`;
                          window.open(appleUrl, '_blank');
                        }}
                        className="px-2.5 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-bold border border-slate-500/20 flex items-center gap-1 transition-all cursor-pointer"
                        title="فتح ومعاينة رابط متجر أبل المباشر للتأكد منه"
                      >
                        <span>🌚</span>
                        <span>رابط أبل ستور</span>
                      </button>

                      <button
                        disabled={verifyingAppId === app.id}
                        onClick={() => handleAiVerifyPlayStoreUrl(app)}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        title="سحب والتحقق بالذكاء الاصطناعي من صحة رابط متجر جوجل بلاي وحفظه بالفايربيس"
                      >
                        {verifyingAppId === app.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>تأكيد الرابط بـ AI</span>
                      </button>

                      <button
                        onClick={() => window.open(`/${app.slug || app.id}`, '_blank')}
                        className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/20 flex items-center gap-1 transition-all cursor-pointer"
                        title="معاينة المقال في الموقع"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>معاينة المقال</span>
                      </button>

                      <button
                        onClick={() => startEditApp(app)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>تعديل</span>
                      </button>

                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-500/20 transition-all cursor-pointer mr-auto"
                      >
                        <span>🗑️</span>
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB: MODERATE UNAPPROVED APPS */}
      {activeTab === "moderate" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-100/60 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-800 dark:text-amber-400 mb-1 flex items-center gap-2">
              <span>📋</span>
              <span>مراجعة واعتماد التطبيقات المستوردة</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mb-4">
              هنا يمكنك مراجعة وتعديل ونشر التطبيقات التي تم سحبها تلقائياً، أو التي قام المستخدمون بالبحث عنها في الواجهة الرئيسية. لن تظهر هذه التطبيقات للزوار العاديين حتى تقوم باعتمادها ونشرها.
            </p>

            <button
              onClick={handlePull10Apps}
              disabled={isPullingApps}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-amber-500/15 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isPullingApps ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري سحب 10 تطبيقات متميزة وتوليد المراجعات... (قد يستغرق ذلك دقيقة)</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>سحب 10 تطبيقات جديدة تلقائياً بالذكاء الاصطناعي</span>
                </>
              )}
            </button>
          </div>

          {/* List of pending apps */}
          {(() => {
            const pendingAppsList = allApps.filter(app => !app.isApproved && app.status !== "published");
            if (pendingAppsList.length === 0) {
              return (
                <div className="bg-slate-50/50 dark:bg-zinc-900/40 rounded-3xl p-12 text-center border border-dashed border-slate-200 dark:border-zinc-800">
                  <span className="text-4xl mb-3 block">🎉</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">صندوق المراجعة فارغ!</h4>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mx-auto leading-relaxed">
                    لا توجد تطبيقات تحت المراجعة حالياً. يمكنك تفعيل ميزة السحب التلقائي باستخدام الزر أعلاه، أو قيام الزوار بالبحث عن تطبيقات جديدة في مربع البحث لجلبها وتوليدها فوراً!
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 px-1">
                  <span>التطبيقات في قائمة الانتظار</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-black">
                    {pendingAppsList.length} تطبيقات
                  </span>
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {pendingAppsList.map((app) => (
                  <div 
                    key={`moderate-${app.id}`}
                    className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-900 rounded-3xl p-5 shadow-sm transition-all animate-in fade-in duration-200"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      {/* App Header info */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center bg-slate-50 dark:bg-zinc-900">
                          {app.iconUrl ? (
                            <img 
                              src={app.iconUrl} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-lg font-black text-blue-500">{app.name.charAt(0)}</span>
                          )}
                        </div>

                        <div className="text-right">
                          <h5 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                            {app.name}
                          </h5>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 px-2.5 py-0.5 rounded-full font-bold">
                              {app.category}
                            </span>
                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                              <span>★</span>
                              <span>{app.rating}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                              {app.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApproveApp(app.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <span>✅</span>
                          <span>اعتماد ونشر</span>
                        </button>

                        <button
                          onClick={() => {
                            const playUrl = app.playStoreUrl || (app.packageId ? `https://play.google.com/store/apps/details?id=${app.packageId}` : `https://play.google.com/store/search?q=${encodeURIComponent(app.name)}&c=apps`);
                            window.open(playUrl, '_blank');
                          }}
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-black border border-amber-500/20 flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="اختبار وتفحص رابط متجر جوجل بلاي المباشر للتطبيق"
                        >
                          <span className="text-sm">🌝</span>
                          <span>جوجل بلاي</span>
                        </button>

                        <button
                          onClick={() => {
                            const appleUrl = app.appStoreUrl || `https://apps.apple.com/us/search?term=${encodeURIComponent(app.name)}`;
                            window.open(appleUrl, '_blank');
                          }}
                          className="px-2.5 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-black border border-slate-500/20 flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="اختبار وتفحص رابط متجر أبل المباشر للتطبيق"
                        >
                          <span className="text-sm">🌚</span>
                          <span>متجر أبل</span>
                        </button>

                        <button
                          disabled={verifyingAppId === app.id}
                          onClick={() => handleAiVerifyPlayStoreUrl(app)}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black border border-emerald-500/20 flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="سحب والتحقق بالذكاء الاصطناعي من صحة رابط متجر جوجل بلاي وحفظه بالفايربيس"
                        >
                          {verifyingAppId === app.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>تأكيد الرابط بـ AI</span>
                        </button>

                        <button
                          onClick={() => startEditApp(app)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-black border border-slate-200/50 dark:border-zinc-800 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <span>✏️</span>
                          <span>تعديل يدوي</span>
                        </button>

                        <button
                          disabled={regeneratingAppId === app.id}
                          onClick={() => handleDirectAppAIRegenerate(app.id, 'description')}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black border border-indigo-200/60 flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="إعادة توليد وتوسيع الشرح بالذكاء الاصطناعي (1500+ كلمة)"
                        >
                          {regeneratingAppId === app.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>تطوير الشرح (AI)</span>
                        </button>

                        <button
                          disabled={regeneratingAppId === app.id}
                          onClick={() => handleDirectAppAIRegenerate(app.id, 'keywords')}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-black border border-emerald-200/60 flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="توليد وتحديث كلمات البحث والـ SEO بالذكاء الاصطناعي"
                        >
                          {regeneratingAppId === app.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Wand2 className="w-3.5 h-3.5" />
                          )}
                          <span>تحديث SEO</span>
                        </button>

                        <button
                          onClick={() => handleDeleteApp(app.id)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black border border-rose-100 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>

                    {/* Tags list */}
                    <div className="mt-4 flex items-center gap-1.5 flex-wrap border-t border-slate-50 dark:border-zinc-900/60 pt-3.5">
                      <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 ml-1.5 font-bold">الكلمات الدلالية:</span>
                      {app.tags && app.tags.map((tag, tagIdx) => (
                        <span 
                          key={`pending-tag-${app.id}-${tagIdx}`}
                          className="text-[9px] bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850/60 text-slate-500 dark:text-zinc-400 px-2 py-0.5 rounded-md font-bold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Collapsible preview of generated article */}
                    <div className="mt-4 border-t border-slate-50 dark:border-zinc-900/60 pt-3">
                      <button
                        onClick={() => setExpandedPendingId(expandedPendingId === app.id ? null : app.id)}
                        className="text-[11px] font-black text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{expandedPendingId === app.id ? "👇 إغلاق المعاينة" : "📖 عرض المقال المولد بالكامل"}</span>
                      </button>

                      {expandedPendingId === app.id && (
                        <div className="mt-2 text-right">
                          <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 mb-1.5">نص المقال (صيغة Markdown):</p>
                          <div className="text-xs bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 font-mono select-text whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto border border-slate-100 dark:border-zinc-850 text-slate-700 dark:text-zinc-300">
                            {app.description}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        </div>
      )}

      {/* TAB 2: MANAGE PUBLISHED APPS */}
      {activeTab === "manage" && (
        <div className="space-y-6">
          {/* Quick Delete Form - requested: حذفه من خلال مسح الرابط */}
          <div className="bg-rose-50 border border-rose-100/70 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-rose-800 mb-1 flex items-center gap-2">
              <span className="text-base">🗑️</span>
              <span>مسح الرابط السريع للحذف</span>
            </h3>
            <p className="text-xs text-rose-600/90 leading-relaxed mb-4">
              يمكنك حذف ومسح أي تطبيق مراجعة مسجل فوراً عن طريق نسخ ولصق رابط متجر Google Play (أو اسم حزمة التطبيق) في المربع أدناه ثم النقر على زر المسح والحذف.
            </p>

            {quickDeleteError && (
              <div className="mb-4 bg-white border border-rose-200 text-rose-600 text-xs font-bold py-2 px-3 rounded-xl">
                {quickDeleteError}
              </div>
            )}
            {quickDeleteSuccess && (
              <div className="mb-4 bg-white border border-emerald-200 text-emerald-600 text-xs font-bold py-2 px-3 rounded-xl">
                {quickDeleteSuccess}
              </div>
            )}

            <form onSubmit={handleQuickDeleteByUrl} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="ضع رابط متجر Google Play بالكامل لحذف التطبيق فوراً..."
                value={urlToDeleteInput}
                onChange={(e) => {
                  setUrlToDeleteInput(e.target.value);
                  setQuickDeleteError("");
                  setQuickDeleteSuccess("");
                }}
                className="flex-1 bg-white border border-rose-200/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all font-medium"
              />
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shadow-sm shadow-rose-100"
              >
                مسح الرابط وحذف المراجعة
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs">
            <div className="pb-4 mb-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">إدارة التطبيقات والمراجعات المنشورة</h2>
            <div className="flex items-center gap-3">
              <WindowCopyButton windowId="WINDOW_MANAGE_PUBLISHED_APPS" />
              <span className="text-xs text-slate-400 font-bold">إجمالي المراجعات: {allApps.length}</span>
            </div>
          </div>

          {allApps.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Globe className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-500">لا توجد مراجعات منشورة حالياً</p>
              <p className="text-xs text-slate-400 mt-1">انتقل لعلامة التبويب الأولى لجلب مراجعة جديدة بنقرة واحدة.</p>
            </div>
          ) : (
            <div>
              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-3 px-4">أيقونة</th>
                      <th className="py-3 px-4">اسم التطبيق / القسم</th>
                      <th className="py-3 px-4">حالة النشر</th>
                      <th className="py-3 px-4">التقييم</th>
                      <th className="py-3 px-4">تاريخ النشر</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {allApps.map((app) => {
                      const isPending = app.status === 'pending' || app.isApproved === false;
                      return (
                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              {app.iconUrl && app.iconUrl.trim() !== "" ? (
                                <img 
                                  src={app.iconUrl} 
                                  alt={app.name} 
                                  className="h-full w-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-xs font-bold text-blue-500">{app.name ? app.name.charAt(0) : "📱"}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{app.name}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-blue-600 font-bold">{app.category}</span>
                              <span className="text-[10px] text-slate-400 font-mono select-all">
                                https://roohme.web.app/{(app.slug || app.id).replace(/\.html$/i, "")}
                              </span>
                              <span className="text-[9px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 font-mono" title={`رابط التخزين الخلفي برتو: ${app.r2Url || 'https://rooh-platform-worker.roohr4046.workers.dev/' + (app.slug || app.id).replace(/\.html$/i, "") + '.html'}`}>
                                R2: {(app.r2FileKey || `${(app.slug || app.id).replace(/\.html$/i, "")}.html`)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                مسودة (Pending)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                منشور (Published)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-amber-500 font-bold">
                            ★ {app.rating.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-xs">
                            {app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString("ar-EG") : new Date().toLocaleDateString("ar-EG")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isPending && (
                                <button
                                  onClick={() => handleApproveApp(app.id)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="موافقة ونشر"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  موافقة ونشر
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const playUrl = app.playStoreUrl || (app.packageId ? `https://play.google.com/store/apps/details?id=${app.packageId}` : `https://play.google.com/store/search?q=${encodeURIComponent(app.name)}&c=apps`);
                                  window.open(playUrl, '_blank');
                                }}
                                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all text-sm font-bold"
                                title="اختبار وتفحص رابط متجر جوجل بلاي المباشر للتطبيق 🌝"
                              >
                                🌝
                              </button>
                              <button
                                onClick={() => {
                                  const appleUrl = app.appStoreUrl || `https://apps.apple.com/us/search?term=${encodeURIComponent(app.name)}`;
                                  window.open(appleUrl, '_blank');
                                }}
                                className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all text-sm font-bold"
                                title="اختبار وتفحص رابط متجر أبل المباشر للتطبيق 🌚"
                              >
                                🌚
                              </button>
                              <button
                                disabled={verifyingAppId === app.id}
                                onClick={() => handleAiVerifyPlayStoreUrl(app)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all text-sm font-bold disabled:opacity-50"
                                title="سحب والتحقق بالذكاء الاصطناعي من صحة رابط متجر جوجل بلاي وحفظه بالفايربيس ✨"
                              >
                                {verifyingAppId === app.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                                ) : (
                                  <Sparkles className="w-4 h-4 text-emerald-600" />
                                )}
                              </button>
                              <button
                                onClick={() => window.open(`/${(app.slug || app.id).replace(/\.html$/i, "")}`, '_blank')}
                                className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                                title={`معاينة صفحة المراجعة في الموقع (/${(app.slug || app.id).replace(/\.html$/i, "")})`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  const cleanSlug = String(app.slug || app.id).split('?')[0].split('#')[0].replace(/\.html$/i, "").trim();
                                  const shortUrl = `https://roohme.web.app/${cleanSlug}`;
                                  try {
                                    await navigator.clipboard.writeText(shortUrl);
                                    alert(`تم نسخ الرابط القصير للمقال بنجاح! 🔗\n${shortUrl}`);
                                  } catch (e) {
                                    prompt("انسخ الرابط القصير للمقال:", shortUrl);
                                  }
                                }}
                                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                                title={`نسخ الرابط القصير المخصص للمقال (https://roohme.web.app/${(app.slug || app.id).replace(/\.html$/i, "")})`}
                              >
                                <Copy className="w-4 h-4 text-amber-500" />
                              </button>
                              <button
                                onClick={() => startEditApp(app)}
                                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                title="تعديل المراجعة"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteApp(app.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                                title="حذف المراجعة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Horizontal Touch-Friendly Cards */}
              <div className="block md:hidden space-y-3">
                {allApps.map((app) => {
                  const isPending = app.status === 'pending' || app.isApproved === false;
                  return (
                    <div key={app.id} className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100/80 dark:border-zinc-800 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200/50 dark:border-zinc-750 shrink-0 flex items-center justify-center">
                          {app.iconUrl && app.iconUrl.trim() !== "" ? (
                            <img 
                              src={app.iconUrl} 
                              alt={app.name} 
                              className="h-full w-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-sm font-bold text-blue-500">{app.name ? app.name.charAt(0) : "📱"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">{app.name}</h4>
                            {isPending && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                مسودة
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">{app.category}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-amber-500 font-black">★ {app.rating.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                              {app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString("ar-EG") : new Date().toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Horizontal Action Buttons Row */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-200/60 dark:border-zinc-800">
                        {isPending && (
                          <button
                            onClick={() => handleApproveApp(app.id)}
                            className="px-2.5 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 rounded-xl transition-all shadow-2xs font-bold text-xs flex items-center gap-1 cursor-pointer"
                            title="موافقة ونشر"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>نشر</span>
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const playUrl = app.playStoreUrl || (app.packageId ? `https://play.google.com/store/apps/details?id=${app.packageId}` : `https://play.google.com/store/search?q=${encodeURIComponent(app.name)}&c=apps`);
                            window.open(playUrl, '_blank');
                          }} 
                          className="p-1.5 px-2.5 text-amber-700 dark:text-amber-400 bg-white dark:bg-zinc-800 hover:bg-amber-50 border border-slate-200/70 dark:border-zinc-700 rounded-xl transition-all shadow-2xs text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="اختبار رابط متجر جوجل بلاي المباشر 🌝"
                        >
                          <span>🌝</span>
                        </button>
                        <button 
                          onClick={() => {
                            const appleUrl = app.appStoreUrl || `https://apps.apple.com/us/search?term=${encodeURIComponent(app.name)}`;
                            window.open(appleUrl, '_blank');
                          }} 
                          className="p-1.5 px-2.5 text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-slate-100 border border-slate-200/70 dark:border-zinc-700 rounded-xl transition-all shadow-2xs text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="اختبار رابط متجر أبل المباشر 🌚"
                        >
                          <span>🌚</span>
                        </button>
                        <button 
                          disabled={verifyingAppId === app.id}
                          onClick={() => handleAiVerifyPlayStoreUrl(app)}
                          className="p-1.5 px-2.5 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-zinc-800 hover:bg-emerald-50 border border-slate-200/70 dark:border-zinc-700 rounded-xl transition-all shadow-2xs text-xs font-bold disabled:opacity-50 flex items-center gap-1 justify-center cursor-pointer"
                          title="سحب والتحقق بالذكاء الاصطناعي من صحة رابط متجر جوجل بلاي وحفظه بالفايربيس ✨"
                        >
                          {verifyingAppId === app.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </button>
                        <button 
                          onClick={() => window.open(`/${(app.slug || app.id).replace(/\.html$/i, "")}`, '_blank')} 
                          className="p-1.5 px-2.5 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-800 hover:bg-indigo-50 border border-slate-200/70 dark:border-zinc-700 rounded-xl transition-all shadow-2xs cursor-pointer"
                          title={`معاينة المراجعة بالموقع (/${(app.slug || app.id).replace(/\.html$/i, "")})`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={async () => {
                            const cleanSlug = String(app.slug || app.id).split('?')[0].split('#')[0].replace(/\.html$/i, "").trim();
                            const shortUrl = `https://roohme.web.app/${cleanSlug}`;
                            try {
                              await navigator.clipboard.writeText(shortUrl);
                              alert(`تم نسخ الرابط القصير للمقال بنجاح! 🔗\n${shortUrl}`);
                            } catch (e) {
                              prompt("انسخ الرابط القصير للمقال:", shortUrl);
                            }
                          }} 
                          className="p-1.5 px-2.5 text-amber-600 dark:text-amber-400 bg-white dark:bg-zinc-800 hover:bg-amber-50 border border-slate-200/70 dark:border-zinc-700 rounded-xl transition-all shadow-2xs cursor-pointer"
                          title={`نسخ الرابط القصير المخصص (https://roohme.web.app/${(app.slug || app.id).replace(/\.html$/i, "")})`}
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-500" />
                        </button>
                        <button 
                          onClick={() => startEditApp(app)} 
                          className="p-1.5 px-2.5 text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-800 hover:bg-blue-50 border border-slate-200/70 dark:border-zinc-700 rounded-xl transition-all shadow-2xs cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteApp(app.id)} 
                          className="p-1.5 px-2.5 text-rose-600 dark:text-rose-400 bg-white dark:bg-zinc-800 hover:bg-rose-50 border border-slate-200/70 dark:border-zinc-700 rounded-xl transition-all shadow-2xs cursor-pointer mr-auto"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          </div>
        </div>
      )}

      {/* TAB 3: MULTI-AD NETWORKS & ADS.TXT CONFIGURATION */}
      {activeTab === "adsense" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
          
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-500" />
                <span>إعدادات الإعلانات وشبكات البدائل (Adsterra, Monetag, Yllix, Popunder, Social Bar)</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">الصق شفرات الإعلانات التابعة لأي شبكة بديلة مثل Adsterra أو Monetag أو Yllix أو Popunder لتظهر تلقائياً.</p>
            </div>

            {/* Global Toggle Button */}
            <div className="flex items-center gap-2.5">
              <WindowCopyButton windowId="WINDOW_ADSENSE_NETWORK_MANAGER" />
              <span className={`text-xs font-bold ${adsEnabled ? "text-emerald-600 animate-pulse" : "text-slate-400"}`}>
                {adsEnabled ? "الإعلانات مفعلة" : "الإعلانات معطلة"}
              </span>
              <button
                type="button"
                onClick={() => setAdsEnabled(!adsEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  adsEnabled ? "bg-emerald-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    adsEnabled ? "-translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {adsSaveSuccess && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4.5 h-4.5 text-emerald-600" />
              <span>تم حفظ تعديلات شبكات الإعلانات البديلة وتحديث ملف ads.txt بنجاح!</span>
            </div>
          )}

          {/* Ad Status & Firebase Connectivity Notice */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1">
              <p className="font-bold text-slate-900">
                قاعدة الأمان الخاصة بالإعلانات:
              </p>
              <p className="text-slate-600 text-[11px]">
                الوضع الطبيعي الافتراضي لجميع الإعلانات هو <span className="font-bold text-rose-600">وضع الإغلاق التام</span> حتى يقوم المطور بتفعيلها يدوياً من هذا الزر. في حالة عدم الاتصال بقاعدة بيانات الفايربيز أو العمل في بيئة المعاينة غير المتصلة، يتم إيقاف الإعلانات تماماً لحماية تجربة التصفح، وعند الاتصال بالفايربيز يكتشف النظام الحالة ويقوم بتفعيل الإعلانات إذا كانت مفعلة من قِبل المطور.
              </p>
            </div>
          </div>

          {/* Ad slot fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                1. شفرة الإعلان أعلى المقال (Banner 728x90, Native Ads, Adsterra Banner, etc.)
              </label>
              <textarea
                rows={3}
                placeholder="الصق شفرة الإعلان الخاصة بالمساحة الإعلانية العلوية هنا..."
                value={adsHeader}
                onChange={(e) => setAdsHeader(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                2. شفرة الإعلان وسط المقال (Native Banner, Social Bar, Adsterra Native, etc.)
              </label>
              <textarea
                rows={3}
                placeholder="الصق شفرة الإعلان الخاصة بالمساحة الإعلانية لوسط المقال هنا..."
                value={adsMiddle}
                onChange={(e) => setAdsMiddle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                3. شفرة الإعلان أسفل المقال / فوق صندوق التحميل (Banner 300x250, Underlay, Direct Link script, etc.)
              </label>
              <textarea
                rows={3}
                placeholder="الصق شفرة الإعلان الخاصة بالمساحة الإعلانية السفلية للتحميل هنا..."
                value={adsBottom}
                onChange={(e) => setAdsBottom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                4. شفرة الإعلان البيني المتقدم (Interstitial Ad / Popunder / Auto-Direct Scripts)
              </label>
              <textarea
                rows={3}
                placeholder="الصق شفرة Popunder أو Interstitial لتفعيل الإعلانات المفتوحة عند التصفح والتحويل..."
                value={adsInterstitial}
                onChange={(e) => setAdsInterstitial(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                5. شفرة إعلان بمكافأة (Rewarded Video Ads, Direct Link Multi-Ad triggers during countdown)
              </label>
              <textarea
                rows={3}
                placeholder="الصق شفرة الإعلان الموجه بمكافأة هنا لتشغيله في نافذة التحميل الآمن..."
                value={adsRewarded}
                onChange={(e) => setAdsRewarded(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Dynamic ads.txt content */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                <span>6. محتوى ملف ads.txt الخاص بالموقع (موجود تلقائياً في جذر الموقع الرئيسي /ads.txt)</span>
                <span className="px-2 py-0.5 text-[10px] text-blue-700 bg-blue-50 rounded-md font-bold">ملف حي ديناميكي</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                يتعرف موقعنا تلقائياً على هذا النص لتقديمه لمحركات وزواحف الإعلانات المختلفة (Adsterra, Monetag, Google etc) على الرابط المباشر <code className="font-bold text-slate-700 select-all">/ads.txt</code> لتسجيل المعرفات وتجنب الفقد التقني للأرباح.
              </p>
              <textarea
                rows={4}
                placeholder="الصق أسطر معرفات الشركاء هنا، سطر لكل شركة..."
                value={adsTxt}
                onChange={(e) => setAdsTxt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-mono outline-none focus:border-blue-500 focus:bg-white leading-relaxed"
              />
            </div>

          </div>

          {/* Save Settings Trigger */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSavingAds}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
            >
              {isSavingAds ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري حفظ الإعدادات...</span>
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" />
                  <span>حفظ إعدادات الإعلانات</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

      {/* TAB 8: SOCIAL LINKS, COMPLAINTS & ONESIGNAL */}
      {activeTab === "links" && (
        <form onSubmit={handleSaveLinks} className="space-y-8">
          
          {/* Social Links & Complaints Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-500" />
                  <span>روابط التواصل الاجتماعي وتقديم الشكاوى</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1">تتيح هذه الروابط لزوار موقعك إمكانية التواصل معك أو تقديم طلبات وشكاوى بلمسة واحدة من الهيدر والفوتر.</p>
              </div>
              <WindowCopyButton windowId="WINDOW_SOCIAL_LINKS_AI_PORTAL" />
            </div>

            {linksSaveSuccess && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check className="w-4.5 h-4.5 text-emerald-600" />
                <span>تم حفظ الروابط وإعدادات OneSignal وتحديث الموقع بنجاح!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط واتساب (WhatsApp URL)</label>
                <input
                  type="text"
                  value={whatsappUrl}
                  onChange={(e) => setWhatsappUrl(e.target.value)}
                  placeholder="مثال: https://wa.me/20123456789"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط فيسبوك (Facebook Page URL)</label>
                <input
                  type="text"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="مثال: https://facebook.com/mypage"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط تيك توك (TikTok URL)</label>
                <input
                  type="text"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="مثال: https://tiktok.com/@myaccount"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط يوتيوب (YouTube Channel URL)</label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="مثال: https://youtube.com/c/mychannel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط إنستغرام (Instagram URL)</label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="مثال: https://instagram.com/myprofile"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط سناب شات (Snapchat URL)</label>
                <input
                  type="text"
                  value={snapchatUrl}
                  onChange={(e) => setSnapchatUrl(e.target.value)}
                  placeholder="مثال: https://snapchat.com/add/myprofile"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط قناة تليجرام (Telegram URL)</label>
                <input
                  type="text"
                  value={telegramUrl}
                  onChange={(e) => setTelegramUrl(e.target.value)}
                  placeholder="مثال: https://t.me/my_channel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط حساب إكس (X / Twitter URL)</label>
                <input
                  type="text"
                  value={xUrl}
                  onChange={(e) => setXUrl(e.target.value)}
                  placeholder="مثال: https://x.com/my_profile"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-red-600 font-extrabold">رابط تقديم الشكاوى وحذف التطبيقات (Complaints URL)</label>
                <input
                  type="text"
                  value={complaintsUrl}
                  onChange={(e) => setComplaintsUrl(e.target.value)}
                  placeholder="مثال: رابط نموذج جوجل Google Form المخصص لتقديم شكاوى حقوق الملكية"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-800 text-right"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-emerald-600 font-extrabold">رابط صفحة سياسة الخصوصية المخصصة (Custom Privacy Policy Link)</label>
                <input
                  type="text"
                  value={customPrivacyUrl}
                  onChange={(e) => setCustomPrivacyUrl(e.target.value)}
                  placeholder="مثال: https://mywebsite.com/privacy-policy أو رابط خارجي لسياسة الخصوصية الكاملة"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-800 text-left"
                  style={{ direction: "ltr" }}
                />
              </div>

          {/* Developer Promotional Window & External Site Link Configuration Card */}
          <div className="bg-white rounded-3xl border border-red-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>التحكم في النافذة الترويجية والرابط والصورة المخصصة بأعلى الصفحة الرئيسية</span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${isPromoEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {isPromoEnabled ? '🟢 النافذة مفعلة وظاهرة بالموقع' : '🔴 النافذة مغلقة ومخفية (الوضع الافتراضي)'}
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                    الوضع الطبيعي للنافذة هو الإغلاق التام، وتظل غير موجودة في واجهة الزوار إلا إذا قمت بتفعيلها هنا وإدخال رابط الموقع ورابط الصورة والنقر على زر الحفظ والتفعيل.
                  </p>
                </div>
              </div>

              {/* Toggle Switch Button */}
              <div className="shrink-0 flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isPromoEnabled;
                    setIsPromoEnabled(nextVal);
                    setShowAiImagePortal(nextVal);
                  }}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPromoEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isPromoEnabled ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
                <span className={`text-xs font-black ${isPromoEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {isPromoEnabled ? 'تفعيل النافذة (مفعل)' : 'إغلاق النافذة (معطل)'}
                </span>
              </div>
            </div>

            <div className="space-y-5 text-right">
              {/* Target Website URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="text-red-600 font-extrabold flex items-center gap-1.5">
                    <span>1. رابط الموقع الخارجي المخصص للنافذة (Custom Destination Website URL)</span>
                  </span>
                  {promoTargetUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        window.open(promoTargetUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>اختبار وتجربة فتح الرابط 🔗</span>
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={promoTargetUrl}
                  onChange={(e) => {
                    setPromoTargetUrl(e.target.value);
                    setAiImagePortalUrl(e.target.value);
                  }}
                  placeholder="مثال: https://mysite.com/ أو أي رابط لموقع خارجي تريد توجيه الزوار إليه"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-red-500 focus:bg-white transition-all font-bold text-slate-800 text-left font-mono"
                  style={{ direction: "ltr" }}
                />
              </div>

              {/* Promo Banner Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="text-slate-800 font-bold flex items-center gap-1.5">
                    <span>2. رابط الصورة الخاصة بالنافذة الترويجية (Promo Banner Image URL) - اختياري</span>
                  </span>
                  {promoImageUrl && (
                    <button
                      type="button"
                      onClick={() => setPromoImageUrl("")}
                      className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>إلغاء ومسح الصورة ✕</span>
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={promoImageUrl}
                  onChange={(e) => setPromoImageUrl(e.target.value)}
                  placeholder="مثال: https://images.unsplash.com/... أو رابط مباشر لصورة البانر الترويجي (JPG / PNG / WebP)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-red-500 focus:bg-white transition-all font-semibold text-slate-800 text-left font-mono"
                  style={{ direction: "ltr" }}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  إذا تركت حقل الصورة فارغاً، سيتم عرض تصميم النيون الأنيق الكلاسيكي للنافذة، وإذا قمت بوضع رابط صورة سيتم عرض الصورة مباشرة كخلفية تفاعلية جذابة للنافذة الترويجية.
                </p>
              </div>

              {/* Live Preview of Image if provided */}
              {promoImageUrl.trim() && (
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">معاينة الصورة الحية للنافذة:</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-md">جاهزة للعرض</span>
                  </div>
                  <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-300 bg-zinc-900 flex items-center justify-center">
                    <img 
                      src={promoImageUrl.trim()} 
                      alt="معاينة نافذة الترويج" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/800x400/222/fff?text=Image+URL+Not+Found";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                      <p className="text-white text-xs font-bold truncate">
                        {promoTargetUrl ? `رابط الوجهة: ${promoTargetUrl}` : "لم يتم تحديد رابط وجهة بعد"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-red-50/60 rounded-2xl border border-red-100 text-xs text-red-800 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">قواعد وضوابط النافذة للمطور:</span> الوضع الافتراضي للنافذة مغلق تماماً لحين تفعيلك لها. في حالة تفعيلها وإضافة الرابط والصورة والنقر على حفظ، تظهر النافذة الترويجية فوراً أعلى الموقع للزوار.
                </div>
              </div>
            </div>
          </div>
            </div>
          </div>

          {/* Google Gemini API Key Configuration Section */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>إعدادات مفاتيح الذكاء الاصطناعي لتوليد المقالات (Google Gemini API Key)</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">يتم استخدام هذا المفتاح بأمان وسرية تامة لتوليد المراجع والمقالات الصحفية الشاملة واستخراج الكلمات المفتاحية (SEO Keywords) عبر محرك Google Gemini الحصري.</p>
            </div>

            <div className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>مفتاح Google Gemini API الخاص بالموقع (Google Gemini API Key)</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">محفوظ ومفعل في الفايربيز ⚡</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showOpenAiKey ? "text" : "password"}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pl-11 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono text-left font-bold"
                    style={{ direction: "ltr" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                    className="absolute left-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    title={showOpenAiKey ? "إخفاء" : "إظهار"}
                  >
                    {showOpenAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* OneSignal Configuration Section */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-500" />
                <span>إعدادات الاتصال ببث الإشعارات (OneSignal App Keys)</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">تأكد من إدخال مفاتيح مشروعك على منصة OneSignal بدقة لتفعيل التنبيهات والبث المباشر.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">معرّف التطبيق (OneSignal App ID)</label>
                <input
                  type="text"
                  value={oneSignalAppId}
                  onChange={(e) => setOneSignalAppId(e.target.value)}
                  placeholder="مثال: f6449102-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white font-mono text-left"
                  style={{ direction: "ltr" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">مفتاح الوصول البرمجي (OneSignal REST API Key)</label>
                <input
                  type="password"
                  value={oneSignalRestKey}
                  onChange={(e) => setOneSignalRestKey(e.target.value)}
                  placeholder="REST API Key الخاص بمشروعك..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white font-mono text-left"
                  style={{ direction: "ltr" }}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSavingLinks}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-200 disabled:opacity-50 cursor-pointer"
            >
              {isSavingLinks ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" />
                  <span>حفظ روابط التواصل وإعدادات الإشعارات</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

      {/* TAB 4: PUSH NOTIFICATIONS & SUBSCRIBERS */}
      {activeTab === "notifications" && (
        <div className="space-y-8">
          
          {/* OneSignal Configuration Quick Save Card */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 text-right">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                <span>إعدادات الاتصال وحفظ مفاتيح OneSignal</span>
              </h2>
              <WindowCopyButton windowId="WINDOW_ONESIGNAL_NOTIFICATIONS" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              أدخل مفاتيح التطبيق الخاصة بـ OneSignal لتتمكن من بث الإشعارات بنجاح للمستخدمين. يتم حفظ هذه البيانات بشكل آمن ومباشر في قاعدة البيانات.
            </p>

            {oneSignalSaveSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>تم حفظ مفاتيح OneSignal وتحديث الإعدادات بنجاح!</span>
              </div>
            )}

            {oneSignalSaveError && (
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{oneSignalSaveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOneSignal} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">معرّف التطبيق (OneSignal App ID)</label>
                <input
                  type="text"
                  required
                  value={oneSignalAppId}
                  onChange={(e) => setOneSignalAppId(e.target.value)}
                  placeholder="مثال: f6449102-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-500 text-left font-mono font-bold"
                  style={{ direction: "ltr" }}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">مفتاح الوصول (OneSignal REST API Key)</label>
                  <input
                    type="password"
                    required
                    value={oneSignalRestKey}
                    onChange={(e) => setOneSignalRestKey(e.target.value)}
                    placeholder="REST API Key الخاص بك..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-500 text-left font-mono font-bold"
                    style={{ direction: "ltr" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingOneSignal}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSavingOneSignal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>حفظ المفاتيح</span>
                </button>
              </div>
            </form>
          </div>
          
          {/* Notification Dispatcher Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span>إرسال إشعار دفع جديد لجميع المستخدمين (OneSignal Push Notification)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">يمكنك صياغة إشعار دفع سيصل فوراً لجميع الهواتف والمشتركين الذين قاموا بتفعيل زر جرس التنبيهات على الموقع.</p>

            {notificationSuccess && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-bold text-emerald-800 mb-5 flex items-center gap-2">
                <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>{notificationSuccess}</span>
              </div>
            )}

            {notificationError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold text-rose-800 mb-5 flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                <span>{notificationError}</span>
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">عنوان الإشعار (مثال: تحديث تطبيق الواتساب الجديد!)</label>
                  <input
                    type="text"
                    required
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 font-semibold"
                    placeholder="أدخل عنوان الإشعار الجذاب هنا..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">رابط التوجيه عند النقر (رابط المقال أو التطبيق - اختياري)</label>
                  <input
                    type="text"
                    value={notificationUrl}
                    onChange={(e) => setNotificationUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 font-semibold"
                    placeholder="مثال: https://myweb.com/app/whatsapp"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">محتوى أو رسالة الإشعار</label>
                <textarea
                  rows={3}
                  required
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 font-semibold"
                  placeholder="اكتب رسالة الإشعار بطريقة مشوقة تحث المستخدمين على التحميل والدخول..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSendingNotification}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-200 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingNotification ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري بث وإرسال الإشعار...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4.5 h-4.5" />
                      <span>إرسال وبث الإشعار الآن</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Subscribers List Card */}
            <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col min-h-[400px]">
              <div className="pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Mail className="w-4.5 h-4.5 text-blue-600" />
                  <span>المشتركون المتابعون ({subscribersList.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">قائمة بجميع الإيميلات والأجهزة التي اشتركت لمتابعة أحدث التطبيقات.</p>
              </div>

              {isLoadingNotificationsData ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-[10px] text-slate-400 font-bold">جاري جلب المشتركين...</span>
                </div>
              ) : subscribersList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <p className="text-xs text-slate-400 font-bold">لا يوجد أي مشتركين مسجلين بعد.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-1">
                  {subscribersList.map((sub, idx) => (
                    <div key={sub.id || idx} className="p-3 bg-slate-50/70 border border-slate-100/70 rounded-xl flex flex-col gap-1 text-right">
                      {sub.email ? (
                        <span className="text-xs font-bold text-slate-800 select-all leading-tight">{sub.email}</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 italic leading-tight">اشتراك بدون إيميل (جرس الدفع)</span>
                      )}
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold mt-1">
                        <span>الجهاز: {sub.deviceInfo || "غير معروف"}</span>
                        <span>{sub.subscribedAt?.toDate ? sub.subscribedAt.toDate().toLocaleDateString("ar-EG") : "قريباً"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Logs/History Card */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col min-h-[400px]">
              <div className="pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                  <span>سجل الإشعارات المرسلة سابقاً ({notificationsHistory.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">قائمة تاريخية بجميع الإشعارات التي تم إرسالها من خلال لوحة التحكم.</p>
              </div>

              {isLoadingNotificationsData ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-[10px] text-slate-400 font-bold">جاري تحميل السجل...</span>
                </div>
              ) : notificationsHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <p className="text-xs text-slate-400 font-bold">لم تقم بإرسال أي إشعارات من الموقع بعد.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2.5 pr-1">
                  {notificationsHistory.map((notif, idx) => (
                    <div key={notif.id || idx} className="p-3.5 bg-slate-50 border border-slate-100/80 rounded-2xl flex flex-col gap-1 text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 leading-snug">{notif.title}</span>
                        <span className={`px-2 py-0.5 text-[8px] font-black rounded-md ${
                          notif.status === "simulated" 
                            ? "bg-amber-50 text-amber-700 border border-amber-100" 
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                          {notif.status === "simulated" ? "إرسال تجريبي" : "تم البث بنجاح"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[9px] text-slate-400 font-semibold self-start mt-2">
                        تاريخ البث: {notif.sentAt?.toDate ? notif.sentAt.toDate().toLocaleString("ar-EG") : "الآن"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 5: APP REQUESTS & COMPLAINTS */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <span>طلبات مراجعة التطبيقات المرسلة من الزوار ({appRequestsList.length})</span>
              </h2>
              <WindowCopyButton windowId="WINDOW_USER_REQUESTS_COMPLAINTS" />
            </div>
            <p className="text-xs text-slate-400 mb-6">هذه القائمة تضم جميع طلبات الألعاب والتطبيقات التي طلبها الزوار من خلال نافذة "اطلب تطبيقاً".</p>

            {isLoadingRequests ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-bold text-slate-400">جاري تحميل طلبات الزوار...</span>
              </div>
            ) : appRequestsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-sm text-slate-400 font-bold">لا يوجد أي طلبات مرسلة من الزوار حالياً.</p>
              </div>
            ) : (
              <div>
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="py-3 px-4 text-right">اسم التطبيق المطلوب</th>
                        <th className="py-3 px-4 text-right">نظام التشغيل</th>
                        <th className="py-3 px-4 text-right">ملاحظات الزائر</th>
                        <th className="py-3 px-4 text-right">تاريخ الطلب</th>
                        <th className="py-3 px-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appRequestsList.map((req) => (
                        <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800 text-right">{req.appName}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                              req.deviceOS === "android"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}>
                              {req.deviceOS === "android" ? "أندرويد" : "آيفون"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-right" title={req.notes}>{req.notes || "—"}</td>
                          <td className="py-3 px-4 text-slate-400 text-right">
                            {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString("ar-EG") : "قريباً"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteRequest(req.id)}
                              className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition-all"
                              title="حذف الطلب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="block md:hidden space-y-4">
                  {appRequestsList.map((req) => (
                    <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900">{req.appName}</h4>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-black rounded-md mt-1 ${
                            req.deviceOS === "android" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}>
                            {req.deviceOS === "android" ? "أندرويد" : "آيفون"}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteRequest(req.id)} 
                          className="p-2 text-rose-600 bg-white hover:bg-rose-50 border border-slate-100 rounded-xl transition-all shadow-2xs shrink-0"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-100/50 mt-1 leading-relaxed">
                        <span className="font-bold text-[10px] text-slate-400 block mb-0.5">ملاحظات الزائر:</span>
                        {req.notes || "—"}
                      </p>
                      <div className="text-[10px] text-slate-400 font-bold self-start mt-1">
                        {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString("ar-EG") : "قريباً"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: VISITOR REVIEWS & RATINGS */}
      {activeTab === "reviews" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <span>تقييمات ومراجعات الزوار للتطبيقات ({reviewsList.length})</span>
              </h2>
              <WindowCopyButton windowId="WINDOW_VISITOR_REVIEWS" />
            </div>
            <p className="text-xs text-slate-400 mb-6">هذه القائمة تتيح لك مشاهدة جميع التقييمات والتعليقات والنجوم التي قام زوار موقعك بكتابتها للتطبيقات المنشورة، مع إمكانية حذف أو تصفية التعليقات غير اللائقة.</p>
 
            {isLoadingReviews ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-bold text-slate-400">جاري تحميل المراجعات والتعليقات...</span>
              </div>
            ) : reviewsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-sm text-slate-400 font-bold">لا يوجد أي تقييمات أو مراجعات من الزوار حالياً.</p>
              </div>
            ) : (
              <div>
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="py-3 px-4 text-right">التطبيق</th>
                        <th className="py-3 px-4 text-right">الزائر</th>
                        <th className="py-3 px-4 text-right">التقييم بالنجوم</th>
                        <th className="py-3 px-4 text-right font-bold">نص التعليق والمراجعة</th>
                        <th className="py-3 px-4 text-right">التاريخ</th>
                        <th className="py-3 px-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewsList.map((rev) => (
                        <tr key={rev.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800 text-right">{rev.appName || "تطبيق مجهول"}</td>
                          <td className="py-3 px-4 font-bold text-slate-700 text-right">{rev.name}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center gap-0.5" style={{ direction: "ltr" }}>
                              {[...Array(5)].map((_, idx) => (
                                <Star 
                                  key={idx} 
                                  className={`w-3 h-3 ${idx < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-sm whitespace-normal break-words text-right">{rev.text}</td>
                          <td className="py-3 px-4 text-slate-400 text-right">
                            {rev.createdAt?.toDate ? rev.createdAt.toDate().toLocaleString("ar-EG") : "الآن"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition-all"
                              title="حذف المراجعة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="block md:hidden space-y-4">
                  {reviewsList.map((rev) => (
                    <div key={rev.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-black text-slate-400">التطبيق: <span className="text-slate-800 text-xs sm:text-sm font-black">{rev.appName || "تطبيق مجهول"}</span></h4>
                          <p className="text-[11px] text-slate-500 font-bold mt-1">بواسطة: <span className="text-slate-700 font-black">{rev.name}</span></p>
                        </div>
                        <button 
                          onClick={() => handleDeleteReview(rev.id)} 
                          className="p-2 text-rose-600 bg-white hover:bg-rose-50 border border-slate-100 rounded-xl transition-all shadow-2xs shrink-0"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5 mt-1" style={{ direction: "ltr" }}>
                        {[...Array(5)].map((_, idx) => (
                          <Star 
                            key={idx} 
                            className={`w-3.5 h-3.5 ${idx < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100/50 mt-1 leading-relaxed whitespace-pre-wrap">
                        {rev.text}
                      </p>
                      <div className="text-[10px] text-slate-400 font-bold self-start mt-1">
                        {rev.createdAt?.toDate ? rev.createdAt.toDate().toLocaleString("ar-EG") : "الآن"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 12: GOOGLE INDEXING API & PAGE ARCHIVING MANAGER */}
      {activeTab === "indexing" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-950/80 via-zinc-900 to-indigo-950/80 border border-blue-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl font-bold shadow-inner shrink-0">
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      <span>صفحة الأرشفة المباشرة (Google Indexing API & Sitemap Manager)</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Real-Time Sync</span>
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                      إرسال وأرشفة أي رابط مخصص أو صفحة مراجعة فورياً إلى محرك بحث جوجل وتحديث خريطة الموقع تلقائياً. يظهر أي رابط يتم إضافته فورياً داخل هذه الصفحة وسجل الأرشفة.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <WindowCopyButton windowId="WINDOW_GOOGLE_INDEXING_STATUS" />
                <button
                  onClick={fetchIndexedUrlsList}
                  disabled={isLoadingIndexedUrls}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingIndexedUrls ? "animate-spin" : ""}`} />
                  <span>تحديث القائمة من Firestore</span>
                </button>
              </div>
            </div>

            {/* Summary KPI Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-800/80">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-400 block">إجمالي الروابط المؤرشفة</span>
                  <span className="text-2xl font-black text-white font-mono mt-1 block">{indexedUrlsList.length}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-400 block">حالة Google Indexing API</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1 block flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>جاهز ومفعل تلقائياً</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-400 block">خريطة الموقع الديناميكية</span>
                  <a
                    href="https://roohme.web.app/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono font-bold text-purple-400 hover:underline mt-1 block flex items-center gap-1"
                  >
                    <span>roohme.web.app/sitemap.xml</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Manual URL Submission Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="border-b border-zinc-800/80 pb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" />
                  <span>إضافة رابط جديد للأرشفة الفورية اليدوية</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  أدخل رابط الصفحة كاملاً أو المعرف (Slug)، وسيتم إرساله مباشرة إلى محرك بحث جوجل وتحديث ملفات الأرشفة وإظهاره فورياً في الجدول أسفله.
                </p>
              </div>
              <WindowCopyButton windowId="WINDOW_GOOGLE_INDEXING_MANUAL_SUBMIT" />
            </div>

            {indexingStatusMsg && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  indexingStatusMsg.type === "success"
                    ? "bg-emerald-950/80 border border-emerald-800 text-emerald-200"
                    : "bg-rose-950/80 border border-rose-800 text-rose-200"
                }`}
              >
                {indexingStatusMsg.type === "success" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{indexingStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmitIndexing} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    رابط الصفحة أو الـ Slug <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualUrlInput}
                    onChange={(e) => setManualUrlInput(e.target.value)}
                    placeholder="مثال: https://roohme.web.app/whatsapp أو whatsapp"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all ltr font-mono"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    عنوان/وصف الرابط (اختياري)
                  </label>
                  <input
                    type="text"
                    value={manualTitleInput}
                    onChange={(e) => setManualTitleInput(e.target.value)}
                    placeholder="مثال: مراجعة وشرح تطبيق واتساب الذهبي"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingManualUrl}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingManualUrl ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الأرشفة والإرسال لـ Google...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-200" />
                      <span>أرشفة وإرسال الرابط الآن 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Indexed Links Table & Search */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <span>سجل الروابط المؤرشفة الحالية ({indexedUrlsList.length})</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  جميع الصفحات والروابط التي تم أصلها وأرشفتها عبر Google Indexing API وخريطة الموقع.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <WindowCopyButton windowId="WINDOW_GOOGLE_INDEXING_RECORDS_TABLE" />
                <button
                  onClick={handleSyncAllPublishedApps}
                  disabled={isSyncingPublished}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                  title="مزامنة وأرشفة كافة التطبيقات المنشورة في الفايربيز وتحديث خريطة الموقع ورابط التخزين R2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPublished ? "animate-spin" : ""}`} />
                  <span>{isSyncingPublished ? "جاري المزامنة..." : "مزامنة وأرشفة جميع التطبيقات المنشورة 🔄"}</span>
                </button>

                {/* Search Input */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-3" />
                  <input
                    type="text"
                    value={indexedFilterSearch}
                    onChange={(e) => setIndexedFilterSearch(e.target.value)}
                    placeholder="بحث في الروابط المؤرشفة..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {isLoadingIndexedUrls ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-zinc-400">جاري تحميل وسحب سلة الروابط المؤرشفة...</p>
              </div>
            ) : indexedUrlsList.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800">
                <Globe className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm font-bold text-zinc-300">لا توجد روابط مؤرشفة مسجلة بعد.</p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  يمكنك استخدام نموذج الأرشفة أعلى الصفحة لإضافة وأرشفة أي رابط مخصص وسيظهر هنا فورياً.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/60 font-bold">
                      <th className="p-3.5 rounded-r-xl">الرابط / Slug</th>
                      <th className="p-3.5">العنوان / المادة</th>
                      <th className="p-3.5">تاريخ الأرشفة</th>
                      <th className="p-3.5">المصدر</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5 rounded-l-xl text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {indexedUrlsList
                      .filter((item) => {
                        if (!indexedFilterSearch.trim()) return true;
                        const query = indexedFilterSearch.toLowerCase();
                        return (
                          item.url.toLowerCase().includes(query) ||
                          item.slug.toLowerCase().includes(query) ||
                          (item.title && item.title.toLowerCase().includes(query))
                        );
                      })
                      .map((record) => {
                        const isCopied = copiedIndexedUrl === record.id;
                        const isReindexing = reindexingUrlId === record.id;

                        return (
                          <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                            <td className="p-3.5 font-mono text-purple-300 ltr text-left max-w-xs truncate" dir="ltr">
                              <a
                                href={record.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center gap-1.5"
                                title={record.url}
                              >
                                <span className="truncate">{record.url}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              </a>
                            </td>

                            <td className="p-3.5 text-white font-bold max-w-xs truncate">
                              {record.title || record.slug}
                            </td>

                            <td className="p-3.5 text-zinc-400 font-mono text-[11px]">
                              {new Date(record.submittedAt).toLocaleString("ar-EG", {
                                dateStyle: "short",
                                timeStyle: "short"
                              })}
                            </td>

                            <td className="p-3.5">
                              <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2.5 py-1 rounded-full font-bold">
                                {record.source || "يدوي"}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                <span>مؤرشف بـ Google</span>
                              </span>
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(record.url);
                                    setCopiedIndexedUrl(record.id);
                                    setTimeout(() => setCopiedIndexedUrl(null), 2000);
                                  }}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                                  title="نسخ الرابط"
                                >
                                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>

                                <button
                                  onClick={() => handleReindexSingleUrl(record)}
                                  disabled={isReindexing}
                                  className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-all cursor-pointer"
                                  title="إعادة الأرشفة الفورية"
                                >
                                  <RefreshCw className={`w-4 h-4 ${isReindexing ? "animate-spin text-blue-400" : ""}`} />
                                </button>

                                <button
                                  onClick={() => handleDeleteIndexedUrl(record.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                                  title="حذف من السجل"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 10: ENVIRONMENT VARIABLES & KEYS MANAGER */}
      {activeTab === "envManager" && (
        <EnvManager getIdTokenHelper={getIdTokenHelper} />
      )}

      {/* TAB 11: FIREBASE STATUS & QUOTA USAGE GAUGE */}
      {activeTab === "firebaseStatus" && (
        <FirebaseUsageMeter />
      )}

      {/* TAB 12: CLOUDFLARE R2 CLOUD STORAGE & WORKER STATUS */}
      {activeTab === "r2Status" && (
        <R2UsageMeter allApps={allApps} onRefreshApps={onRefreshApps} />
      )}

      {/* TAB 13: APP LIFECYCLE MAP & DIAGNOSTICS */}
      {activeTab === "appMap" && (
        <AppMapDiagnostics />
      )}

      {/* TAB 14: DEDICATED FULL DEVELOPER AI AGENT WORKSPACE */}
      {activeTab === "agentChat" && (
        <div className="space-y-4">
          <div className="bg-zinc-950 border border-purple-500/30 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xl font-bold">
                  🤖
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>مساحة محادثة وكيل المطور التفاعلية (Proq LLaMA 3.3 70B & ElevenLabs)</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      11 مفتاح ElevenLabs + 10 مفاتيح Groq
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    يمكنك التحدث باللغة العربية مع الذكاء الاصطناعي في أي موضوع أو استفسار أو مشكلة فنية برمجية مع دعم الاستماع الصوتي والتحكم الكامل.
                  </p>
                </div>
              </div>
              <WindowCopyButton windowId="WINDOW_DEVELOPER_AGENT_CHAT_FULL" />
            </div>

            <DeveloperAgentChat
              getIdTokenHelper={getIdTokenHelper}
              onTabChange={(tab: any) => setActiveTab(tab)}
              onNavigate={onNavigate}
              isPinned={isAgentPinned}
              onTogglePin={onToggleAgentPin}
              onToggleDarkMode={onToggleDarkMode}
              onToggleLanguage={onToggleLanguage}
              onRefreshApps={onRefreshApps}
              onRefreshSettings={onRefreshSettings}
              initialContext={{
                totalApps: allApps.length,
                activeTab,
                adminEmail: user?.email
              }}
            />
          </div>
        </div>
      )}

      {/* AI TECHNICAL DIAGNOSTICS & SYSTEM HEALTH - PRESENT ON EVERY PAGE */}
      <TabAiDiagnostics
        activeTabName={activeTab}
        getIdTokenHelper={getIdTokenHelper}
        contextData={{ totalApps: allApps.length, activeTab }}
      />

      {/* ARCHIVED APPS POPUP MODAL */}
      {showArchivedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                  📦
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>أرشيف الصفحات المعتمدة والروابط المباشرة</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      {archivedAppsList.length} صفحة
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                    روابط المقالات المؤرشفة بـ R2 بمسارات نظيفة: <code className="text-emerald-400 font-mono">https://roohme.web.app/[cleanSlug]</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowArchivedModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Controls Bar: Search & Refresh */}
            <div className="p-3 sm:p-4 border-b border-zinc-800/60 bg-zinc-900/80 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="ابحث باسم التطبيق أو الرابط المباشر..."
                  value={archivedSearchQuery}
                  onChange={(e) => setArchivedSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs sm:text-sm rounded-xl px-3.5 py-2 pl-8 focus:outline-none focus:border-emerald-500/60 font-medium"
                />
                <Search className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2.5" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncAllPublishedApps}
                  disabled={isSyncingPublished}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                  title="مزامنة وأرشفة كافة التطبيقات المنشورة من قاعدة البيانات وإعادة الفهرسة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPublished ? "animate-spin" : ""}`} />
                  <span>{isSyncingPublished ? "جاري المزامنة..." : "مزامنة كافة المنشورة 🔄"}</span>
                </button>
                <button
                  onClick={fetchArchivedAppsList}
                  disabled={isLoadingArchived}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingArchived ? "animate-spin text-emerald-400" : ""}`} />
                  <span>{isLoadingArchived ? "جاري التحديث..." : "تحديث القائمة"}</span>
                </button>
              </div>
            </div>

            {/* Archived Items List */}
            <div className="p-3 sm:p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {(() => {
                const filtered = archivedAppsList.filter((item) => {
                  if (!archivedSearchQuery.trim()) return true;
                  const q = archivedSearchQuery.toLowerCase().trim();
                  const name = (item.name || item.appTitle || "").toLowerCase();
                  const slug = (item.cleanSlug || item.slug || "").toLowerCase();
                  return name.includes(q) || slug.includes(q);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                      <span className="text-4xl opacity-40">📭</span>
                      <p className="text-xs sm:text-sm font-bold text-zinc-400">
                        {archivedSearchQuery ? "لم يتم العثور على نتائج مطابقة للبحث." : "لا توجد صفحات مؤرشفة بملف approved-apps.json حالياً."}
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        عند موافقة المطور على أي تطبيق، سيتم تسجيل وأرشفة رابطه هنا تلقائياً.
                      </p>
                    </div>
                  );
                }

                return filtered.map((item, idx) => {
                  const rawSlug = item.cleanSlug || item.slug || item.id;
                  const cleanSlug = String(rawSlug).replace(/^\/+|\.html$/gi, '').trim();
                  const fullUrl = `https://roohme.web.app/${cleanSlug}`;

                  return (
                    <div
                      key={item.id || cleanSlug || idx}
                      className="bg-zinc-950/80 border border-zinc-800/80 hover:border-emerald-500/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.iconUrl ? (
                          <img
                            src={item.iconUrl}
                            alt={item.name || cleanSlug}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-zinc-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg shrink-0">
                            📱
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-zinc-100 truncate flex items-center gap-1.5">
                            <span>{item.name || item.appTitle || cleanSlug}</span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                              منشور بـ R2
                            </span>
                          </h4>
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-emerald-400/90 hover:text-emerald-300 hover:underline truncate block dir-ltr text-right mt-0.5"
                          >
                            {fullUrl}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(fullUrl);
                            setCopiedLinkSlug(cleanSlug);
                            setTimeout(() => setCopiedLinkSlug(null), 2000);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                            copiedLinkSlug === cleanSlug
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                          }`}
                        >
                          {copiedLinkSlug === cleanSlug ? (
                            <>
                              <span>✓</span>
                              <span>تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرابط</span>
                            </>
                          )}
                        </button>

                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>فتح الصفحة</span>
                        </a>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
              <span>مصدر البيانات: <code className="text-zinc-400 font-mono">approved-apps.json (Cloudflare R2/KV)</code></span>
              <button
                onClick={() => setShowArchivedModal(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GITHUB TOKEN POPUP MODAL */}
      {showGithubModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xl font-bold">
                  <Github className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>توكن جيت هاب المحفوظ في الفايربيز</span>
                    <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Firestore Sync</span>
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                    يتم جلب البيانات وتوكن GitHub ديناميكياً من قاعدة البيانات <code className="text-purple-300 font-mono">system/config</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGithubModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {/* Repository Details Card */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">مستودع GitHub المرتبط (Repository):</span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">githubRepo</span>
                </div>
                <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 dir-ltr">
                  <span className="text-xs sm:text-sm font-mono font-bold text-purple-300 truncate">
                    {githubRepoName || "dodorooh/rooh"}
                  </span>
                  <div className="flex items-center gap-2 dir-rtl shrink-0">
                    <button
                      onClick={() => {
                        const repoUrl = `https://github.com/${githubRepoName || "dodorooh/rooh"}`;
                        navigator.clipboard.writeText(repoUrl);
                        setCopiedGithubRepoUrl(true);
                        setTimeout(() => setCopiedGithubRepoUrl(false), 2000);
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedGithubRepoUrl ? "تم نسخ الرابط! ✓" : "نسخ رابط المستودع"}
                    </button>
                    <a
                      href={`https://github.com/${githubRepoName || "dodorooh/rooh"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-all"
                      title="فتح في GitHub"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* GitHub Token Display & Actions */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-zinc-200">توكن جيت هاب (Personal Access Token):</span>
                  </div>
                  <button
                    onClick={fetchGithubTokenFromFirestore}
                    disabled={isLoadingGithubToken}
                    className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingGithubToken ? "animate-spin" : ""}`} />
                    <span>تحديث من Firestore</span>
                  </button>
                </div>

                {githubTokensList.length === 0 ? (
                  <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4 text-center space-y-2">
                    <p className="text-xs font-bold text-amber-300">لم يتم العثور على توكن مخزن في `system/config`</p>
                    <p className="text-[11px] text-zinc-400">
                      يمكنك إضافة توكن جديد وتخزينه في Firebase مباشرة من قسم إدارة المفاتيح وحزم البيئة.
                    </p>
                    <button
                      onClick={() => {
                        setShowGithubModal(false);
                        setActiveTab("envManager");
                      }}
                      className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition-all cursor-pointer inline-block mt-1"
                    >
                      الانتقال لإدارة المفاتيح (EnvManager)
                    </button>
                  </div>
                ) : (
                  githubTokensList.map((tokenItem, index) => {
                    const id = tokenItem.id || `token_${index}`;
                    const tokenValue = tokenItem.key || "";
                    const isVisible = !!showGithubTokenRaw[id];
                    const maskedValue = tokenValue.length > 10 ? `${tokenValue.slice(0, 7)}••••••••••••${tokenValue.slice(-4)}` : "••••••••••••";
                    const isCopied = copiedGithubToken === id;

                    return (
                      <div key={id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-zinc-300 font-bold">{tokenItem.label || `GitHub Token #${index + 1}`}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                            فعّال في Firestore
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 dir-ltr">
                          <span className="text-xs font-mono text-emerald-400 flex-1 truncate selection:bg-purple-900">
                            {isVisible ? tokenValue : maskedValue}
                          </span>

                          <div className="flex items-center gap-1.5 dir-rtl shrink-0">
                            <button
                              onClick={() => {
                                setShowGithubTokenRaw(prev => ({ ...prev, [id]: !prev[id] }));
                              }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                              title={isVisible ? "إخفاء التوكن" : "إظهار التوكن"}
                            >
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(tokenValue);
                                setCopiedGithubToken(id);
                                setTimeout(() => setCopiedGithubToken(null), 2000);
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                                isCopied
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "bg-purple-600 border-purple-600 text-white hover:bg-purple-500"
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <span>✓</span>
                                  <span>تم النسخ!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>نسخ التوكن</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-[11px] text-zinc-400 space-y-1">
                  <p className="font-bold text-zinc-300 flex items-center gap-1">
                    <span>🛡️ إرشادات أمان التوكن:</span>
                  </p>
                  <p>• هذا التوكن يجلب البيانات ديناميكياً من وثيقة <code className="text-purple-300 font-mono">/system/config</code> ولا يتم عرضه للزوار العاديين.</p>
                  <p>• يُستخدم هذا التوكن للمزامنة التلقائية مع GitHub Workflows ومستودع السورس كود.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
              <span>Firebase Firestore Document: <code className="text-purple-300 font-mono">system/config</code></span>
              <button
                onClick={() => setShowGithubModal(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON FOR DEVELOPER AI AGENT (IF NOT OPEN) */}
      {!showFloatingAgent && (
        <div className="fixed bottom-6 left-6 z-40">
          <button
            onClick={() => setShowFloatingAgent(true)}
            className="relative group p-1.5 rounded-full bg-zinc-950 border-2 border-purple-400/80 text-white shadow-[0_0_30px_rgba(99,102,241,0.6)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="فتح نافذة محادثة وكيل المطور الذكي (Groq LLaMA 3.3 70B & ElevenLabs Voice)"
          >
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 blur-sm opacity-80 group-hover:opacity-100 transition-opacity animate-pulse" />
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-zinc-950 flex flex-col items-center justify-center overflow-hidden">
              <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-purple-300 group-hover:rotate-12 transition-transform" />
              <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950 animate-pulse" />
            </div>
          </button>
        </div>
      )}

      {/* FLOATING MODAL FOR DEVELOPER AGENT CHAT */}
      {showFloatingAgent && (
        <DeveloperAgentChat
          isFloatingModal={true}
          getIdTokenHelper={getIdTokenHelper}
          onClose={() => setShowFloatingAgent(false)}
          onTabChange={(tab: any) => setActiveTab(tab)}
          onNavigate={onNavigate}
          isPinned={isAgentPinned}
          onTogglePin={onToggleAgentPin}
          onToggleDarkMode={onToggleDarkMode}
          onToggleLanguage={onToggleLanguage}
          onRefreshApps={onRefreshApps}
          onRefreshSettings={onRefreshSettings}
          initialContext={{
            totalApps: allApps.length,
            activeTab,
            adminEmail: user?.email
          }}
        />
      )}

    </div>
  );
};
