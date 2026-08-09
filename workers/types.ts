export interface Env {
  h?: D1Database;
  ROOH_KV?: KVNamespace;
  roohme?: R2Bucket;
  ROOH_R2?: R2Bucket;
  R2_BUCKET?: R2Bucket;
  REVIEWS_BUCKET?: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY?: string;
  SITE_URL?: string;
  SITE_BASE_URL?: string;
  AUTH_SECRET?: string;
  ADMIN_SECRET?: string;
  GROQ_API_KEY?: string;
  GROQ_API_KEYS?: string;
  GOOGLE_API_KEY?: string;
}

export interface AppMetadata {
  appId: string;
  slug: string;
  name: string;
  status: 'published' | 'pending';
  lastmod: string;
  r2Key: string;
  playStoreUrl?: string;
  iconUrl?: string;
  keywords?: string[];
  description?: string;
}

export interface ReviewUploadPayload {
  appId: string;
  slug: string;
  name: string;
  reviewContentHtml: string;
  keywords?: string[];
  playStoreUrl?: string;
  iconUrl?: string;
  description?: string;
}
