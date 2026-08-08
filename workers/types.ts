export interface Env {
  R2_BUCKET: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY: string;
  SITE_URL: string;
  AUTH_SECRET: string;
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
