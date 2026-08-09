import React, { useState, useEffect } from "react";
import { 
  collection, getDocs, doc, getDoc, setDoc, query, orderBy, limit, serverTimestamp, onSnapshot, where 
} from "firebase/firestore";
import { generateShortId } from "./lib/idUtils";
import { db, auth, googleProvider, signInWithPopup, handleFirestoreError, OperationType, isPlaceholderFirebase, syncToRealtimeDatabase, ensureAnonymousAuth } from "./lib/firebase";
import { canShowFullScreenAd, isRealAdCode, recordFullScreenAdShown } from "./lib/adUtils";
import { AppReview, GlobalSettings } from "./types";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { AppCard } from "./components/AppCard";
import { AppDetails } from "./components/AppDetails";
import { ReviewView } from "./components/ReviewView";
import { AdminPanel } from "./components/AdminPanel";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { AdSenseSlot } from "./components/AdSenseSlot";
import { CookieConsent } from "./components/CookieConsent";
import { LiveStatsWidget } from "./components/LiveStatsWidget";
import { InteractivePopularCarousel } from "./components/InteractivePopularCarousel";
import { DeveloperAgentChat } from "./components/DeveloperAgentChat";
import { RefreshCw, LayoutGrid, Award, ShieldAlert, Sparkles, BookOpen, Smartphone, ChevronRight, ChevronLeft, Check, ChevronUp, ChevronDown, Play, Download, X, Video, Shield, Facebook, Youtube, MessageCircle, Twitter, Music, Ghost, Send, Clock, Flame, Flag, ShieldCheck, Info, Search, Star, Loader2, ExternalLink } from "lucide-react";

import { popularAppsSeed } from "./data/appsSeed";
import { callGeminiApi, callOpenAiApi, safeFetchJson, safeParseResponse, generateExhaustiveArticleFallback } from "./lib/fetchUtils";
import { toShortCleanSlug } from "./lib/slugUtils";
import { getGooglePlayLink } from "./lib/playSearchService";

export const getAppSlug = (app: { id?: string; name?: string; slug?: string; appCode?: string; packageId?: string }): string => {
  if (app.slug && app.slug.trim()) return toShortCleanSlug(app.slug);
  if (app.appCode && app.appCode.trim()) return toShortCleanSlug(app.appCode);
  if (app.name && app.name.trim()) return toShortCleanSlug(app.name);
  return toShortCleanSlug(app.id || "app");
};

export const isMatchApp = (a: { id?: string; name?: string; slug?: string; appCode?: string; packageId?: string }, key: string): boolean => {
  if (!key) return false;
  const k = key.trim().toLowerCase();
  if (!k) return false;

  const aId = (a.id || "").toLowerCase();
  const aPkg = (a.packageId || "").toLowerCase();
  const aCode = (a.appCode || "").toLowerCase();
  const aSlug = (a.slug || "").toLowerCase();
  const aComputedSlug = getAppSlug(a).toLowerCase();
  const aName = (a.name || "").toLowerCase();

  if (aId === k || aPkg === k || aCode === k || aSlug === k || aComputedSlug === k || aName === k) {
    return true;
  }

  if (aId.replace(/\./g, "-") + "-review" === k) return true;

  if (k.includes("facebook") && (aId.includes("facebook") || aName.includes("facebook"))) return true;
  if ((k === "wats" || k.includes("whatsapp")) && (aId.includes("whatsapp") || aName.includes("whatsapp"))) return true;
  if (k.includes("chatgpt") && (aId.includes("chatgpt") || aName.includes("chatgpt"))) return true;
  if (k.includes("instagram") && (aId.includes("instagram") || aName.includes("instagram"))) return true;
  if (k.includes("tiktok") && (aId.includes("tiktok") || aName.includes("tiktok"))) return true;
  if (k.includes("telegram") && (aId.includes("telegram") || aName.includes("telegram"))) return true;
  if (k.includes("youtube") && (aId.includes("youtube") || aName.includes("youtube"))) return true;
  if (k.includes("snapchat") && (aId.includes("snapchat") || aName.includes("snapchat"))) return true;
  if (k.includes("netflix") && (aId.includes("netflix") || aName.includes("netflix"))) return true;
  if (k.includes("spotify") && (aId.includes("spotify") || aName.includes("spotify"))) return true;
  if (k.includes("pubg") && (aId.includes("pubg") || aName.includes("pubg"))) return true;

  return false;
};

const AppLoaderComponent: React.FC<{
  selectedKey: string;
  onFetchSingle: (key: string) => Promise<void>;
  onLiveSearch: (query: string) => Promise<void>;
  onNavigateHome?: () => void;
}> = ({ selectedKey, onFetchSingle, onLiveSearch }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadApp = async () => {
      setLoading(true);
      await onFetchSingle(selectedKey);
      if (isMounted) {
        setLoading(false);
      }
    };
    loadApp();
    return () => { isMounted = false; };
  }, [selectedKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 flex-1 my-10 text-center">
        <div className="p-4 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl border border-blue-500/30 mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
        </div>
        <p className="font-black text-slate-800 dark:text-white text-base">جاري تحضير وتجهيز المراجعة الرسمية للتطبيق... 🚀</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">يتم التثبت من وجود التطبيق بروابط رسمية لمتاجر Google Play و App Store</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 flex-1 my-6 text-center">
      <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
      <p className="font-bold text-slate-800 dark:text-white">لم نتمكن من الوصول للتطبيق المطلوب تلقائياً</p>
      <div className="flex items-center justify-center gap-3 mt-4">
        <button 
          onClick={() => onLiveSearch(selectedKey)} 
          className="px-5 py-2.5 bg-amber-400 text-slate-950 text-xs font-black rounded-xl hover:bg-amber-300 transition-colors shadow-md cursor-pointer"
        >
          البحث والتحضير الفوري للتطبيق 🔍
        </button>
      </div>
    </div>
  );
};

export const deduplicateAppsList = (apps: AppReview[]): AppReview[] => {
  const seenSlugs = new Set<string>();
  const seenIds = new Set<string>();
  const seenPkgs = new Set<string>();
  const seenNames = new Set<string>();

  const result: AppReview[] = [];

  for (const app of apps) {
    if (!app || !app.id) continue;
    const slug = (getAppSlug(app) || "").toLowerCase().trim();
    const id = (app.id || "").toLowerCase().trim();
    const pkg = (app.packageId || "").toLowerCase().trim();
    const nameKey = (app.name || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, "").trim();

    if (slug && seenSlugs.has(slug)) continue;
    if (id && seenIds.has(id)) continue;
    if (pkg && pkg.length > 3 && seenPkgs.has(pkg)) continue;
    if (nameKey && nameKey.length > 3 && seenNames.has(nameKey)) continue;

    if (slug) seenSlugs.add(slug);
    if (id) seenIds.add(id);
    if (pkg && pkg.length > 3) seenPkgs.add(pkg);
    if (nameKey && nameKey.length > 3) seenNames.add(nameKey);

    result.push(app);
  }

  return result;
};

