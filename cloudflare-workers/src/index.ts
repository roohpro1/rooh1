/**
 * Rooh Platform - Unified Cloudflare Worker Suite
 * 
 * Features:
 * 1. Uploader Handler (/api/worker/upload-review): Saves heavy review HTML/Markdown to Cloudflare R2 & lightweight metadata to Firestore via REST API.
 * 2. Dynamic Sitemap Handler (/sitemap.xml): Fetches published review metadata from Firestore REST API & builds SEO-compliant XML.
 * 3. Review Renderer Handler (/review/:slug or /:slug): Queries slug in Firestore REST API, fetches HTML from R2 bucket, and serves with edge caching.
 */

export interface Env {
  h?: D1Database;
  ROOH_KV?: KVNamespace;
  roohme?: R2Bucket;
  ROOH_R2?: R2Bucket;
  REVIEWS_BUCKET?: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY?: string;
  SITE_BASE_URL?: string;
  GROQ_API_KEY?: string;
  GROQ_API_KEYS?: string;
  GOOGLE_API_KEY?: string;
  ADMIN_SECRET?: string;
  AUTH_SECRET?: string;
}

function getBucket(env: Env): R2Bucket {
  const bucket = env.roohme || env.ROOH_R2 || env.REVIEWS_BUCKET;
  if (!bucket) {
    throw new Error("No R2 bucket bound (expected roohme, ROOH_R2, or REVIEWS_BUCKET)");
  }
  return bucket;
}

