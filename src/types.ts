export interface ChartData {
  title?: string;
  labels: string[];
  scores: number[];
}

export interface AppReview {
  id: string; // 5-digit Short ID (e.g. "58291") or legacy package ID
  packageId?: string; // package ID (e.g. com.whatsapp)
  slug?: string; // SEO friendly dynamic slug (e.g. pubg-mobile-review)
  cleanSlug?: string; // Clean direct slug (e.g. whatsapp, roohme.web.app/whatsapp)
  name: string;
  appTitle?: string; // App Title for SEO / Firebase schema
  status?: 'pending' | 'published'; // Article status: pending (draft/generated) or published
  metaTitle?: string; // Custom SEO Title
  metaDescription?: string; // Custom SEO Description
  seoKeywords?: string[] | string; // SEO keywords array or string
  iconUrl: string;
  rating: number;
  description: string; // Markdown article / summary
  content?: string; // Full review content if separate
  r2FileKey?: string; // Cloudflare R2 file key (e.g. clean-slug.html)
  r2Url?: string; // Cloudflare Worker R2 URL
  articleUrl?: string; // Clean short shareable frontend URL
  playStoreUrl: string;
  appStoreUrl?: string; // App Store URL
  videoUrl?: string; // App preview/YouTube video URL
  tags: string[];
  category: string;
  createdAt: any; // Firestore Timestamp
  appCode?: string; // numeric code for direct search (e.g., "101")
  couponCode?: string; // coupon or discount code
  couponUrl?: string; // dedicated coupon activation link
  couponDiscount?: string; // discount percentage or promo offer text
  downloadsCount?: number; // download count indicator
  storeType?: "android" | "ios" | "both";
  isApproved?: boolean; // moderator approval status
  isUserSearched?: boolean; // created from user search
  authorName?: string; // Review author name for Schema.org
  operatingSystem?: string; // e.g. "ANDROID, IOS"
  price?: string; // e.g. "0.00 SAR" or "Free"
  chartData?: ChartData;
  chart_data?: ChartData;
}

export interface GlobalSettings {
  enableAds: boolean;
  adsHeaderCode: string;
  adsMiddleCode: string;
  adsBottomCode: string;
  adsRewardedCode?: string;
  adsInterstitialCode?: string;
  adsTxtContent: string;
  whatsappUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  snapchatUrl?: string; // added snapchat support
  telegramUrl?: string; // added telegram support
  xUrl?: string; // added X/Twitter support
  complaintsUrl: string;
  customPrivacyUrl?: string; // Custom full privacy policy link
  oneSignalAppId?: string;
  oneSignalRestKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  googlePlayApiKey?: string; // Added Google Play Console / API key
  // Custom Top Promotional Window & External Site Link Settings
  promoImageUrl?: string; // Developer custom image URL to display inside the top promotional window
  promoTargetUrl?: string; // Developer custom destination website URL to navigate to when clicked
  isPromoEnabled?: boolean; // Developer explicit toggle to enable and show the promotional window
  aiImagePortalUrl?: string; // Customizable AI Image Creation Portal URL (legacy alias)
  showAiImagePortal?: boolean; // Control visibility (show/hide) of instant AI image generator window (legacy alias)
  couponUrl?: string; // Global active coupon or partner link
  couponCode?: string; // Global coupon / discount code
  couponTitle?: string; // Custom title for coupon activation banner
}

export interface AppRequest {
  id: string;
  appName: string;
  notes?: string;
  deviceOS?: string;
  createdAt: any;
}

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

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  modelUsed?: string;
  keyUsedMasked?: string;
  audioUrl?: string;
  actionTaken?: string;
}

export type AppTheme = "black" | "blue" | "white" | "yellow";