export default function App() {
  // Dark Mode State: Default to Light Mode (الوضع الأبيض) for first-time visitors, toggleable to dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark") return true;
      if (saved === "light") return false;
    } catch {}
    return false; // Default to White mode (الوضع الأبيض)
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        if (next) {
          document.documentElement.classList.add("dark");
          document.body.className = "theme-black";
          localStorage.setItem("theme", "dark");
          localStorage.setItem("app_theme", "black");
        } else {
          document.documentElement.classList.remove("dark");
          document.body.className = "theme-white";
          localStorage.setItem("theme", "light");
          localStorage.setItem("app_theme", "white");
        }
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        document.body.className = "theme-black";
        localStorage.setItem("theme", "dark");
        localStorage.setItem("app_theme", "black");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.className = "theme-white";
        localStorage.setItem("theme", "light");
        localStorage.setItem("app_theme", "white");
      }
    } catch {}
  }, [isDarkMode]);

  // Global attractive click/tap ripple effect on any click anywhere across the app
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      if (clientX === 0 && clientY === 0) return;

      const ripple = document.createElement("span");
      ripple.className = "click-ripple";
      ripple.style.left = `${clientX}px`;
      ripple.style.top = `${clientY}px`;
      ripple.style.background = isDarkMode
        ? "radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(239,68,68,0.2) 60%, transparent 100%)"
        : "radial-gradient(circle, rgba(37,99,235,0.45) 0%, rgba(220,38,38,0.25) 60%, transparent 100%)";
      ripple.style.border = isDarkMode 
        ? "1.5px solid rgba(147,197,253,0.8)" 
        : "1.5px solid rgba(37,99,235,0.7)";

      document.body.appendChild(ripple);
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);
    };

    window.addEventListener("pointerdown", handleGlobalClick, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handleGlobalClick);
    };
  }, [isDarkMode]);

  // Language Switcher State (AR / EN)
  const [currentLang, setCurrentLang] = useState<"ar" | "en">("ar");

  const handleToggleLanguage = () => {
    setCurrentLang((prev) => (prev === "ar" ? "en" : "ar"));
  };

  // Global Developer Agent Persistence State (Pin to Frontend)
  const [isAgentPinned, setIsAgentPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dev_agent_pinned") === "true";
    } catch {
      return false;
    }
  });
  const [isGlobalAgentOpen, setIsGlobalAgentOpen] = useState<boolean>(false);

  const handleToggleAgentPin = () => {
    setIsAgentPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dev_agent_pinned", String(next));
      } catch {}
      return next;
    });
  };

  // Navigation Routing States
  const [currentView, setCurrentView] = useState<"home" | "app" | "admin" | "privacy">("home");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeAppTab, setActiveAppTab] = useState<"all" | "latest" | "featured">("all");

  // Global Lists loaded from Firebase Firestore
  const [appsList, setAppsList] = useState<AppReview[]>(() => {
    const initialSeed = popularAppsSeed.map((item, idx) => {
      const seedShortCode = (10001 + idx).toString();
      return {
        ...item,
        packageId: item.id,
        appCode: item.appCode || seedShortCode,
        slug: item.slug || getAppSlug(item),
        createdAt: new Date(Date.now() - idx * 24 * 60 * 60 * 1000)
      };
    }) as AppReview[];
    return deduplicateAppsList(initialSeed);
  });
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    enableAds: false, // Default is closed/off until explicitly activated by developer via control panel and connected to Firebase
    adsHeaderCode: "",
    adsMiddleCode: "",
    adsBottomCode: "",
    adsRewardedCode: "",
    adsInterstitialCode: "",
    adsTxtContent: "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0",
    whatsappUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    instagramUrl: "",
    snapchatUrl: "",
    telegramUrl: "",
    xUrl: "",
    complaintsUrl: "",
    oneSignalAppId: "",
    oneSignalRestKey: "",
    openaiApiKey: "",
    geminiApiKey: "",
    promoImageUrl: "", // No default promotional image URL
    promoTargetUrl: "", // Removed default URL - empty until developer adds custom link
    isPromoEnabled: false, // Closed/hidden by default until developer activates it
    aiImagePortalUrl: "",
    showAiImagePortal: false
  });

  const [loadingApps, setLoadingApps] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStickyAd, setShowStickyAd] = useState(true);
  const [bannerHeight, setBannerHeight] = useState<90 | 70>(90);
  const [showAdVideoModal, setShowAdVideoModal] = useState(false);

  // Transition banner ad height from 90px to 70px after 3 seconds of showing
  useEffect(() => {
    if (showStickyAd && globalSettings.enableAds) {
      setBannerHeight(90);
      const timer = setTimeout(() => {
        setBannerHeight(70);
      }, 3000); // 3 seconds
      return () => clearTimeout(timer);
    }
  }, [showStickyAd, globalSettings.enableAds]);

  // Secret Admin Access States
  const [logoClicks, setLogoClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Subscription States
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState("");
  const [subscribeError, setSubscribeError] = useState("");
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [showTopNotification, setShowTopNotification] = useState(true);
  const [subscribersCount, setSubscribersCount] = useState<number>(0);
  const [isGoogleAuthSubmitting, setIsGoogleAuthSubmitting] = useState(false);

  // User Google Auth / Account Chooser
  const handleUserGoogleAuth = async () => {
    setIsGoogleAuthSubmitting(true);
    setSubscribeError("");
    setSubscribeSuccess("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = user.email || "";

      if (userEmail) {
        setSubscriberEmail(userEmail);

        // Save subscriber & user account in Firestore
        let visitorId = localStorage.getItem("site_visitor_id") || ("vid_" + Date.now().toString(36));
        const subRef = doc(db, "subscribers", visitorId);
        await setDoc(subRef, {
          email: userEmail,
          displayName: user.displayName || "مستخدم جديد",
          photoURL: user.photoURL || "",
          uid: user.uid,
          provider: "google.com",
          subscribedAt: serverTimestamp(),
          notificationsEnabled: true
        }, { merge: true });

        // Save user profile in Firestore 'users'
        try {
          const userRef = doc(db, "users", userEmail);
          await setDoc(userRef, {
            emailOrPhone: userEmail,
            name: user.displayName || "مستخدم الويب",
            photoURL: user.photoURL || "",
            uid: user.uid,
            role: "user",
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (uErr) {
          console.warn("User profile save warning:", uErr);
        }

        setSubscribeSuccess(`🎉 تم تسجيل الدخول والاشتراك بنجاح بالبريد الإلكتروني: ${userEmail}`);
        setSubscribersCount((prev) => prev + 1);

        setTimeout(() => {
          setShowPromoPopup(false);
          sessionStorage.setItem("promo_popup_closed", "true");
        }, 3000);
      }
    } catch (err: any) {
      console.error("Google User Auth Error:", err);
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        setSubscribeError("تم إغلاق نافذة اختيار الحساب. يرجى إتاحة النوافذ المنبثقة والنقر مجدداً لاختيار إيميلك.");
      } else {
        setSubscribeError("تعذر تسجيل الدخول الفوري عبر Google. يمكنك كتابة بريدك الإلكتروني بالأسفل.");
      }
    } finally {
      setIsGoogleAuthSubmitting(false);
    }
  };

  // Fetch subscribers count from Firestore & auto-register visitor ID with daily 24h notification trigger
  useEffect(() => {
    const initVisitorAndDailyNotifications = async () => {
      try {
        // 1. Generate or load persistent unique Visitor ID
        let visitorId = localStorage.getItem("site_visitor_id");
        if (!visitorId) {
          visitorId = "vid_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
          localStorage.setItem("site_visitor_id", visitorId);
        }

        // 2. Auto-register / update visitor in Firestore "subscribers" collection (throttled to once per 24 hours per visitor)
        const userAgent = window.navigator.userAgent;
        let shortDevice = "متصفح الويب";
        if (/iPhone|iPad|iPod/i.test(userAgent)) {
          shortDevice = "هاتف آيفون (iOS)";
        } else if (/Android/i.test(userAgent)) {
          shortDevice = "هاتف أندرويد";
        }

        const lastPing = localStorage.getItem("last_visitor_ping");
        const now = Date.now();
        if (!lastPing || (now - parseInt(lastPing, 10)) > 24 * 60 * 60 * 1000) {
          localStorage.setItem("last_visitor_ping", now.toString());
          try {
            const subRef = doc(db, "subscribers", visitorId);
            await setDoc(subRef, {
              visitorId: visitorId,
              deviceInfo: shortDevice,
              lastActiveAt: serverTimestamp(),
              subscribedAt: serverTimestamp(),
              notificationsEnabled: true,
              isAutoRegistered: true
            }, { merge: true });
          } catch (pingErr) {
            console.warn("Visitor ping notice:", pingErr);
          }
        }

        const savedSubCount = localStorage.getItem("subscribers_count");
        setSubscribersCount(savedSubCount ? parseInt(savedSubCount, 10) : 1850);

        // 3. Automated 24-Hour Daily Notification Trigger Check
        const lastNotifTs = localStorage.getItem("last_daily_notification_ts");
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        if (!lastNotifTs || (now - parseInt(lastNotifTs, 10)) >= ONE_DAY_MS) {
          localStorage.setItem("last_daily_notification_ts", now.toString());

          // Trigger native browser notification if allowed
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              try {
                new Notification("إشعارات وتحديثات جديدة اليوم 🚀", {
                  body: "أهلاً بك! تم إضافة أحدث التطبيقات والألعاب المحدثة اليوم على المنصة.",
                  icon: "/icon.png"
                });
              } catch (e) {}
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission().then((perm) => {
                if (perm === "granted") {
                  try {
                    new Notification("تم تفعيل التنبيهات بنجاح 🔔", {
                      body: "ستتلقى تنبيهات حصرية بأحدث الألعاب والتطبيقات المحدثة تلقائياً.",
                      icon: "/icon.png"
                    });
                  } catch (e) {}
                }
              });
            }
          }

          // Show top bar notification banner
          setShowTopNotification(true);
        }

      } catch (e) {
        console.log("Visitor auto-registration / daily notification trigger error:", e);
      }
    };

    initVisitorAndDailyNotifications();
    ensureAnonymousAuth();
  }, []);

  // 10-second auto-dismiss for top notification bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTopNotification(false);
    }, 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, []);

  // Cookie consent visibility state for coordinating bottom ads
  const [isCookieConsentVisible, setIsCookieConsentVisible] = useState<boolean>(false);

  // App Request States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [requestedAppName, setRequestedAppName] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestOS, setRequestOS] = useState("android");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState("");
  const [requestError, setRequestError] = useState("");

  // --- REAL-TIME ON-THE-FLY SEARCH SCRAPING & REVIEW GENERATION ---
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);
  const [showSearchRewardedOverlay, setShowSearchRewardedOverlay] = useState<boolean>(false);
  const [searchRewardedTimer, setSearchRewardedTimer] = useState<number>(5);
  const [showEmbeddedAdInScrape, setShowEmbeddedAdInScrape] = useState<boolean>(true);

  // Candidate Apps Selection Modal States
  const [showCandidatesModal, setShowCandidatesModal] = useState<boolean>(false);
  const [candidateApps, setCandidateApps] = useState<{
    packageId: string;
    name: string;
    iconUrl: string;
    developer: string;
    rating: number;
    category: string;
    playStoreUrl: string;
  }[]>([]);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState<boolean>(false);
  const [searchedQueryText, setSearchedQueryText] = useState<string>("");
  const [isFeatureSearchQuery, setIsFeatureSearchQuery] = useState<boolean>(false);

  // Timer countdown for search rewarded top-layer ad
  useEffect(() => {
    if (!showSearchRewardedOverlay) return;
    if (searchRewardedTimer > 0) {
      const timer = setTimeout(() => {
        setSearchRewardedTimer(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSearchRewardedOverlay, searchRewardedTimer]);

  const handleStartSearchFlow = async (query: string) => {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();
    const queryLower = cleanQuery.toLowerCase();
    const queryNorm = normalizeText(cleanQuery);

    // 1. FIRST PRIORITY: High-speed local barcode / appCode / Package ID / Exact Name search in site apps
    const matchedLocalApp = appsList.find((app) => {
      const computedCode = app.appCode || (Math.floor((app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 900) + 100)).toString();
      const normComputedCode = normalizeText(computedCode);
      const normAppCode = app.appCode ? normalizeText(app.appCode) : "";

      // Exact Barcode / Code Match
      if (
        computedCode.trim() === cleanQuery ||
        normComputedCode === queryNorm ||
        (app.appCode && (app.appCode.trim() === cleanQuery || normAppCode === queryNorm))
      ) {
        return true;
      }

      // Exact Package ID Match (e.g. com.whatsapp)
      if (app.id.toLowerCase().trim() === queryLower) {
        return true;
      }

      // Exact Name Match
      if (
        app.name.toLowerCase().trim() === queryLower ||
        normalizeText(app.name) === queryNorm
      ) {
        return true;
      }

      return false;
    });

    if (matchedLocalApp) {
      // Local app match found! Display app directly with zero delay
      handleNavigate("app", matchedLocalApp.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 2. SECOND PRIORITY: Check if query matches partial local app names
    const partialLocalMatches = appsList.filter((app) => {
      if (app.isApproved === false) return false;
      const normName = normalizeText(app.name);
      return normName.includes(queryNorm);
    });

    if (partialLocalMatches.length === 1) {
      handleNavigate("app", partialLocalMatches[0].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 4. FOURTH PRIORITY: No app match found inside local database -> Search external stores for candidates
    setSearchedQueryText(cleanQuery);
    setIsSearchingCandidates(true);
    console.log(`[Client Search] 🔍 Initiating candidate search for query: "${cleanQuery}"`);

    let backendNetworkError = false;

    try {
      const res = await safeFetchJson<{ success: boolean; candidates: any[]; isFeatureSearch?: boolean; errorType?: string; error?: string }>(
        "/api/search-candidates",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: cleanQuery })
        }
      );

      console.log(`[Client Search] 📥 Backend Response:`, res);

      if (res.data?.errorType === "NETWORK_ERROR") {
        backendNetworkError = true;
      }

      if (res.ok && res.data && res.data.success && Array.isArray(res.data.candidates) && res.data.candidates.length > 0) {
        setIsSearchingCandidates(false);
        setIsFeatureSearchQuery(!!res.data.isFeatureSearch);

        if (res.data.candidates.length === 1) {
          const cand = res.data.candidates[0];
          const candPkg = cand.packageId || "";
          const candName = cand.name || "";
          const localCand = appsList.find(a => 
            (candPkg && (a.id.toLowerCase() === candPkg.toLowerCase() || a.packageId?.toLowerCase() === candPkg.toLowerCase())) ||
            (candName && a.name.toLowerCase() === candName.toLowerCase())
          );
          if (localCand) {
            handleNavigate("app", localCand.id);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
          await handleLiveSearchAndScrape(
            candPkg || candName || cand.playStoreUrl, 
            cand.appStoreUrl || "", 
            cand.playStoreUrl || "",
            cand
          );
        } else {
          setCandidateApps(res.data.candidates);
          setShowCandidatesModal(true);
        }
        return;
      }
    } catch (err) {
      console.warn("[Client Search] ⚠️ Backend search exception:", err);
      backendNetworkError = true;
    }

    // Client-Side Candidate Search Fallback via iTunes Search API if backend candidate API is unreachable or returned empty
    let clientNetworkError = false;
    const clientCandidateMap = new Map<string, any>();

    const runiTunesClientSearch = async (searchTerm: string) => {
      try {
        console.log(`[Client Search Fallback] 🌐 Searching iTunes API for: "${searchTerm}"`);
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=software&country=SA&limit=8`);
        if (itunesRes.ok) {
          const data = await safeParseResponse(itunesRes, null);
          console.log(`[Client Search Fallback] iTunes response for "${searchTerm}":`, data);
          if (data && Array.isArray(data.results) && data.results.length > 0) {
            for (const resItem of data.results) {
              const pkg = resItem.bundleId || ("com." + (resItem.trackName || "app").toLowerCase().replace(/[^a-z0-9]+/g, ""));
              if (!clientCandidateMap.has(pkg.toLowerCase())) {
                clientCandidateMap.set(pkg.toLowerCase(), {
                  name: resItem.trackName,
                  packageId: pkg,
                  developer: resItem.artistName || "الشركة المطورة",
                  iconUrl: resItem.artworkUrl512 || resItem.artworkUrl100 || `https://ui-avatars.com/api/?name=${encodeURIComponent(resItem.trackName)}&size=512&background=4f46e5&color=ffffff&bold=true`,
                  rating: resItem.averageUserRating || 4.7,
                  category: resItem.primaryGenreName || "تطبيقات",
                  playStoreUrl: `https://play.google.com/store/search?q=${encodeURIComponent(resItem.trackName || "App")}&c=apps`,
                  appStoreUrl: resItem.trackViewUrl || ""
                });
              }
            }
          }
        } else {
          clientNetworkError = true;
        }
      } catch (e) {
        console.warn(`[Client Search Fallback] iTunes fetch error for "${searchTerm}":`, e);
        clientNetworkError = true;
      }
    };

    // First try original query
    await runiTunesClientSearch(cleanQuery);

    // KEYWORD BREAKDOWN FALLBACK: If 0 candidates found, split words & remove stop words
    if (clientCandidateMap.size === 0) {
      const stopWords = new Set(["تطبيق", "تطبيقات", "برنامج", "برامج", "تحميل", "تنزيل", "شرح", "شروحات", "مجاني", "مجانا", "بدون", "ميزة", "طريقة", "افضل", "أفضل", "جديد", "العاب", "لعبة", "عن", "في", "من", "على", "الى", "إلى", "مع", "هل", "هو", "هي"]);
      const words = cleanQuery.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w.toLowerCase()));
      console.log(`[Client Search Fallback] 🔄 Triggering keyword breakdown for "${cleanQuery}". Keywords:`, words);

      for (const kw of words) {
        await runiTunesClientSearch(kw);
        if (clientCandidateMap.size >= 5) break;
      }
    }

    setIsSearchingCandidates(false);

    if (clientCandidateMap.size > 0) {
      const candidatesList = Array.from(clientCandidateMap.values());
      console.log(`[Client Search Fallback] ✅ Displaying ${candidatesList.length} candidate apps`);
      setCandidateApps(candidatesList);
      setShowCandidatesModal(true);
      return;
    }

    // Distinguish network connection error vs zero matching apps
    if (backendNetworkError && clientNetworkError) {
      alert("تعذر الاتصال بالمتجر حالياً، يرجى المحاولة لاحقاً.");
      return;
    }

    // Genuine 0 matching apps found across all stores & keyword fallbacks
    alert("عذراً، لم يتم العثور على تطبيقات مطابقة لاسم البحث في متجر التطبيقات. يُرجى التثبت من صحة اسم التطبيق وإعادة المحاولة.");
  };

  // Helper to convert Markdown articles into pristine HTML for R2 storage in client fallback
  const markdownToFormattedHtmlClient = (
    markdown: string, 
    title: string, 
    playStoreUrl?: string, 
    appStoreUrl?: string, 
    iconUrl?: string
  ): string => {
    if (!markdown) return "";
    let bodyHtml = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p>\n<p>')
      .replace(/\n/g, '<br/>\n');

    const playBtn = playStoreUrl
      ? `<a href="${playStoreUrl}" target="_blank" rel="noopener noreferrer" class="store-btn google-play">
           <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>
           <span>تحميل من متجر Google Play</span>
         </a>`
      : '';

    const appStoreBtn = appStoreUrl
      ? `<a href="${appStoreUrl}" target="_blank" rel="noopener noreferrer" class="store-btn app-store">
           <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.09,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/></svg>
           <span>تحميل من متجر App Store</span>
         </a>`
      : '';

    const iconTag = iconUrl
      ? `<img src="${iconUrl}" alt="${title}" class="app-icon" />`
      : '';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - دليل ومراجعة شاملة | موقع مراجع وأدلة التطبيقات</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.8; color: #1e293b; background-color: #f8fafc; padding: 24px; max-width: 920px; margin: 0 auto; }
    article { background: #ffffff; padding: 36px; border-radius: 20px; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header-box { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
    .app-icon { width: 80px; height: 80px; border-radius: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; object-fit: cover; }
    .header-text h1 { color: #0f172a; font-size: 2rem; font-weight: 800; margin: 0 0 6px 0; border: none; padding: 0; }
    .header-text p { margin: 0; color: #64748b; font-size: 0.95rem; font-weight: 600; }
    .action-buttons { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0 28px 0; }
    .store-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 12px 24px; border-radius: 14px; font-weight: 700; font-size: 0.95rem; text-decoration: none; transition: all 0.2s ease; }
    .google-play { background: #0f172a; color: #ffffff; }
    .google-play:hover { background: #1e293b; }
    .app-store { background: #2563eb; color: #ffffff; }
    .app-store:hover { background: #1d4ed8; }
    h1 { color: #0f172a; font-size: 2rem; font-weight: 800; border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-bottom: 24px; }
    h2 { color: #1e40af; font-size: 1.5rem; font-weight: 700; margin-top: 32px; margin-bottom: 16px; border-right: 4px solid #3b82f6; padding-right: 12px; }
    h3 { color: #2563eb; font-size: 1.25rem; font-weight: 600; margin-top: 24px; margin-bottom: 12px; }
    p { margin-bottom: 18px; font-size: 1.05rem; }
    strong { color: #0f172a; font-weight: 700; }
    code { background: #f1f5f9; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    hr { border: 0; height: 1px; background: #e2e8f0; margin: 32px 0; }
  </style>
</head>
<body>
  <article>
    <div class="header-box">
      ${iconTag}
      <div class="header-text">
        <h1>${title}</h1>
        <p>دليل واستعراض تفصيلي | مراجع وأدلة التطبيقات (RoohMe)</p>
      </div>
    </div>
    ${(playStoreUrl || appStoreUrl) ? `<div class="action-buttons">${playBtn}${appStoreBtn}</div><hr/>` : ''}
    ${bodyHtml}
    ${(playStoreUrl || appStoreUrl) ? `<hr/><div class="action-buttons" style="justify-content: center;">${playBtn}${appStoreBtn}</div>` : ''}
  </article>
</body>
</html>`;
  };

  const handleLiveSearchAndScrape = async (
    query: string,
    prefAppStoreUrl?: string,
    prefPlayStoreUrl?: string,
    selectedCandidate?: any
  ) => {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();
    const queryLower = cleanQuery.toLowerCase();
    const queryNorm = normalizeText(cleanQuery);

    const candName = selectedCandidate?.name || "";
    const candPkg = selectedCandidate?.packageId || "";

    // Check if app already exists in local site database before scraping external store
    const existingLocalApp = appsList.find((app) => {
      const computedCode = app.appCode || (Math.floor((app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 900) + 100)).toString();
      return (
        (candPkg && (app.id.toLowerCase() === candPkg.toLowerCase() || app.packageId?.toLowerCase() === candPkg.toLowerCase())) ||
        (candName && app.name.toLowerCase() === candName.toLowerCase()) ||
        app.id.toLowerCase() === queryLower ||
        computedCode.trim() === cleanQuery ||
        normalizeText(computedCode) === queryNorm ||
        (app.appCode && (app.appCode.trim() === cleanQuery || normalizeText(app.appCode) === queryNorm))
      );
    });

    if (existingLocalApp) {
      handleNavigate("app", existingLocalApp.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsScraping(true);
    setShowEmbeddedAdInScrape(true);
    setScrapingStatus("جاري التثبت والبحث في متجر Google Play و App Store... 🔍");

    // Trigger Rewarded Ad in top-layer overlay ONLY if ad code exists and 1-min cooldown passed
    const hasRewardedCode = isRealAdCode(globalSettings.adsRewardedCode);
    if (globalSettings.enableAds && hasRewardedCode && canShowFullScreenAd(globalSettings.enableAds)) {
      recordFullScreenAdShown();
      setShowSearchRewardedOverlay(true);
      setSearchRewardedTimer(5);
    } else {
      setShowSearchRewardedOverlay(false);
    }
    
    const statuses = [
      "جاري جلب تفاصيل وبيانات التطبيق... 📱",
      "جاري التحقق من تقييم وتصنيف التطبيق... 🏷️",
      "جاري تحضير المراجعة ودليل الاستخدام... ⚡",
      "جاري تهيئة روابط التحميل المباشرة للمتجرين... 💾"
    ];
    let statusIdx = 0;
    const interval = setInterval(() => {
      if (statusIdx < statuses.length) {
        setScrapingStatus(statuses[statusIdx]);
        statusIdx++;
      }
    }, 2800);

    let backendSuccess = false;
    let backendAppId = "";

    try {
      const res = await safeFetchJson<{ success: boolean; app: any }>("/api/search-and-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: cleanQuery,
          prefAppStoreUrl: selectedCandidate?.appStoreUrl || prefAppStoreUrl || "",
          prefPlayStoreUrl: selectedCandidate?.playStoreUrl || prefPlayStoreUrl || "",
          packageId: selectedCandidate?.packageId || "",
          targetAppName: selectedCandidate?.name || "",
          candidate: selectedCandidate || null
        })
      });

      if (res.ok && res.data && res.data.success && res.data.app) {
        backendSuccess = true;
        backendAppId = res.data.app.id;
      }
    } catch (e) {
      console.warn("Backend /api/search-and-scrape not reachable or returned non-JSON, using direct client scraper fallback...", e);
    }

    if (backendSuccess && backendAppId) {
      clearInterval(interval);
      setScrapingStatus("تم إنشاء المراجعة بنجاح! ⚡ التطبيق الآن بانتظار موافقة المطور وسيتوفر بالرئيسية فور الاعتماد.");
      await fetchAppReviews();
      setTimeout(() => {
        setIsScraping(false);
        setScrapingStatus(null);
        setShowSearchRewardedOverlay(false);
        handleNavigate("app", backendAppId);
      }, 2000);
      return;
    }

    // --- CLIENT-SIDE FALLBACK FOR STATIC FIREBASE HOSTING ---
    try {
      setScrapingStatus("جاري الفحص المباشر والتحقق من وجود التطبيق في متجر التطبيقات... 🔍");

      let storeMatchFound = false;
      let cleanAppName = selectedCandidate?.name || "";
      let packageId = selectedCandidate?.packageId || "";
      let appStoreUrl = selectedCandidate?.appStoreUrl || prefAppStoreUrl || "";
      let iconUrl = selectedCandidate?.iconUrl || "";
      let ratingVal = selectedCandidate?.rating || 4.8;
      let categoryStr = selectedCandidate?.category || "تطبيقات";

      if (selectedCandidate && selectedCandidate.name) {
        storeMatchFound = true;
      }

      if (!packageId) {
        if (prefPlayStoreUrl && prefPlayStoreUrl.includes("id=")) {
          const urlMatch = prefPlayStoreUrl.match(/id=([a-zA-Z0-9_.]+)/);
          if (urlMatch) packageId = urlMatch[1];
        }
        if (!packageId) {
          const pkgMatch = cleanQuery.match(/id=([a-zA-Z0-9_.]+)/);
          if (pkgMatch) {
            packageId = pkgMatch[1];
          } else if (cleanQuery.includes(".") && !cleanQuery.includes(" ") && !cleanQuery.startsWith("http")) {
            packageId = cleanQuery;
          } else {
            packageId = "com." + cleanQuery.toLowerCase().replace(/[^a-z0-9]+/g, "");
          }
        }
      }

      if (!storeMatchFound) {
        // Prepare terms to query store API
        const searchTerms: string[] = [cleanQuery];
        if (packageId) {
          searchTerms.push(packageId);
          const pkgParts = packageId.split(".");
          const mainPart = pkgParts.pop() || "";
          if (mainPart && mainPart.length >= 3 && mainPart !== "android" && mainPart !== "app") {
            searchTerms.push(mainPart);
          }
        }

        // Query iTunes Search API for artwork and track URLs to verify real app existence
        for (const term of searchTerms) {
          if (!term || term.trim().length < 2) continue;
          try {
            const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term.trim())}&entity=software&limit=5`);
            if (itunesRes.ok) {
              const itunesData = await safeParseResponse(itunesRes, null);
              if (itunesData && itunesData.results && itunesData.results.length > 0) {
                const resItem = itunesData.results[0];
                if (resItem && resItem.trackName) {
                  storeMatchFound = true;
                  cleanAppName = resItem.trackName;
                  if (resItem.trackViewUrl) appStoreUrl = resItem.trackViewUrl;
                  if (resItem.artworkUrl512 || resItem.artworkUrl100) {
                    iconUrl = resItem.artworkUrl512 || resItem.artworkUrl100;
                  }
                  if (resItem.averageUserRating) ratingVal = resItem.averageUserRating;
                  if (resItem.primaryGenreName) categoryStr = resItem.primaryGenreName;
                  break;
                }
              }
            }
          } catch (e) {
            console.warn("iTunes store search error for term:", term, e);
          }
        }
      }

      // If app is NOT found on store, DO NOT create a dummy app or review!
      if (!storeMatchFound) {
        clearInterval(interval);
        setIsScraping(false);
        setScrapingStatus(null);
        setShowSearchRewardedOverlay(false);
        alert("عذراً، لم يتم العثور على هذا التطبيق في متجر التطبيقات (Google Play / App Store). يُرجى التثبت من صحة اسم التطبيق أو رابط الحزمة وإعادة المحاولة.");
        return;
      }

      if (!iconUrl) {
        iconUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanAppName)}&size=512&background=4f46e5&color=ffffff&bold=true`;
      }

      setScrapingStatus("جاري صياغة مراجعة ودليل استخدام التطبيق بالذكاء الاصطناعي... ⚡");

      let aiArticle = generateExhaustiveArticleFallback(cleanAppName, "الشركة المطورة الرسمية", categoryStr || "تطبيقات", ratingVal, packageId);
      let aiTags = [
        cleanAppName,
        `تحميل ${cleanAppName}`,
        `تنزيل ${cleanAppName}`,
        `تطبيق ${cleanAppName}`,
        "تطبيقات أندرويد",
        "تطبيقات آيفون",
        "مراجعة شاملة"
      ];

      try {
        const prompt = `أنت خبير محرر ومراجع صحفي ومؤلف أدلة استخدام تطبيقات الجوال الذكية باللغة العربية.
قم بكتابة مقال صحفي ومراجعة ودليل استخدام شامل ومستفيض وعميق جداً باللغة العربية لتطبيق اسمه: "${cleanAppName}" (معرّف الحزمة: ${packageId}).

الشروط والتعليمات الإلزامية:
1. يجب ألا يقل حجم مقال المراجعة عن 1500 كلمة (1500+ Words) مفصلة ودقيقة وبأسلوب صحفي بشري ممتع وجذاب وموثوق.
2. استخدم تنسيق ماركداون (Markdown) غني وموزع بعناوين رئيسية وفرعية مرتبة (# و ## و ###).
3. يجب أن يحتوي المقال على الهيكل المنهجي التالي كاملاً دون اختصار:
   - # دليل ومراجعة شاملة لتطبيق ${cleanAppName}
   - ## مقدمة استعراضية ورؤية التطبيق وفكرته الرئيسية
   - ## قصة وتاريخ المطور وأهداف تطوير التطبيق
   - ## الشرح الموسع والعميق لكافة المميزات والخصائص الفنية والوظائف الذكية
   - ## تحليل الأداء والسرعة، الأمان وحماية الخصوصية، واستهلاك الموارد
   - ## دليل الاستخدام والتشغيل الكامل خطوة بخطوة للمبتدئين
   - ## قسم الأسئلة الشائعة والأجوبة التفصيلية (FAQ)
   - ## العيوب والتحديات والملاحظات الموضوعية المصداقية
   - ## مقارنة شاملة مع التطبيقات المنافسة في متجر Google Play و App Store
   - ## الخلاصة ورأي الخبراء والتقييم النهائي
   - ## الكلمات المفتاحية والدلالية المستهدفة (SEO Target Keywords): تضم 15 إلى 25 كلمة مفتاحية دقيقة.`;

        const metaEnv = (import.meta as any).env || {};
        const gemKey = globalSettings.geminiApiKey || metaEnv.VITE_GEMINI_API_KEY || "";
        
        const aiResponseText = await callGeminiApi([
          { role: "system", content: "أنت خبير مراجعة ودليل استخدام تطبيقات الهاتف الذكي باللغة العربية، وتكتب مقالات احترافية ثرية ومفصلة لا تقل عن 1500 كلمة." },
          { role: "user", content: prompt }
        ], gemKey);

        if (aiResponseText && aiResponseText.trim() && aiResponseText.length > 200) {
          aiArticle = aiResponseText;
        }
      } catch (aiErr) {
        console.warn("Client Gemini generation notice:", aiErr);
      }

      const newShortId = generateShortId();
      let playStoreUrl = selectedCandidate?.playStoreUrl && selectedCandidate.playStoreUrl.includes("details?id=")
        ? selectedCandidate.playStoreUrl
        : (cleanQuery.startsWith("http") && cleanQuery.includes("play.google.com"))
          ? cleanQuery
          : ((packageId && packageId.includes(".") && !packageId.startsWith("com.app."))
            ? `https://play.google.com/store/apps/details?id=${packageId}`
            : "");

      if (!playStoreUrl) {
        try {
          playStoreUrl = await getGooglePlayLink(cleanAppName || cleanQuery);
        } catch (linkErr) {
          playStoreUrl = `https://play.google.com/store/search?q=${encodeURIComponent(cleanAppName || cleanQuery)}&c=apps`;
        }
      }
      const cleanSlug = toShortCleanSlug(cleanAppName);
      const r2FileKey = `${cleanSlug}.html`;
      const r2Url = `https://roohpro.com/${r2FileKey}`;
      const articleUrl = `https://roohpro.com/${cleanSlug}`;

      const formattedHtml = markdownToFormattedHtmlClient(aiArticle, cleanAppName, playStoreUrl, appStoreUrl, iconUrl);

      // Send PUT request to Cloudflare Worker R2 in client fallback
      try {
        await fetch(r2Url, {
          method: "PUT",
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=31536000, immutable"
          },
          body: formattedHtml
        });
      } catch (r2Err) {
        console.warn("Client fallback R2 upload notice:", r2Err);
      }

      const newAppObj: AppReview = {
        id: newShortId,
        appCode: newShortId,
        packageId: packageId,
        name: cleanAppName,
        iconUrl: iconUrl,
        rating: ratingVal,
        downloadsCount: 100000,
        category: categoryStr || "تطبيقات",
        description: aiArticle,
        content: formattedHtml,
        r2FileKey: r2FileKey,
        r2Url: r2Url,
        articleUrl: articleUrl,
        playStoreUrl: playStoreUrl,
        appStoreUrl: appStoreUrl,
        tags: aiTags,
        createdAt: new Date(),
        isApproved: false,
        status: "pending",
        isUserSearched: true,
        slug: cleanSlug,
        metaTitle: `تنزيل ومراجعة تطبيق ${cleanAppName} | أحدث إصدار بروابط مباشرة`,
        metaDescription: `احصل على شرح ومراجعة تفصيلية شاملة لتطبيق ${cleanAppName} مع رابط التحميل المباشر والآمن 100%.`,
        seoKeywords: aiTags
      };

      // Save to Firestore 'apps' collection explicitly using 5-digit short ID doc name
      try {
        await setDoc(doc(db, "apps", newShortId), {
          ...newAppObj,
          createdAt: serverTimestamp()
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Save review to Firestore client fallback notice:", fsErr);
      }

      setAppsList(prev => {
        if (prev.some(a => a.id === newShortId)) return prev;
        return [newAppObj, ...prev];
      });

      clearInterval(interval);
      setScrapingStatus("تم إنشاء المراجعة بنجاح! ⚡ التطبيق الآن بانتظار موافقة المطور.");

      setTimeout(() => {
        setIsScraping(false);
        setScrapingStatus(null);
        setShowSearchRewardedOverlay(false);
        handleNavigate("app", newShortId);
      }, 1500);

    } catch (fallbackErr: any) {
      clearInterval(interval);
      console.error("Scrape fallback error:", fallbackErr);
      setIsScraping(false);
      setScrapingStatus(null);
      setShowSearchRewardedOverlay(false);
    }
  };

  // 10-second delay subscription popup with 10-second auto-hide
  useEffect(() => {
    const isClosed = sessionStorage.getItem("promo_popup_closed");
    if (!isClosed) {
      const showTimer = setTimeout(() => {
        setShowPromoPopup(true);
        sessionStorage.setItem("promo_popup_closed", "true");

        // Auto-hide after 10 seconds of showing
        const hideTimer = setTimeout(() => {
          setShowPromoPopup(false);
        }, 10000);

        return () => clearTimeout(hideTimer);
      }, 10000); // 10 seconds delay
      return () => clearTimeout(showTimer);
    }
  }, []);

  // OneSignal dynamic loader when settings are loaded
  useEffect(() => {
    if (!globalSettings.oneSignalAppId) return;

    const initOneSignal = async () => {
      try {
        const appId = globalSettings.oneSignalAppId;
        if (document.getElementById("onesignal-sdk")) {
          const OneSignal = (window as any).OneSignal;
          if (OneSignal) {
            OneSignal.push(() => {
              try {
                OneSignal.init({
                  appId: appId,
                  allowLocalhostAsSecureOrigin: true,
                  notifyButton: {
                    enable: false,
                  }
                });
              } catch (e) {
                console.log("OneSignal already initialized or error", e);
              }
            });
          }
          return;
        }

        const script = document.createElement("script");
        script.id = "onesignal-sdk";
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => {
          const OneSignal = (window as any).OneSignal || [];
          OneSignal.push(() => {
            try {
              OneSignal.init({
                appId: appId,
                allowLocalhostAsSecureOrigin: true,
                notifyButton: {
                  enable: false, // We render our own beautiful native button
                }
              });
            } catch (e) {
              console.log("OneSignal init error:", e);
            }
          });
        };
      } catch (err) {
        console.log("OneSignal push service loading bypassed:", err);
      }
    };
    initOneSignal();
  }, [globalSettings.oneSignalAppId]);

  const handleSubscribe = async (e?: React.FormEvent, customEmail?: string) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubscribeError("");
    setSubscribeSuccess("");
    setIsSubscribing(true);

    try {
      const subRef = doc(collection(db, "subscribers"));
      const userAgent = window.navigator.userAgent;
      let shortDevice = "متصفح الويب";
      if (/iPhone|iPad|iPod/i.test(userAgent)) {
        shortDevice = "هاتف آيفون (iOS)";
      } else if (/Android/i.test(userAgent)) {
        shortDevice = "هاتف أندرويد";
      }

      const emailToUse = customEmail !== undefined ? customEmail.trim() : subscriberEmail.trim();

      await setDoc(subRef, {
        email: emailToUse || null,
        deviceInfo: shortDevice,
        subscribedAt: serverTimestamp()
      });

      // Try triggering OneSignal registration overlay
      const OneSignal = (window as any).OneSignal;
      if (OneSignal) {
        try {
          await OneSignal.showSlidedownPrompt();
        } catch (promptErr) {
          console.log("OneSignal native prompt bypassed:", promptErr);
        }
      }

      setSubscribeSuccess("تم تفعيل جرس التنبيهات والاشتراك بنجاح! ستتلقى إشعارات فورية بكل جديد.");
      setSubscriberEmail("");
      setSubscribersCount((prev) => prev + 1);
    } catch (err: any) {
      console.error(err);
      setSubscribeError("حدث خطأ أثناء تفعيل الجرس. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendAppRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedAppName.trim()) {
      setRequestError("الرجاء إدخال اسم التطبيق المطلوبة.");
      return;
    }
    setIsSendingRequest(true);
    setRequestError("");
    setRequestSuccess("");
    try {
      const requestRef = doc(collection(db, "appRequests"));
      await setDoc(requestRef, {
        id: requestRef.id,
        appName: requestedAppName.trim(),
        notes: requestNotes.trim() || "",
        deviceOS: requestOS,
        createdAt: serverTimestamp()
      });
      setRequestSuccess("تم إرسال طلبك بنجاح! سيقوم مدير الموقع بمراجعته ونشر مراجعة للتطبيق في أقرب وقت.");
      setRequestedAppName("");
      setRequestNotes("");
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess("");
      }, 4000);
    } catch (err: any) {
      console.error("Error sending app request:", err);
      setRequestError("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً.");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 4000) {
      setLogoClicks(1);
    } else {
      const newClicksCount = logoClicks + 1;
      setLogoClicks(newClicksCount);
      if (newClicksCount >= 5) {
        setLogoClicks(0);
        handleNavigate("admin");
      }
    }
    setLastClickTime(now);
  };

  // Track window size for dynamic items per page (16 apps for mobile, 17 apps for browser/desktop)
  const [isMobileWindow, setIsMobileWindow] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileWindow(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pagination States - requested: 16 apps per page on mobile view, 17 apps per page on browser view
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobileWindow ? 16 : 17;

  const fetchSingleAppFromFirestore = async (key: string) => {
    if (!key) return;
    const cleanKey = key.trim().toLowerCase();

    // Check seed list first
    const seedMatch = popularAppsSeed.find((s) => isMatchApp(s, cleanKey));
    if (seedMatch) {
      const appObj: AppReview = {
        ...seedMatch,
        packageId: seedMatch.id,
        appCode: seedMatch.appCode || "10001",
        slug: seedMatch.slug || getAppSlug(seedMatch),
        createdAt: new Date()
      } as AppReview;

      setAppsList((prev) => {
        if (prev.some((a) => a.id === appObj.id)) return prev;
        return [appObj, ...prev];
      });
      setSelectedAppId(appObj.id);
      setCurrentView("app");
      return;
    }

    if (isPlaceholderFirebase) return;

    try {
      let docSnap = await getDoc(doc(db, "apps", key));
      if (!docSnap.exists()) {
        const qCode = query(collection(db, "apps"), where("appCode", "==", key), limit(1));
        const snapCode = await getDocs(qCode);
        if (!snapCode.empty) {
          docSnap = snapCode.docs[0];
        } else {
          const qPkg = query(collection(db, "apps"), where("packageId", "==", key), limit(1));
          const snapPkg = await getDocs(qPkg);
          if (!snapPkg.empty) {
            docSnap = snapPkg.docs[0];
          } else {
            const qSlug = query(collection(db, "apps"), where("slug", "==", key), limit(1));
            const snapSlug = await getDocs(qSlug);
            if (!snapSlug.empty) {
              docSnap = snapSlug.docs[0];
            }
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const appObj: AppReview = {
          id: docSnap.id,
          packageId: data.packageId || (docSnap.id.includes('.') ? docSnap.id : ''),
          appCode: data.appCode || docSnap.id,
          name: data.name || "",
          iconUrl: data.iconUrl || "",
          rating: data.rating || 4.5,
          description: data.description || "",
          chart_data: data.chart_data || data.chartData,
          playStoreUrl: data.playStoreUrl || "",
          appStoreUrl: data.appStoreUrl || "",
          videoUrl: data.videoUrl || "",
          tags: data.tags || [],
          category: data.category || "أخرى",
          createdAt: data.createdAt,
          isApproved: data.isApproved !== undefined ? data.isApproved : true,
          isUserSearched: data.isUserSearched !== undefined ? data.isUserSearched : false,
          slug: data.slug || getAppSlug({ id: docSnap.id, name: data.name, packageId: data.packageId, appCode: data.appCode })
        };

        setAppsList((prev) => {
          if (prev.some((a) => a.id === appObj.id)) return prev;
          return [appObj, ...prev];
        });
        setSelectedAppId(appObj.id);
        setCurrentView("app");
      }
    } catch (e) {
      console.warn("Notice: Firestore single app fetch error:", e);
    }
  };

  // Synced Routing via Pathname & Hash for Clean SEO Direct URLs & Link Sharing
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|ico|css|js|json|xml|txt)$/i.test(pathname);

      let reviewSlugOrId = "";
      if (pathname.startsWith("/review/")) {
        reviewSlugOrId = decodeURIComponent(pathname.replace("/review/", ""));
      } else if (pathname.startsWith("/app/")) {
        reviewSlugOrId = decodeURIComponent(pathname.replace("/app/", ""));
      } else if (hash.startsWith("#/review/")) {
        reviewSlugOrId = decodeURIComponent(hash.replace("#/review/", ""));
      } else if (hash.startsWith("#/app/")) {
        reviewSlugOrId = decodeURIComponent(hash.replace("#/app/", ""));
      } else if (pathname !== "/" && pathname !== "/admin" && pathname !== "/privacy" && pathname !== "/sitemap.xml" && !isStaticAsset) {
        // Direct clean flat URL e.g. /wats or /facebook or /10001 or /com.facebook.katana
        reviewSlugOrId = decodeURIComponent(pathname.replace(/^\/+/, ""));
      } else if (hash && hash !== "#/" && hash !== "#/admin" && hash !== "#/privacy") {
        reviewSlugOrId = decodeURIComponent(hash.replace(/^#\/+/, ""));
      }

      if (reviewSlugOrId) {
        const cleanKey = reviewSlugOrId.trim().toLowerCase();
        const targetApp = appsList.find((a) => isMatchApp(a, cleanKey));

        if (targetApp) {
          setSelectedAppId(targetApp.id);
          setCurrentView("app");
        } else {
          setSelectedAppId(reviewSlugOrId);
          setCurrentView("app");
          fetchSingleAppFromFirestore(cleanKey);
        }
      } else if (pathname === "/admin" || hash === "#/admin") {
        setCurrentView("admin");
      } else if (pathname === "/privacy" || hash === "#/privacy") {
        setCurrentView("privacy");
      } else if (pathname === "/") {
        setCurrentView("home");
        setSelectedAppId(null);
      }
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    
    // Sync location on boot and whenever appsList changes
    handleLocationChange();

    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, [appsList]);

  // Update browser URL (clean HTML5 direct flat path without #) and navigate
  const handleNavigate = (view: "home" | "admin" | "privacy" | "app", id?: string) => {
    if (view === "app" && id) {
      const cleanKey = id.trim().toLowerCase();
      const targetApp = appsList.find((a) => isMatchApp(a, id) || isMatchApp(a, cleanKey));

      const actualId = targetApp ? targetApp.id : id;
      const slugToUse = targetApp ? getAppSlug(targetApp) : (id.includes(".") ? getAppSlug({ id, name: id }) : id);
      const targetUrl = `/${slugToUse}`;

      setSelectedAppId(actualId);
      setCurrentView("app");

      if (!targetApp) {
        fetchSingleAppFromFirestore(cleanKey);
      }

      if (window.location.pathname !== targetUrl) {
        window.history.pushState({}, "", targetUrl);
      }
    } else if (view === "admin") {
      setCurrentView("admin");
      if (window.location.pathname !== "/admin") {
        window.history.pushState({}, "", "/admin");
      }
    } else if (view === "privacy") {
      setCurrentView("privacy");
      if (window.location.pathname !== "/privacy") {
        window.history.pushState({}, "", "/privacy");
      }
    } else {
      setCurrentView("home");
      setSelectedAppId(null);
      if (window.location.pathname !== "/") {
        window.history.pushState({}, "", "/");
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fetch settings from Firestore settings/global (with Realtime fallback & Sync)
  const fetchGlobalSettings = async () => {
    if (isPlaceholderFirebase) {
      // Strictly disable ads when disconnected from Firebase
      setGlobalSettings(prev => ({
        ...prev,
        enableAds: false
      }));
      return;
    }
    try {
      const settingsDoc = await getDoc(doc(db, "settings", "global"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const promoLink = data.promoTargetUrl || data.aiImagePortalUrl || "";
        const promoImg = data.promoImageUrl || "";
        const promoActive = data.isPromoEnabled !== undefined ? data.isPromoEnabled : (data.showAiImagePortal === true && Boolean(promoLink));
        
        const newSettings = {
          enableAds: data.enableAds === true, // Respect developer choice from Firestore when connected
          adsHeaderCode: data.adsHeaderCode || "",
          adsMiddleCode: data.adsMiddleCode || "",
          adsBottomCode: data.adsBottomCode || "",
          adsRewardedCode: data.adsRewardedCode || "",
          adsInterstitialCode: data.adsInterstitialCode || "",
          adsTxtContent: data.adsTxtContent || "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0",
          whatsappUrl: data.whatsappUrl || "",
          facebookUrl: data.facebookUrl || "",
          tiktokUrl: data.tiktokUrl || "",
          youtubeUrl: data.youtubeUrl || "",
          instagramUrl: data.instagramUrl || "",
          snapchatUrl: data.snapchatUrl || "",
          telegramUrl: data.telegramUrl || "",
          xUrl: data.xUrl || "",
          complaintsUrl: data.complaintsUrl || "",
          customPrivacyUrl: data.customPrivacyUrl || "",
          oneSignalAppId: data.oneSignalAppId || "",
          oneSignalRestKey: data.oneSignalRestKey || "",
          openaiApiKey: data.openaiApiKey || "",
          geminiApiKey: data.geminiApiKey || "",
          promoImageUrl: promoImg,
          promoTargetUrl: promoLink,
          isPromoEnabled: promoActive,
          aiImagePortalUrl: promoLink,
          showAiImagePortal: promoActive
        };
        setGlobalSettings(newSettings);
        syncToRealtimeDatabase("realtime_sync/global_settings", newSettings);
      }
    } catch (e) {
      console.warn("Notice: Firestore settings fallback to local defaults.", e);
    }
  };

  // Fetch App Reviews from lightweight approved-apps.json and paginated Firestore (Quota Protection)
  // Fetch App Reviews from static cache files (approved-apps.json, apps_cache.json, R2, localStorage) and Firestore
  const fetchAppReviews = async () => {
    setLoadingApps(true);

    let deletedIds: string[] = [];
    try {
      const storedDeleted = localStorage.getItem("rooh_deleted_apps");
      if (storedDeleted) deletedIds = JSON.parse(storedDeleted);
    } catch (e) {}

    const appsMap = new Map<string, AppReview>();

    const parseItemDate = (item: any): Date => {
      if (!item) return new Date(0);
      if (item.createdAt?.toDate && typeof item.createdAt.toDate === "function") return item.createdAt.toDate();
      if (item.updatedAt?.toDate && typeof item.updatedAt.toDate === "function") return item.updatedAt.toDate();
      if (item.updatedAt) {
        const d = new Date(item.updatedAt);
        if (!isNaN(d.getTime())) return d;
      }
      if (item.createdAt) {
        const d = new Date(item.createdAt);
        if (!isNaN(d.getTime())) return d;
      }
      if (item.lastmod) {
        const d = new Date(item.lastmod);
        if (!isNaN(d.getTime())) return d;
      }
      return new Date(0);
    };

    // 0. Load from local browser cache first (Immediate offline display)
    try {
      const localCached = localStorage.getItem("rooh_published_apps_local_cache");
      if (localCached) {
        const parsed = JSON.parse(localCached);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const rawSlug = item.cleanSlug || item.slug || item.id || "";
            const cleanSlug = String(rawSlug).toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
            if (cleanSlug && !deletedIds.includes(item.id) && !deletedIds.includes(cleanSlug)) {
              appsMap.set(item.id || cleanSlug, {
                ...item,
                id: item.id || cleanSlug,
                packageId: item.packageId || cleanSlug,
                appCode: item.appCode || item.id || cleanSlug,
                slug: cleanSlug,
                name: item.name || cleanSlug,
                iconUrl: item.iconUrl || "",
                rating: item.rating || 4.8,
                description: item.description || "",
                playStoreUrl: item.playStoreUrl || "",
                appStoreUrl: item.appStoreUrl || "",
                tags: item.tags || [],
                category: item.category || "تطبيقات",
                createdAt: parseItemDate(item),
                isApproved: true,
                status: "published"
              });
            }
          });
        }
      }
    } catch (e) {}

    // 1. Fetch lightweight approved-apps.json & apps_cache.json static files
    const staticEndpoints = [
      "/approved-apps.json",
      "/apps_cache.json",
      "/data/apps_cache.json",
      "https://roohpro.com/approved-apps.json"
    ];

    for (const url of staticEndpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              const rawSlug = item.cleanSlug || item.slug || item.id || "";
              const cleanSlug = String(rawSlug).toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
              if (cleanSlug && !deletedIds.includes(item.id) && !deletedIds.includes(cleanSlug)) {
                const existing = appsMap.get(item.id || cleanSlug);
                appsMap.set(item.id || cleanSlug, {
                  ...(existing || {}),
                  ...item,
                  id: item.id || cleanSlug,
                  packageId: item.packageId || cleanSlug,
                  appCode: item.appCode || item.id || cleanSlug,
                  slug: cleanSlug,
                  name: item.name || cleanSlug,
                  iconUrl: item.iconUrl || existing?.iconUrl || "",
                  rating: item.rating || existing?.rating || 4.8,
                  description: item.description || existing?.description || "",
                  playStoreUrl: item.playStoreUrl || existing?.playStoreUrl || "",
                  appStoreUrl: item.appStoreUrl || existing?.appStoreUrl || "",
                  tags: item.tags || existing?.tags || [],
                  category: item.category || existing?.category || "تطبيقات",
                  createdAt: parseItemDate(item) || parseItemDate(existing),
                  isApproved: true,
                  status: "published"
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn(`Notice loading static app list from ${url}:`, e);
      }
    }

    // 2. Paginated fetch from Firestore (ONLY in Admin View or if static endpoints returned empty)
    const shouldFetchFirestore = (currentView === "admin") || (appsMap.size === 0);
    if (shouldFetchFirestore && !isPlaceholderFirebase && db) {
      try {
        const qApps = query(collection(db, "apps"), orderBy("createdAt", "desc"), limit(200));
        const querySnapshot = await getDocs(qApps);
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const cleanSlug = data.slug || getAppSlug({ id: docSnap.id, name: data.name, packageId: data.packageId, appCode: data.appCode });
          if (!deletedIds.includes(docSnap.id) && !deletedIds.includes(cleanSlug)) {
            const existingMapItem = appsMap.get(docSnap.id);
            const isApprovedVal = (
              data.isApproved === true ||
              data.isApproved === "true" ||
              data.status === "published" ||
              data.status === "approved" ||
              (existingMapItem && (existingMapItem.isApproved === true || existingMapItem.status === "published"))
            );
            const statusVal = isApprovedVal ? "published" : (data.status || "pending");

            appsMap.set(docSnap.id, {
              ...(existingMapItem || {}),
              id: docSnap.id,
              packageId: data.packageId || (docSnap.id.includes('.') ? docSnap.id : ''),
              appCode: data.appCode || docSnap.id,
              slug: cleanSlug,
              name: data.name || existingMapItem?.name || "",
              iconUrl: data.iconUrl || existingMapItem?.iconUrl || "",
              rating: data.rating || existingMapItem?.rating || 4.5,
              description: data.description || existingMapItem?.description || "",
              chart_data: data.chart_data || data.chartData || existingMapItem?.chart_data,
              playStoreUrl: data.playStoreUrl || existingMapItem?.playStoreUrl || "",
              appStoreUrl: data.appStoreUrl || existingMapItem?.appStoreUrl || "",
              videoUrl: data.videoUrl || existingMapItem?.videoUrl || "",
              tags: data.tags || existingMapItem?.tags || [],
              category: data.category || existingMapItem?.category || "أخرى",
              createdAt: data.createdAt ? parseItemDate({ createdAt: data.createdAt }) : (existingMapItem?.createdAt || new Date()),
              isApproved: isApprovedVal,
              status: statusVal,
              isUserSearched: data.isUserSearched !== undefined ? data.isUserSearched : false
            });
          }
        });
      } catch (e) {
        console.warn("Notice: Firestore apps query notice (using local static backup):", e);
      }
    }

    // 3. Include static seed apps (excluding deleted or already fetched ones)
    popularAppsSeed.forEach((item, idx) => {
      const seedShortCode = (10001 + idx).toString();
      const seedSlug = item.slug || getAppSlug(item);
      if (!appsMap.has(item.id) && !deletedIds.includes(item.id) && !deletedIds.includes(seedSlug)) {
        appsMap.set(item.id, {
          ...item,
          packageId: item.id,
          appCode: item.appCode || seedShortCode,
          slug: seedSlug,
          createdAt: new Date(Date.now() - (idx + 100) * 24 * 60 * 60 * 1000)
        } as AppReview);
      }
    });

    const combinedApps = deduplicateAppsList(Array.from(appsMap.values()));

    // Strict Ordering: NEWEST ALWAYS FIRST (latest created or updated) -> Front Page
    combinedApps.sort((a, b) => {
      const dateA = parseItemDate(a).getTime();
      const dateB = parseItemDate(b).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return (b.id || "").localeCompare(a.id || "");
    });

    // Save published apps into localStorage for fail-safe client storage
    try {
      const publishedOnly = combinedApps.filter(a => a.isApproved !== false && a.status !== "pending");
      localStorage.setItem("rooh_published_apps_local_cache", JSON.stringify(publishedOnly));
    } catch (e) {}

    setAppsList(combinedApps);
    setLoadingApps(false);
  };

  // Cooperative Realtime Synchronization Engine (Protected from unconstrained collection streams)
  useEffect(() => {
    fetchGlobalSettings();
    fetchAppReviews();

    if (isPlaceholderFirebase || !db) return;

    // Realtime Listener for Global Settings only
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newSettings = {
          enableAds: data.enableAds !== undefined ? data.enableAds : true,
          adsHeaderCode: data.adsHeaderCode || "",
          adsMiddleCode: data.adsMiddleCode || "",
          adsBottomCode: data.adsBottomCode || "",
          adsRewardedCode: data.adsRewardedCode || "",
          adsInterstitialCode: data.adsInterstitialCode || "",
          adsTxtContent: data.adsTxtContent || "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0",
          whatsappUrl: data.whatsappUrl || "",
          facebookUrl: data.facebookUrl || "",
          tiktokUrl: data.tiktokUrl || "",
          youtubeUrl: data.youtubeUrl || "",
          instagramUrl: data.instagramUrl || "",
          snapchatUrl: data.snapchatUrl || "",
          telegramUrl: data.telegramUrl || "",
          xUrl: data.xUrl || "",
          complaintsUrl: data.complaintsUrl || "",
          oneSignalAppId: data.oneSignalAppId || "",
          oneSignalRestKey: data.oneSignalRestKey || "",
          openaiApiKey: data.openaiApiKey || "",
          geminiApiKey: data.geminiApiKey || "",
          aiImagePortalUrl: data.aiImagePortalUrl || "https://roohpro.vercel.app/",
          showAiImagePortal: data.showAiImagePortal !== undefined ? data.showAiImagePortal : true
        };
        setGlobalSettings(newSettings);
      }
    }, (err) => {
      console.warn("Notice: Realtime listener for global settings offline fallback.", err);
    });

    return () => {
      unsubSettings();
    };
  }, []);

  // Filter categories dynamically based on current apps list
  const categoriesList = Array.from(new Set(appsList.map(app => app.category))).filter(Boolean);

  const normalizeText = (text: string = ""): string => {
    return text
      .toLowerCase()
      .replace(/[\u064B-\u0652]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();
  };

  // Filter apps based on smart search, selected category & active tab (latest vs featured)
  const filteredApps = appsList.filter((app) => {
    // Only show approved apps on public grids/listings
    if (app.isApproved === false) return false;

    if (!searchQuery || !searchQuery.trim()) {
      const matchesCategory = selectedCategory ? app.category === selectedCategory : true;
      const matchesTab = activeAppTab === "featured"
        ? (app.rating >= 4.5 || app.tags.some(t => t.includes("مميز") || t.includes("شائع") || t.includes("موصى")))
        : true;
      return matchesCategory && matchesTab;
    }

    const queryNorm = normalizeText(searchQuery);
    const queryWords = queryNorm.split(/\s+/).filter(Boolean);

    const normName = normalizeText(app.name);
    const normCategory = normalizeText(app.category);
    const normTags = app.tags.map(t => normalizeText(t)).join(" ");
    const normDesc = normalizeText(app.description);
    const appCode = app.appCode || (Math.floor((app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 900) + 100)).toString();

    const combinedAppText = `${normName} ${normCategory} ${normTags} ${normDesc}`;

    const matchesSearch = queryWords.length === 0 ||
      combinedAppText.includes(queryNorm) ||
      queryWords.every(w => combinedAppText.includes(w)) ||
      appCode === queryNorm ||
      (app.appCode && normalizeText(app.appCode) === queryNorm);

    const matchesCategory = selectedCategory ? app.category === selectedCategory : true;

    // Filter by tab: Featured apps (rating >= 4.5 or tags containing مميز/شائع/موصى) vs Latest apps
    const matchesTab = activeAppTab === "featured"
      ? (app.rating >= 4.5 || app.tags.some(t => t.includes("مميز") || t.includes("شائع") || t.includes("موصى")))
      : true;

    return matchesSearch && matchesCategory && matchesTab;
  });

  // Calculate Paginated items - requested: Pagination supporting 1000s of apps
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPaginatedApps = filteredApps.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);

  // Reset page when search, category, or active tab filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, activeAppTab]);

  const isStandaloneAgent = typeof window !== "undefined" && (window.location.search.includes("standalone_agent=true") || window.location.hash.includes("agent-standalone"));

  if (isStandaloneAgent) {
    return (
      <div className="min-h-screen bg-[#070b13] text-white flex flex-col p-2 sm:p-4 justify-center items-center font-sans" dir="rtl">
        <div className="w-full max-w-5xl h-[95vh] flex flex-col">
          <DeveloperAgentChat
            isFloatingModal={false}
            getIdTokenHelper={() => {
              const savedPin = localStorage.getItem("dev_pin") || "";
              const savedEmail = localStorage.getItem("dev_email") || "";
              return `dev-pin:${savedEmail}:${savedPin}`;
            }}
            onToggleDarkMode={toggleDarkMode}
            onToggleLanguage={handleToggleLanguage}
            onRefreshApps={fetchAppReviews}
            onRefreshSettings={fetchGlobalSettings}
            initialContext={{
              totalApps: appsList.length,
              activeTab: "standalone",
              tabTitle: "وكيل المطور المستقل (Standalone Window)"
            }}
          />
        </div>
      </div>
    );
  }

  // Dynamic theme-based container classes (Dark Mode vs White Mode with vibrant colorful accents)
  const getThemeContainerClass = () => {
    return isDarkMode 
      ? "bg-[#070b13] text-zinc-100" 
      : "bg-[#f8fafc] text-slate-900";
  };

  return (
    <div className={`min-h-screen ${getThemeContainerClass()} flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-300`}>
      
      {/* Dynamic Header Component with Single Direct Theme Switcher */}
      <Header
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onNavigate={handleNavigate}
        currentView={currentView}
        onLogoClick={handleLogoClick}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        currentLang={currentLang}
        onToggleLanguage={handleToggleLanguage}
        onSubscribeClick={() => setShowPromoPopup(true)}
        appsList={appsList}
        onTriggerSearchAndScrape={handleStartSearchFlow}
      />

      {/* Categories Off-Canvas Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        categories={categoriesList}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onNavigate={handleNavigate}
        globalSettings={globalSettings}
        onAboutClick={() => {
          setIsSidebarOpen(false);
          setShowAboutModal(true);
        }}
        onRequestAppClick={() => {
          setIsSidebarOpen(false);
          setShowRequestModal(true);
        }}
        onComplaintsClick={() => {
          setIsSidebarOpen(false);
          if (globalSettings.complaintsUrl) {
            window.open(globalSettings.complaintsUrl, "_blank");
          } else {
            alert("رابط تقديم الشكاوى والشكاوى غير مهيأ حالياً من قبل الإدارة.");
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col">
        
        {/* VIEW 1: HOME PAGE GRID */}
        {currentView === "home" && (
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 flex-1 flex flex-col justify-between">
            
            {/* Main Advertisement Slot placed above the Top Subscription/Follow Notification Bar */}
            {globalSettings.enableAds && (
              <div className="mb-8 w-full flex justify-center items-center">
                <div className="w-full bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-sm overflow-hidden">
                  <AdSenseSlot 
                    code={globalSettings.adsHeaderCode || globalSettings.adsBottomCode || globalSettings.adsMiddleCode} 
                    slotName="إعلان أعلى الصفحة الرئيسي (Top Main Ad)" 
                    enableAds={true} 
                    isSquare={false}
                  />
                </div>
              </div>
            )}

            {/* Top Subscription/Follow Notification Bar */}
            {showTopNotification ? (
              <div className="mb-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-indigo-100/50">
                <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-10 -top-10 w-44 h-44 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
                
                {/* Close Button X */}
                <button
                  onClick={() => setShowTopNotification(false)}
                  className="absolute top-4 left-4 h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all font-black text-sm cursor-pointer select-none z-10"
                  title="إغلاق الإشعار"
                >
                  ×
                </button>

                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pl-6">
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1 bg-white/10 rounded-lg text-amber-300 animate-bounce">
                        <Sparkles className="w-5 h-5" />
                      </span>
                      <h3 className="text-lg font-black tracking-tight">تابع موقعنا وفّعل جرس الإشعارات لتلقي تنبيهات التحديثات أولاً بأول!</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-2xl">
                      اشترك الآن ليصلك إشعار فوري عند صدور أي تحديث أو مراجعة جديدة للتطبيقات والألعاب المفضلة لديك. يمكنك تفعيل جرس التنبيهات وإدخال بريدك لمتابعة الأخبار.
                    </p>
                  </div>

                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-md">
                    <input
                      type="email"
                      value={subscriberEmail}
                      onChange={(e) => setSubscriberEmail(e.target.value)}
                      className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm placeholder:text-indigo-200 text-white outline-none focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 transition-all font-semibold text-right"
                      placeholder="أدخل بريدك الإلكتروني (اختياري)..."
                    />
                    <button
                      type="submit"
                      disabled={isSubscribing}
                      className="px-6 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all text-xs font-black shadow-lg shadow-red-950/20 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubscribing ? "جاري..." : "اشتراك"}
                    </button>
                  </form>
                </div>

                {subscribeSuccess && (
                  <div className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 p-3.5 text-xs font-bold text-emerald-100 flex items-center gap-2 text-right">
                    <Check className="w-4 h-4 shrink-0 text-emerald-300" />
                    <span>{subscribeSuccess}</span>
                  </div>
                )}

                {subscribeError && (
                  <div className="mt-4 rounded-xl bg-rose-500/20 border border-rose-500/30 p-3.5 text-xs font-bold text-rose-100 flex items-center gap-2 text-right">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-300" />
                    <span>{subscribeError}</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Top Section: Developer Promotional Window & External Site Link + Inline Ad slot */}
            {(() => {
              const promoTarget = (globalSettings.promoTargetUrl || globalSettings.aiImagePortalUrl || "").trim();
              const promoImg = (globalSettings.promoImageUrl || "").trim();
              const isPromoActive = Boolean(globalSettings.isPromoEnabled && promoTarget);
              const isAdsActive = Boolean(globalSettings.enableAds && !isPlaceholderFirebase);

              if (!isPromoActive && !isAdsActive) {
                return null;
              }

              // Component for the promotional banner / window
              const renderPromoBanner = (isSquare = false) => (
                <div 
                  onClick={() => {
                    if (promoTarget) {
                      window.open(promoTarget, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className={`relative cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 select-none overflow-hidden group border-2 border-red-500 rounded-3xl shadow-[0_0_15px_rgba(239,68,68,0.35)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] w-full h-full min-h-[220px] ${
                    promoImg 
                      ? "bg-zinc-950 flex flex-col justify-end" 
                      : `p-5 sm:p-6 bg-gradient-to-r from-red-500/10 via-amber-500/5 to-red-500/10 dark:from-red-950/20 dark:via-zinc-950 dark:to-red-950/20 flex flex-col items-center justify-between text-center gap-4 ${isSquare ? 'md:aspect-square' : ''}`
                  }`}
                  style={{ direction: "rtl" }}
                >
                  {promoImg ? (
                    <>
                      <img 
                        src={promoImg} 
                        alt="إعلان ترويجي مميز"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
                      <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between gap-3 text-right w-full">
                        <div className="flex items-center gap-2 text-white">
                          <div className="h-9 w-9 rounded-xl bg-red-600/90 text-white flex items-center justify-center shadow-md shrink-0">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">زيارة الموقع المخصص</p>
                            <p className="text-[11px] text-zinc-300 line-clamp-1 opacity-90">{promoTarget.replace(/^https?:\/\//i, '')}</p>
                          </div>
                        </div>
                        <span className="shrink-0 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-md transition-colors flex items-center gap-1">
                          <span>فتح الآن</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      
                      <div className="flex flex-col items-center gap-3 my-auto">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 text-white flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.5)] group-hover:animate-bounce shrink-0">
                          <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-black dark:text-white flex items-center justify-center gap-1.5 flex-wrap">
                            <span>الرابط والخدمة الترويجية المخصصة</span>
                            <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-300 dark:border-red-900 animate-pulse">مفعل</span>
                          </h3>
                          <p className="text-xs sm:text-sm text-black dark:text-zinc-300 mt-2 max-w-sm line-clamp-3 font-black">
                            انتقل مباشرة إلى الرابط المخصص والخدمات الإضافية المختارة من قِبل إدارة المنصة بنقرة واحدة!
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 w-full mt-2">
                        <span className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 text-white font-extrabold text-xs sm:text-sm rounded-xl border border-red-500 group-hover:bg-red-500 transition-all duration-300 shadow-[0_0_12px_rgba(220,38,38,0.4)]">
                          <span>دخول الرابط الآن</span>
                          <ChevronLeft className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-1" />
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );

              return (
                <div className="mb-8 w-full max-w-full">
                  {isPromoActive && isAdsActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch w-full max-w-full">
                      {renderPromoBanner(true)}
                      <div className="w-full flex justify-center items-center">
                        <div className="w-full aspect-square bg-white dark:bg-zinc-950 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-zinc-850 p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative">
                          <AdSenseSlot 
                            code={globalSettings.adsHeaderCode || globalSettings.adsMiddleCode} 
                            slotName="إعلان مدمج (أعلى الصفحة)" 
                            enableAds={true} 
                            app={appsList[0]}
                            isSquare={true}
                          />
                        </div>
                      </div>
                    </div>
                  ) : isPromoActive ? (
                    renderPromoBanner(false)
                  ) : isAdsActive ? (
                    <div className="w-full bg-white dark:bg-zinc-950 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-zinc-850 p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative">
                      <AdSenseSlot 
                        code={globalSettings.adsHeaderCode || globalSettings.adsMiddleCode} 
                        slotName="إعلان مدمج (أعلى الصفحة)" 
                        enableAds={true} 
                        app={appsList[0]}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {/* Interactive Apps Ticker Strip (شريط عرض التطبيقات المتحرك بنفس تصميم وطريقة عرض شريط تطبيقات صفحة المراجعة) */}
            {appsList && appsList.length > 0 && (
              <InteractivePopularCarousel
                siblingApps={appsList}
                onNavigate={(view, id) => handleNavigate(view, id)}
                hideHeader={true}
                itemShape="rectangle"
                className="mb-8 mt-2"
              />
            )}

            {/* Header banner with active tab strip */}
            <div className="mb-8 flex flex-col gap-5 border-b border-slate-200 dark:border-zinc-850 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white flex items-center gap-2">
                    <LayoutGrid className="w-5.5 h-5.5 text-blue-600 dark:text-blue-400" />
                    <span className="font-black text-black dark:text-white">
                      {selectedCategory 
                        ? `قائمة تصنيف: ${selectedCategory}` 
                        : activeAppTab === "all"
                          ? "جميع التطبيقات المتاحة"
                          : activeAppTab === "featured"
                            ? "قسم التطبيقات المميزة والموصى بها"
                            : "أحدث التطبيقات التي تمت مراجعتها"}
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-300 mt-1 font-bold">
                    تصفح وحمل أحدث المراجعات والتطبيقات الحصرية الموثوقة بدقة متناهية.
                  </p>
                </div>

                {/* Filtering active badge */}
                {(selectedCategory || searchQuery) && (
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-800 shadow-2xs">
                      الفلترة النشطة:
                    </span>
                    {selectedCategory && (
                      <span className="px-3.5 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-black text-xs sm:text-sm rounded-xl border-2 border-red-400 dark:border-red-600 flex items-center gap-2 shadow-2xs">
                        <span>القسم: {selectedCategory}</span>
                        <button 
                          onClick={() => setSelectedCategory(null)} 
                          className="hover:text-red-950 dark:hover:text-red-200 font-black text-base cursor-pointer"
                          title="إلغاء فلترة القسم"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="px-3.5 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-black text-xs sm:text-sm rounded-xl border-2 border-red-400 dark:border-red-600 flex items-center gap-2 shadow-2xs">
                        <span>بحث: "{searchQuery}"</span>
                        <button 
                          onClick={() => setSearchQuery("")} 
                          className="hover:text-red-950 dark:hover:text-red-200 font-black text-base cursor-pointer"
                          title="مسح البحث"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Tabs strip below title */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-slate-100 dark:bg-zinc-900/90 rounded-2xl border border-slate-300 dark:border-zinc-800/80 w-fit max-w-full overflow-x-auto whitespace-nowrap">
                <button
                  onClick={() => { setActiveAppTab("all"); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                    activeAppTab === "all"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]"
                      : "text-black dark:text-zinc-300 hover:text-blue-700 dark:hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>الكل</span>
                </button>

                <button
                  onClick={() => { setActiveAppTab("latest"); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                    activeAppTab === "latest"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]"
                      : "text-black dark:text-zinc-300 hover:text-blue-700 dark:hover:text-white"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>حديثة</span>
                </button>

                <button
                  onClick={() => { setActiveAppTab("featured"); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                    activeAppTab === "featured"
                      ? "bg-amber-400 text-black shadow-md shadow-amber-400/30 scale-[1.02]"
                      : "text-black dark:text-zinc-300 hover:text-amber-600 dark:hover:text-white"
                  }`}
                >
                  <Award className="w-4 h-4 text-black" />
                  <span>مميزة</span>
                </button>
              </div>
            </div>

            {/* List Loader - Cheerful background with rotating red spinner */}
            {loadingApps ? (
              <div className="flex flex-col items-center justify-center py-20 flex-1 w-full">
                <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-rose-50 via-sky-50 to-amber-50 dark:bg-slate-900 border-2 border-red-200 dark:border-slate-800 flex flex-col items-center shadow-lg max-w-md w-full text-center">
                  <div className="w-14 h-14 rounded-full border-4 border-rose-200 border-t-red-600 border-r-rose-500 animate-spin shadow-[0_0_15px_rgba(220,38,38,0.25)] mb-4"></div>
                  <h4 className="text-base font-black text-slate-950 dark:text-white mb-1">
                    جاري تحميل مراجعات التطبيقات الذكية...
                  </h4>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    منصة روح | مراجعات حصرية وروابط مباشرة 100%
                  </p>
                </div>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 flex-1 w-full my-auto">
                {/* Main empty state */}
                <div className="text-center py-16 bg-white dark:bg-zinc-900/40 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-xs max-w-xl w-full flex flex-col items-center">
                  <ShieldAlert className="w-14 h-14 text-slate-300 dark:text-zinc-700 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">لم يتم العثور على نتائج للتطبيقات</h3>
                  <p className="text-xs sm:text-sm text-slate-400 dark:text-zinc-500 mt-1.5 px-6 leading-relaxed">
                    عذراً، لم نتمكن من العثور على أي تطبيق يطابق بحثك الحالي. جرب الكلمات المفتاحية العامة أو ابحث في تصنيفات القائمة الجانبية.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                    }}
                    className="mt-6 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    عرض جميع التطبيقات
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                {/* Apps Grid - Responsive layout for both Desktop (3-column square layout) and Mobile */}
                <div className="mb-10 w-full max-w-full overflow-hidden">
                  {/* 1. DESKTOP VIEW (hidden on mobile, visible on md+): 3-column square grid layout */}
                  <div className="hidden md:grid md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full items-stretch">
                    {globalSettings.enableAds ? (
                      /* When Ads are ON: Alternating rows with integrated ads */
                      (() => {
                        const elements: React.ReactNode[] = [];
                        let appIdx = 0;
                        let rowIdx = 0;

                        while (appIdx < currentPaginatedApps.length) {
                          const isAdRow = rowIdx % 2 === 0; // Row 0 (1st), Row 2 (3rd), etc. have ad in the middle

                          if (isAdRow) {
                            const app1 = currentPaginatedApps[appIdx];
                            const app2 = currentPaginatedApps[appIdx + 1];
                            appIdx += 2;

                            elements.push(
                              <React.Fragment key={`desktop-row-${rowIdx}`}>
                                {app1 && (
                                  <AppCard
                                    key={app1.id}
                                    app={app1}
                                    onViewDetails={(id) => handleNavigate("app", id)}
                                    isSquareDesktop={true}
                                  />
                                )}

                                {/* Integrated Square Ad in middle of Row 1, Row 3, etc. */}
                                <div 
                                  key={`desktop-ad-row-${rowIdx}`}
                                  className="aspect-square bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-850 p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative w-full h-full"
                                >
                                  <AdSenseSlot 
                                    code={rowIdx % 4 === 0 ? globalSettings.adsMiddleCode : globalSettings.adsBottomCode} 
                                    slotName={`إعلان مدمج صف (${rowIdx + 1})`} 
                                    enableAds={true} 
                                    app={appsList[0]}
                                    isSquare={true}
                                  />
                                </div>

                                {app2 && (
                                  <AppCard
                                    key={app2.id}
                                    app={app2}
                                    onViewDetails={(id) => handleNavigate("app", id)}
                                    isSquareDesktop={true}
                                  />
                                )}
                              </React.Fragment>
                            );
                          } else {
                            const app1 = currentPaginatedApps[appIdx];
                            const app2 = currentPaginatedApps[appIdx + 1];
                            const app3 = currentPaginatedApps[appIdx + 2];
                            appIdx += 3;

                            elements.push(
                              <React.Fragment key={`desktop-row-${rowIdx}`}>
                                {app1 && (
                                  <AppCard
                                    key={app1.id}
                                    app={app1}
                                    onViewDetails={(id) => handleNavigate("app", id)}
                                    isSquareDesktop={true}
                                  />
                                )}
                                {app2 && (
                                  <AppCard
                                    key={app2.id}
                                    app={app2}
                                    onViewDetails={(id) => handleNavigate("app", id)}
                                    isSquareDesktop={true}
                                  />
                                )}
                                {app3 && (
                                  <AppCard
                                    key={app3.id}
                                    app={app3}
                                    onViewDetails={(id) => handleNavigate("app", id)}
                                    isSquareDesktop={true}
                                  />
                                )}
                              </React.Fragment>
                            );
                          }
                          rowIdx++;
                        }

                        return elements;
                      })()
                    ) : (
                      /* When Ads are OFF on Desktop: Apps fill every slot in the exact same 3-column square layout! */
                      currentPaginatedApps.map((app) => (
                        <AppCard
                          key={app.id}
                          app={app}
                          onViewDetails={(id) => handleNavigate("app", id)}
                          isSquareDesktop={true}
                        />
                      ))
                    )}
                  </div>

                  {/* 2. MOBILE VIEW (visible on mobile, hidden on md+) */}
                  <div className="md:hidden space-y-6 w-full max-w-full">
                    {globalSettings.enableAds ? (
                      /* When Ads are ON on Mobile: 4 apps in a 2x2 grid followed by 1 full-width square ad */
                      (() => {
                        const chunks: AppReview[][] = [];
                        for (let i = 0; i < currentPaginatedApps.length; i += 4) {
                          chunks.push(currentPaginatedApps.slice(i, i + 4));
                        }
                        return chunks.map((chunk, chunkIdx) => (
                          <div key={`mobile-chunk-${chunkIdx}`} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              {chunk.map((app) => (
                                <AppCard
                                  key={app.id}
                                  app={app}
                                  onViewDetails={(id) => handleNavigate("app", id)}
                                  isSquareDesktop={false}
                                />
                              ))}
                            </div>

                            {/* Integrated Square Ad below every 4 apps, matching full container width from far right to far left */}
                            <div className="w-full flex justify-center items-center py-1">
                              <div className="w-full aspect-square bg-white dark:bg-zinc-950 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-zinc-850 p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative">
                                <AdSenseSlot 
                                  code={chunkIdx % 2 === 0 ? globalSettings.adsMiddleCode : globalSettings.adsBottomCode} 
                                  slotName={`إعلان هاتف مربع (${chunkIdx + 1})`} 
                                  enableAds={true} 
                                  app={appsList[0]}
                                  isSquare={true}
                                />
                              </div>
                            </div>
                          </div>
                        ));
                      })()
                    ) : (
                      /* When Ads are OFF on Mobile: Ad slots disappear completely, displaying a clean 2-column mobile app grid */
                      <div className="grid grid-cols-2 gap-3">
                        {currentPaginatedApps.map((app) => (
                          <AppCard
                            key={app.id}
                            app={app}
                            onViewDetails={(id) => handleNavigate("app", id)}
                            isSquareDesktop={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Hidden flatMap block to preserve variables */}
                <div className="hidden">
                  {currentPaginatedApps.flatMap((app, index) => {
                    const elements = [
                      <AppCard
                        key={app.id}
                        app={app}
                        onViewDetails={(id) => handleNavigate("app", id)}
                      />
                    ];
                    
                    if ((index + 1) % 4 === 0) {
                      elements.push(
                        <div 
                          key={`ad-in-feed-${index}`}
                          className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md hover:border-amber-100 transition-all duration-300"
                          style={{ direction: "rtl" }}
                        >
                          <div className="flex items-start gap-4">
                            {/* Ad Icon Placeholder */}
                            <div className="relative h-16 w-16 min-w-[64px] rounded-2xl bg-amber-50 border border-amber-100 overflow-hidden flex items-center justify-center text-amber-600 font-extrabold text-sm select-none">
                              AD
                            </div>

                            {/* Content details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-md">
                                  ممول
                                </span>
                                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded font-bold">
                                  إعلان مخصص
                                </span>
                              </div>

                              <h3 className="mt-2 text-base font-bold text-slate-900 line-clamp-1">
                                متجر تطبيقات الأندرويد الموثوق
                              </h3>

                              <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                تصفح مئات الألعاب والتطبيقات الحصرية الآمنة بروابط مباشرة وتنزيل سريع وآمن 100%.
                              </p>
                            </div>
                          </div>

                          {/* Ad Slot inside Card */}
                          <div className="mt-5 pt-3 border-t border-slate-50 flex flex-col gap-2">
                            <div className="w-full overflow-hidden text-center">
                              {globalSettings.enableAds && globalSettings.adsMiddleCode ? (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: globalSettings.adsMiddleCode }} 
                                  className="text-xs text-slate-400 font-mono select-none"
                                />
                              ) : (
                                <span className="text-xs text-slate-400 font-bold">إعلان ممول</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return elements;
                  })}
                </div>

                {/* PAGINATION SYSTEM - pages navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 sm:gap-3 pt-6 border-t border-slate-100 dark:border-zinc-800/80">
                    <button
                      onClick={() => {
                        setCurrentPage(prev => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      disabled={currentPage === 1}
                      className="px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-xs sm:text-sm text-black dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    {/* Numeric Pages indicators */}
                    <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-none py-1">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentPage(i + 1);
                            window.scrollTo({ top: 300, behavior: "smooth" });
                          }}
                          className={`h-9 w-9 min-w-[36px] rounded-xl font-black text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer ${
                            currentPage === i + 1
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                              : "border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setCurrentPage(prev => Math.min(prev + 1, totalPages));
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      disabled={currentPage === totalPages}
                      className="px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-bold text-xs sm:text-sm text-black dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>التالي</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            
          </div>
        )}

        {/* VIEW 2: DYNAMIC DETAILED REVIEW PAGE */}
        {currentView === "app" && selectedAppId && (
          (() => {
            const cleanKey = selectedAppId.trim().toLowerCase();
            const currentApp = appsList.find(
              (a) =>
                a.id === selectedAppId ||
                isMatchApp(a, selectedAppId) ||
                isMatchApp(a, cleanKey)
            );

            if (!currentApp) {
              return (
                <AppLoaderComponent 
                  selectedKey={selectedAppId}
                  onFetchSingle={fetchSingleAppFromFirestore}
                  onLiveSearch={(q) => handleLiveSearchAndScrape(q)}
                  onNavigateHome={() => handleNavigate("home")}
                />
              );
            }

            return (
              <ReviewView
                app={currentApp}
                globalSettings={globalSettings}
                onNavigate={handleNavigate}
                siblingApps={appsList}
                onOpenAppRequestModal={() => setShowRequestModal(true)}
              />
            );
          })()
        )}

        {/* VIEW 3: ADMIN DASHBOARD */}
        {currentView === "admin" && (
          <AdminPanel
            globalSettings={globalSettings}
            onRefreshSettings={fetchGlobalSettings}
            allApps={appsList}
            onRefreshApps={fetchAppReviews}
            onNavigate={handleNavigate}
            isAgentPinned={isAgentPinned}
            onToggleAgentPin={handleToggleAgentPin}
            onToggleDarkMode={toggleDarkMode}
            onToggleLanguage={handleToggleLanguage}
          />
        )}

        {/* VIEW 4: PRIVACY POLICY PAGE */}
        {currentView === "privacy" && <PrivacyPolicy customPrivacyUrl={globalSettings.customPrivacyUrl} />}

      </main>

      {/* Bottom Main Advertisement Slot */}
      {globalSettings.enableAds && currentView !== "admin" && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8 mb-2 w-full flex justify-center items-center">
          <div className="w-full bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-sm overflow-hidden">
            <AdSenseSlot 
              code={globalSettings.adsBottomCode || globalSettings.adsMiddleCode || globalSettings.adsHeaderCode} 
              slotName="إعلان أسفل الصفحة الرئيسي (Bottom Ad)" 
              enableAds={true} 
              isSquare={false}
            />
          </div>
        </div>
      )}

      {/* Dynamic Live Platform Statistics Window (Live Visitors, Subscribers, Active Users) - Frontend Only */}
      {currentView !== "admin" && (
        <LiveStatsWidget 
          subscriberCount={subscribersCount} 
          onSubscribe={(email) => handleSubscribe(undefined, email)}
          isSubscribing={isSubscribing}
          enableAds={globalSettings.enableAds}
          adCode={globalSettings.adsBottomCode || globalSettings.adsMiddleCode || globalSettings.adsHeaderCode}
        />
      )}

      {/* Footer - Frontend Only */}
      {currentView !== "admin" && (
        <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 mt-12 pt-8 pb-44 md:pb-44 transition-colors">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col items-center gap-6">
            
            {/* Distinct Framed Cards Row: Privacy Policy (Blue), About Us (Yellow), Report Button (Red) */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl">
              {/* Privacy Policy Card - Blue Background with Yellow/White Bold Text */}
              <button
                onClick={() => handleNavigate("privacy")}
                className="group flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-blue-700 bg-blue-600 hover:bg-blue-700 active:scale-95 text-yellow-300 font-black text-sm sm:text-base transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-yellow-300 group-hover:scale-110 transition-transform stroke-[2.5]" />
                <span className="text-yellow-300 font-black">سياسة الخصوصية</span>
              </button>

              {/* About Us Card - Yellow Background with Black Bold Text */}
              <button
                onClick={() => setShowAboutModal(true)}
                className="group flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-amber-500 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-sm sm:text-base transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <Info className="w-5 h-5 text-black group-hover:scale-110 transition-transform stroke-[2.5]" />
                <span className="text-black font-black">من نحن</span>
              </button>

              {/* Report Button Card - Red Background with White Bold Text */}
              <button
                onClick={() => {
                  if (globalSettings.complaintsUrl) {
                    window.open(globalSettings.complaintsUrl, "_blank");
                  } else {
                    setShowRequestModal(true);
                  }
                }}
                className="group flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-red-700 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm sm:text-base transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <Flag className="w-5 h-5 text-white group-hover:scale-110 transition-transform stroke-[2.5]" />
                <span className="text-white font-black">الإبلاغ عن مشكلة</span>
              </button>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800/80" />

            {/* Copyright and Brand */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 select-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
                  <Award className="w-5 h-5" />
                </div>
                <button onClick={() => handleNavigate("home")} className="font-black text-black dark:text-slate-300 text-sm hover:text-blue-600 transition-colors cursor-pointer">
                  اكتشف تطبيقك
                </button>
              </div>

              {/* Navigation links */}
              <div className="flex items-center gap-4 text-xs sm:text-sm font-black text-black dark:text-slate-400">
                <button onClick={() => handleNavigate("home")} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">الرئيسية</button>
              </div>

              <div className="text-center md:text-left text-xs text-black dark:text-slate-500 font-bold">
                <span>© {new Date().getFullYear()} جميع الحقوق محفوظة.</span>
                <span className="block md:inline md:mr-2">بوابة تحميل آمنة ومطابقة لمعايير السيو وأدسنس.</span>
              </div>
            </div>

          </div>
        </footer>
      )}

      {/* Sticky Bottom Anchor Ad */}
      {(() => {
        if (!globalSettings.enableAds || !showStickyAd || isCookieConsentVisible || currentView === "admin") return null;
        
        return (
          <div className="fixed bottom-0 left-0 right-0 w-full z-50 h-[150px] min-h-[150px] max-h-[150px] bg-slate-950/98 backdrop-blur-md border-t-2 border-amber-500/50 shadow-2xl flex items-center justify-center p-0 m-0 overflow-hidden select-none">
            <button
              onClick={() => setShowStickyAd(false)}
              className="absolute top-2.5 left-3 z-30 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold shadow-md cursor-pointer border border-slate-600 transition-all active:scale-90"
              title="إغلاق الإعلان"
            >
              ×
            </button>
            <AdSenseSlot 
              code={globalSettings.adsBottomCode} 
              slotName="الإعلان اللاصق السفلي (Sticky Bottom)" 
              enableAds={globalSettings.enableAds} 
              isBottomBanner={true}
            />
          </div>
        );
      })()}

      {/* 15-second Subscription Promo & Integrated Native Ad Modal */}
      {showPromoPopup && currentView !== "admin" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 overflow-y-auto animate-in fade-in duration-300" style={{ direction: "rtl" }}>
          <div className="max-w-xs sm:max-w-sm w-full my-auto space-y-2.5 animate-in fade-in zoom-in-95 duration-300">
            {/* Top Compact Square Window: User Login / Google Auth Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xl relative w-full">
              {/* Close Button "X" */}
              <button
                onClick={() => {
                  setShowPromoPopup(false);
                  sessionStorage.setItem("promo_popup_closed", "true");
                }}
                className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all font-bold text-base cursor-pointer z-10"
                title="إغلاق"
              >
                ×
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center font-black text-lg mb-1.5 border border-red-100 dark:border-red-900/50">
                  🔔
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white">تسجيل الدخول والاشتراك</h3>
                <p className="text-[11px] text-slate-800 dark:text-slate-300 font-bold mt-0.5">
                  اختر حسابك للتسجيل المباشر وتفعيل التنبيهات
                </p>

                {/* Google Email Account Chooser Button */}
                <div className="w-full mt-2.5">
                  <button
                    type="button"
                    disabled={isGoogleAuthSubmitting || isSubscribing}
                    onClick={handleUserGoogleAuth}
                    className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-950 dark:text-white border-2 border-slate-300 dark:border-slate-700 hover:border-red-500 font-black py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 relative group"
                  >
                    {isGoogleAuthSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-red-600 shrink-0" />
                        <span className="text-xs font-black text-slate-950">جاري فتح الحسابات...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span className="text-xs font-black text-slate-950 dark:text-white group-hover:text-red-600 transition-colors">
                          دخول بـ Google تلقائي ⚡
                        </span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative my-2 w-full">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-700 dark:text-slate-400">أو يدوياً</span>
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await handleSubscribe(e);
                  setTimeout(() => {
                    setShowPromoPopup(false);
                    sessionStorage.setItem("promo_popup_closed", "true");
                  }, 4000);
                }} className="w-full space-y-2">
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني (اختياري)"
                    value={subscriberEmail}
                    onChange={(e) => setSubscriberEmail(e.target.value)}
                    className="w-full text-center font-black text-xs rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 px-3 outline-none focus:border-red-500 text-slate-950 dark:text-white transition-all placeholder:text-slate-600"
                  />

                  <button
                    type="submit"
                    disabled={isSubscribing}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2.5 px-3 rounded-lg text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubscribing ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>جاري...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>تأكيد الاشتراك</span>
                      </>
                    )}
                  </button>
                </form>

                {subscribeSuccess && (
                  <div className="w-full mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-right">
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    <span>{subscribeSuccess}</span>
                  </div>
                )}

                {subscribeError && (
                  <div className="w-full mt-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-right">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{subscribeError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Compact Square Window: Integrated Native Ad Box */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-2.5 shadow-xl w-full flex flex-col items-center justify-center overflow-hidden max-h-[220px]">
              <AdSenseSlot 
                code={globalSettings.adsMiddleCode || globalSettings.adsHeaderCode} 
                slotName="إعلان مدمج أسفل نافذة تسجيل الدخول (Square Ad)" 
                enableAds={globalSettings.enableAds} 
                isSquare={true} 
              />
            </div>
          </div>
        </div>
      )}

      {/* App Request / Report Modal - Red Theme with High-Contrast White Text */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-300" style={{ direction: "rtl" }}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-red-500 dark:border-red-600 p-6 sm:p-8 shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in-95 duration-300">
            {/* Close Button "X" */}
            <button
              onClick={() => {
                setShowRequestModal(false);
                setRequestSuccess("");
                setRequestError("");
              }}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-all font-black text-lg cursor-pointer"
              title="إغلاق"
            >
              ×
            </button>

            <div className="flex flex-col mt-2">
              {/* Vibrant Red Header Banner */}
              <div className="w-full bg-red-600 text-white rounded-2xl p-4 shadow-md flex items-center gap-3 mb-4 border-2 border-red-700">
                <div className="h-11 w-11 rounded-xl bg-white/20 text-white flex items-center justify-center font-black text-xl shrink-0">
                  🚩
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">طلب مراجعة تطبيق أو إبلاغ</h3>
                  <p className="text-[11px] text-red-100 font-bold mt-0.5">
                    اكتب تفاصيل طلبك وسنقوم بفحصه وتوفيره فوراً
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendAppRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-950 dark:text-slate-100 mb-1.5">اسم التطبيق أو اللعبة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: واتساب، كاندي كراش..."
                    value={requestedAppName}
                    onChange={(e) => setRequestedAppName(e.target.value)}
                    className="w-full text-right font-black text-xs sm:text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 px-4 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-slate-950 dark:text-white transition-all placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-950 dark:text-slate-100 mb-1.5">ملاحظات إضافية (اختياري)</label>
                  <textarea
                    placeholder="اكتب أي ميزات خاصة تريدها أو تفاصيل لتسهل علينا إيجاد التطبيق..."
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    rows={3}
                    className="w-full text-right font-bold text-xs sm:text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2.5 px-4 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-slate-950 dark:text-white transition-all resize-none placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-950 dark:text-slate-100 mb-1.5">نظام تشغيل هاتفك</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRequestOS("android")}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        requestOS === "android"
                          ? "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-600 text-emerald-950 dark:text-emerald-300 shadow-xs"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300"
                      }`}
                    >
                      أندرويد (Android)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestOS("ios")}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        requestOS === "ios"
                          ? "bg-blue-100 dark:bg-blue-950/40 border-blue-600 text-blue-950 dark:text-blue-300 shadow-xs"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300"
                      }`}
                    >
                      آيفون (iOS)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingRequest}
                  className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingRequest ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </>
                  ) : (
                    <span>إرسال الطلب للإدارة الآن 🚀</span>
                  )}
                </button>
              </form>

              {requestSuccess && (
                <div className="w-full mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-right">
                  <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{requestSuccess}</span>
                </div>
              )}

              {requestError && (
                <div className="w-full mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-2 text-right">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{requestError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* About Us (من نحن) Modal - Yellow Theme with High-Contrast Black Text */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-300" style={{ direction: "rtl" }}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-400 dark:border-amber-500 p-6 sm:p-8 shadow-2xl max-w-lg w-full relative animate-in fade-in zoom-in-95 duration-300">
            {/* Close Button "X" */}
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-all font-black text-lg cursor-pointer"
              title="إغلاق"
            >
              ×
            </button>

            <div className="flex flex-col mt-2">
              {/* Vibrant Yellow Header Banner with Bold Black Text */}
              <div className="w-full bg-yellow-400 text-black rounded-2xl p-4 shadow-md flex items-center gap-3 mb-4 border-2 border-amber-500">
                <div className="h-11 w-11 rounded-xl bg-black text-yellow-300 flex items-center justify-center font-black text-xl shrink-0">
                  ✨
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black">من نحن - منصة اكتشف تطبيقك</h3>
                  <p className="text-[11px] text-black font-black mt-0.5">
                    بوابتك الموثوقة والآمنة للبرامج والألعاب الرسمية
                  </p>
                </div>
              </div>
              
              <div className="mt-2 space-y-4 text-right text-slate-900 dark:text-slate-100 leading-relaxed text-xs sm:text-sm font-bold">
                <p>
                  مرحباً بكم في <strong className="text-blue-700 dark:text-blue-400 font-black">اكتشف تطبيقك</strong>، المنصة العربية الرائدة والمخصصة بالكامل لتقديم مراجعات تقنية دقيقة وتوفير روابط تحميل مباشرة وسريعة لأشهر التطبيقات والألعاب لهواتف الأندرويد والآيفون.
                </p>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 text-black dark:text-slate-100">
                  <h4 className="font-black text-black dark:text-amber-300 mb-2">💡 رؤيتنا وهويتنا البشرية:</h4>
                  <ul className="list-disc list-inside space-y-2 text-slate-950 dark:text-slate-200 text-xs sm:text-sm font-bold">
                    <li><strong className="text-blue-700 dark:text-blue-400">مراجعات صادقة وشاملة:</strong> كل تطبيق ترافقه مراجعة تحليلية لا تقل عن 1500 كلمة تبرز المطور، المميزات، وطرق الاستخدام والعيوب.</li>
                    <li><strong className="text-emerald-700 dark:text-emerald-400">أمان تام بنسبة 100%:</strong> فحص دوري للروابط لضمان خلوها من أي برمجيات ضارة وتوجيه مباشر للمصادر الرسمية.</li>
                    <li><strong className="text-rose-700 dark:text-rose-400">تكامل المنصات:</strong> روابط فورية متناظرة لمتجر Google Play ومتجر Apple App Store.</li>
                  </ul>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 text-center pt-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                  نحن فخورون بكوننا منصة متوافقة بالكامل مع أعلى معايير الجودة وتجربة المستخدم.
                </p>
              </div>

              <button
                onClick={() => setShowAboutModal(false)}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center cursor-pointer"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-fidelity cookie consent dialog */}
      <CookieConsent onVisibilityChange={setIsCookieConsentVisible} />

      {/* Candidate App Searching Overlay */}
      {isSearchingCandidates && (
        <div className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200" style={{ direction: "rtl" }}>
          <div className="bg-white dark:bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xl max-w-sm w-full text-center relative">
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-t-amber-500 border-r-transparent border-l-transparent border-b-transparent animate-spin" />
              <Search className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
            <h4 className="text-base font-black text-black dark:text-white">جاري البحث في متجر Google Play...</h4>
            <p className="text-xs text-black dark:text-zinc-300 mt-2 font-black leading-relaxed">
              جاري البحث عن أحدث التطبيقات المطابقة لـ "{searchedQueryText}" لعرض النتائج المناسبة لك...
            </p>
          </div>
        </div>
      )}

      {/* Candidate App Selection Modal */}
      {showCandidatesModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300" style={{ direction: "rtl" }}>
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border-2 border-amber-400 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl max-w-2xl w-full relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
            {/* Close Button "X" */}
            <button
              onClick={() => setShowCandidatesModal(false)}
              className="absolute top-4 left-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-black hover:text-red-600 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all font-black text-lg cursor-pointer"
              title="إغلاق"
            >
              ×
            </button>

            <div className="flex flex-col text-right">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shadow-amber-500/20 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black dark:text-white">
                    {isFeatureSearchQuery ? "التطبيقات المرشحة للميزة المطلوبة" : "اختر التطبيق المطلوب من النتائج المقترحة"}
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-black mt-0.5">
                    {isFeatureSearchQuery 
                      ? `عثر الذكاء الاصطناعي والمتجر على (${candidateApps.length}) تطبيقات متخصصة توفر ميزة: "${searchedQueryText}"`
                      : `عثرنا على (${candidateApps.length}) تطبيقات بأسماء متقاربة في متجر Google Play`
                    }
                  </p>
                </div>
              </div>

              <p className="text-xs text-black dark:text-zinc-300 my-3 leading-relaxed font-black">
                {isFeatureSearchQuery 
                  ? `قم باختيار التطبيق المناسب لميزتك لبدء إعداد الشرح والمراجعة الشاملة (1500+ كلمة) مع روابط التحميل المباشرة:`
                  : `عثرنا على التطبيقات التالية المتاحة في المتجر، يرجى اختيار التطبيق المطلوب لعرض تفاصيله وروابط التحميل:`
                }
              </p>

              {/* Candidates Grid / List */}
              <div className="space-y-3 my-2">
                {candidateApps.map((candidate, idx) => (
                  <div
                    key={`cand-${candidate.packageId}-${idx}`}
                    onClick={async () => {
                      setShowCandidatesModal(false);
                      const candPkg = candidate.packageId || "";
                      const candName = candidate.name || "";
                      const localApp = appsList.find(a => 
                        (candPkg && (a.id.toLowerCase() === candPkg.toLowerCase() || a.packageId?.toLowerCase() === candPkg.toLowerCase())) ||
                        (candName && a.name.toLowerCase() === candName.toLowerCase())
                      );
                      if (localApp) {
                        handleNavigate("app", localApp.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        let cleanPlayUrl = candidate.playStoreUrl || "";
                        if (!cleanPlayUrl || !cleanPlayUrl.includes("details?id=")) {
                          if (candPkg && candPkg.includes(".")) {
                            cleanPlayUrl = `https://play.google.com/store/apps/details?id=${candPkg}`;
                          }
                        }
                        await handleLiveSearchAndScrape(
                          candPkg || candName || cleanPlayUrl,
                          (candidate as any).appStoreUrl || "",
                          cleanPlayUrl || "",
                          candidate
                        );
                      }
                    }}
                    className="p-4 rounded-2xl border-2 border-slate-300 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500/80 bg-slate-50/70 dark:bg-zinc-900/60 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-all group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5 w-full sm:w-auto overflow-hidden">
                      {/* Icon */}
                      <div className="h-14 w-14 rounded-2xl border-2 border-slate-300 dark:border-zinc-800 overflow-hidden flex items-center justify-center bg-white dark:bg-zinc-950 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {candidate.iconUrl && candidate.iconUrl.trim() !== "" ? (
                          <img 
                            src={candidate.iconUrl} 
                            alt={candidate.name} 
                            className="h-full w-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <span className="text-lg font-black text-amber-500">{candidate.name.charAt(0)}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col text-right overflow-hidden">
                        <h4 className="text-sm font-black text-black dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {candidate.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] font-black text-black dark:text-zinc-400 mt-1">
                          <span className="truncate max-w-[150px]">{candidate.developer}</span>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 flex items-center">
                            <Star className="w-3 h-3 fill-amber-500 ml-0.5" />
                            {candidate.rating ? candidate.rating.toFixed(1) : "4.5"}
                          </span>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-zinc-800 text-[10px] text-black dark:text-white font-black">
                            {candidate.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Choose button */}
                    <button
                      type="button"
                      className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 group-hover:scale-105"
                    >
                      <span>{isFeatureSearchQuery ? "إعداد الشرح والمراجعة ⚡" : "اختيار التطبيق"}</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center text-[11px] text-black dark:text-zinc-400 font-black">
                <span>لم تجد التطبيق الذي تقصده؟</span>
                <button
                  onClick={() => {
                    setShowCandidatesModal(false);
                    setShowRequestModal(true);
                  }}
                  className="text-amber-700 dark:text-amber-400 font-black hover:underline"
                >
                  أرسل طلب مراجعة جديد للإدارة ✍️
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Real-time search scraper loading overlay */}
      {isScraping && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-start pt-8 sm:pt-14 p-4 sm:p-6 text-center animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-2xl max-w-md w-full relative overflow-hidden my-auto sm:my-0">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-amber-500 to-indigo-500 animate-pulse" />
            
            {/* Spinning/pulsing graphic */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 dark:border-amber-500/5 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-t-amber-500 border-r-transparent border-l-transparent border-b-transparent animate-spin" style={{ animationDuration: '1s' }} />
              <span className="text-2xl sm:text-3xl">🔍</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-black dark:text-white mb-2">جاري تجهيز الشرح والمراجعة الشاملة</h3>
            <p className="text-xs sm:text-sm font-black text-black dark:text-zinc-400 min-h-[38px] px-2 leading-relaxed">
              {scrapingStatus}
            </p>

            {/* Embedded Ad Container inside Base Frame with Close Button */}
            {globalSettings.enableAds && showEmbeddedAdInScrape && (
              <div className="my-4 p-3 bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-2xl relative">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-zinc-800/80">
                  <span className="text-[11px] font-black text-black dark:text-zinc-400 flex items-center gap-1">
                    <span>📢 إعلان مدمج ترويجي</span>
                  </span>
                  <button
                    onClick={() => setShowEmbeddedAdInScrape(false)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 transition-all flex items-center gap-1 cursor-pointer"
                    title="إغلاق الإعلان المدمج"
                  >
                    <span>إغلاق الإعلان</span>
                    <span className="text-xs">✕</span>
                  </button>
                </div>

                <AdSenseSlot 
                  code={globalSettings.adsMiddleCode || globalSettings.adsHeaderCode} 
                  slotName="إعلان مدمج (Embedded Ad)" 
                  enableAds={globalSettings.enableAds} 
                  isSquare={true}
                />
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-center gap-1.5 text-[10px] text-black dark:text-zinc-500 font-bold">
              <span>نظام المراجعات الذكي</span>
              <span>•</span>
              <span>روابط مباشرة وآمنة</span>
            </div>
          </div>
        </div>
      )}

      {/* Top-layer Rewarded Ad Modal during Search & Description Generation */}
      {isScraping && showSearchRewardedOverlay && globalSettings.enableAds && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/80 backdrop-blur-md flex items-start sm:items-center justify-center pt-8 sm:pt-12 p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center my-auto sm:my-0">
            
            {/* Top-left Close "✕" Button */}
            <button
              onClick={() => setShowSearchRewardedOverlay(false)}
              className="absolute top-4 left-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-black hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all font-bold text-base cursor-pointer z-10"
              title="إغلاق الإعلان والمتابعة"
            >
              ✕
            </button>

            {/* Header Ribbon / Badge */}
            <div className="flex items-center gap-2 mb-3 px-3.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-full border border-amber-500/20 text-xs font-black">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>إعلان مكافأة الشرح المباشر 🎁</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-black dark:text-white mb-1">
              جاري إعداد الوصف والشرح الكامل للتطبيق
            </h3>
            <p className="text-xs text-black dark:text-zinc-400 mb-3 leading-relaxed max-w-sm font-bold">
              شاهد الإعلان المدمج القصير أثناء تجهيز الشرح التلقائي.
            </p>

            {/* Rewarded Ad Content PLACED FIRST ABOVE TIMER */}
            <div className="w-full my-2 overflow-hidden flex justify-center items-center min-h-[180px] bg-slate-50 dark:bg-zinc-900/60 p-2 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
              <AdSenseSlot 
                code={globalSettings.adsRewardedCode || globalSettings.adsMiddleCode || globalSettings.adsHeaderCode} 
                slotName="إعلان مكافأة الشرح (Rewarded Ad)" 
                enableAds={globalSettings.enableAds} 
                isSquare={true}
              />
            </div>

            {/* Progress Bar / Countdown Timer Indicator PLACED BELOW AD */}
            <div className="w-full mt-2 bg-slate-100 dark:bg-zinc-900 rounded-full h-2.5 overflow-hidden relative border border-slate-200/50 dark:border-zinc-800">
              <div 
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${((5 - searchRewardedTimer) / 5) * 100}%` }}
              ></div>
            </div>
            <div className="text-[11px] font-black text-black dark:text-zinc-400 my-1.5 flex items-center justify-between w-full px-1">
              <span>العداد التنازلي لتجهيز الشرح</span>
              <span className="text-amber-600 font-mono font-black">{searchRewardedTimer} ثانية</span>
            </div>

            {/* Action / Dismiss Button */}
            <button
              onClick={() => setShowSearchRewardedOverlay(false)}
              className={`mt-2 w-full py-2.5 px-5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                searchRewardedTimer === 0
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/20 animate-pulse"
                  : "bg-slate-100 dark:bg-zinc-900 text-black dark:text-zinc-300 border border-slate-300 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800"
              }`}
            >
              {searchRewardedTimer > 0 ? (
                <>
                  <span>إغلاق الإعلان والمتابعة للشرح ({searchRewardedTimer}ث)</span>
                  <span className="text-xs">✕</span>
                </>
              ) : (
                <>
                  <span>المتابعة إلى الشرح والمراجعة الكاملة 🚀</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* PERSISTENT GLOBAL DEVELOPER AGENT (WHEN PINNED OR OPENED ON FRONTEND VIEWS) */}
      {(isAgentPinned || isGlobalAgentOpen) && currentView !== "admin" && (
        <DeveloperAgentChat
          isFloatingModal={true}
          getIdTokenHelper={() => {
            const savedPin = localStorage.getItem("dev_pin") || "";
            const savedEmail = localStorage.getItem("dev_email") || "";
            return `dev-pin:${savedEmail}:${savedPin}`;
          }}
          onClose={() => {
            if (isAgentPinned) {
              setIsGlobalAgentOpen(false);
            } else {
              setIsGlobalAgentOpen(false);
              setIsAgentPinned(false);
              try {
                localStorage.setItem("dev_agent_pinned", "false");
              } catch {}
            }
          }}
          onNavigate={handleNavigate}
          isPinned={isAgentPinned}
          onTogglePin={handleToggleAgentPin}
          onToggleDarkMode={toggleDarkMode}
          onToggleLanguage={handleToggleLanguage}
          onRefreshApps={fetchAppReviews}
          onRefreshSettings={fetchGlobalSettings}
          initialContext={{
            totalApps: appsList.length,
            activeTab: currentView,
            tabTitle: currentView === "home" ? "الصفحة الرئيسية للموقع" : currentView === "app" ? "صفحة مراجعة وشرح التطبيق" : "سياسة الخصوصية",
            currentView
          }}
        />
      )}

    </div>
  );
}
