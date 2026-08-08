# Rooh Platform - Cloudflare Workers & R2 Storage Architecture

High-speed, cost-optimized dynamic SEO & content rendering architecture combining **Cloudflare Workers**, **Cloudflare R2**, and **Firebase Firestore REST API**.

---

## 🏗️ Architectural Split Strategy

1. **Cloudflare R2 Bucket**: Stores heavy, multi-kilobyte HTML/Markdown 1500+ word AI review files (`reviews/${slug}.html`).
2. **Firebase Firestore (REST API)**: Stores lightweight document metadata (`appId`, `slug`, `status: "published"`, `lastmod`, `r2Key`) to minimize read/write costs.
3. **Dynamic Sitemap (`/sitemap.xml`)**: Intercepts requests, queries published docs via Firestore REST API, generates compliant XML on the fly, and caches responses at Cloudflare Edge.
4. **Edge Content Renderer (`/review/:slug`)**: Fetches review HTML directly from R2 storage with edge caching.

---

## 🛠️ Environmental Setup & Cloudflare Deployment

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`

### 2. Create Cloudflare R2 Bucket
Run the following command in your terminal to provision the bucket:
```bash
npx wrangler r2 bucket create rooh-reviews-bucket
```

### 3. Configure Secrets in Cloudflare
Set secret variables securely without committing keys to git:
```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put FIREBASE_API_KEY
```

### 4. Deploy to Cloudflare Edge
From inside the `/workers` directory, execute:
```bash
npx wrangler deploy
```

---

## 📡 API Usage & Integration

### Uploading a Review (Worker Script 1)
- **Endpoint**: `POST https://<your-worker-subdomain>.workers.dev/api/upload-review`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <AUTH_SECRET>`
- **Request Body**:
```json
{
  "appId": "com.whatsapp",
  "slug": "whatsapp",
  "name": "واتساب (WhatsApp)",
  "reviewContentHtml": "<h1>دليل ومراجعة شاملة لتطبيق واتساب</h1><p>شرح تفصيلي موسع...</p>",
  "playStoreUrl": "https://play.google.com/store/apps/details?id=com.whatsapp",
  "iconUrl": "https://lh3.googleusercontent.com/..."
}
```

### Dynamic Sitemap (Worker Script 2)
- **URL**: `GET https://<your-domain>/sitemap.xml`
- **Output**: Real-time XML sitemap generated dynamically from Firestore published documents with edge caching headers.

### Content Rendering (Worker Script 3)
- **URL**: `GET https://<your-domain>/review/whatsapp`
- **Output**: High-speed, low-latency HTML payload served directly from Cloudflare R2.
