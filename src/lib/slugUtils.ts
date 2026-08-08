// Helper utility for generating short, clean, direct English slugs (e.g. "whats", "facebook", "pubg")
export function toShortCleanSlug(input: string): string {
  if (!input || !input.trim()) return "app";

  let str = input.trim().toLowerCase();

  // Strip query/hash and trailing .html or leading/trailing slashes
  str = str.split("?")[0].split("#")[0];
  str = str.replace(/\.html$/gi, "").replace(/^\/+|\/+$/g, "");

  // Direct Arabic mappings
  if (str.includes("واتساب") || str.includes("واتس")) {
    if (str.includes("عمر") || str.includes("omar")) return "whatsomar";
    if (str.includes("الذهبي") || str.includes("gold")) return "whatsgold";
    if (str.includes("لايت") || str.includes("lite")) return "whatslite";
    if (str.includes("أعمال") || str.includes("business")) return "whatsbus";
    return "whats";
  }
  if (str.includes("فيسبوك") || str.includes("فيس")) {
    if (str.includes("لايت") || str.includes("lite")) return "facebooklite";
    return "facebook";
  }
  if (str.includes("انستقرام") || str.includes("إنستغرام") || str.includes("انستجرام") || str.includes("انستا")) return "insta";
  if (str.includes("تيليجرام") || str.includes("تليجرام") || str.includes("تلجرام")) return "telegram";
  if (str.includes("يوتيوب")) return "yt";
  if (str.includes("تيك توك") || str.includes("تيكتوك")) return "tiktok";
  if (str.includes("شات جي بي تي") || str.includes("شات جبيتي")) return "chatgpt";
  if (str.includes("ببجي")) return "pubg";
  if (str.includes("سناب شات") || str.includes("سناب")) return "snap";
  if (str.includes("كاب كات")) return "capcut";
  if (str.includes("نتفليكس")) return "netflix";
  if (str.includes("سبوتيفاي")) return "spotify";

  // Remove filler English words that make slugs long
  str = str
    .replace(/\b(review|messenger|official|edition|version|mobile|android|iphone|download|free|apk|mod|guide|pro|app|application|appstore|playstore|latest|update)\b/gi, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();

  // Common English app names check
  if (str.includes("whatsapp")) {
    if (str.includes("omar")) return "whatsomar";
    if (str.includes("gold")) return "whatsgold";
    if (str.includes("lite")) return "whatslite";
    if (str.includes("business")) return "whatsbus";
    return "whats";
  }
  if (str.includes("facebook")) return str.includes("lite") ? "facebooklite" : "facebook";
  if (str.includes("instagram")) return "insta";
  if (str.includes("telegram")) return "telegram";
  if (str.includes("chatgpt")) return "chatgpt";
  if (str.includes("youtube")) return "yt";
  if (str.includes("tiktok")) return "tiktok";
  if (str.includes("snapchat")) return "snap";
  if (str.includes("pubg")) return "pubg";
  if (str.includes("netflix")) return "netflix";
  if (str.includes("spotify")) return "spotify";
  if (str.includes("capcut")) return "capcut";

  // Split into words and pick at most 2 concise parts
  const parts = str.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "app";

  let result = parts.length > 1 ? `${parts[0]}${parts[1]}` : parts[0];
  result = result.replace(/[^a-z0-9]/gi, "").toLowerCase();

  if (result.length > 12) {
    result = result.substring(0, 12);
  }

  return result || "app";
}
