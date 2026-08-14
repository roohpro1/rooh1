// Helper utility for generating short, clean, direct English slugs (e.g. "whatsapp", "facebook", "pubg", "messenger", "snapchat")
export function toShortCleanSlug(input: string): string {
  if (!input || !input.trim()) return "app";

  let str = input.trim().toLowerCase();

  // Strip query/hash and trailing .html or leading/trailing slashes
  str = str.split("?")[0].split("#")[0];
  str = str.replace(/\.html$/gi, "").replace(/^\/+|\/+$/g, "");

  // Strip any "-review" or "_review" or "review" endings/starts
  str = str.replace(/[-_]review$/gi, "").replace(/^review[-_]/gi, "").replace(/[-_]review[-_]/gi, "-");

  // Direct Arabic mappings
  if (str.includes("واتساب") || str.includes("واتس")) {
    if (str.includes("عمر") || str.includes("omar")) return "whatsomar";
    if (str.includes("الذهبي") || str.includes("gold")) return "whatsgold";
    if (str.includes("لايت") || str.includes("lite")) return "whatsapp-lite";
    if (str.includes("أعمال") || str.includes("business")) return "whatsapp-business";
    return "whatsapp";
  }
  if (str.includes("فيسبوك") || str.includes("فيس")) {
    if (str.includes("لايت") || str.includes("lite")) return "facebook-lite";
    return "facebook";
  }
  if (str.includes("ماسنجر") || str.includes("مسنجر")) {
    if (str.includes("لايت") || str.includes("lite")) return "messenger-lite";
    return "messenger";
  }
  if (str.includes("انستقرام") || str.includes("إنستغرام") || str.includes("انستجرام") || str.includes("انستا") || str.includes("انستغرام")) return "instagram";
  if (str.includes("تيليجرام") || str.includes("تليجرام") || str.includes("تلجرام")) return "telegram";
  if (str.includes("يوتيوب")) return "youtube";
  if (str.includes("تيك توك") || str.includes("تيكتوك")) return "tiktok";
  if (str.includes("شات جي بي تي") || str.includes("شات جبيتي")) return "chatgpt";
  if (str.includes("ببجي")) return "pubg";
  if (str.includes("سناب شات") || str.includes("سناب")) return "snapchat";
  if (str.includes("كاب كات")) return "capcut";
  if (str.includes("نتفليكس")) return "netflix";
  if (str.includes("سبوتيفاي")) return "spotify";
  if (str.includes("تويتر") || str.includes("منصة اكس") || str.includes("منصة x")) return "x";
  if (str.includes("ديسكورد")) return "discord";
  if (str.includes("لينكد") || str.includes("لينكد إن")) return "linkedin";
  if (str.includes("ريديت")) return "reddit";

  // Remove filler English words that make slugs long (including review)
  str = str
    .replace(/\b(review|reviews|official|edition|version|mobile|android|iphone|download|free|apk|mod|guide|pro|app|application|appstore|playstore|latest|update)\b/gi, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();

  // Common English app names check
  if (str.includes("whatsapp") || str === "whats" || str === "wats") {
    if (str.includes("omar")) return "whatsomar";
    if (str.includes("gold")) return "whatsgold";
    if (str.includes("lite")) return "whatsapp-lite";
    if (str.includes("business")) return "whatsapp-business";
    return "whatsapp";
  }
  if (str.includes("facebook") || str === "fb") return str.includes("lite") ? "facebook-lite" : "facebook";
  if (str.includes("messenger") || str === "orca") return str.includes("lite") ? "messenger-lite" : "messenger";
  if (str.includes("instagram") || str === "insta") return "instagram";
  if (str.includes("telegram") || str === "tele") return "telegram";
  if (str.includes("chatgpt")) return "chatgpt";
  if (str.includes("youtube") || str === "yt") return "youtube";
  if (str.includes("tiktok")) return "tiktok";
  if (str.includes("snapchat") || str === "snap") return "snapchat";
  if (str.includes("pubg")) return "pubg";
  if (str.includes("netflix")) return "netflix";
  if (str.includes("spotify")) return "spotify";
  if (str.includes("capcut")) return "capcut";
  if (str.includes("discord")) return "discord";
  if (str.includes("linkedin")) return "linkedin";
  if (str.includes("reddit")) return "reddit";
  if (str.includes("twitter") || str === "x") return "x";

  // Split into words and pick at most 2 concise parts
  const parts = str.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "app";

  let result = parts.length > 1 ? `${parts[0]}-${parts[1]}` : parts[0];
  result = result.replace(/[^a-z0-9\-]/gi, "").toLowerCase().replace(/-+/g, "-").replace(/^-|-$/g, "");

  // Strip review again if any residue remains
  result = result.replace(/[-_]?review$/gi, "");

  if (result.length > 25) {
    result = result.substring(0, 25).replace(/-+$/, "");
  }

  return result || "app";
}
