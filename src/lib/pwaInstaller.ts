// PWA Installation helper and deferred prompt manager
let deferredPrompt: any = null;
let isPwaListenersSet = false;

export function initPwaInstaller() {
  if (typeof window === "undefined" || isPwaListenersSet) return;
  isPwaListenersSet = true;

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("📲 PWA beforeinstallprompt captured and ready!");
    window.dispatchEvent(new CustomEvent("pwa-prompt-available"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    console.log("🎉 PWA installed successfully!");
    window.dispatchEvent(new CustomEvent("pwa-installed"));
  });
}

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export async function promptPwaInstall(onShowIosGuide?: () => void): Promise<boolean> {
  if (isStandaloneMode()) {
    alert("🌟 منصة روح مثبتة كـ تطبيق حقيقي بالفعل على جهازك وشغالة بطاقتا الكلية (Full Screen)!");
    return true;
  }

  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        console.log("✅ User accepted PWA installation");
        deferredPrompt = null;
        return true;
      } else {
        console.log("❌ User dismissed PWA installation");
      }
    } catch (err) {
      console.warn("PWA prompt error:", err);
    }
  } else if (isIosDevice()) {
    if (onShowIosGuide) {
      onShowIosGuide();
    } else {
      alert(
        "📱 لتثبيت منصة روح كتطبيق على الآيفون والآيباد:\n\n1. اضغط على زر المشاركة ⎘ (Share) أسفل الشاشة في متصفح Safari.\n2. اختر 'الإضافة إلى الشاشة الرئيسية' ➕ (Add to Home Screen).\n3. انقر على 'إضافة' (Add) أعلى اليمين."
      );
    }
    return false;
  } else {
    alert(
      "📱 تثبيت التطبيق:\nيمكنك تثبيت منصة روح كـ تطبيق حقيقي بدون شريط متصفح بالضغط على قائمة خيارات المتصفح (⋮) ثم اختيار 'تثبيت التطبيق' أو 'التثبيت على الشاشة الرئيسية'."
    );
  }
  return false;
}
