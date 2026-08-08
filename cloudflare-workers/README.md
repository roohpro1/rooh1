# Rooh Platform - Cloudflare Workers & R2 Architecture Guide

This directory contains the production-ready TypeScript Cloudflare Edge Worker for **Rooh Platform** (`roohme.web.app`).

## System Architecture Overview

```
                          ┌───────────────────────────┐
                          │    Client / Googlebot     │
                          └─────────────┬─────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │   Cloudflare Edge Worker    │
                         └──────┬──────────────┬───────┘
                                │              │
    ┌───────────────────────────▼──┐        ┌──▼──────────────────────────┐
    │   Cloudflare R2 Bucket       │        │   Firebase Firestore REST   │
    │   (Heavy 1500+ Word HTML)    │        │   (Lightweight Metadata)    │
    └──────────────────────────────┘        └─────────────────────────────┘
```

1. **Storage Split**:
   - Heavy 1500+ word AI-generated articles are stored as static `.html` files in **Cloudflare R2** (Zero Egress Costs).
   - Only lightweight metadata (`appId`, `slug`, `status: "published"`, `lastmod`, `r2FileKey`) is stored in **Firestore**, drastically reducing Firestore read/write costs.

2. **Instant Dynamic Sitemap**:
   - Intercepts `/sitemap.xml` requests.
   - Queries Firestore via REST API for `status == "published"`.
   - Returns valid, cached, SEO-optimized XML for instant Google Search Console indexing.

3. **High-Speed Clean URL Rendering**:
   - Intercepts `/review/:slug` or `/:slug`.
   - Looks up metadata in Firestore and streams HTML directly from Cloudflare R2 with low latency.

---

## Environment Variables & Bindings Setup

### 1. R2 Bucket Creation
Run the following Wrangler command to create your R2 bucket:
```bash
npx wrangler r2 bucket create rooh-reviews-bucket
```

### 2. Configure `wrangler.toml`
Ensure your `wrangler.toml` file contains the correct project bindings:

```toml
name = "rooh-platform-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "REVIEWS_BUCKET"
bucket_name = "rooh-reviews-bucket"

[vars]
FIREBASE_PROJECT_ID = "ai-studio-remixremixremixr-f90e7953-c5a1-4541-b13d-95e6eb5f6d0b"
SITE_BASE_URL = "https://roohme.web.app"
```

### 3. Deploy Secret Keys to Cloudflare
Set optional Firebase API key secrets via Wrangler CLI or Cloudflare Dashboard:
```bash
npx wrangler secret put FIREBASE_API_KEY
```

---

## Deployment Instructions

1. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

3. **Deploy the Worker**:
   ```bash
   npx wrangler deploy
   ```

4. **Attach Cloudflare Routes**:
   In your Cloudflare Dashboard, attach the worker to your domain `roohme.web.app/*`:
   - `roohme.web.app/sitemap.xml` -> `handleDynamicSitemap`
   - `roohme.web.app/api/worker/*` -> `handleUploadReview`
   - `roohme.web.app/*` -> `handleRenderReview`

---

## API Documentation

### Uploader Endpoint (`POST /api/worker/upload-review`)

**Request Body:**
```json
{
  "appId": "com.whatsapp",
  "name": "WhatsApp Messenger",
  "slug": "whatsapp",
  "reviewHtml": "<article><h1>دليل ومراجعة تطبيق WhatsApp</h1>...</article>",
  "playStoreUrl": "https://play.google.com/store/apps/details?id=com.whatsapp",
  "packageId": "com.whatsapp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "App review uploaded to R2 & metadata synced with Firestore successfully",
  "slug": "whatsapp",
  "r2FileKey": "reviews/whatsapp.html",
  "publicUrl": "https://roohme.web.app/whatsapp"
}
```
