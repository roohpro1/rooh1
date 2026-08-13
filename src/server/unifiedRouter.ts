/**
 * Rooh Platform - Unified Cloudflare Native Router & Portal 1 Engine
 * Combines Gateway routing, Portal 1 Standalone Worker capabilities,
 * D1 database storage, R2 articles bucket, and KV namespace storage.
 *
 * Domain: https://roohpro.com
 * Gateway Path: https://roohpro.com/app
 */

import { toShortCleanSlug } from "../lib/slugUtils";
import { normalizePackageId, generateExhaustiveArticleFallback, callGeminiApi } from "../lib/fetchUtils";

export interface Fetcher {
  fetch(request: Request | string, init?: RequestInit): Promise<Response>;
}

export interface D1Database {
  prepare(query: string): {
    bind(...values: any[]): {
      first<T = any>(colName?: string): Promise<T | null>;
      all<T = any>(): Promise<{ results?: T[] }>;
      run(): Promise<{ success: boolean }>;
    };
    first<T = any>(colName?: string): Promise<T | null>;
    all<T = any>(): Promise<{ results?: T[] }>;
    run(): Promise<{ success: boolean }>;
  };
}

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface R2Bucket {
  get(key: string): Promise<{ body: ReadableStream; text(): Promise<string> } | null>;
  put(key: string, value: any, options?: any): Promise<any>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
}

export interface Env {
  // Service Binding to Master Gateway
  MASTER_GATEWAY?: Fetcher;

  // Cloudflare Storage Bindings
  h?: D1Database;              // D1 Database (primary)
  DB?: D1Database;             // D1 Database (alias)
  ROOH_KV?: KVNamespace;       // Key-Value Namespace
  roohme?: R2Bucket;           // R2 Bucket (primary)
  ROOH_R2?: R2Bucket;          // R2 Bucket (alias 2)
  REVIEWS_BUCKET?: R2Bucket;   // R2 Bucket (alias 3)
  ROOH_BUCKET?: R2Bucket;      // R2 Bucket (alias 4)
  R2_BUCKET?: R2Bucket;        // R2 Bucket (alias 5)
  ASSETS?: Fetcher;            // Static Assets

  // Environment Variables & Secrets
  GROQ_API_KEY?: string;
  GROQ_API_KEYS?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  SITE_BASE_URL?: string;
  SITE_URL?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SECRET?: string;
  AUTH_SECRET?: string;
}

/**
 * Get available R2 Bucket
 */
function getBucket(env: Env): R2Bucket | null {
  if (!env) return null;
  return env.roohme || env.ROOH_R2 || env.REVIEWS_BUCKET || env.ROOH_BUCKET || env.R2_BUCKET || (env as any).BUCKET || null;
}

/**
 * Get available D1 Database
 */
function getD1(env: Env): D1Database | null {
  if (!env) return null;
  return env.h || env.DB || (env as any).D1 || (env as any).DATABASE || null;
}

/**
 * Get available KV Namespace
 */
function getKV(env: Env): KVNamespace | null {
  if (!env) return null;
  return env.ROOH_KV || (env as any).KV || (env as any).ROOH_KV_NAMESPACE || null;
}

/**
 * Get Base URL
 */
function getBaseUrl(env: Env): string {
  const url = env.SITE_BASE_URL || env.SITE_URL || "https://roohpro.com";
  return url.replace(/\/+$/, "");
}

/**
 * Common CORS Headers
 */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, x-api-key, Bearer, Cache-Control, Pragma, X-Admin-Email, X-Admin-Password, X-Admin-Secret, X-Portal-Source",
};

/**
 * Embedded Frontend SPA HTML Shell
 */
