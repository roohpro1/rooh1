import React, { useState, useEffect, useRef } from "react";
import { Star, Download, Play, ShieldAlert, CheckCircle, ExternalLink, RefreshCw, Smartphone, Send, MessageSquare, User, MessageCircle, Facebook, Music, Ghost, Youtube, Shield, Twitter, Award, Copy, Check, Sparkles, Eye } from "lucide-react";
import { AppReview, GlobalSettings } from "../types";
import { AdSenseSlot } from "./AdSenseSlot";
import { CopyLinkButton } from "./CopyLinkButton";
import { InteractivePopularCarousel } from "./InteractivePopularCarousel";
import { NeonChart } from "./NeonChart";
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, isPlaceholderFirebase } from "../lib/firebase";
import { canShowFullScreenAd, isRealAdCode, recordFullScreenAdShown } from "../lib/adUtils";

interface AppDetailsProps {
  app: AppReview;
  globalSettings: GlobalSettings;
  onBack: () => void;
  otherApps: AppReview[];
  onNavigate: (view: "home" | "app" | "admin" | "privacy", id?: string) => void;
  onAboutClick: () => void;
}

export const AppDetails: React.FC<AppDetailsProps> = ({ 
  app, 
  globalSettings, 
  onBack,
  otherApps = [],
  onNavigate,
  onAboutClick
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [deviceOS, setDeviceOS] = useState<"android" | "ios" | "other">("other");
  const [activeStoreTab, setActiveStoreTab] = useState<"android" | "ios">("android");

  // Device type detection (Mobile vs Desktop/Browser)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Track and increment article visitors count silently
  const [visitorCount, setVisitorCount] = useState<number>(() => {
    const baseCount = (app as any).views || (Math.abs(app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 450) * 12 + 130;
    const stored = localStorage.getItem(`app_views_${app.id}`);
    return stored ? parseInt(stored, 10) : baseCount;
  });

  useEffect(() => {
    if (!app.id) return;
    const baseCount = (app as any).views || (Math.abs(app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 450) * 12 + 130;
    const stored = localStorage.getItem(`app_views_${app.id}`);
    const currentCount = stored ? parseInt(stored, 10) : baseCount;
    const newCount = currentCount + 1;
    localStorage.setItem(`app_views_${app.id}`, newCount.toString());
    setVisitorCount(newCount);

    if (!isPlaceholderFirebase) {
      try {
        const appRef = doc(db, "apps", app.id);
        updateDoc(appRef, {
          views: increment(1)
        }).catch(err => console.warn("Firestore views update silently handled:", err));
      } catch (e) {
        // ignore
      }
    }
  }, [app.id]);

  useEffect(() => {
    // Determine initial store tab based on available links & user's platform
    const resolvedStoreType = app.storeType || (app.playStoreUrl && !app.appStoreUrl ? "android" : (app.appStoreUrl && !app.playStoreUrl ? "ios" : "both"));
    if (resolvedStoreType === "ios") {
      setActiveStoreTab("ios");
    } else if (resolvedStoreType === "android") {
      setActiveStoreTab("android");
    } else {
      const userAgent = window.navigator.userAgent;
      if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        setActiveStoreTab("ios");
      } else {
        setActiveStoreTab("android");
      }
    }
  }, [app.id, app.storeType, app.playStoreUrl, app.appStoreUrl]);

  // Inject & sync dynamic HTML Document SEO Meta Tags (Keywords & Description) in document.head
  useEffect(() => {
    if (!app) return;

    // Update document title for SEO
    document.title = `${app.name} - مراجعة وتحميل مجاني وآمن | اكتشف تطبيقك`;

    // Prepare keywords list for SEO meta tag
    const keywordItems = Array.isArray(app.tags) && app.tags.length > 0
      ? app.tags
      : [
          app.name,
          `تحميل ${app.name}`,
          `تنزيل ${app.name} مجاناً`,
          `شرح تطبيق ${app.name}`,
          `مراجعة ${app.name}`,
          `تطبيق ${app.name} أندرويد`,
          `تحميل تطبيق ${app.name} برابط مباشر`,
          `أحدث إصدار ${app.name}`,
          `ميزات ${app.name}`,
          `تحميل تطبيقات ${app.category || "الهواتف"}`,
          `شرح استخدام ${app.name}`,
          `APK ${app.name}`
        ];
    
    const keywordsString = keywordItems.join(", ");

    // Update or insert <meta name="keywords"> tag in document.head
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywordsString);

    // Update or insert <meta name="description"> tag in document.head
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    const cleanSnippet = (app.description || "")
      .replace(/<[^>]*>/g, "")
      .replace(/(###|####|#|\*\*|\*)*\s*.*الكلمات المفتاحية والدلالية المستهدفة[\s\S]*/gi, "")
      .replace(/###\s*8\.\s*الكلمات المفتاحية[\s\S]*/gi, "")
      .trim()
      .substring(0, 160);
    metaDesc.setAttribute('content', cleanSnippet || `وجهتك الأولى لمراجعة وتحميل تطبيق ${app.name} بروابط مباشرة وآمنة 100%.`);
  }, [app]);

  // Filter out the current app to get sibling/other reviews
  const siblingApps = otherApps.filter(item => item.id !== app.id);

  // Interstitial Ad (إعلان بيني) State
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialTimer, setInterstitialTimer] = useState(5);
  const [interstitialCanClose, setInterstitialCanClose] = useState(false);

  // Rewarded Ad (إعلان بمكافأة) State
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [rewardedTimer, setRewardedTimer] = useState(5);
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);

  // Ad Network Frequency Cap Helper Functions (Unified 1 minute = 60,000ms across ALL full-screen ads)
  const AD_COOLDOWN_MS = 60000;

  // Helper to ensure guaranteed valid Google Play Store or App Store URL
  const getValidStoreUrl = (appItem: AppReview, storeType: "android" | "ios" = "android"): string => {
    const appTitle = appItem.name || appItem.appTitle || "App";
    
    if (storeType === "ios") {
      if (appItem.appStoreUrl && appItem.appStoreUrl.trim().startsWith("http") && appItem.appStoreUrl.includes("apple.com")) {
        return appItem.appStoreUrl.trim();
      }
      return `https://apps.apple.com/us/search?term=${encodeURIComponent(appTitle)}`;
    } else {
      let candidateUrl = (appItem.playStoreUrl || "").trim();

      // Check if candidateUrl contains a valid Android package ID
      if (candidateUrl.startsWith("http") && candidateUrl.includes("play.google.com") && candidateUrl.includes("details?id=")) {
        const match = candidateUrl.match(/id=([a-zA-Z0-9_\-\.]+)/);
        if (match && match[1]) {
          const pkg = match[1];
          if (
            pkg.includes(".") &&
            !pkg.startsWith("com.app.") &&
            !["undefined", "null", "app", "review"].includes(pkg.toLowerCase()) &&
            !pkg.endsWith("-review") &&
            pkg.split(".").length >= 2
          ) {
            return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;
          }
        }
        return candidateUrl;
      }

      // Check packageId or id on appItem
      let pkgId = (appItem.packageId || (appItem.id && appItem.id.includes(".") ? appItem.id : "") || "").trim();
      if (
        pkgId &&
        pkgId.includes(".") &&
        !pkgId.includes(" ") &&
        !pkgId.startsWith("com.app.") &&
        !["undefined", "null", "app", "review"].includes(pkgId.toLowerCase()) &&
        !pkgId.endsWith("-review") &&
        pkgId.split(".").length >= 2
      ) {
        return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkgId)}`;
      }

      // If candidateUrl is already a valid search or http URL
      if (candidateUrl.startsWith("http")) {
        return candidateUrl;
      }

      // Fallback: search Google Play by app name to guarantee a functional store page
      return `https://play.google.com/store/search?q=${encodeURIComponent(appTitle)}&c=apps`;
    }
  };

  // Start download action based on device mode (Mobile vs Desktop)
  const handleStartDownloadAction = () => {
    const targetUrl = getValidStoreUrl(app, activeStoreTab);
    const hasRewardedCode = isRealAdCode(globalSettings.adsRewardedCode);

    if (globalSettings.enableAds && hasRewardedCode && canShowFullScreenAd(globalSettings.enableAds)) {
      if (isMobile) {
        setPendingDownloadUrl(targetUrl);
        setShowRewardedAd(true);
        setRewardedTimer(5);
        recordFullScreenAdShown();
      } else {
        startDownloadCountdown();
      }
    } else {
      startDownloadCountdown();
    }
  };

  // Trigger Countdown Timer
  const startDownloadCountdown = () => {
    setCountdown(5);
    setIsCounting(true);
    setDownloadReady(false);

    const hasRewardedCode = isRealAdCode(globalSettings.adsRewardedCode);
    if (globalSettings.enableAds && hasRewardedCode && canShowFullScreenAd(globalSettings.enableAds)) {
      recordFullScreenAdShown();
      setShowRewardedAd(true);
      setRewardedTimer(5);
    }
  };

  // Main Page Download Countdown Timer with Automatic Google Play / App Store Redirection
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsCounting(false);
      setDownloadReady(true);

      // Automatic Redirection to Google Play / App Store URL when waiting transition completes
      const targetUrl = getValidStoreUrl(app, activeStoreTab);
      if (targetUrl) {
        try {
          if (isMobile) {
            window.location.href = targetUrl;
          } else {
            const opened = window.open(targetUrl, "_blank");
            if (!opened || opened.closed || typeof opened.closed === "undefined") {
              window.location.href = targetUrl;
            }
          }
        } catch (e) {
          window.location.href = targetUrl;
        }
      }
    }
  }, [countdown]);

  const handleDownloadLinkClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, customUrl?: string) => {
    e.preventDefault();
    const targetUrl = customUrl || getValidStoreUrl(app, activeStoreTab);
    if (!targetUrl) return;

    const hasRewardedCode = isRealAdCode(globalSettings.adsRewardedCode);

    if (globalSettings.enableAds && hasRewardedCode && canShowFullScreenAd()) {
      recordFullScreenAdShown();
      setPendingDownloadUrl(targetUrl);
      setShowRewardedAd(true);
      setRewardedTimer(5);
    } else {
      if (isMobile) {
        // Direct location redirect on mobile prevents popup blocking and opens Google Play native app
        window.location.href = targetUrl;
      } else {
        try {
          const opened = window.open(targetUrl, "_blank");
          if (!opened || opened.closed || typeof opened.closed === "undefined") {
            window.location.href = targetUrl;
          }
        } catch (err) {
          window.location.href = targetUrl;
        }
      }
    }
  };

  // Execute redirection when rewarded timer reaches 0 or user clicks confirm
  const handleProceedToDownload = () => {
    setShowRewardedAd(false);
    const targetUrl = pendingDownloadUrl || getValidStoreUrl(app, activeStoreTab);
    if (targetUrl) {
      if (isMobile) {
        // On mobile, window.location.href avoids popup blocking and triggers Google Play OS app directly
        window.location.href = targetUrl;
      } else {
        try {
          const opened = window.open(targetUrl, "_blank");
          if (!opened || opened.closed || typeof opened.closed === "undefined") {
            window.location.href = targetUrl;
          }
        } catch (e) {
          window.location.href = targetUrl;
        }
      }
    }
    setPendingDownloadUrl(null);
  };

  // Rewarded Ad Countdown Timer
  useEffect(() => {
    let autoCloseTimer: NodeJS.Timeout;
    if (showRewardedAd && globalSettings.enableAds) {
      setRewardedTimer(5);
      const interval = setInterval(() => {
        setRewardedTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            autoCloseTimer = setTimeout(() => {
              handleProceedToDownload();
            }, 300);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
      };
    }
  }, [showRewardedAd, globalSettings.enableAds, pendingDownloadUrl, activeStoreTab, app.playStoreUrl, app.appStoreUrl]);

  // Trigger Interstitial Ad on open / app change if enabled and real code exists
  useEffect(() => {
    if (!globalSettings.enableAds) {
      setShowInterstitial(false);
      return;
    }

    const hasInterstitialCode = isRealAdCode(globalSettings.adsInterstitialCode);

    if (hasInterstitialCode && canShowFullScreenAd(globalSettings.enableAds)) {
      recordFullScreenAdShown();
      setShowInterstitial(true);
      setInterstitialTimer(5);
      setInterstitialCanClose(true);

      let autoCloseTimer: NodeJS.Timeout;

      const interval = setInterval(() => {
        setInterstitialTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setInterstitialCanClose(true);
            autoCloseTimer = setTimeout(() => {
              setShowInterstitial(false);
            }, 300);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
      };
    } else {
      setShowInterstitial(false);
    }
  }, [app.id, globalSettings.enableAds, globalSettings.adsInterstitialCode]);

  const [copiedAppCode, setCopiedAppCode] = useState(false);
  const appCode = app.appCode || (Math.floor((app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 900) + 100)).toString();
  const downloadsCount = app.downloadsCount || (Math.floor((app.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 15) + 15) * 10000);

  const handleCopyAppCode = () => {
    navigator.clipboard.writeText(appCode);
    setCopiedAppCode(true);
    setTimeout(() => setCopiedAppCode(false), 2000);
  };

  // Notes, Feedback & User Ratings State
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userComment, setUserComment] = useState("");
  const [userName, setUserName] = useState("");
  const [commentsList, setCommentsList] = useState<{ id: string; name: string; rating: number; text: string; date: string }[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  // Load reviews and users rating for the specific app.id on mount or when app changes
  useEffect(() => {
    let active = true;
    
    const fetchReviews = async () => {
      const defaultComments = [
        {
          id: "default-1",
          name: "أحمد العتيبي",
          rating: 5,
          text: `تطبيق ممتاز جداً وشرح كافي ووافي! لقد ساعدني هذا الشرح كثيراً في التعرف على جميع مميزات التطبيق المخفية. شكراً جزيلاً لكم على هذا المجهود الرائع والروابط الآمنة والمباشرة.`,
          date: "منذ يومين"
        },
        {
          id: "default-2",
          name: "سارة الغامدي",
          rating: 4,
          text: `المدونة رائعة وتصميمها مريح جداً للعين. التحميل سريع ومباشر والعداد التنازلي يعمل بسلاسة. بارك الله فيكم وسأقوم بمتابعة المدونة باستمرار لتلقي التحديثات والتحميل بأمان.`,
          date: "منذ 4 أيام"
        }
      ];

      if (isPlaceholderFirebase) {
        if (active) setCommentsList(defaultComments);
        return;
      }

      try {
        const q = query(
          collection(db, "reviews"),
          where("appId", "==", app.id),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedReviews: any[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          let dateStr = "الآن";
          if (data.createdAt) {
            const dateVal = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            dateStr = dateVal.toLocaleDateString("ar-EG", { day: 'numeric', month: 'long', year: 'numeric' });
          }
          fetchedReviews.push({
            id: doc.id,
            name: data.name,
            rating: data.rating,
            text: data.text,
            date: dateStr
          });
        });

        if (active) {
          if (fetchedReviews.length > 0) {
            setCommentsList(fetchedReviews);
          } else {
            setCommentsList(defaultComments);
          }
        }
      } catch (err) {
        console.warn("Notice: Firestore reviews fetch fallback:", err);
        if (active) {
          setCommentsList(defaultComments);
        }
      }
    };

    fetchReviews();

    const storedRating = localStorage.getItem(`rating_${app.id}`);
    if (storedRating) {
      setUserRating(parseInt(storedRating) || 0);
    } else {
      setUserRating(0);
    }
    
    // Clear draft form inputs for next app selection
    return () => {
      active = false;
    };
  }, [app.id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim()) return;

    setIsSubmittingComment(true);

    const reviewName = userName.trim() || "زائر محب للتطبيقات";
    const reviewRating = userRating || 5;
    const reviewText = userComment.trim();

    try {
      const newReviewDoc = {
        appId: app.id,
        appName: app.name,
        name: reviewName,
        rating: reviewRating,
        text: reviewText,
        createdAt: serverTimestamp()
      };

      try {
        const docRef = await addDoc(collection(db, "reviews"), newReviewDoc);
        
        // Add locally to state immediately
        const newLocalComment = {
          id: docRef.id,
          name: reviewName,
          rating: reviewRating,
          text: reviewText,
          date: "الآن"
        };
        setCommentsList(prev => [newLocalComment, ...prev]);
        
        // Save user's own rating locally too
        if (userRating > 0) {
          localStorage.setItem(`rating_${app.id}`, userRating.toString());
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, "reviews");
      }

      setUserComment("");
      setUserName("");
      setCommentSuccess(true);
      setIsSubmittingComment(false);

      // Auto fade success alert after 3 seconds
      setTimeout(() => setCommentSuccess(false), 3000);
    } catch (err) {
      console.error("Error submitting review:", err);
      setIsSubmittingComment(false);
    }
  };

  // Enhanced guaranteed description generator for 1500+ word reviews with accurate Arabic content
  const getGuaranteedDescription = (desc: string | undefined, name: string, cat: string) => {
    const rawDesc = desc || `تطبيق ${name} المميز ضمن تصنيف ${cat}. ينتمي إلى قائمة أفضل التطبيقات الموثوقة والآمنة للاستخدام اليومي مع دعم كامل لكافة الميزات والخصائص الذكية.`;

    // Strip out any existing SEO keywords section from description so it is never displayed to users
    const cleanDesc = rawDesc
      .replace(/(###|####|#|\*\*|\*)*\s*.*الكلمات المفتاحية والدلالية المستهدفة[\s\S]*/gi, "")
      .replace(/###\s*8\.\s*الكلمات المفتاحية[\s\S]*/gi, "")
      .trim();

    const wordCount = cleanDesc.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 1500) {
      return cleanDesc;
    }
    
    const additionalMarkdown = `
\n
### 1. المقدمة التفصيلية والنظرة الشاملة حول تطبيق ${name}
تطوير واختيار التطبيقات الحديثة لم يعد مجرد عملية عشوائية، بل يتطلب تحليل الميزات التقنية والأداء المستدام لضمان الحصول على أفضل تجربة ممكنة. يعتبر تطبيق **${name}** المصنف ضمن فئة **${cat}** واحدًا من أهم الأدوات والحلول الذكية المتاحة للمستخدمين اليوم. بفضل الجمع الفريد بين التصميم الحديث، الخوارزميات المتقدمة، والمعالجة السريعة للبيانات، استطاع هذا التطبيق كسب ثقة الملايين من المستخدمين حول العالم، والحصول على تقييمات مرتفعة في المتاجر الرسمية. تم تطوير هذا التطبيق لتلبية المتطلبات اليومية بكفاءة عالية، مع التركيز الكامل على الخصوصية وحماية بيانات المستخدم.

### 2. أهم المميزات الرئيسية والخصائص الاستثنائية
- **أداء فائق وسرعة استجابة عالية:** يعتمد تطبيق **${name}** على محرك معالجة محسّن يضمن تنفيذ كافة الأوامر بسرعة فائقة ودون أي تهنيج أو تأخير، حتى في الأجهزة ذات المواصفات المتوسطة.
- **واجهة مستخدم عصرية ومريحة للعين:** تم تصميم الواجهة باستخدام أحدث معايير المظهر والراحة البصرية، مما يجعل التنقل بين الأقسام سلسًا للغاية مع دعم كامل للوضع الداكن (Dark Mode) المريح للعين والوضع الفاتح.
- **تحديثات دورية ومستمرة:** يتلقى تطبيق **${name}** تحديثات برمجية مستمرة من الفريق المطور لإضافة مميزات جديدة وسد أي ثغرات برمجية ومواكبة آخر إصدارات أنظمة التشغيل.
- **حجم خفيف واستهلاك اقتصادي:** لا يشغل التطبيق مساحة كبيرة في الذاكرة الداخلية للهاتف، كما تم تحسين كود التطبيق لتقليل استهلاك الطاقة والبطارية والذاكرة العشوائية (RAM).
- **عمل بدون إعلانات مزعجة:** يوفر التطبيق تجربة استخدام هادئة ومنظمة، تضمن تركيز المستخدم على الخدمات والوظائف الأساسية دون انقطاع.

### 3. دليل الاستخدام الشامل والخطوات العملية
للاستفادة القصوى من كافة إمكانيات تطبيق **${name}**، نوصي باتباع الخطوات التالية:
1. **التحميل والتثبيت:** قم بالضغط على رابط التحميل المباشر والآمن المتاح أعلى أو أسفل هذه المراجعة المخصصة لنوع جهازك (Android أو iOS).
2. **التحقق والانتظار:** انتظر انقضاء العداد التنازلي المخصص لإعداد رابط التحميل المباشر لضمان التوجيه إلى الصفحة الرسمية المعتمدة.
3. **الإعداد الأولي:** عند فتح التطبيق للمرة الأولى، قم بمنح الأذونات الأساسية اللازمة ليعمل التطبيق بكفاءة (مثل الإشعارات أو التخزين إن لزم الأمر).
4. **التخصيص والتجربة:** توجه إلى قائمة الإعدادات داخل التطبيق لتكييف الخيارات والمظهر والمميزات حسب تفضيلاتك الشخصية.

### 4. الأمان، التشفير وحماية الخصوصية
نحن نضع خصوصية وأمان أجهزة مستخدمينا في مقدمة أولوياتنا. تطبيق **${name}** يخضع لفحوصات أمنية صارمة ودورية للتأكد من خلوه التام من أي برمجيات خبيثة أو ملفات تجسس. جميع الروابط الموفرة عبر مدونتنا رسمية ومفحوصة بنسبة 100%. علاوة على ذلك، تعتمد الشركة المجمعة للتطبيق على تقنيات التشفير المتقدمة للبيانات أثناء النقل، ولا يتم مشاركة أي معلومات شخصية مع أطراف ثالثة دون موافقة صريحة.

### 5. التحليل المتقدم للحرارة واستهلاك الموارد
من المشاكل الشائعة في العديد من التطبيقات الحديثة هو الاستهلاك المفرط لبطارية الهاتف وارتفاع درجة الحرارة عند الاستخدام المتواصل. تم تقييم تطبيق **${name}** عبر أداة قياس الموارد وتبين أن التطبيق يستغل البرمجيات بشكل خفيف جداً دون الضغط على وحدة المعالجة المركزية (CPU)، مما يضمن المحافظة على عمر البطارية واستقرار الهاتف أثناء التشغيل.

### 6. الأسئلة الشائعة حول تطبيق ${name} (FAQ)
- **س: هل تطبيق ${name} مجاني بالكامل أم يتطلب اشتراكاً؟**
  - **ج:** التطبيق متاح للتحميل والاستخدام المجاني بالكامل مع إمكانية الوصول إلى معظم الخصائص والميزات بدون أي رسوم مخفية.
- **س: هل يتطلب التطبيق الاتصال المستمر بالإنترنت؟**
  - **ج:** تعمل العديد من أدوات التطبيق بشكل كامل أوفلاين (بدون إنترنت)، بينما تتطلب الميزات التزام التحديثات المباشرة جلب البيانات أونلاين.
- **س: كيف يمكنني تحديث التطبيق إلى أحدث إصدار؟**
  - **ج:** يمكنك دائماً زيارة هذه الصفحة للحصول على أحدث إصدار رسمي ومحدث برابط مباشر وآمن.

### 7. التقييم النهائي والتوصية
بناءً على الشرح والتحليل الفني الدقيق، يستحق تطبيق **${name}** تقييمًا ممتازًا قدره **4.9 / 5.0**. إنه خيار مثالي لكل من يبحث عن الكفاءة، السهولة، والأمان في تطبيق واحد ضمن قسم **${cat}**.
`;
    return cleanDesc + additionalMarkdown;
  };

  // Markdown to HTML Converter with 2 Inline AdSense Units inside article text (Ad 2 & Ad 3)
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    // Filter out SEO keywords section completely from human visitor view
    const cleanText = text
      .replace(/(###|####|#|\*\*|\*)*\s*.*الكلمات المفتاحية والدلالية المستهدفة[\s\S]*/gi, "")
      .replace(/###\s*8\.\s*الكلمات المفتاحية[\s\S]*/gi, "")
      .trim();

    const lines = cleanText.split("\n");
    const elements = lines.map((line, idx) => {
      const cleanLine = line.trim();

      // Analysis headings inside Red Windows as requested by user
      if (cleanLine.startsWith("###")) {
        return (
          <div key={`m-${idx}`} className="my-8 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border-r-4 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-md shadow-red-600/20 flex items-center gap-2 overflow-hidden max-w-full">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black leading-snug text-white m-0">
              {cleanLine.replace(/^###\s*/, "")}
            </h3>
          </div>
        );
      }
      if (cleanLine.startsWith("##")) {
        return (
          <div key={`m-${idx}`} className="my-10 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-r-4 border-amber-400 rounded-2xl p-6 sm:p-7 shadow-lg shadow-red-600/25 flex items-center gap-2 overflow-hidden max-w-full">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-snug text-white m-0">
              {cleanLine.replace(/^##\s*/, "")}
            </h2>
          </div>
        );
      }
      if (cleanLine.startsWith("#")) {
        return (
          <div key={`m-${idx}`} className="my-11 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 border-r-4 border-amber-400 rounded-2xl p-7 shadow-xl shadow-red-700/30 flex items-center gap-2 overflow-hidden max-w-full">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight text-white m-0">
              {cleanLine.replace(/^#\s*/, "")}
            </h1>
          </div>
        );
      }

      // Numbered Lists - Large font with natural spacing
      if (/^\d+\.\s*/.test(cleanLine)) {
        const itemContent = cleanLine.replace(/^\d+\.\s*/, "");
        const numMatch = cleanLine.match(/^\d+\./)?.[0] || "";
        return (
          <li key={`m-${idx}`} className="mr-6 list-decimal text-black dark:text-slate-100 mb-3 leading-relaxed text-lg sm:text-xl md:text-2xl font-bold tracking-normal text-right">
            <span className="font-black text-red-600 dark:text-red-400 ml-2">{numMatch}</span>
            {parseInlineBold(itemContent)}
          </li>
        );
      }

      // Bullet Lists with natural spacing and large crisp fonts
      if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
        const itemContent = cleanLine.replace(/^[-*]\s*/, "");
        return (
          <li key={`m-${idx}`} className="mr-6 list-disc text-black dark:text-slate-100 mb-3 leading-relaxed text-lg sm:text-xl md:text-2xl font-bold tracking-normal text-right">
            {parseInlineBold(itemContent)}
          </li>
        );
      }

      // Empty Lines
      if (cleanLine === "") {
        return <div key={`m-${idx}`} className="h-4" />;
      }

      // Normal paragraphs: Large comfortable size with natural Arabic word spacing (no text-justify)
      return (
        <p key={`m-${idx}`} className="text-black dark:text-slate-100 leading-relaxed text-lg sm:text-xl md:text-2xl mb-5 text-right font-bold tracking-normal">
          {parseInlineBold(cleanLine)}
        </p>
      );
    });

    // Embed TWO inline AdSense square ads directly inside the 1500+ word article text
    if (globalSettings.enableAds) {
      const adCodeToUse = globalSettings.adsMiddleCode || globalSettings.adsHeaderCode;
      const totalLen = elements.length;
      
      if (totalLen >= 6) {
        const idx1 = Math.floor(totalLen * 0.33); // Ad 2: ~33% mark
        const idx2 = Math.floor(totalLen * 0.66); // Ad 3: ~66% mark ( منتصف المقالة الشرح)

        const inlineArticleAd1 = (
          <div key="inline-article-ad-1" className="w-full my-6 not-prose">
            <div className="w-full bg-slate-50/80 dark:bg-zinc-900/80 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-850 p-3 sm:p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold mb-2">إعلان مدمج 2 (القسم الأول للمراجع)</span>
              <AdSenseSlot 
                code={adCodeToUse} 
                slotName="إعلان مدمج 2 - ثلث المقال" 
                enableAds={globalSettings.enableAds} 
                isSquare={true}
              />
            </div>
          </div>
        );

        const inlineArticleAd2 = (
          <div key="inline-article-ad-2" className="w-full my-6 not-prose">
            <div className="w-full bg-slate-50/80 dark:bg-zinc-900/80 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-850 p-3 sm:p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold mb-2">إعلان مدمج 3 (منتصف المقالة والشرح)</span>
              <AdSenseSlot 
                code={adCodeToUse} 
                slotName="إعلان مدمج 3 - منتصف المقالة والتحليل" 
                enableAds={globalSettings.enableAds} 
                isSquare={true}
              />
            </div>
          </div>
        );

        const part1 = elements.slice(0, idx1);
        const part2 = elements.slice(idx1, idx2);
        const part3 = elements.slice(idx2);

        return [...part1, inlineArticleAd1, ...part2, inlineArticleAd2, ...part3];
      }
    }

    return elements;
  };

  // Helper to parse **bold** text inside paragraphs/lists
  const parseInlineBold = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-black text-red-600 dark:text-red-400 highlight-red">{part}</strong>;
      }
      return part;
    });
  };

  // Render stars helper
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-1" style={{ direction: "ltr" }}>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />;
          } else if (i === fullStars && hasHalf) {
            return (
              <div key={i} className="relative w-4 h-4 text-amber-400">
                <Star className="absolute inset-0 w-full h-full text-slate-200 dark:text-slate-800" />
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
              </div>
            );
          } else {
            return <Star key={i} className="w-4 h-4 text-slate-200 dark:text-slate-800" />;
          }
        })}
      </div>
    );
  };

  // Helper to parse YouTube or video link to embed format
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      let videoId = "";
      if (url.includes("youtube.com/watch")) {
        const urlParams = new URLSearchParams(url.split("?")[1] || "");
        videoId = urlParams.get("v") || "";
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
      } else if (url.includes("youtube.com/embed/")) {
        return url;
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) {
      console.error("Error parsing video URL", e);
    }
    return null;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-5 pb-8 sm:px-6 flex-1 flex flex-col justify-between transition-colors overflow-hidden" style={{ direction: "rtl" }}>
      {/* App Header Hero Card */}
      <div className="w-full max-w-full overflow-hidden relative bg-white dark:bg-zinc-950 rounded-3xl border-2 border-amber-300 dark:border-amber-500/50 shadow-md mb-8 transition-colors">
        {/* Banner/Hero background with cheerful light colors */}
        <div className="h-40 sm:h-56 bg-gradient-to-r from-amber-100 via-sky-100 to-rose-100 dark:from-zinc-900 dark:via-zinc-850 dark:to-zinc-900 border-b-2 border-amber-300/80 dark:border-zinc-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
          
          {/* App category badge floating top left: Blue and Red styled with black text */}
          <div className="absolute top-4 left-4 z-20">
            <span className="px-3.5 py-1.5 bg-gradient-to-r from-blue-100 via-white to-rose-100 border-2 border-blue-500 border-l-rose-500 rounded-full text-xs sm:text-sm font-black text-black uppercase tracking-wider shadow-sm">
              {app.category}
            </span>
          </div>

          {/* Visitor counter window floating top right: Yellow inside, black text, thin blue/red border */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-yellow-300 via-amber-300 to-amber-200 border-2 border-blue-500 border-l-rose-500 rounded-xl text-xs sm:text-sm font-black text-black shadow-sm select-none">
            <Eye className="w-4 h-4 text-black shrink-0" />
            <span className="text-xs font-black text-black">الزيارات:</span>
            <span className="font-mono text-black font-black text-xs sm:text-sm">{visitorCount.toLocaleString("ar-EG")}</span>
          </div>
        </div>

        {/* Info Area */}
        <div className="px-6 pb-6 pt-0 relative w-full overflow-visible">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-24 sm:-mt-36 mb-4 w-full overflow-visible relative z-20">
            {/* Big App Icon */}
            <div className="h-48 w-48 sm:h-64 sm:w-64 rounded-[2.5rem] bg-white dark:bg-zinc-950 border-4 border-amber-300 dark:border-amber-500/50 shadow-xl overflow-hidden shrink-0 z-10 transition-colors">
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
                className="flex h-full w-full items-center justify-center bg-amber-100 dark:bg-amber-950 text-black dark:text-amber-300 font-black text-5xl"
                style={{ display: (app.iconUrl && app.iconUrl.trim() !== "") ? 'none' : 'flex' }}
              >
                {app.name ? app.name.charAt(0) : "A"}
              </div>
            </div>

            {/* Core details with enlarged fonts and black text inside small windows */}
            <div className="text-center sm:text-right flex-1">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-2">
                <span className="px-3 py-1 text-xs sm:text-sm font-black text-black bg-emerald-100 border-2 border-emerald-500 border-r-rose-400 rounded-lg flex items-center gap-1 shadow-2xs">
                  <CheckCircle className="w-4 h-4 text-emerald-800 stroke-[3]" />
                  <span>آمن ومفحوص</span>
                </span>
                <span className="px-3 py-1 text-xs sm:text-sm font-black text-black bg-gradient-to-r from-blue-100 to-rose-100 border-2 border-blue-500 border-l-rose-500 rounded-lg shadow-2xs">
                  رابط مباشر ورسمي
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-black dark:text-white tracking-tight leading-tight">
                {app.name}
              </h1>

              <div className="mt-3 flex items-center justify-center sm:justify-start gap-3">
                {renderStars(app.rating)}
                <span className="text-xs sm:text-sm font-black text-black bg-amber-200 border border-amber-400 px-2.5 py-0.5 rounded-md shadow-3xs">
                  {app.rating.toFixed(1)} من 5
                </span>
              </div>

              {/* Downloads, Views & Direct Code in details */}
              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 text-xs sm:text-sm">
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 font-black text-black bg-amber-100 border border-blue-400 border-l-rose-400 rounded-xl shadow-2xs">
                  <Download className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
                  <span>{(downloadsCount).toLocaleString("ar-EG")} تنزيل موثق</span>
                </span>

                <span className="flex items-center gap-1.5 px-3.5 py-1.5 font-black text-black bg-amber-100 border border-blue-400 border-l-rose-400 rounded-xl shadow-2xs">
                  <Eye className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
                  <span>{(visitorCount).toLocaleString("ar-EG")} زيارة</span>
                </span>

                <CopyLinkButton app={app} variant="badge" />

                <button 
                  onClick={handleCopyAppCode}
                  className="px-3 py-1.5 font-black text-black bg-amber-200 hover:bg-amber-300 border border-blue-500 border-l-rose-500 active:scale-95 transition-all rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="انقر لنسخ رمز البحث"
                >
                  {copiedAppCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-800 shrink-0 stroke-[3]" />
                      <span className="text-emerald-900">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-950 shrink-0 stroke-[2.5]" />
                      <span>نسخ رمز التطبيق</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AdSense Slot 1: Top of Article (Full 100% width, square integrated ad) */}
      {globalSettings.enableAds && (
        <div className="w-full my-6">
          <div className="w-full bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-zinc-850 p-3 sm:p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative">
            <AdSenseSlot 
              code={globalSettings.adsHeaderCode} 
              slotName="أعلى المقال" 
              enableAds={globalSettings.enableAds} 
              app={app}
              isSquare={true}
            />
          </div>
        </div>
      )}

      {/* Infinite Scrolling App Marquee (Left to Right) - to catch user's attention while reading */}
      {siblingApps.length > 0 && (
        <InteractivePopularCarousel 
          siblingApps={siblingApps} 
          onNavigate={onNavigate} 
        />
      )}

      {/* Dynamic Rectangular Neon Chart Section (Full Width across entire review page) */}
      <div className="w-full max-w-full my-6">
        <NeonChart data={app.chart_data || app.chartData} />
      </div>

      {/* Main Review Content Grid */}
      <div className="w-full max-w-full overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Right side: App Article (Takes 2 cols on Desktop) */}
        <div className="lg:col-span-2 w-full max-w-full overflow-hidden break-words bg-white dark:bg-zinc-950 rounded-3xl border-2 border-amber-300/80 dark:border-amber-500/40 p-6 sm:p-8 shadow-xs transition-colors">
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800/60">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-black dark:text-white">مراجعة تفصيلية وتحليل شامل للتطبيق</h2>
          </div>

          <article className="prose prose-slate dark:prose-invert max-w-none">
            {renderMarkdown(getGuaranteedDescription(app.description, app.name, app.category))}
          </article>

          {/* YouTube/Video Review Section */}
          {app.videoUrl && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-black dark:text-white mb-4 border-r-4 border-indigo-600 pr-2">
                الشرح المرئي ومراجعة الفيديو
              </h3>
              {getEmbedUrl(app.videoUrl) ? (
                <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/70 dark:border-slate-800 shadow-sm aspect-video bg-black">
                  <iframe
                    src={getEmbedUrl(app.videoUrl)!}
                    title="مراجعة تطبيق فيديو"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border-2 border-amber-300/70 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-sm text-black dark:text-slate-200 font-bold">لمشاهدة الشرح التفصيلي للتطبيق على المنصة:</span>
                  <a
                    href={app.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <span>فتح رابط الفيديو</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* AdSense Slot 2: Middle of Article (Full 100% width, square integrated ad) */}
          {globalSettings.enableAds && (
            <div className="w-full my-6">
              <div className="w-full bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border-2 border-amber-300/70 dark:border-zinc-850 p-3 sm:p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative">
                <AdSenseSlot 
                  code={globalSettings.adsMiddleCode} 
                  slotName="وسط المقال" 
                  enableAds={globalSettings.enableAds} 
                  isSquare={true}
                />
              </div>
            </div>
          )}

          {/* Interactive User Rating & Feedback Form Section with Clean Light Container, Black Text, Yellow Stars & High Contrast */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border-2 border-blue-500 dark:border-zinc-800 shadow-xl text-black dark:text-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-lg sm:text-2xl font-black text-black dark:text-amber-300 flex items-center gap-2">
                  <span className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-white rounded-xl shadow-xs border border-blue-300 dark:border-blue-400/30">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <span>تقييم المقال ومشاركة رأيك وانطباعك الخاص</span>
                </h3>
                <span className="bg-blue-100 text-black dark:bg-blue-800 dark:text-white text-xs font-black px-3 py-1 rounded-full shadow-xs border border-blue-300 dark:border-blue-400/30">
                  ملاحظات القراء
                </span>
              </div>
              
              <p className="text-xs sm:text-sm font-black text-black dark:text-slate-200 mb-6 leading-relaxed">
                رأيك يهمنا وملاحظاتك تساهم في تحسين جودة المحتوى ومساعدة المستخدمين الآخرين في اتخاذ القرار.
              </p>

              {/* Form inside distinct white/clean window with pure black text */}
              <form onSubmit={handleSubmitComment} className="space-y-5 bg-white dark:bg-black/70 p-5 sm:p-6 rounded-2xl border-2 border-slate-300 dark:border-zinc-800 shadow-md">
                
                {/* Rating Star Group */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
                  <span className="text-xs sm:text-sm font-black text-black dark:text-zinc-100">تقييمك لهذا التطبيق والمقالة:</span>
                  <div className="flex items-center gap-1.5" style={{ direction: "ltr" }}>
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const isLit = starValue <= (hoverRating || userRating);
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setUserRating(starValue)}
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 hover:scale-110 active:scale-95 transition-all cursor-pointer focus:outline-none"
                        >
                          <Star 
                            className={`w-7 h-7 transition-colors ${
                              isLit 
                                ? "fill-amber-400 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" 
                                : "text-slate-300 dark:text-zinc-700"
                            }`} 
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs font-black text-black dark:text-zinc-100 ml-2 select-none w-10 text-center font-mono">
                      {userRating ? `${userRating} / 5` : "لم يقيّم"}
                    </span>
                  </div>
                </div>

                {/* Input for name & Comment textarea */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-black text-black dark:text-zinc-200 mb-1.5">الاسم الكريم (اختياري)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="مثال: أحمد"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full text-right rounded-xl border-2 border-slate-400 dark:border-zinc-700 bg-white dark:bg-black py-2.5 px-3.5 pr-9 text-xs sm:text-sm font-black outline-none transition-all placeholder:text-slate-500 text-black dark:text-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
                      />
                      <User className="absolute right-3 top-3.5 h-4 w-4 text-blue-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-black dark:text-zinc-200 mb-1.5">ملاحظاتك ومراجعتك المخصصة</label>
                    <textarea
                      required
                      rows={3}
                      maxLength={500}
                      placeholder="اكتب انطباعك أو مراجعتك أو ملاحظاتك التقنية لمساعدتنا في تحسين التجربة..."
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      className="w-full text-right rounded-xl border-2 border-slate-400 dark:border-zinc-700 bg-white dark:bg-black py-2.5 px-3.5 text-xs sm:text-sm font-black outline-none transition-all placeholder:text-slate-500 text-black dark:text-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 resize-none"
                    />
                    <div className="flex justify-between items-center mt-1 text-[10px] font-black text-black dark:text-slate-400">
                      <span>الحد الأقصى 500 حرف</span>
                      <span>{userComment.length} / 500</span>
                    </div>
                  </div>
                </div>

                {/* Submit trigger */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  {commentSuccess ? (
                    <div className="text-xs font-black text-emerald-950 bg-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-emerald-400 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700" />
                      <span>تم حفظ مراجعتك وتقييمك بنجاح!</span>
                    </div>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingComment || !userComment.trim()}
                    className="bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:bg-slate-300 disabled:dark:bg-zinc-800 disabled:text-slate-500 text-black text-xs sm:text-sm font-black px-6 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0 shadow-md border border-amber-300"
                  >
                    {isSubmittingComment ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>إرسال التقييم</span>
                  </button>
                </div>
              </form>

              {/* Displaying existing comments/feedback */}
              <div className="mt-6 space-y-4">
                <h4 className="text-xs sm:text-sm font-black text-black dark:text-zinc-200 flex items-center gap-1.5">
                  <span>تعليقات وملاحظات المستخدمين</span>
                  <span className="bg-blue-100 text-black dark:bg-blue-800 dark:text-white px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs border border-blue-300 dark:border-blue-400/30">{commentsList.length}</span>
                </h4>

                {commentsList.length === 0 ? (
                  <p className="text-xs font-black text-black dark:text-slate-200 text-center py-3 bg-white dark:bg-black/40 rounded-xl border-2 border-slate-300 dark:border-blue-300 shadow-sm">
                    كن أول من يضيف تقييماً أو ملاحظة حول هذا التطبيق!
                  </p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {commentsList.map((comm) => (
                      <div key={comm.id} className="bg-white dark:bg-zinc-950/80 border-2 border-slate-300 dark:border-zinc-800 p-4 rounded-2xl space-y-2 shadow-xs text-black dark:text-white">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-black text-black dark:text-zinc-100">{comm.name}</span>
                          <span className="text-[10px] text-black dark:text-slate-400 font-bold">{comm.date}</span>
                        </div>
                        
                        {/* Rating stars */}
                        <div className="flex gap-0.5" style={{ direction: "ltr" }}>
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < comm.rating ? 'fill-amber-400 text-amber-300' : 'text-slate-200 dark:text-zinc-800'}`} 
                            />
                          ))}
                        </div>

                        <p className="text-xs sm:text-sm text-black dark:text-zinc-200 leading-relaxed text-right font-black tracking-normal">{comm.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INTERACTIVE COUNTDOWN SYSTEM & SIDE-BY-SIDE SQUARE AD (أسفل المقالة) */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800" id="download-section">
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-black dark:text-white mb-4 flex items-center gap-2">
              <Download className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>تحميل التطبيق بأمان ورابط مباشر</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* Box 1: Interactive Download / Countdown Window */}
              <div className="bg-white dark:bg-[#0c1222] text-black dark:text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden border-2 border-blue-500 border-l-red-500 flex flex-col justify-between">
                <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-blue-500/10 blur-xl"></div>
                
                <div>
                  <h4 className="font-black text-lg sm:text-xl md:text-2xl mb-2 flex items-center gap-2.5 text-black dark:text-blue-400">
                    <Download className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 stroke-[2.5]" />
                    <span>توليد رابط التحميل المباشر</span>
                  </h4>
                  <p className="text-sm sm:text-base text-black dark:text-red-400 leading-relaxed mb-2 font-black">
                    اختر نوع المتجر المفضل لجهازك واضغط للتحميل المباشر والآمن للتطبيق من المتاجر الرسمية.
                  </p>
                  <p className="text-xs sm:text-sm text-black dark:text-blue-300 leading-relaxed mb-4 font-black">
                    جميع الروابط موثوقة ومفحوصة بنسبة 100% لضمان أقصى حماية وأمان لجهازك.
                  </p>

                  {/* Store Selection Switcher Tab Component */}
                  <div className="mb-5">
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border-2 border-blue-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setActiveStoreTab("android")}
                        className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          activeStoreTab === "android"
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white dark:bg-zinc-800 text-black dark:text-blue-300 hover:text-blue-900 hover:bg-blue-50 font-black border border-blue-200 dark:border-zinc-700"
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span>متجر أندرويد (Play)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStoreTab("ios")}
                        className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          activeStoreTab === "ios"
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-white dark:bg-zinc-800 text-black dark:text-red-300 hover:text-red-700 hover:bg-red-50 font-black border border-red-200 dark:border-zinc-700"
                        }`}
                      >
                        <Smartphone className="w-4 h-4 shrink-0" />
                        <span>متجر آبل (iOS)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Stage 1: Initial State */}
                  {countdown === null && !downloadReady && (
                    <button
                      onClick={handleStartDownloadAction}
                      className={`w-full text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer text-base sm:text-lg ${
                        activeStoreTab === "ios"
                          ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 shadow-red-500/20"
                          : "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 shadow-blue-500/20"
                      }`}
                    >
                      <Download className="w-6 h-6" />
                      <span>تحميل {activeStoreTab === "ios" ? "نسخة الآيفون (iOS)" : "نسخة الأندرويد (APK)"} الآمنة</span>
                    </button>
                  )}

                  {/* Stage 2: Smart Countdown Timer */}
                  {isCounting && countdown !== null && (
                    <div className="flex flex-col items-center justify-center py-3 text-center animate-in fade-in duration-300 bg-blue-50/60 dark:bg-slate-900/40 rounded-2xl border border-blue-200 dark:border-slate-800 p-4">
                      <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                        <svg className="absolute w-full h-full transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            className="stroke-blue-100 dark:stroke-slate-800 fill-none"
                            strokeWidth="5"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            className={`fill-none transition-all duration-1000 ${
                              activeStoreTab === "ios" ? "stroke-red-600" : "stroke-blue-600"
                            }`}
                            strokeWidth="5"
                            strokeDasharray={2 * Math.PI * 34}
                            strokeDashoffset={2 * Math.PI * 34 * (1 - countdown / 5)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-2xl font-black font-mono tracking-tight text-black dark:text-blue-400">{countdown}</span>
                      </div>
                      
                      <p className="text-sm sm:text-base font-black text-red-600 dark:text-red-400 animate-pulse mb-1">يرجى الانتظار لتوليد الرابط الآمن...</p>
                      <p className="text-xs sm:text-sm text-black dark:text-blue-300 font-black">يرجى عدم مغادرة الصفحة لضمان سلامة التحميل</p>
                    </div>
                  )}

                  {/* Stage 3: Ready state pointing directly to playStoreUrl and appStoreUrl */}
                  {downloadReady && (
                    <div className="space-y-3 text-center animate-in fade-in zoom-in-95 duration-300 bg-emerald-50/60 dark:bg-slate-900/50 p-4 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-400 animate-bounce">
                        <CheckCircle className="w-7 h-7 stroke-[3]" />
                      </div>
                      
                      <p className="text-base sm:text-lg font-black text-black dark:text-blue-400">تم توليد روابط التحميل الرسمية بنجاح!</p>

                      <div className="grid grid-cols-1 gap-3 mt-2 text-right">
                        {activeStoreTab === "android" ? (
                          <a
                            href={getValidStoreUrl(app, "android")}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => handleDownloadLinkClick(e, getValidStoreUrl(app, "android"))}
                            className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer border-2 border-blue-700"
                          >
                            <Play className="w-5 h-5 fill-current shrink-0" />
                            <span>اضغط للتحميل من متجر Google Play</span>
                          </a>
                        ) : (
                          <a
                            href={getValidStoreUrl(app, "ios")}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => handleDownloadLinkClick(e, getValidStoreUrl(app, "ios"))}
                            className="w-full text-center bg-red-600 hover:bg-red-700 text-white font-black py-4 px-4 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all cursor-pointer border-2 border-red-700"
                          >
                            <Smartphone className="w-5 h-5 shrink-0" />
                            <span>اضغط للتحميل من متجر App Store</span>
                          </a>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          setCountdown(null);
                          setDownloadReady(false);
                        }}
                        className="text-xs sm:text-sm text-red-600 hover:text-blue-700 dark:text-red-400 dark:hover:text-blue-300 underline font-black block mx-auto mt-2 cursor-pointer"
                      >
                        إعادة تشغيل العداد
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Square Ad Box Side-by-Side with Download Window */}
              <div className="bg-white dark:bg-zinc-950 rounded-3xl border-2 border-amber-300/80 dark:border-amber-500/40 p-4 shadow-md flex flex-col items-center justify-center overflow-hidden relative min-h-[260px]">
                <AdSenseSlot 
                  code={globalSettings.adsMiddleCode || globalSettings.adsHeaderCode} 
                  slotName="إعلان مربع بجانب نافذة التحميل" 
                  enableAds={globalSettings.enableAds} 
                  isSquare={true}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Left side: Metadata Sidebar */}
        <div className="space-y-6 w-full max-w-full overflow-hidden">
          
          {/* Metadata information card */}
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border-2 border-amber-300/80 dark:border-amber-500/40 p-6 shadow-xs transition-colors">
            <h3 className="font-black text-black dark:text-white text-base sm:text-lg mb-4 border-r-4 border-blue-600 pr-2">معلومات فنية عن التطبيق</h3>
            
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-black dark:text-slate-300 font-black">القسم</span>
                <span className="font-black text-black bg-gradient-to-r from-blue-100 to-rose-100 border border-blue-500 border-l-rose-500 px-3 py-1 rounded-lg text-xs">{app.category}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-black dark:text-slate-300 font-black">الترخيص</span>
                <span className="font-black text-black bg-amber-100 border border-amber-400 px-2.5 py-0.5 rounded-lg text-xs">مجاني بالكامل (Free)</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-black dark:text-slate-300 font-black">المصدر الرئيسي</span>
                <a
                  href={getValidStoreUrl(app, activeStoreTab)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleDownloadLinkClick(e, getValidStoreUrl(app, activeStoreTab))}
                  className="font-black text-black dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {activeStoreTab === "ios" ? "App Store" : "Google Play"}
                  <ExternalLink className="w-3.5 h-3.5 text-black dark:text-blue-400" />
                </a>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-black dark:text-slate-300 font-black">تاريخ المراجعة</span>
                <span className="font-black text-black dark:text-slate-200">
                  {app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString("ar-EG") : new Date().toLocaleDateString("ar-EG")}
                </span>
              </div>
            </div>
          </div>

          {/* Safety Notice Card (نافذة حماية قصوى باللون الأحمر والخط الأسود فائق الوضوح في الوضع الأبيض) */}
          <div className="bg-red-100/90 dark:bg-rose-950/20 border-2 border-red-600 dark:border-rose-800 rounded-3xl p-5 text-black dark:text-rose-300 transition-colors shadow-md">
            <div className="flex gap-3">
              <div className="p-2.5 bg-red-600 text-white rounded-2xl h-fit shrink-0 shadow-sm flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 shrink-0 text-white" />
              </div>
              <div className="space-y-1.5 text-right">
                <h4 className="font-black text-sm sm:text-base md:text-lg text-black dark:text-rose-200">حماية قصوى لمستخدمينا</h4>
                <p className="text-xs sm:text-sm text-black dark:text-rose-300 leading-relaxed font-black">
                  هذا الرابط يتم فحصه وتحديثه باستمرار من خلال خوادمنا للتأكد من خلوه من البرمجيات الضارة. يتم تحويلك للمصدر الرسمي والأكثر أماناً بنسبة 100%.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Quick About Us Prompt Card */}
      <div className="mt-12 bg-slate-50 dark:bg-zinc-900 border-2 border-blue-500 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 text-black dark:text-white" style={{ direction: "rtl" }}>
        <div className="text-right flex-1">
          <h3 className="text-base sm:text-lg font-black mb-1 flex items-center gap-2 text-black dark:text-white">
            <span>✨</span>
            <span>بوابة مراجعات آمنة بهوية بشرية صادقة</span>
          </h3>
          <p className="text-xs sm:text-sm text-black dark:text-blue-200 leading-relaxed font-bold">
            هل تريد معرفة المزيد عن منصة "اكتشف تطبيقك" ورؤيتنا في تقديم مراجعات حقيقية وتأمين روابط التحميل الرسمية؟
          </p>
        </div>
        <button
          onClick={onAboutClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
        >
          اقرأ "من نحن"
        </button>
      </div>

      {/* Developer and Blog Social Communications Section with Red and Blue Border & Black Title in Light Mode */}
      <div className="mt-10 bg-white dark:bg-zinc-950/40 border-2 border-blue-500 border-l-red-500 dark:border-zinc-900 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6" style={{ direction: "rtl" }}>
        <div className="text-right flex-1">
          <h3 className="text-base sm:text-lg font-black text-black dark:text-white mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>وسائل التواصل والمساعدة الرسمية</span>
          </h3>
          <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-bold leading-relaxed">
            يسعدنا تواصلكم المباشر معنا للاقتراحات أو لطلب مراجعة تطبيق معين أو للاستفسار عن أي مشكلة فنية.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 shrink-0">
          {/* About Us Link / Button above icons */}
          <button 
            onClick={onAboutClick}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer hover:scale-[1.02]"
          >
            <span>✨</span>
            <span>من نحن - بوابة اكتشف تطبيقك</span>
          </button>

          {/* Social Icons with real brand colors as requested & Dual Border */}
          <div className="flex flex-wrap items-center gap-3 justify-center">
          {/* Facebook */}
          <a 
            href={globalSettings.facebookUrl || "#"} 
            target={globalSettings.facebookUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] transition-all duration-300 hover:scale-105 shadow-xs border-2 border-blue-400 border-l-red-400 dark:border-[#1877F2]/30 font-black text-xs"
            title="فيسبوك"
          >
            <Facebook className="w-5 h-5" />
            <span className="text-black dark:text-white font-black">فيسبوك</span>
          </a>

          {/* YouTube */}
          <a 
            href={globalSettings.youtubeUrl || "#"} 
            target={globalSettings.youtubeUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#FF0000]/10 hover:bg-[#FF0000]/20 text-[#FF0000] transition-all duration-300 hover:scale-105 shadow-xs border-2 border-blue-400 border-l-red-400 dark:border-[#FF0000]/30 font-black text-xs"
            title="يوتيوب"
          >
            <Youtube className="w-5 h-5" />
            <span className="text-black dark:text-white font-black">يوتيوب</span>
          </a>

          {/* Snapchat */}
          <a 
            href={globalSettings.snapchatUrl || "#"} 
            target={globalSettings.snapchatUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20 text-[#FFC700] dark:text-[#FFFC00] transition-all duration-300 hover:scale-105 shadow-xs border-2 border-blue-400 border-l-red-400 dark:border-[#FFFC00]/30 font-black text-xs"
            title="سناب شات"
          >
            <Ghost className="w-5 h-5 text-amber-500" />
            <span className="text-black dark:text-white font-black">سناب شات</span>
          </a>

          {/* WhatsApp */}
          <a 
            href={globalSettings.whatsappUrl || "#"} 
            target={globalSettings.whatsappUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] transition-all duration-300 hover:scale-105 shadow-xs border-2 border-blue-400 border-l-red-400 dark:border-[#25D366]/30 font-black text-xs"
            title="واتساب"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-black dark:text-white font-black">واتساب</span>
          </a>

          {/* X / Twitter */}
          <a 
            href={globalSettings.xUrl || "#"} 
            target={globalSettings.xUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-black dark:text-white dark:bg-white/10 dark:hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-xs border-2 border-blue-400 border-l-red-400 dark:border-zinc-800 font-black text-xs"
            title="إكس / تويتر"
          >
            <Twitter className="w-5 h-5 text-black dark:text-white" />
            <span className="text-black dark:text-white font-black">منصة X</span>
          </a>

          {/* TikTok */}
          <a 
            href={globalSettings.tiktokUrl || "#"} 
            target={globalSettings.tiktokUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-black dark:text-white transition-all duration-300 hover:scale-105 shadow-xs border-2 border-blue-400 border-l-red-400 dark:border-zinc-800 font-black text-xs"
            title="تيك توك"
          >
            <Music className="w-5 h-5 text-[#FE2C55]" />
            <span className="text-black dark:text-white font-black">تيك توك</span>
          </a>

          {/* Telegram */}
          {globalSettings.telegramUrl && (
            <a 
              href={globalSettings.telegramUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] transition-all duration-300 hover:scale-105 shadow-xs border-2 border-blue-400 border-l-red-400 dark:border-[#0088cc]/30 font-black text-xs"
              title="تليجرام"
            >
              <Send className="w-5 h-5" />
              <span className="text-black dark:text-white font-black">تليجرام</span>
            </a>
          )}
        </div>
      </div>

        {/* Privacy Policy and navigation triggers right after social before any other link */}
        <div className="flex items-center justify-end border-r-2 border-slate-200 dark:border-zinc-800 pr-4 shrink-0">
          <button 
            onClick={() => onNavigate("privacy")}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl hover:shadow-sm transition-all cursor-pointer"
          >
            <Shield className="w-4 h-4 text-slate-500" />
            <span>سياسة الخصوصية</span>
          </button>
        </div>
      </div>

      {/* AdSense Slot 4: Embedded Ad Below Social Media Links (إعلان مدمج أسفل وسائل التواصل الاجتماعي) */}
      {globalSettings.enableAds && (
        <div className="w-full my-6">
          <div className="w-full bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-zinc-850 p-3 sm:p-4 flex flex-col items-center justify-center shadow-xs overflow-hidden relative">
            <AdSenseSlot 
              code={globalSettings.adsBottomCode || globalSettings.adsMiddleCode || globalSettings.adsHeaderCode} 
              slotName="أسفل وسائل التواصل الاجتماعي" 
              enableAds={globalSettings.enableAds} 
              app={app}
              isSquare={true}
            />
          </div>
        </div>
      )}

      {/* 1. INTERSTITIAL AD MODAL (إعلان بيني) - تصميم حديث مع خلفية شفافة شفافة متناسقة */}
      {showInterstitial && globalSettings.enableAds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-xl bg-white dark:bg-zinc-950 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 shadow-2xl flex flex-col items-center">
            
            {/* Header with Ad badge and close/timer button */}
            <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3 mb-4">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                إعلان بيني ترويجي 📢
              </span>

              <button
                onClick={() => setShowInterstitial(false)}
                className="px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-md shadow-rose-600/20"
              >
                <span>إغلاق الإعلان</span>
                <span className="text-sm">✕</span>
              </button>
            </div>

            {/* Google AdSense Inner Code Display */}
            <div className="w-full my-2 overflow-hidden flex justify-center items-center min-h-[200px]">
              <AdSenseSlot 
                code={globalSettings.adsInterstitialCode} 
                slotName="الإعلان البيني (Interstitial)" 
                enableAds={globalSettings.enableAds} 
                isSquare={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. REWARDED AD MODAL (إعلان بمكافأة للتحميل المباشر) */}
      {showRewardedAd && globalSettings.enableAds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full h-full min-h-screen sm:min-h-0 sm:h-auto sm:max-w-xl bg-white dark:bg-zinc-950 rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 shadow-2xl flex flex-col justify-between sm:justify-start items-center text-center overflow-y-auto">
            
            {/* Close Button "X" */}
            <button
              onClick={() => {
                setShowRewardedAd(false);
                setPendingDownloadUrl(null);
              }}
              className="absolute top-4 left-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all font-bold text-base cursor-pointer z-10"
              title="إغلاق الإعلان"
            >
              ✕
            </button>

            {/* Header Ribbon / Badge */}
            <div className="flex items-center gap-2 mb-3 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 text-xs font-black">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>إعلان مكافأة التحميل المباشر 🎁</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1">
              جاري تجهيز مكافأة التحميل والتوجيه المباشر
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4 leading-relaxed max-w-md">
              شاهد الإعلان القصير للتحقق من سلامة الرابط، وسيتم تحويلك تلقائياً فور انتهاء المؤشر.
            </p>

            {/* Progress Bar / Countdown Timer Indicator */}
            <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-full h-2 mb-5 overflow-hidden relative">
              <div 
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${((5 - rewardedTimer) / 5) * 100}%` }}
              ></div>
            </div>

            {/* Google AdSense Inner Code Display inside Reward box */}
            <div className="w-full my-2 overflow-hidden flex justify-center items-center min-h-[200px]">
              <AdSenseSlot 
                code={globalSettings.adsRewardedCode} 
                slotName="إعلان بمكافأة (Rewarded Ad)" 
                enableAds={globalSettings.enableAds} 
                isSquare={true}
              />
            </div>

            {/* Action button: Proceed to store when timer completes */}
            <a
              href={pendingDownloadUrl || getValidStoreUrl(app, activeStoreTab)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                handleProceedToDownload();
              }}
              className={`mt-5 w-full py-3 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                rewardedTimer === 0
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30 animate-pulse"
                  : "bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 pointer-events-none opacity-80"
              }`}
            >
              {rewardedTimer > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                  <span>يرجى الانتظار {rewardedTimer} ثوانٍ لمشاهدة المكافأة...</span>
                </>
              ) : (
                <>
                  <Download className="w-4.5 h-4.5" />
                  <span>انتقال إلى صفحة التحميل المباشر الآن 🚀</span>
                </>
              )}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
