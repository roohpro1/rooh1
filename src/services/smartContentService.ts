/**
 * Rooh Platform - Smart Content Generator & Cloudflare R2 Caching System
 * 
 * Logic Workflow (Caching & Generate Once):
 * 1. Smart Check (Pre-Check): Checks Firebase Firestore first using a unique slug derived from the search query.
 * 2. Cache Hit: If article metadata exists in Firestore, executes a GET request to the Cloudflare Worker URL
 *    (https://rooh-platform-worker.roohr4046.workers.dev/${uniqueSlug}.html) to fetch cached HTML directly.
 *    No AI generation call is executed!
 * 3. Cache Miss (Generate & Upload):
 *    - Calls Gemini AI to generate a 1500+ word article formatted as structured HTML.
 *    - Uploads the HTML via PUT request to https://rooh-platform-worker.roohr4046.workers.dev/${uniqueSlug}.html
 *    - Upon Response Status 200, saves metadata (slug, searchKeyword, r2Url, lastmod) to Firebase Firestore.
 */

import { toShortCleanSlug } from "../lib/slugUtils";

export const WORKER_BASE_URL = "https://rooh-platform-worker.roohr4046.workers.dev";

export interface SmartContentResult {
  slug: string;
  title: string;
  searchKeyword: string;
  r2Url: string;
  r2FileKey: string;
  htmlContent: string;
  isCacheHit: boolean;
  status: 'published' | 'pending';
  lastmod: string;
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];
}

/**
 * Normalizes search query into a clean, SEO-friendly unique slug.
 * Example: "واتساب عمر العنابي" -> "whatsapp-omar-al-annabi-review"
 */
export function generateUniqueSlug(searchQuery: string): string {
  return toShortCleanSlug(searchQuery);
}

/**
 * 1. Smart Check: Query Cloudflare Worker R2 via GET request
 */
export async function checkWorkerR2Cache(slug: string): Promise<string | null> {
  const filename = slug.endsWith(".html") ? slug : `${slug}.html`;
  const workerUrl = `${WORKER_BASE_URL}/${filename}`;

  try {
    console.log(`[Smart Cache Check] 🔍 Fetching from Cloudflare Worker R2: ${workerUrl}`);
    const response = await fetch(workerUrl, {
      method: "GET",
      headers: { "Accept": "text/html, application/xhtml+xml, */*" }
    });

    if (response.ok) {
      const html = await response.text();
      if (html && html.trim().length > 100) {
        console.log(`[Smart Cache Check] ✅ Cache Hit on R2! Fetched ${html.length} bytes.`);
        return html;
      }
    } else {
      console.log(`[Smart Cache Check] ℹ️ Cache Miss on R2 (HTTP Status ${response.status})`);
    }
  } catch (error) {
    console.warn(`[Smart Cache Check] ⚠️ R2 fetch check exception for ${slug}:`, error);
  }

  return null;
}

/**
 * 2. Upload HTML content to Cloudflare Worker R2 via PUT request
 */
export async function uploadToWorkerR2(slug: string, htmlContent: string): Promise<string> {
  const filename = slug.endsWith(".html") ? slug : `${slug}.html`;
  const workerUrl = `${WORKER_BASE_URL}/${filename}`;

  console.log(`[R2 Upload] 🚀 Sending PUT request to Cloudflare Worker: ${workerUrl}`);

  const response = await fetch(workerUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable"
    },
    body: htmlContent
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`فشل رفع المقالة إلى Cloudflare R2 (رمز الاستجابة: ${response.status}). التفاصيل: ${errorText}`);
  }

  console.log(`[R2 Upload] ✅ Successfully uploaded ${filename} to R2 (Status 200)`);
  return workerUrl;
}

/**
 * Complete Smart Check (Caching & Generate Once) Workflow Handler
 */
export async function processSmartArticleWorkflow(
  searchQuery: string,
  firestoreGetter: (slug: string) => Promise<any | null>,
  firestoreSaver: (data: SmartContentResult) => Promise<void>,
  aiGenerator: (searchQuery: string) => Promise<{ title: string; htmlContent: string; metaTitle?: string; metaDescription?: string; seoKeywords?: string[] }>
): Promise<SmartContentResult> {
  const cleanSlug = generateUniqueSlug(searchQuery);
  console.log(`\n=================== [SMART CHECK WORKFLOW] ===================`);
  console.log(`[Smart Workflow] Query: "${searchQuery}" | Slug: "${cleanSlug}"`);

  // Step 1: Pre-check in Firebase Firestore
  const existingDoc = await firestoreGetter(cleanSlug);

  if (existingDoc && existingDoc.r2Url) {
    console.log(`[Smart Workflow] 📦 Found Firestore metadata for slug: ${cleanSlug}`);

    // Step 2: Cache Hit - Fetch directly from Cloudflare Worker R2 via GET request
    const cachedHtml = await checkWorkerR2Cache(cleanSlug);
    if (cachedHtml) {
      console.log(`[Smart Workflow] 🎉 CACHE HIT! Returning cached article without AI generation.`);
      return {
        slug: cleanSlug,
        title: existingDoc.title || searchQuery,
        searchKeyword: searchQuery,
        r2Url: existingDoc.r2Url,
        r2FileKey: existingDoc.r2FileKey || cleanSlug,
        htmlContent: cachedHtml,
        isCacheHit: true,
        status: existingDoc.status || 'published',
        lastmod: existingDoc.lastmod || new Date().toISOString(),
        metaTitle: existingDoc.metaTitle,
        metaDescription: existingDoc.metaDescription,
        seoKeywords: existingDoc.seoKeywords
      };
    }
  }

  // Step 3: Cache Miss - Generate with AI & Upload to Cloudflare Worker R2 via PUT
  console.log(`[Smart Workflow] ⚡ CACHE MISS! Triggering AI Generation Engine...`);

  // A. Call AI Generation Engine
  const aiOutput = await aiGenerator(searchQuery);

  if (!aiOutput || !aiOutput.htmlContent) {
    throw new Error("فشل الذكاء الاصطناعي في توليد محتوى المقالة.");
  }

  // B. Send HTML body via PUT request to Cloudflare Worker R2
  const r2Url = await uploadToWorkerR2(cleanSlug, aiOutput.htmlContent);

  const resultData: SmartContentResult = {
    slug: cleanSlug,
    title: aiOutput.title || searchQuery,
    searchKeyword: searchQuery,
    r2Url: r2Url,
    r2FileKey: cleanSlug,
    htmlContent: aiOutput.htmlContent,
    isCacheHit: false,
    status: 'published',
    lastmod: new Date().toISOString(),
    metaTitle: aiOutput.metaTitle,
    metaDescription: aiOutput.metaDescription,
    seoKeywords: aiOutput.seoKeywords
  };

  // C. Save metadata & R2 URL to Firebase Firestore
  try {
    await firestoreSaver(resultData);
    console.log(`[Smart Workflow] 💾 Successfully saved metadata to Firebase Firestore.`);
  } catch (fsErr) {
    console.error(`[Smart Workflow] ⚠️ Error saving metadata to Firestore:`, fsErr);
    // Continue since R2 upload succeeded
  }

  return resultData;
}
