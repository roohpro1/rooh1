const AD_COOLDOWN_MS = 60000; // 1 minute cooldown

export const getLastFullScreenAdTimestamp = (): number => {
  const stored = localStorage.getItem("last_fullscreen_ad_time");
  return stored ? parseInt(stored, 10) : 0;
};

export const recordFullScreenAdShown = () => {
  localStorage.setItem("last_fullscreen_ad_time", Date.now().toString());
};

export const canShowFullScreenAd = (enableAds?: boolean): boolean => {
  if (!enableAds) return false;
  const now = Date.now();
  const lastAd = getLastFullScreenAdTimestamp();
  return (now - lastAd) >= AD_COOLDOWN_MS;
};

export const isRealAdCode = (code?: string): boolean => {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (trimmed.length < 15) return false;
  if (
    trimmed.includes("Placeholder") ||
    trimmed.includes("مثال") ||
    trimmed.includes("كود الإعلان") ||
    trimmed.includes("ca-pub-0000000000000000")
  ) return false;
  return true;
};