function getAppHtmlShell(siteBase: string, pageTitle?: string, appSlug?: string): string {
  const title = pageTitle ? `${pageTitle} | منصة روح` : "منصة روح - دليل ومراجعات التطبيقات الموثوقة | Rooh Platform";
  const canonicalUrl = appSlug ? `${siteBase}/app/${appSlug}` : `${siteBase}/app`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="منصة روح المحترفة - دليل شامل واستعراض تحليلي معزز بالذكاء الاصطناعي لجميع التطبيقات والألعاب." />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="stylesheet" href="/assets/index.css">
  </head>
  <body class="bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200 min-h-screen">
    <div id="root"></div>
  </body>
</html>`;
}

/**
 * Service Binding Sync with Master Gateway
 */
async function syncWithMasterGateway(
  env: Env,
  endpoint: string,
  method: string = "POST",
  payload?: any
): Promise<{ success: boolean; status: number; data?: any; error?: string }> {
  if (env.MASTER_GATEWAY && typeof env.MASTER_GATEWAY.fetch === "function") {
    try {
      const siteBase = getBaseUrl(env);
      const fullUrl = `${siteBase}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

      const requestInit: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Portal-Source": "Portal-1-Standalone-Worker",
          "X-Service-Binding": "true",
          "X-Admin-Secret": env.ADMIN_SECRET || ""
        },
        body: payload ? JSON.stringify(payload) : undefined
      };

      const res = await env.MASTER_GATEWAY.fetch(new Request(fullUrl, requestInit));
      let responseData: any = null;

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        responseData = await res.json().catch(() => null);
      } else {
        responseData = await res.text().catch(() => null);
      }

      return {
        success: res.ok,
        status: res.status,
        data: responseData
      };
    } catch (err: any) {
      console.warn("[Portal 1 Service Binding Sync Notice]:", err?.message || err);
      return {
        success: false,
        status: 500,
        error: err?.message || "فشل الاتصال بالبوابة الرئيسية عبر Service Binding"
      };
    }
  }

  return {
    success: false,
    status: 503,
    error: "لم يتم ربط MASTER_GATEWAY Service Binding في إعدادات البيئة"
  };
}

/**
 * Auto-Initialize D1 Tables
 */
async function initD1Tables(d1: D1Database): Promise<void> {
  try {
    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        target_url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        clicks INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run().catch(() => {});

    await d1.prepare(`
      CREATE TABLE IF NOT EXISTS apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id TEXT UNIQUE,
        name TEXT,
        slug TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'published',
        r2_file_key TEXT,
        lastmod TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run().catch(() => {});
  } catch (e) {
    console.warn("D1 tables init notice:", e);
  }
}

/**
 * Generate candidate apps list
 */
async function fetchCandidateApps(query: string, pkgId: string): Promise<Array<any>> {
  const cleanQuery = query.trim();
  const lowerQuery = cleanQuery.toLowerCase();
  
  // Try iTunes Store Search API for candidate apps
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=software&limit=10`);
    if (res.ok) {
      const data = await res.json() as any;
      if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((item: any) => ({
          packageId: item.bundleId || pkgId || `com.app.${toShortCleanSlug(item.trackName)}`,
          name: item.trackName,
          developer: item.artistName || "الشركة المطورة الرسمية",
          category: item.primaryGenreName || "تطبيقات وأدوات",
          rating: item.averageUserRating || 4.8,
          iconUrl: item.artworkUrl512 || item.artworkUrl100 || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.trackName)}&size=512&background=4f46e5&color=ffffff&bold=true`,
          playStoreUrl: item.trackViewUrl || `https://play.google.com/store/search?q=${encodeURIComponent(item.trackName)}&c=apps`,
          appStoreUrl: item.trackViewUrl || ""
        }));
      }
    }
  } catch (e) {
    console.warn("iTunes store search notice:", e);
  }

  // Fallback candidate
  return [
    {
      packageId: pkgId || `com.app.${toShortCleanSlug(cleanQuery)}`,
      name: cleanQuery,
      developer: "الشركة المطورة الرسمية",
      category: "تطبيقات وأدوات",
      rating: 4.8,
      iconUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanQuery)}&size=512&background=4f46e5&color=ffffff&bold=true`,
      playStoreUrl: `https://play.google.com/store/search?q=${encodeURIComponent(cleanQuery)}&c=apps`,
      appStoreUrl: ""
    }
  ];
}

/**
 * Generate 1500+ Word Review Article using Groq / Gemini / Fallback
 */