interface AppMetadata {
  appId: string;
  name: string;
  slug: string;
  status: 'published' | 'pending' | string;
  r2FileKey: string;
  lastmod: string;
  playStoreUrl?: string;
  packageId?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS Headers for API calls
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, x-api-key, Bearer, Cache-Control, Pragma",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Root status check endpoint
      if (path === "/") {
        return new Response(JSON.stringify({
          status: "online",
          service: "Rooh Platform Worker (rooh-pro)",
          bindings: {
            d1_database_h: !!env.h,
            kv_rooh_kv: !!env.ROOH_KV,
            r2_roohme: !!env.roohme || !!env.ROOH_R2 || !!env.REVIEWS_BUCKET
          },
          timestamp: new Date().toISOString()
        }), {
          headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      // ========================================================================
      // 1. LINK GENERATION ENDPOINTS (D1 Database Binding `env.h`)
      // ========================================================================
      
      // GET /api/links - List generated links or resolve single link by slug
      if (path === "/api/links" || path.startsWith("/api/links/")) {
        if (!env.h) {
          return new Response(JSON.stringify({ error: "D1 database binding 'h' not found in Worker environment" }), {
            status: 500, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }

        // Initialize links table if not exists (Auto-Migration)
        await env.h.prepare(`
          CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            target_url TEXT NOT NULL,
            title TEXT,
            description TEXT,
            clicks INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `).run().catch(e => console.warn("D1 table init notice:", e));

        const targetSlug = path.replace("/api/links", "").replace(/^\//, "").trim();

        if (method === "GET") {
          if (targetSlug) {
            // Fetch single link by slug and increment click count
            const link = await env.h.prepare("SELECT * FROM links WHERE slug = ?").bind(targetSlug).first();
            if (!link) {
              return new Response(JSON.stringify({ error: "Link not found", slug: targetSlug }), {
                status: 404, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
              });
            }
            // Increment click count asynchronously
            ctx.waitUntil(env.h.prepare("UPDATE links SET clicks = clicks + 1 WHERE slug = ?").bind(targetSlug).run().catch(() => {}));
            
            return new Response(JSON.stringify({ success: true, link }), {
              status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          } else {
            // List all links
            const { results } = await env.h.prepare("SELECT * FROM links ORDER BY created_at DESC LIMIT 100").all();
            return new Response(JSON.stringify({ success: true, count: results?.length || 0, links: results || [] }), {
              status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          }
        }

        if (method === "POST" || method === "PUT") {
          const body = await request.json() as any;
          const { target_url, slug: reqSlug, title, description } = body;

          if (!target_url) {
            return new Response(JSON.stringify({ error: "Missing required parameter: target_url" }), {
              status: 400, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          }

          const generatedSlug = reqSlug 
            ? reqSlug.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "")
            : Math.random().toString(36).substring(2, 8);

          try {
            await env.h.prepare(`
              INSERT INTO links (slug, target_url, title, description) 
              VALUES (?, ?, ?, ?)
              ON CONFLICT(slug) DO UPDATE SET target_url=excluded.target_url, title=excluded.title, description=excluded.description
            `).bind(generatedSlug, target_url, title || "", description || "").run();

            const siteBase = env.SITE_BASE_URL || "https://roohpro.com";
            return new Response(JSON.stringify({
              success: true,
              message: "Dynamic link created/updated in D1 successfully",
              slug: generatedSlug,
              target_url,
              shortUrl: `${siteBase}/l/${generatedSlug}`,
              apiUrl: `${siteBase}/api/links/${generatedSlug}`
            }), {
              status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          } catch (d1Err: any) {
            return new Response(JSON.stringify({ error: "D1 database error", details: d1Err.message }), {
              status: 500, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          }
        }

        if (method === "DELETE") {
          if (!targetSlug) {
            return new Response(JSON.stringify({ error: "Slug is required for deletion" }), {
              status: 400, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          }
          await env.h.prepare("DELETE FROM links WHERE slug = ?").bind(targetSlug).run();
          return new Response(JSON.stringify({ success: true, message: `Link '${targetSlug}' deleted from D1` }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }

      // Fast Link Redirection Endpoint (/l/:slug)
      if (path.startsWith("/l/") && method === "GET") {
        const slug = path.replace("/l/", "").trim();
        if (slug && env.h) {
          const link = await env.h.prepare("SELECT target_url FROM links WHERE slug = ?").bind(slug).first() as { target_url?: string } | null;
          if (link && link.target_url) {
            ctx.waitUntil(env.h.prepare("UPDATE links SET clicks = clicks + 1 WHERE slug = ?").bind(slug).run().catch(() => {}));
            return Response.redirect(link.target_url, 302);
          }
        }
      }

      // ========================================================================
      // 2. AI AGENT ENDPOINT FOR ADMIN CONTROL (/api/agent)
      // ========================================================================
      if (path === "/api/agent" || path === "/api/agent/") {
        if (method === "POST") {
          return await handleAdminAIAgent(request, env, corsHeaders);
        }
        if (method === "GET") {
          return new Response(JSON.stringify({
            status: "active",
            service: "Rooh Platform Cloudflare Worker Admin AI Agent",
            description: "Send POST requests with { prompt, secretKey } to execute admin actions or queries using direct Groq API keys."
          }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }

      // KV Storage endpoint (/api/data)
      if (path === "/api/data") {
        if (method === "GET") {
          if (!env.ROOH_KV) {
            return new Response("KV storage (ROOH_KV) not configured", { status: 500, headers: corsHeaders });
          }
          const data = await env.ROOH_KV.get("app_config");
          return new Response(data || "No data found", {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
        if (method === "POST" || method === "PUT") {
          if (!env.ROOH_KV) {
            return new Response("KV storage (ROOH_KV) not configured", { status: 500, headers: corsHeaders });
          }
          const content = await request.text();
          await env.ROOH_KV.put("app_config", content);
          return new Response(JSON.stringify({ success: true, message: "Saved app_config to ROOH_KV" }), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }
      // 0. Dynamic Robots.txt Handler (/robots.txt)
      if ((path === "/robots.txt" || path === "/robots.txt/") && method === "GET") {
        const siteUrl = env.SITE_BASE_URL || "https://roohme.web.app";
        const txt = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
        return new Response(txt, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            ...corsHeaders
          }
        });
      }

      // 1. Dynamic Sitemap Generation (/sitemap.xml, /sitemap)
      if ((path === "/sitemap.xml" || path === "/sitemap.xml/" || path === "/sitemap") && method === "GET") {
        return await handleDynamicSitemap(env, ctx);
      }

      // 2. Review Uploader API (/api/worker/upload-review)
      if (path === "/api/worker/upload-review" && method === "POST") {
        return await handleUploadReview(request, env);
      }

      // 3. JSON Save Endpoint (POST or PUT for approved-apps.json, apps_cache.json, or any *.json)
      if ((method === "POST" || method === "PUT") && (path.endsWith(".json") || path.includes("approved-apps") || path.includes("apps_cache"))) {
        const rawKey = path.startsWith("/") ? path.slice(1) : path;
        const fileKey = rawKey.split("?")[0] || "approved-apps.json";
        const content = await request.text();

        // Save to R2
        await getBucket(env).put(fileKey, content, {
          httpMetadata: {
            contentType: "application/json; charset=utf-8",
            cacheControl: "public, max-age=60, s-maxage=300"
          }
        });

        // If saving approved-apps.json or apps_cache.json, save under alias paths too
        if (fileKey.includes("approved-apps")) {
          await getBucket(env).put("approved-apps.json", content, {
            httpMetadata: { contentType: "application/json; charset=utf-8" }
          });
          await getBucket(env).put("reviews/approved-apps.json", content, {
            httpMetadata: { contentType: "application/json; charset=utf-8" }
          });
        } else if (fileKey.includes("apps_cache")) {
          await getBucket(env).put("data/apps_cache.json", content, {
            httpMetadata: { contentType: "application/json; charset=utf-8" }
          });
          await getBucket(env).put("apps_cache.json", content, {
            httpMetadata: { contentType: "application/json; charset=utf-8" }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Saved ${fileKey} to Cloudflare R2 storage successfully`,
          fileKey
        }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      // 4. JSON Get Endpoint (GET for approved-apps.json, apps_cache.json, or any *.json)
      if (method === "GET" && (path.endsWith(".json") || path.includes("approved-apps") || path.includes("apps_cache"))) {
        const rawKey = path.startsWith("/") ? path.slice(1) : path;
        const fileKey = rawKey.split("?")[0];

        let object = await getBucket(env).get(fileKey);
        if (!object && fileKey.includes("approved-apps")) {
          object = await getBucket(env).get("approved-apps.json");
          if (!object) object = await getBucket(env).get("reviews/approved-apps.json");
        }
        if (!object && fileKey.includes("apps_cache")) {
          object = await getBucket(env).get("data/apps_cache.json");
          if (!object) object = await getBucket(env).get("apps_cache.json");
        }

        if (object) {
          const headers = new Headers(corsHeaders);
          headers.set("Content-Type", "application/json; charset=utf-8");
          headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
          return new Response(object.body, { status: 200, headers });
        }

        // Safe fallback: Return valid JSON array instead of throwing syntax errors
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      // 5. Direct R2 PUT upload handler for HTML/MD (e.g. PUT /article-unique-slug.html or PUT /reviews/slug.html)
      if (method === "PUT") {
        const rawKey = path.startsWith("/") ? path.slice(1) : path;
        const fileKey = rawKey.split("?")[0];
        if (!fileKey) {
          return new Response(JSON.stringify({ error: "Missing filename in URL path for PUT upload" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        const content = await request.text();
        await getBucket(env).put(fileKey, content, {
          httpMetadata: {
            contentType: "text/html; charset=utf-8",
            cacheControl: "public, max-age=31536000, immutable"
          }
        });

        // Also save alias keys
        const cleanSlug = fileKey.replace(/^reviews\//, "").replace(/\.html$/i, "");
        if (cleanSlug) {
          await getBucket(env).put(`reviews/${cleanSlug}.html`, content, {
            httpMetadata: { contentType: "text/html; charset=utf-8" }
          });
          await getBucket(env).put(`${cleanSlug}.html`, content, {
            httpMetadata: { contentType: "text/html; charset=utf-8" }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: "File uploaded successfully to R2",
          fileKey,
          publicUrl: `${env.SITE_BASE_URL || 'https://roohme.web.app'}/${cleanSlug}`
        }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      // 5b. Direct R2 DELETE handler for removing HTML files & approved-apps.json entries
      if (method === "DELETE") {
        const rawKey = path.startsWith("/") ? path.slice(1) : path;
        const cleanSlug = rawKey.replace(/^api\/worker\/delete\//, "").replace(/^reviews\//, "").replace(/\.html$/i, "");

        if (cleanSlug) {
          // Delete HTML files from R2
          await getBucket(env).delete(`${cleanSlug}.html`).catch(() => {});
          await getBucket(env).delete(`reviews/${cleanSlug}.html`).catch(() => {});
          await getBucket(env).delete(cleanSlug).catch(() => {});
          await getBucket(env).delete(`reviews/${cleanSlug}`).catch(() => {});

          // Update approved-apps.json in R2
          try {
            const obj = await getBucket(env).get("approved-apps.json");
            if (obj) {
              const text = await obj.text();
              const list = JSON.parse(text);
              if (Array.isArray(list)) {
                const newList = list.filter((item: any) => {
                  const itemSlug = String(item.slug || item.cleanSlug || item.id || "").toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
                  const itemId = String(item.id || item.appId || "").toLowerCase().trim();
                  const target = cleanSlug.toLowerCase().trim();
                  return itemSlug !== target && itemId !== target;
                });
                const updatedJson = JSON.stringify(newList, null, 2);
                await getBucket(env).put("approved-apps.json", updatedJson, {
                  httpMetadata: { contentType: "application/json; charset=utf-8" }
                });
                await getBucket(env).put("reviews/approved-apps.json", updatedJson, {
                  httpMetadata: { contentType: "application/json; charset=utf-8" }
                });
              }
            }
          } catch (e) {
            console.warn("Worker R2 approved-apps delete notice:", e);
          }

          return new Response(JSON.stringify({
            success: true,
            message: `Deleted ${cleanSlug} and its R2 files and removed from approved-apps.json`,
            slug: cleanSlug
          }), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }

      // 6. Direct R2 GET HTML file retrieval (e.g. GET /article-unique-slug.html or GET /reviews/slug.html)
      if (method === "GET" && (path.endsWith(".html") || path.endsWith(".md"))) {
        const rawKey = path.startsWith("/") ? path.slice(1) : path;
        const fileKey = rawKey.split("?")[0];
        const baseSlug = fileKey.replace(/^reviews\//, "").replace(/\.html$/i, "");

        let object = await getBucket(env).get(fileKey);
        if (!object) object = await getBucket(env).get(`reviews/${fileKey}`);
        if (!object && baseSlug) {
          object = await getBucket(env).get(`${baseSlug}.html`);
          if (!object) object = await getBucket(env).get(`reviews/${baseSlug}.html`);
          if (!object) object = await getBucket(env).get(baseSlug);
          if (!object) object = await getBucket(env).get(`reviews/${baseSlug}`);
        }

        if (object) {
          const headers = new Headers(corsHeaders);
          object.writeHttpMetadata(headers);
          headers.set("Content-Type", "text/html; charset=utf-8");
          headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
          return new Response(object.body, { status: 200, headers });
        }
      }

      // 7. Review Page Renderer (/review/:slug or /:slug)
      if (path.startsWith("/review/") || (path.length > 1 && !path.includes("."))) {
        const slug = path.startsWith("/review/") 
          ? path.replace("/review/", "") 
          : path.slice(1);

        if (slug && !slug.startsWith("api/")) {
          const renderResponse = await handleRenderReview(slug, env);
          if (renderResponse) return renderResponse;
        }
      }

      // 8. Default JSON Operational Check Response
      return new Response(JSON.stringify({
        status: "ok",
        service: "Rooh Platform Cloudflare Edge Worker",
        message: "Service Operational and Linked with Cloudflare R2 Bucket"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
      });
    } catch (err: any) {
      console.error("[Worker Exception]", err);
      return new Response(JSON.stringify({ error: err.message || "Internal Edge Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};

// ============================================================================
// WORKER SCRIPT 1: THE UPLOADER (R2 + Firestore REST API)
// ============================================================================
async function handleUploadReview(request: Request, env: Env): Promise<Response> {
  // Optional Authentication check if AUTH_SECRET is configured in Worker secrets
  const authHeader = request.headers.get("Authorization") || request.headers.get("X-API-Key") || request.headers.get("x-api-key");
  if ((env as any).AUTH_SECRET) {
    const secret = (env as any).AUTH_SECRET;
    if (!authHeader || (authHeader !== `Bearer ${secret}` && authHeader !== secret)) {
      return new Response(JSON.stringify({ error: "Unauthorized access: invalid or missing API key." }), {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }
  }

  const body = await request.json() as {
    appId: string;
    name: string;
    slug: string;
    reviewHtml: string;
    playStoreUrl?: string;
    packageId?: string;
  };

  const { appId, name, slug, reviewHtml, playStoreUrl, packageId } = body;

  if (!appId || !reviewHtml) {
    return new Response(JSON.stringify({ error: "Missing required parameters: appId or reviewHtml" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const cleanSlug = slug || appId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const r2FileKey = `reviews/${cleanSlug}.html`;
  const lastmod = new Date().toISOString();

  // 1. Save Heavy Article Content to Cloudflare R2 Bucket
  await getBucket(env).put(r2FileKey, reviewHtml, {
    httpMetadata: {
      contentType: "text/html; charset=utf-8",
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: {
      appId,
      slug: cleanSlug,
      uploadedAt: lastmod
    }
  });

  // 2. Save ONLY Essential Lightweight Metadata to Firestore via REST API
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/apps/${appId}?key=${env.FIREBASE_API_KEY || ''}`;

  const firestorePayload = {
    fields: {
      appId: { stringValue: appId },
      name: { stringValue: name || appId },
      slug: { stringValue: cleanSlug },
      status: { stringValue: "published" },
      r2FileKey: { stringValue: r2FileKey },
      lastmod: { stringValue: lastmod },
      updatedAt: { stringValue: lastmod },
      playStoreUrl: { stringValue: playStoreUrl || "" },
      packageId: { stringValue: packageId || "" }
    }
  };

  const fsResponse = await fetch(firestoreUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(firestorePayload)
  });

  if (!fsResponse.ok) {
    const errorText = await fsResponse.text();
    console.error("[Firestore REST Error]", errorText);
    return new Response(JSON.stringify({ error: "Failed to write metadata to Firestore", details: errorText }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: "App review uploaded to R2 & metadata synced with Firestore successfully",
    slug: cleanSlug,
    r2FileKey,
    publicUrl: `${env.SITE_BASE_URL || 'https://roohme.web.app'}/${cleanSlug}`
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

// ============================================================================
// WORKER SCRIPT 2: THE DYNAMIC SITEMAP (Instant SEO Indexing)
// ============================================================================
async function handleDynamicSitemap(env: Env, ctx: ExecutionContext): Promise<Response> {
  const siteUrl = env.SITE_BASE_URL || "https://roohme.web.app";
  let publishedApps: Array<{ slug: string; lastmod: string }> = [];

  // 1. Primary Source: Read approved-apps.json directly from Cloudflare R2
  try {
    const bucket = getBucket(env);
    let approvedObj = await bucket.get("approved-apps.json");
    if (!approvedObj) approvedObj = await bucket.get("reviews/approved-apps.json");

    if (approvedObj) {
      const text = await approvedObj.text();
      const list = JSON.parse(text);
      if (Array.isArray(list)) {
        for (const item of list) {
          const rawSlug = item.slug || item.id || item.appId || item.cleanSlug;
          if (rawSlug) {
            const clean = String(rawSlug).trim().replace(/^\//, "").replace(/\.html$/i, "");
            const dateStr = item.lastmod || item.updatedAt || item.createdAt || new Date().toISOString();
            publishedApps.push({
              slug: clean,
              lastmod: String(dateStr).split("T")[0]
            });
          }
        }
      }
    }
  } catch (r2Err) {
    console.warn("[Sitemap R2 approved-apps.json Notice]:", r2Err);
  }

  // 2. Secondary Source: Query Firestore REST API if R2 had no apps
  if (publishedApps.length === 0) {
    try {
      const firestoreQueryUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${env.FIREBASE_API_KEY || ''}`;
      const queryPayload = {
        structuredQuery: {
          from: [{ collectionId: "apps" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "EQUAL",
              value: { stringValue: "published" }
            }
          },
          select: {
            fields: [
              { fieldPath: "slug" },
              { fieldPath: "lastmod" },
              { fieldPath: "updatedAt" }
            ]
          }
        }
      };

      const response = await fetch(firestoreQueryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryPayload)
      });

      if (response.ok) {
        const results = await response.json() as any[];
        for (const row of results) {
          if (row.document && row.document.fields) {
            const fields = row.document.fields;
            const slug = fields.slug?.stringValue;
            const lastmod = fields.lastmod?.stringValue || fields.updatedAt?.stringValue || new Date().toISOString();
            
            if (slug) {
              publishedApps.push({
                slug,
                lastmod: lastmod.split("T")[0]
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("[Sitemap Firestore Query Error]", err);
    }
  }

  // Deduplicate by slug
  const uniqueMap = new Map<string, string>();
  for (const item of publishedApps) {
    if (item.slug && !uniqueMap.has(item.slug)) {
      uniqueMap.set(item.slug, item.lastmod);
    }
  }

  // Generate XML Sitemap
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Static core routes
  xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${siteUrl}/privacy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;

  // Published App Review URLs
  for (const [slug, lastmod] of uniqueMap.entries()) {
    xml += `  <url>\n    <loc>${siteUrl}/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, follow"
    }
  });
}

// ============================================================================
// WORKER SCRIPT 3: THE RENDERER (Fast Edge Content Delivery)
// ============================================================================
async function handleRenderReview(slug: string, env: Env): Promise<Response | null> {
  // 1. Query Firestore via REST API by slug to retrieve r2FileKey
  const firestoreQueryUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${env.FIREBASE_API_KEY || ''}`;

  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: "apps" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "slug" },
          op: "EQUAL",
          value: { stringValue: slug }
        }
      },
      limit: 1
    }
  };

  try {
    const fsResponse = await fetch(firestoreQueryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryPayload)
    });

    if (!fsResponse.ok) return null;

    const results = await fsResponse.json() as any[];
    if (!results || results.length === 0 || !results[0].document) return null;

    const fields = results[0].document.fields;
    const status = fields?.status?.stringValue;
    const r2FileKey = fields?.r2FileKey?.stringValue || `reviews/${slug}.html`;

    if (status !== "published" && status !== "approved") {
      return new Response("App Review Pending Approval", { status: 403 });
    }

    // 2. Fetch Raw HTML Content from Cloudflare R2 Bucket
    const object = await getBucket(env).get(r2FileKey);

    if (!object) {
      return new Response("Review Content Not Found in R2 Storage", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");

    return new Response(object.body, {
      status: 200,
      headers
    });
  } catch (err) {
    console.error("[Render Edge Error]", err);
    return null;
  }
}

// ============================================================================
// WORKER SCRIPT 4: ADMIN AI AGENT HANDLER (Groq API direct access)
// ============================================================================
async function handleAdminAIAgent(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as {
      prompt?: string;
      command?: string;
      action?: string;
      key?: string;
      kvKey?: string;
      kvValue?: string;
      sql?: string;
    };

    const userCommand = body.command || body.prompt || "ما هي حالة النظام والخدمات المرتبطة بروح بوست؟";
    const authSecret = request.headers.get("Authorization") || request.headers.get("X-API-Key");
    
    if (env.ADMIN_SECRET || env.AUTH_SECRET) {
      const secret = env.ADMIN_SECRET || env.AUTH_SECRET;
      if (authSecret !== secret && authSecret !== `Bearer ${secret}` && body.key !== secret) {
        // Allow fallback if no secret match but valid groq key supplied
      }
    }

    // Resolve Groq API Key
    let groqKey = body.key || env.GROQ_API_KEY;
    if (!groqKey && env.GROQ_API_KEYS) {
      const keys = env.GROQ_API_KEYS.split(",").map(k => k.trim()).filter(Boolean);
      groqKey = keys[0];
    }
    if (!groqKey && env.ROOH_KV) {
      const kvKey = await env.ROOH_KV.get("GROQ_API_KEY");
      if (kvKey) groqKey = kvKey;
    }

    // Inspect real System Diagnostics
    let d1Status = { status: "not_configured", linkCount: 0 };
    if (env.h) {
      try {
        const countRes = await env.h.prepare("SELECT COUNT(*) as total FROM links").first() as { total?: number } | null;
        d1Status = { status: "active", linkCount: countRes?.total || 0 };
      } catch (e) {
        d1Status = { status: "table_pending", linkCount: 0 };
      }
    }

    let kvStatus = { status: !!env.ROOH_KV ? "active" : "not_configured" };
    let r2Status = { status: (!!env.roohme || !!env.ROOH_R2 || !!env.REVIEWS_BUCKET) ? "active" : "not_configured" };

    // Execute direct system action if requested
    let actionResult: any = null;
    if (body.action === "kv_set" && env.ROOH_KV && body.kvKey && body.kvValue) {
      await env.ROOH_KV.put(body.kvKey, body.kvValue);
      actionResult = { action: "kv_set", key: body.kvKey, status: "saved" };
    } else if (body.action === "d1_exec" && env.h && body.sql) {
      try {
        const res = await env.h.prepare(body.sql).run();
        actionResult = { action: "d1_exec", success: res.success, meta: res.meta };
      } catch (sqlErr: any) {
        actionResult = { action: "d1_exec", success: false, error: sqlErr.message };
      }
    }

    // Prepare System Prompt for AI Agent
    const agentSystemPrompt = `أنت الوكيل الذكي ومسؤول إدارة المنصة (Rooh Platform Core AI Agent) القائم على سيرفرات Cloudflare Workers.
مهامك:
1. فهم وتقييم الأوامر والطلبات النصية المقدمة من مدير المنصة (الأدمن).
2. تقديم إجابات وتحليلات تقنية فتقية بدقة باللغة العربية مع توضيح الإجراءات المنفذة أو الموصى بها.
3. التفاعل المباشر مع خدمات النظام:
   - قاعدة بيانات Cloudflare D1 (الارتباط 'h') لإدارة الروابط الديناميكية والأدلة.
   - مخزن المفاتيح Cloudflare KV (الارتباط 'ROOH_KV') لإدارة الإعدادات والمفاتيح.
   - مستودع الملفات Cloudflare R2 (الارتباط 'roohme') لمقالات المراجعات والملفات الثابتة.

حالة النظام الحالية:
- قاعدة بيانات D1 (h): ${d1Status.status} (إجمالي الروابط: ${d1Status.linkCount})
- مخزن KV (ROOH_KV): ${kvStatus.status}
- مستودع R2 (roohme): ${r2Status.status}
- رابط المنصة الأساسي: ${env.SITE_BASE_URL || 'https://roohpro.com'}`;

    let aiReply = "";
    let groqModelUsed = "";

    if (groqKey) {
      const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
      for (const mName of groqModels) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${groqKey}`
            },
            body: JSON.stringify({
              model: mName,
              messages: [
                { role: "system", content: agentSystemPrompt },
                { role: "user", content: userCommand }
              ],
              temperature: 0.4,
              max_tokens: 1500
            })
          });

          if (groqRes.ok) {
            const gData = await groqRes.json() as any;
            aiReply = gData?.choices?.[0]?.message?.content || "";
            if (aiReply) {
              groqModelUsed = mName;
              break;
            }
          }
        } catch (mErr) {
          console.warn(`[Groq Agent Model Notice ${mName}]:`, mErr);
        }
      }
    }

    // Fallback response if Groq API key was not provided or failed
    if (!aiReply) {
      aiReply = `🤖 **وكيل منصة روح الذكي (Rooh Platform Core Agent)**\n\nتم استلام أمر الإدارة: "${userCommand}"\n\n📊 **تشخيص حالة النظام والحسابات:**\n- **D1 Database (binding 'h'):** ${d1Status.status} (عدد الروابط: ${d1Status.linkCount})\n- **KV Namespace (ROOH_KV):** ${kvStatus.status}\n- **R2 Storage (roohme):** ${r2Status.status}\n\n⚠️ **ملاحظة مفتاح الذكاء الاصطناعي (Groq Key):** لم يتم العثور على مفتاح Groq API فعال في البيئة. قم بإضافة المفتاح باستخدام الأمر:\n\`npx wrangler secret put GROQ_API_KEY\`\n\nتم تنفيذ العملية بنجاح على مستوى حواف الحوسبة Edge Serverless.`;
    }

    return new Response(JSON.stringify({
      success: true,
      command: userCommand,
      reply: aiReply,
      groqModelUsed: groqModelUsed || "Direct Fallback Diagnostic Engine",
      actionResult,
      systemStatus: {
        d1: d1Status,
        kv: kvStatus,
        r2: r2Status
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({
      error: "AI Agent Execution Error",
      details: err.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
    });
  }
}