async function generateFull1500WordReview(
  appName: string,
  devName?: string,
  category?: string,
  rating?: number,
  packageId?: string,
  env?: Env
): Promise<string> {
  const name = appName || "التطبيق المتميز";
  const dev = devName || "الشركة المطورة الرسمية";
  const cat = category || "تطبيقات وأدوات";
  const rate = rating || 4.7;
  const pkg = packageId || "com.app.official";

  const prompt = `أنت محرر صحفي وتقني خبير في منصة روح (roohpro.com).
المطلوب منك كتابة مقال مراجعة صحفي وشرح تفصيلي موسع وشامل لتطبيق "${name}" لا يقل بحال من الأحوال عن 1500 كلمة (1500+ Words).

يجب التقيّد الصارم بالهيكل المنهجي المعتمد التالي دون حذفه:

# دليل ومراجعة شاملة لتطبيق ${name}

## مقدمة استعراضية ورؤية التطبيق وفكرته الرئيسية
(اكتب مقدمة صحفية موسعة تشرح الفكرة ورؤية المطور والتقييم ${rate} من 5).

## قصة وتاريخ المطور وأهداف تطوير التطبيق
(اكتب تفاصيل عن المطور ${dev} وأسباب إنشائه للبرنامج).

## الشرح الموسع والعميق لكافة المميزات والخصائص الفنية والوظائف الذكية
(اذكر واشرح 6-8 ميزات مع شروح طوال لكل ميزة).

## تحليل الأداء والسرعة، الأمان وحماية الخصوصية، واستهلاك الموارد
(تحليل شامل للسرعة والبطارية والأمان).

## دليل الاستخدام والتشغيل الكامل خطوة بخطوة للمبتدئين
(4 خطوات تشغيلية مفصلة).

## قسم الأسئلة الشائعة والأجوبة التفصيلية (FAQ)
(4 أسئلة شائعة وأجوبة كاملة).

## العيوب والتحديات والملاحظات الموضوعية المصداقية
(تحليل العيوب بشفافية ومصداقية).

## مقارنة شاملة مع التطبيقات المنافسة في المتاجر الرسمية
(مقارنة مفصلة مع البرامج المشابهة).

## الخلاصة ورأي الخبراء والتقييم النهائي
(الرأي النهائي والتوصية).

## الكلمات المفتاحية والدلالية المستهدفة (SEO Target Keywords)
(تضمين 20 كلمة مفتاحية دقيقة بين علامات تنصيص).

تنبيه هام جداً: اكتب المقال بلغة عربية فصحى احترافية وغنية جداً ليتجاوز المقال 1500 كلمة بوضوح.`;

  // 1. Try Groq API
  let groqKey = env?.GROQ_API_KEY;
  if (!groqKey && env?.GROQ_API_KEYS) groqKey = env.GROQ_API_KEYS.split(",")[0].trim();

  if (groqKey) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000
        })
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json() as any;
        const text = groqData?.choices?.[0]?.message?.content;
        if (text && text.length > 500) {
          return text;
        }
      }
    } catch (e) {
      console.warn("[Unified Router Groq Notice]:", e);
    }
  }

  // 2. Try Gemini API
  if (env?.GEMINI_API_KEY) {
    try {
      const geminiText = await callGeminiApi([{ role: "user", content: prompt }], env.GEMINI_API_KEY);
      if (geminiText && geminiText.length > 500) {
        return geminiText;
      }
    } catch (e) {
      console.warn("[Unified Router Gemini Notice]:", e);
    }
  }

  // 3. Fallback generator
  return generateExhaustiveArticleFallback(name, dev, cat, rate, pkg);
}

/**
 * Convert Markdown to Styled HTML Document
 */
function convertMarkdownToHtml(markdown: string, appName: string, cleanSlug: string, storeUrl: string): string {
  const paragraphs = markdown
    .split("\n\n")
    .map(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith("# ")) return `<h1 class="text-3xl font-extrabold text-emerald-400 my-6">${trimmed.slice(2)}</h1>`;
      if (trimmed.startsWith("## ")) return `<h2 class="text-2xl font-bold text-zinc-100 my-5 border-r-4 border-emerald-500 pr-3">${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith("### ")) return `<h3 class="text-xl font-semibold text-zinc-200 my-4">${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split("\n").map(li => `<li class="my-1">${li.replace(/^[-*]\s+/, "")}</li>`).join("");
        return `<ul class="list-disc list-inside my-4 space-y-1 text-zinc-300">${items}</ul>`;
      }
      return `<p class="my-4 text-zinc-300 leading-relaxed text-lg">${trimmed}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>دليل ومراجعة شاملة لتطبيق ${appName} | منصة روح</title>
  <meta name="description" content="اقرأ المراجعة الصحفية والشرح التفصيلي الكامل لتطبيق ${appName} على منصة روح الموثوقة.">
  <link rel="canonical" href="https://roohpro.com/app/${cleanSlug}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>body { font-family: 'Cairo', sans-serif; }</style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen">
  <main class="max-w-4xl mx-auto px-4 py-10">
    <article class="prose prose-invert max-w-none">
      ${paragraphs}
    </article>
    ${storeUrl ? `
    <div class="mt-10 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
      <a href="${storeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-lg shadow-lg shadow-emerald-900/30">
        تحميل تطبيق ${appName} من المتجر الرسمي
      </a>
    </div>` : ''}
  </main>
</body>
</html>`;
}

/**
 * Upload review HTML to R2 & Sync with D1 / KV / Master Gateway
 */
async function uploadAndSyncReview(
  cleanSlug: string,
  appName: string,
  reviewHtml: string,
  env: Env,
  siteBase: string,
  ctx?: { waitUntil?: (p: Promise<any>) => void }
): Promise<any> {
  const bucket = getBucket(env);
  const d1 = getD1(env);
  const r2Key = `reviews/${cleanSlug}.html`;
  const lastmod = new Date().toISOString();

  // 1. Save HTML to R2
  if (bucket) {
    await bucket.put(r2Key, reviewHtml, {
      httpMetadata: { contentType: "text/html; charset=utf-8", cacheControl: "public, max-age=31536000, immutable" }
    });
    await bucket.put(`${cleanSlug}.html`, reviewHtml, {
      httpMetadata: { contentType: "text/html; charset=utf-8" }
    });
    await bucket.put(`app/${cleanSlug}.html`, reviewHtml, {
      httpMetadata: { contentType: "text/html; charset=utf-8" }
    });
  }

  // 2. Register in D1
  if (d1) {
    const p = d1.prepare(`
      INSERT INTO apps (app_id, name, slug, status, r2_file_key, lastmod)
      VALUES (?, ?, ?, 'published', ?, ?)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, r2_file_key=excluded.r2_file_key, lastmod=excluded.lastmod
    `).bind(cleanSlug, appName, cleanSlug, r2Key, lastmod).run().catch(() => {});

    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(p);
    } else {
      await p;
    }
  }

  // 3. Register in approved-apps.json in KV & R2
  try {
    const kv = getKV(env);
    let existingList: any[] = [];
    if (kv) {
      const kvVal = await kv.get("APPROVED_APPS_JSON");
      if (kvVal) existingList = JSON.parse(kvVal);
    }

    if (existingList.length === 0 && bucket) {
      const obj = await bucket.get("approved-apps.json");
      if (obj) existingList = JSON.parse(await obj.text());
    }

    const newAppMeta = {
      id: cleanSlug,
      packageId: cleanSlug,
      name: appName,
      slug: cleanSlug,
      cleanSlug: cleanSlug,
      status: "published",
      isApproved: true,
      lastmod: lastmod,
      updatedAt: lastmod
    };

    const updatedList = [newAppMeta, ...existingList.filter((a: any) => (a.slug || a.id || a.cleanSlug) !== cleanSlug)];
    const jsonStr = JSON.stringify(updatedList);

    if (kv) {
      await kv.put("APPROVED_APPS_JSON", jsonStr);
    }
    if (bucket) {
      await bucket.put("approved-apps.json", jsonStr, {
        httpMetadata: { contentType: "application/json; charset=utf-8" }
      });
    }
  } catch (e) {
    console.warn("Notice updating approved-apps.json in uploadAndSyncReview:", e);
  }

  // 4. Sync with Master Gateway via Service Binding if available
  const bindingSyncResult = await syncWithMasterGateway(env, "/api/worker/upload-review", "POST", {
    appId: cleanSlug,
    name: appName,
    slug: cleanSlug,
    reviewHtml
  });

  return {
    r2Saved: !!bucket,
    r2Key,
    masterGatewaySynced: bindingSyncResult.success,
    bindingStatus: bindingSyncResult.status,
    syncResponse: bindingSyncResult.data
  };
}

/**
 * Resolve pre-rendered HTML review article across D1 and R2
 */
async function resolveArticleHtml(cleanSlug: string, env: Env): Promise<Response | null> {
  const normSlug = cleanSlug.toLowerCase();
  const bucket = getBucket(env);
  const d1 = getD1(env);

  // 1. Check D1 Database
  if (d1) {
    try {
      const d1App = await d1.prepare("SELECT * FROM apps WHERE (slug = ? OR LOWER(slug) = ? OR app_id = ?) AND status = 'published'").bind(cleanSlug, normSlug, cleanSlug).first() as any;
      if (d1App && d1App.r2_file_key && bucket) {
        const object = await bucket.get(d1App.r2_file_key) 
                    || await bucket.get(`${cleanSlug}.html`)
                    || await bucket.get(`reviews/${cleanSlug}.html`)
                    || await bucket.get(`app/${cleanSlug}.html`);
        if (object) {
          const headers = new Headers(corsHeaders);
          headers.set("Content-Type", "text/html; charset=utf-8");
          headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
          return new Response(object.body, { status: 200, headers });
        }
      }
    } catch (d1Err) {
      console.warn("[Unified Router] D1 query notice:", d1Err);
    }
  }

  // 2. Direct R2 Lookup
  if (bucket) {
    try {
      const object = await bucket.get(`${cleanSlug}.html`) 
                  || await bucket.get(`reviews/${cleanSlug}.html`)
                  || await bucket.get(`app/${cleanSlug}.html`)
                  || await bucket.get(`${normSlug}.html`)
                  || await bucket.get(`reviews/${normSlug}.html`)
                  || await bucket.get(cleanSlug);

      if (object) {
        const headers = new Headers(corsHeaders);
        headers.set("Content-Type", "text/html; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
        return new Response(object.body, { status: 200, headers });
      }
    } catch (r2Err) {
      console.warn("[Unified Router] R2 lookup notice:", r2Err);
    }
  }

  return null;
}

/**
 * Handle Dynamic Sitemap Generation
 */
async function handleDynamicSitemap(env: Env, siteBase: string): Promise<Response> {
  const d1 = getD1(env);
  const bucket = getBucket(env);
  let publishedApps: Array<{ slug: string; lastmod: string }> = [];

  // 1. Query D1
  if (d1) {
    try {
      const { results } = await d1.prepare("SELECT slug, lastmod FROM apps WHERE status = 'published'").all();
      if (results && results.length > 0) {
        results.forEach((row: any) => {
          if (row.slug) {
            publishedApps.push({ slug: row.slug, lastmod: String(row.lastmod || "").split("T")[0] });
          }
        });
      }
    } catch (_) {}
  }

  // 2. Query KV or R2 approved-apps.json
  if (publishedApps.length === 0) {
    try {
      const kv = getKV(env);
      let list: any[] = [];
      if (kv) {
        const kvVal = await kv.get("APPROVED_APPS_JSON");
        if (kvVal) list = JSON.parse(kvVal);
      }
      if (list.length === 0 && bucket) {
        const approvedObj = await bucket.get("approved-apps.json");
        if (approvedObj) list = JSON.parse(await approvedObj.text());
      }
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          const rawSlug = item.slug || item.id || item.cleanSlug;
          if (rawSlug) {
            const clean = String(rawSlug).trim().replace(/^\//, "").replace(/^app\//, "").replace(/\.html$/i, "");
            publishedApps.push({ slug: clean, lastmod: String(item.lastmod || item.updatedAt || new Date().toISOString()).split("T")[0] });
          }
        });
      }
    } catch (_) {}
  }

  // Deduplicate
  const uniqueMap = new Map<string, string>();
  for (const item of publishedApps) {
    if (item.slug && !uniqueMap.has(item.slug)) uniqueMap.set(item.slug, item.lastmod);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <url>\n    <loc>${siteBase}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${siteBase}/app</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${siteBase}/privacy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;

  for (const [slug, lastmod] of uniqueMap.entries()) {
    xml += `  <url>\n    <loc>${siteBase}/app/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600"
    }
  });
}

/**
 * Main Request Handler for Cloudflare Workers & Pages Functions
 */
export async function handleUnifiedCloudflareRequest(
  request: Request,
  env: Env,
  ctx?: { waitUntil?: (p: Promise<any>) => void }
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const siteBase = getBaseUrl(env);
  const bucket = getBucket(env);
  const d1 = getD1(env);

  // Preflight CORS
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Static Assets pass-through via env.ASSETS
  if (env.ASSETS && (path.includes("/assets/") || /\.(js|css|png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|map)$/i.test(path))) {
    let assetUrl = request.url;
    if (path.startsWith('/app/assets/')) {
      assetUrl = request.url.replace('/app/assets/', '/assets/');
    }
    const assetRes = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (assetRes && assetRes.status !== 404) {
      return assetRes;
    }
  }

  try {
    // Auto init D1 tables if available
    if (d1 && (path.startsWith("/api/links") || path.startsWith("/l/") || path.startsWith("/app") || path === "/")) {
      const p = initD1Tables(d1);
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
      else await p;
    }

    // ========================================================================
    // 1. Portal 1 Health & Status
    // ========================================================================
    if (path === "/api/portal1/health" || path === "/api/portal1/status" || path === "/api/health" || path === "/api/status") {
      return new Response(JSON.stringify({
        status: "active",
        service: "Rooh Platform Unified Cloudflare Router & Portal 1 Engine",
        domain: "roohpro.com",
        version: "2.0.0-cloudflare-native",
        bindings: {
          masterGatewayBinding: !!env.MASTER_GATEWAY,
          r2Bucket: !!bucket,
          d1Database: !!d1,
          kvNamespace: !!env.ROOH_KV,
          groqApiKey: !!(env.GROQ_API_KEY || env.GROQ_API_KEYS),
          geminiApiKey: !!env.GEMINI_API_KEY
        },
        timestamp: new Date().toISOString()
      }), {
        status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
      });
    }

    // ========================================================================
    // 2. Candidate App Search Flow (/api/portal1/candidates, /api/candidates, /api/search-candidates)
    // ========================================================================
    if ((path === "/api/portal1/candidates" || path === "/api/candidates" || path === "/api/search-candidates") && (method === "GET" || method === "POST")) {
      let query = "";
      if (method === "GET") {
        query = url.searchParams.get("q") || url.searchParams.get("query") || "";
      } else {
        const body = await request.json().catch(() => ({})) as any;
        query = body.query || body.q || body.appName || "";
      }

      if (!query.trim()) {
        return new Response(JSON.stringify({ error: "يرجى إدخال اسم التطبيق للبحث عن المرشحات" }), {
          status: 400, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      const pkgId = normalizePackageId(query);
      const candidates = await fetchCandidateApps(query, pkgId);

      return new Response(JSON.stringify({
        success: true,
        query,
        packageId: pkgId,
        count: candidates.length,
        candidates
      }), {
        status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
      });
    }

    // ========================================================================
    // 3. AI Review Generator (1500+ Words) (/api/portal1/generate-review, /api/generate-review)
    // ========================================================================
    if ((path === "/api/portal1/generate-review" || path === "/api/generate-review") && method === "POST") {
      const body = await request.json().catch(() => ({})) as any;
      const { appName, devName, category, rating, packageId, storeUrl, autoUpload } = body;

      if (!appName || !appName.trim()) {
        return new Response(JSON.stringify({ error: "اسم التطبيق مطلوب لبدء توليد المراجعة" }), {
          status: 400, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      const cleanSlug = toShortCleanSlug(appName);
      const reviewMarkdown = await generateFull1500WordReview(appName, devName, category, rating, packageId, env);
      const reviewHtml = convertMarkdownToHtml(reviewMarkdown, appName, cleanSlug, storeUrl || "");

      let uploadResult: any = null;
      if (autoUpload !== false) {
        uploadResult = await uploadAndSyncReview(cleanSlug, appName, reviewHtml, env, siteBase, ctx);
      }

      return new Response(JSON.stringify({
        success: true,
        slug: cleanSlug,
        appName,
        publicUrl: `${siteBase}/app/${cleanSlug}`,
        wordCount: reviewMarkdown.split(/\s+/).length,
        markdown: reviewMarkdown,
        html: reviewHtml,
        syncedToMasterGateway: uploadResult?.masterGatewaySynced || false,
        uploadDetails: uploadResult
      }), {
        status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
      });
    }

    // ========================================================================
    // 4. Combined Search & Scrape Review Engine (/api/search-and-scrape)
    // ========================================================================
    if (path === "/api/search-and-scrape" && method === "POST") {
      const body = await request.json().catch(() => ({})) as any;
      const query = body.query || body.appName || "";

      if (!query.trim()) {
        return new Response(JSON.stringify({ error: "اسم التطبيق مطلوب للبحث والتوليد" }), {
          status: 400, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      const pkgId = normalizePackageId(query);
      const candidates = await fetchCandidateApps(query, pkgId);
      const selected = candidates[0];

      const cleanSlug = toShortCleanSlug(selected.name || query);
      const reviewMarkdown = await generateFull1500WordReview(
        selected.name || query,
        selected.developer,
        selected.category,
        selected.rating,
        selected.packageId,
        env
      );

      const reviewHtml = convertMarkdownToHtml(
        reviewMarkdown,
        selected.name || query,
        cleanSlug,
        selected.playStoreUrl || ""
      );

      const uploadResult = await uploadAndSyncReview(cleanSlug, selected.name || query, reviewHtml, env, siteBase, ctx);

      return new Response(JSON.stringify({
        success: true,
        slug: cleanSlug,
        appName: selected.name || query,
        packageId: selected.packageId,
        iconUrl: selected.iconUrl,
        playStoreUrl: selected.playStoreUrl,
        publicUrl: `${siteBase}/app/${cleanSlug}`,
        markdown: reviewMarkdown,
        html: reviewHtml,
        uploadResult
      }), {
        status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
      });
    }

    // ========================================================================
    // 5. Upload & Sync Review Endpoint (/api/portal1/upload-review, /api/worker/upload-review, /api/upload-review)
    // ========================================================================
    if ((path === "/api/portal1/upload-review" || path === "/api/worker/upload-review" || path === "/api/upload-review") && method === "POST") {
      const body = await request.json().catch(() => ({})) as any;
      const rawHtml = body.reviewHtml || body.reviewContentHtml;
      const appName = body.name || body.appId || "تطبيق جديد";
      const cleanSlug = body.slug || toShortCleanSlug(appName);

      if (!rawHtml) {
        return new Response(JSON.stringify({ error: "محتوى الـ HTML الخاص بالمراجعة مطلوب للرفع" }), {
          status: 400, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      const uploadResult = await uploadAndSyncReview(cleanSlug, appName, rawHtml, env, siteBase, ctx);

      return new Response(JSON.stringify({
        success: true,
        message: "تم حفظ المراجعة بنجاح في Cloudflare R2/D1",
        slug: cleanSlug,
        publicUrl: `${siteBase}/app/${cleanSlug}`,
        ...uploadResult
      }), {
        status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
      });
    }

    // ========================================================================
    // 6. Approved Apps List Endpoint (/approved-apps.json, /api/approved-apps)
    // ========================================================================
    if (path === "/approved-apps.json" || path === "/api/approved-apps") {
      const kv = getKV(env);
      if (method === "GET") {
        let apps: any[] = [];
        if (kv) {
          const kvVal = await kv.get("APPROVED_APPS_JSON");
          if (kvVal) apps = JSON.parse(kvVal);
        }
        if (apps.length === 0 && bucket) {
          const obj = await bucket.get("approved-apps.json");
          if (obj) apps = JSON.parse(await obj.text());
        }
        return new Response(JSON.stringify(apps), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      if (method === "POST" || method === "PUT") {
        const bodyText = await request.text();
        if (kv) {
          await kv.put("APPROVED_APPS_JSON", bodyText);
        }
        if (bucket) {
          await bucket.put("approved-apps.json", bodyText, {
            httpMetadata: { contentType: "application/json; charset=utf-8" }
          });
        }
        return new Response(JSON.stringify({ success: true, message: "Approved apps updated in KV & R2" }), {
          status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }
    }

    // ========================================================================
    // 7. Robots.txt & Sitemap
    // ========================================================================
    if (path === "/robots.txt" || path === "/robots.txt/") {
      return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${siteBase}/sitemap.xml\n`, {
        status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders }
      });
    }

    if (path === "/sitemap.xml" || path === "/sitemap.xml/" || path === "/sitemap") {
      return await handleDynamicSitemap(env, siteBase);
    }

    // ========================================================================
    // 8. D1 Link Shortener Endpoints (/api/links, /l/:slug)
    // ========================================================================
    if (path === "/api/links" || path.startsWith("/api/links/")) {
      if (!d1) {
        return new Response(JSON.stringify({ error: "D1 database binding 'h' or 'DB' not configured" }), {
          status: 500, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      const targetSlug = path.replace("/api/links", "").replace(/^\//, "").trim();

      if (method === "GET") {
        if (targetSlug) {
          const link = await d1.prepare("SELECT * FROM links WHERE slug = ?").bind(targetSlug).first();
          if (!link) {
            return new Response(JSON.stringify({ error: "Link not found", slug: targetSlug }), {
              status: 404, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          }
          return new Response(JSON.stringify({ success: true, link }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        } else {
          const { results } = await d1.prepare("SELECT * FROM links ORDER BY created_at DESC LIMIT 100").all();
          return new Response(JSON.stringify({ success: true, count: results?.length || 0, links: results || [] }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }

      if (method === "POST" || method === "PUT") {
        const body = await request.json().catch(() => ({})) as any;
        const { target_url, slug: reqSlug, title, description } = body;

        if (!target_url) {
          return new Response(JSON.stringify({ error: "Missing required parameter: target_url" }), {
            status: 400, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }

        const generatedSlug = reqSlug 
          ? reqSlug.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "")
          : Math.random().toString(36).substring(2, 8);

        await d1.prepare(`
          INSERT INTO links (slug, target_url, title, description) 
          VALUES (?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET target_url=excluded.target_url, title=excluded.title, description=excluded.description
        `).bind(generatedSlug, target_url, title || "", description || "").run();

        return new Response(JSON.stringify({
          success: true,
          message: "Dynamic link saved to D1",
          slug: generatedSlug,
          target_url,
          shortUrl: `${siteBase}/l/${generatedSlug}`,
          appUrl: `${siteBase}/app/${generatedSlug}`
        }), {
          status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }
    }

    if (path.startsWith("/l/") && method === "GET") {
      const slug = path.replace("/l/", "").trim();
      if (slug && d1) {
        const link = await d1.prepare("SELECT target_url FROM links WHERE slug = ?").bind(slug).first() as any;
        if (link && link.target_url) {
          return Response.redirect(link.target_url, 302);
        }
      }
    }

    // ========================================================================
    // 9. Article Resolution (/app/:slug, /:slug)
    // ========================================================================
    if (method === "GET" && path.length > 1 && !path.startsWith("/api/") && !path.startsWith("/assets/")) {
      const cleanSlug = path.replace(/^\/app\/?/i, "").replace(/^\/+|\.html$/gi, "").trim();

      if (cleanSlug && cleanSlug !== "index.html" && cleanSlug !== "admin" && cleanSlug !== "privacy") {
        const articleResponse = await resolveArticleHtml(cleanSlug, env);
        if (articleResponse) return articleResponse;

        // Fallback to SPA Shell
        return new Response(getAppHtmlShell(siteBase, cleanSlug, cleanSlug), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders }
        });
      }
    }

    // ========================================================================
    // 10. Default Route (/app, /app/, /) -> Frontend SPA Shell
    // ========================================================================
    if (bucket) {
      try {
        const obj = await bucket.get("index.html");
        if (obj) {
          const headers = new Headers(corsHeaders);
          headers.set("Content-Type", "text/html; charset=utf-8");
          return new Response(obj.body, { status: 200, headers });
        }
      } catch (_) {}
    }

    return new Response(getAppHtmlShell(siteBase), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders }
    });

  } catch (err: any) {
    console.error("[Unified Router Error]:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal Edge Error" }), {
      status: 500, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
    });
  }
}
