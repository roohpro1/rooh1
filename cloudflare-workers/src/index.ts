/**
 * Rooh Platform - Unified Cloudflare Worker Gateway & Edge Routing Engine
 * Main Domain: https://roohpro.com
 * Gateway Path: https://roohpro.com/app
 *
 * Requirements & Features:
 * 1. Gateway Route (/app & /app/): Instant Frontend SPA response without infinite loading loops.
 * 2. App Direct Routes (/app/:slug & /:slug): Supports links like https://roohpro.com/app/TikTok.
 * 3. Relative API Routing (/api/...): Seamless relative path API connectivity with global CORS.
 * 4. Hybrid Routing Engine: D1 Database + R2 Bucket Storage + Firestore Fallback + SPA Shell.
 * 5. D1 Link Shortener & Links API (/api/links, /l/:slug).
 * 6. Dynamic Sitemap XML & Robots.txt Generator (/sitemap.xml, /robots.txt).
 * 7. Admin AI Agent Endpoint (/api/agent).
 */

export interface Env {
  h?: D1Database;              // Primary D1 Database binding
  ROOH_KV?: KVNamespace;       // Key-Value store
  roohme?: R2Bucket;           // Primary R2 Storage bucket
  ROOH_R2?: R2Bucket;          // Secondary R2 Bucket alias
  REVIEWS_BUCKET?: R2Bucket;   // Tertiary R2 Bucket alias
  FIREBASE_PROJECT_ID: string;
  FIREBASE_API_KEY?: string;
  SITE_BASE_URL?: string;      // Default: https://roohpro.com
  ORIGIN_URL?: string;         // Origin backend URL for proxying
  GROQ_API_KEY?: string;
  GROQ_API_KEYS?: string;
  GOOGLE_API_KEY?: string;
  ADMIN_SECRET?: string;
  AUTH_SECRET?: string;
}

function getBucket(env: Env): R2Bucket {
  const bucket = env.roohme || env.ROOH_R2 || env.REVIEWS_BUCKET;
  if (!bucket) {
    throw new Error("No R2 bucket bound (expected 'roohme', 'ROOH_R2', or 'REVIEWS_BUCKET')");
  }
  return bucket;
}

// Embedded Frontend SPA HTML Shell for Instant /app Gateway Serving (Prevents Infinite Loading)
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const siteBase = (env.SITE_BASE_URL || "https://roohpro.com").replace(/\/+$/, "");

    // Global CORS Headers supporting custom admin headers
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, x-api-key, Bearer, Cache-Control, Pragma, X-Admin-Email, X-Admin-Password, x-admin-email, x-admin-password, X-Admin-Secret, x-admin-secret",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Lazy initialization of D1 tables if D1 binding `env.h` exists
      if (env.h && (path.startsWith("/api/links") || path.startsWith("/l/") || path.startsWith("/app") || path === "/")) {
        ctx.waitUntil(initD1Tables(env.h));
      }

      // ========================================================================
      // 1. MAIN GATEWAY & APP ROUTES: /app, /app/, or /app/:slug (e.g. /app/TikTok)
      // ========================================================================
      if (path === "/app" || path === "/app/" || path.startsWith("/app/")) {
        const subSlug = path.replace(/^\/app\/?/i, "").trim().replace(/\.html$/i, "");

        // A. If a specific app slug is requested (e.g. /app/TikTok or /app/tiktok)
        if (subSlug && subSlug !== "index.html") {
          // Check D1, R2, or Firestore for pre-rendered article HTML
          const articleResponse = await resolveArticleHtml(subSlug, env, corsHeaders);
          if (articleResponse) return articleResponse;

          // If no static article HTML exists, serve the Frontend SPA Shell with the requested app slug context
          return new Response(getAppHtmlShell(siteBase, subSlug, subSlug), {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders }
          });
        }

        // B. Main Gateway Root (/app or /app/) - Immediate Frontend SPA Serving
        try {
          const bucket = getBucket(env);
          let object = await bucket.get("index.html");
          if (!object) object = await bucket.get("app/index.html");
          if (!object) object = await bucket.get("dist/index.html");

          if (object) {
            const headers = new Headers(corsHeaders);
            headers.set("Content-Type", "text/html; charset=utf-8");
            headers.set("Cache-Control", "public, max-age=300, s-maxage=3600");
            return new Response(object.body, { status: 200, headers });
          }
        } catch (e) {
          console.warn("[Worker Gateway] R2 index.html check notice:", e);
        }

        // If ORIGIN_URL is configured, proxy to origin server fallback
        if (env.ORIGIN_URL && !env.ORIGIN_URL.includes("roohpro.com")) {
          try {
            const originRes = await fetch(`${env.ORIGIN_URL.replace(/\/+$/, "")}/index.html`, {
              headers: request.headers
            });
            if (originRes.ok) {
              const bodyText = await originRes.text();
              return new Response(bodyText, {
                status: 200,
                headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders }
              });
            }
          } catch (pErr) {
            console.warn("[Worker Gateway] Origin proxy notice:", pErr);
          }
        }

        // Fallback: Immediate response with embedded Frontend SPA Shell (Prevents Infinite Loading)
        return new Response(getAppHtmlShell(siteBase), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders }
        });
      }

      // Root Homepage Route (/)
      if (path === "/") {
        try {
          const bucket = getBucket(env);
          const object = await bucket.get("index.html");
          if (object) {
            const headers = new Headers(corsHeaders);
            headers.set("Content-Type", "text/html; charset=utf-8");
            return new Response(object.body, { status: 200, headers });
          }
        } catch (_) {}

        return new Response(getAppHtmlShell(siteBase), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders }
        });
      }

      // ========================================================================
      // 2. SYSTEM & STATIC ENDPOINTS (robots.txt, sitemap.xml, /api/health)
      // ========================================================================
      
      // Dynamic Robots.txt
      if (path === "/robots.txt" || path === "/robots.txt/") {
        const txt = `User-agent: *\nAllow: /\n\nSitemap: ${siteBase}/sitemap.xml\n`;
        return new Response(txt, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            ...corsHeaders
          }
        });
      }

      // Dynamic Sitemap XML
      if (path === "/sitemap.xml" || path === "/sitemap.xml/" || path === "/sitemap") {
        return await handleDynamicSitemap(env, ctx, siteBase);
      }

      // Health / Status Check Endpoint
      if (path === "/api/health" || path === "/api/status") {
        return new Response(JSON.stringify({
          status: "online",
          service: "Rooh Platform Unified Cloudflare Worker Gateway",
          domain: "roohpro.com",
          gatewayPath: `${siteBase}/app`,
          bindings: {
            d1: !!env.h,
            kv: !!env.ROOH_KV,
            r2: !!env.roohme || !!env.ROOH_R2 || !!env.REVIEWS_BUCKET
          },
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      // ========================================================================
      // 3. D1 DYNAMIC LINKS & SHORTENER (/api/links, /l/:slug)
      // ========================================================================
      if (path === "/api/links" || path.startsWith("/api/links/")) {
        if (!env.h) {
          return new Response(JSON.stringify({ error: "D1 database binding 'h' not found in Worker environment" }), {
            status: 500, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }

        const targetSlug = path.replace("/api/links", "").replace(/^\//, "").trim();

        if (method === "GET") {
          if (targetSlug) {
            const link = await env.h.prepare("SELECT * FROM links WHERE slug = ?").bind(targetSlug).first();
            if (!link) {
              return new Response(JSON.stringify({ error: "Link not found", slug: targetSlug }), {
                status: 404, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
              });
            }
            ctx.waitUntil(env.h.prepare("UPDATE links SET clicks = clicks + 1 WHERE slug = ?").bind(targetSlug).run().catch(() => {}));
            return new Response(JSON.stringify({ success: true, link }), {
              status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          } else {
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

          await env.h.prepare(`
            INSERT INTO links (slug, target_url, title, description) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET target_url=excluded.target_url, title=excluded.title, description=excluded.description
          `).bind(generatedSlug, target_url, title || "", description || "").run();

          return new Response(JSON.stringify({
            success: true,
            message: "Dynamic link saved to D1 successfully",
            slug: generatedSlug,
            target_url,
            shortUrl: `${siteBase}/l/${generatedSlug}`,
            appUrl: `${siteBase}/app/${generatedSlug}`,
            apiUrl: `${siteBase}/api/links/${generatedSlug}`
          }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
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

      // Fast Link Redirection (/l/:slug)
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
      // 4. ADMIN AI AGENT ENDPOINT (/api/agent)
      // ========================================================================
      if (path === "/api/agent" || path === "/api/agent/") {
        if (method === "POST") {
          return await handleAdminAIAgent(request, env, corsHeaders, siteBase);
        }
        if (method === "GET") {
          return new Response(JSON.stringify({
            status: "active",
            service: "Rooh Platform Cloudflare Worker Admin AI Agent",
            description: "Send POST requests with { prompt, command } to execute admin actions or queries."
          }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }

      // ========================================================================
      // 5. KV & JSON STORAGE ENDPOINTS (/api/data, approved-apps.json, apps_cache.json)
      // ========================================================================
      if (path === "/api/data") {
        if (method === "GET") {
          if (!env.ROOH_KV) return new Response("KV storage not configured", { status: 500, headers: corsHeaders });
          const data = await env.ROOH_KV.get("app_config");
          return new Response(data || "No data found", { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders } });
        }
        if (method === "POST" || method === "PUT") {
          if (!env.ROOH_KV) return new Response("KV storage not configured", { status: 500, headers: corsHeaders });
          const content = await request.text();
          await env.ROOH_KV.put("app_config", content);
          return new Response(JSON.stringify({ success: true, message: "Saved app_config to ROOH_KV" }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }

      // JSON Get/Put endpoints for approved-apps.json or apps_cache.json
      if (path.endsWith(".json") || path.includes("approved-apps") || path.includes("apps_cache")) {
        const fileKey = path.startsWith("/") ? path.slice(1).split("?")[0] : path.split("?")[0];

        if (method === "POST" || method === "PUT") {
          const content = await request.text();
          await getBucket(env).put(fileKey, content, {
            httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "public, max-age=60, s-maxage=300" }
          });

          if (fileKey.includes("approved-apps")) {
            await getBucket(env).put("approved-apps.json", content, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
            await getBucket(env).put("reviews/approved-apps.json", content, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
          } else if (fileKey.includes("apps_cache")) {
            await getBucket(env).put("data/apps_cache.json", content, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
            await getBucket(env).put("apps_cache.json", content, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
          }

          return new Response(JSON.stringify({ success: true, message: `Saved ${fileKey} to R2`, fileKey }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }

        if (method === "GET") {
          let object = await getBucket(env).get(fileKey);
          if (!object && fileKey.includes("approved-apps")) {
            object = await getBucket(env).get("approved-apps.json") || await getBucket(env).get("reviews/approved-apps.json");
          }
          if (!object && fileKey.includes("apps_cache")) {
            object = await getBucket(env).get("data/apps_cache.json") || await getBucket(env).get("apps_cache.json");
          }

          if (object) {
            const headers = new Headers(corsHeaders);
            headers.set("Content-Type", "application/json; charset=utf-8");
            headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
            return new Response(object.body, { status: 200, headers });
          }

          return new Response("[]", { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders } });
        }
      }

      // Review Uploader Handler (/api/worker/upload-review)
      if (path === "/api/worker/upload-review" && method === "POST") {
        return await handleUploadReview(request, env, siteBase);
      }

      // Direct R2 HTML/MD file uploads (PUT)
      if (method === "PUT" && (path.endsWith(".html") || path.endsWith(".md"))) {
        const fileKey = path.replace(/^\/+/, "").split("?")[0];
        const content = await request.text();
        await getBucket(env).put(fileKey, content, {
          httpMetadata: { contentType: "text/html; charset=utf-8", cacheControl: "public, max-age=31536000, immutable" }
        });

        const cleanSlug = fileKey.replace(/^reviews\//, "").replace(/^app\//, "").replace(/\.html$/i, "");
        if (cleanSlug) {
          await getBucket(env).put(`reviews/${cleanSlug}.html`, content, { httpMetadata: { contentType: "text/html; charset=utf-8" } });
          await getBucket(env).put(`${cleanSlug}.html`, content, { httpMetadata: { contentType: "text/html; charset=utf-8" } });
          await getBucket(env).put(`app/${cleanSlug}.html`, content, { httpMetadata: { contentType: "text/html; charset=utf-8" } });

          // Also register in D1 'apps' table if available
          if (env.h) {
            ctx.waitUntil(env.h.prepare(`
              INSERT INTO apps (app_id, name, slug, status, r2_file_key, lastmod)
              VALUES (?, ?, ?, 'published', ?, CURRENT_TIMESTAMP)
              ON CONFLICT(slug) DO UPDATE SET r2_file_key=excluded.r2_file_key, lastmod=CURRENT_TIMESTAMP
            `).bind(cleanSlug, cleanSlug, cleanSlug, `reviews/${cleanSlug}.html`).run().catch(() => {}));
          }
        }

        return new Response(JSON.stringify({
          success: true,
          message: "Article uploaded to R2 & registered in edge database",
          fileKey,
          publicAppUrl: `${siteBase}/app/${cleanSlug}`,
          publicCleanUrl: `${siteBase}/${cleanSlug}`
        }), {
          status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }

      // Direct R2 DELETE handler
      if (method === "DELETE") {
        const cleanSlug = path.replace(/^\/+/, "").replace(/^api\/worker\/delete\//, "").replace(/^reviews\//, "").replace(/^app\//, "").replace(/\.html$/i, "");
        if (cleanSlug) {
          await getBucket(env).delete(`${cleanSlug}.html`).catch(() => {});
          await getBucket(env).delete(`reviews/${cleanSlug}.html`).catch(() => {});
          await getBucket(env).delete(`app/${cleanSlug}.html`).catch(() => {});
          await getBucket(env).delete(cleanSlug).catch(() => {});

          if (env.h) {
            ctx.waitUntil(env.h.prepare("DELETE FROM apps WHERE slug = ?").bind(cleanSlug).run().catch(() => {}));
          }

          return new Response(JSON.stringify({ success: true, message: `Deleted ${cleanSlug} from R2 and edge DB`, slug: cleanSlug }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }

      // Direct R2 HTML File GET handler (e.g. GET /clean-slug.html)
      if (method === "GET" && (path.endsWith(".html") || path.endsWith(".md"))) {
        const fileKey = path.replace(/^\/+/, "").split("?")[0];
        const baseSlug = fileKey.replace(/^reviews\//, "").replace(/^app\//, "").replace(/\.html$/i, "");

        let object = await getBucket(env).get(fileKey) 
                  || await getBucket(env).get(`reviews/${fileKey}`) 
                  || await getBucket(env).get(`app/${fileKey}`) 
                  || await getBucket(env).get(`${baseSlug}.html`) 
                  || await getBucket(env).get(`reviews/${baseSlug}.html`)
                  || await getBucket(env).get(`app/${baseSlug}.html`);

        if (object) {
          const headers = new Headers(corsHeaders);
          headers.set("Content-Type", "text/html; charset=utf-8");
          headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
          return new Response(object.body, { status: 200, headers });
        }
      }

      // ========================================================================
      // 6. HYBRID ROUTER FOR DIRECT CLEAN SLUGS & ARTICLES (/:slug)
      // ========================================================================
      if (method === "GET" && path.length > 1 && !path.startsWith("/api/") && !path.startsWith("/assets/")) {
        const cleanSlug = path.replace(/^\/+|\.html$/gi, "").trim();

        if (cleanSlug) {
          const articleResponse = await resolveArticleHtml(cleanSlug, env, corsHeaders);
          if (articleResponse) return articleResponse;

          // Fallback to Frontend SPA Application Shell
          return new Response(getAppHtmlShell(siteBase, cleanSlug, cleanSlug), {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders }
          });
        }
      }

      // Default Fallback
      return new Response(getAppHtmlShell(siteBase), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders }
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

// Helper: Resolve pre-rendered HTML review article across D1 and R2
async function resolveArticleHtml(cleanSlug: string, env: Env, corsHeaders: Record<string, string>): Promise<Response | null> {
  const normSlug = cleanSlug.toLowerCase();

  // 1. D1 Database query for rapid edge resolution
  if (env.h) {
    try {
      const d1App = await env.h.prepare("SELECT * FROM apps WHERE (slug = ? OR LOWER(slug) = ? OR app_id = ?) AND status = 'published'").bind(cleanSlug, normSlug, cleanSlug).first() as any;
      if (d1App && d1App.r2_file_key) {
        const object = await getBucket(env).get(d1App.r2_file_key) 
                    || await getBucket(env).get(`${cleanSlug}.html`)
                    || await getBucket(env).get(`reviews/${cleanSlug}.html`)
                    || await getBucket(env).get(`app/${cleanSlug}.html`);
        if (object) {
          const headers = new Headers(corsHeaders);
          headers.set("Content-Type", "text/html; charset=utf-8");
          headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
          return new Response(object.body, { status: 200, headers });
        }
      }
    } catch (d1Err) {
      console.warn("[Hybrid Router] D1 query notice:", d1Err);
    }
  }

  // 2. Direct R2 Bucket Lookup across multi-prefix keys
  try {
    const object = await getBucket(env).get(`${cleanSlug}.html`) 
                || await getBucket(env).get(`reviews/${cleanSlug}.html`)
                || await getBucket(env).get(`app/${cleanSlug}.html`)
                || await getBucket(env).get(`${normSlug}.html`)
                || await getBucket(env).get(`reviews/${normSlug}.html`)
                || await getBucket(env).get(cleanSlug);

    if (object) {
      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", "text/html; charset=utf-8");
      headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
      return new Response(object.body, { status: 200, headers });
    }
  } catch (r2Err) {
    console.warn("[Hybrid Router] R2 lookup notice:", r2Err);
  }

  return null;
}

// Auto-Initialize D1 Tables if binding `h` exists
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

// Upload Review Handler
async function handleUploadReview(request: Request, env: Env, siteBase: string): Promise<Response> {
  const body = await request.json() as {
    appId: string;
    name: string;
    slug: string;
    reviewHtml: string;
    playStoreUrl?: string;
    packageId?: string;
  };

  const { appId, name, slug, reviewHtml } = body;
  if (!appId || !reviewHtml) {
    return new Response(JSON.stringify({ error: "Missing required parameters: appId or reviewHtml" }), { status: 400 });
  }

  const cleanSlug = slug || appId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const r2FileKey = `reviews/${cleanSlug}.html`;
  const lastmod = new Date().toISOString();

  // 1. Save HTML to R2 across multiple keys for high availability
  await getBucket(env).put(r2FileKey, reviewHtml, {
    httpMetadata: { contentType: "text/html; charset=utf-8", cacheControl: "public, max-age=31536000, immutable" }
  });
  await getBucket(env).put(`${cleanSlug}.html`, reviewHtml, {
    httpMetadata: { contentType: "text/html; charset=utf-8" }
  });
  await getBucket(env).put(`app/${cleanSlug}.html`, reviewHtml, {
    httpMetadata: { contentType: "text/html; charset=utf-8" }
  });

  // 2. Sync to D1 Database if available
  if (env.h) {
    await env.h.prepare(`
      INSERT INTO apps (app_id, name, slug, status, r2_file_key, lastmod)
      VALUES (?, ?, ?, 'published', ?, ?)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, r2_file_key=excluded.r2_file_key, lastmod=excluded.lastmod
    `).bind(appId, name || appId, cleanSlug, r2FileKey, lastmod).run().catch(() => {});
  }

  return new Response(JSON.stringify({
    success: true,
    message: "Article uploaded to R2 & synced to D1 edge database",
    slug: cleanSlug,
    appUrl: `${siteBase}/app/${cleanSlug}`,
    cleanUrl: `${siteBase}/app/${cleanSlug}`
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

// Dynamic Sitemap Generator
async function handleDynamicSitemap(env: Env, ctx: ExecutionContext, siteBase: string): Promise<Response> {
  let publishedApps: Array<{ slug: string; lastmod: string }> = [];

  // 1. Query D1 Database
  if (env.h) {
    try {
      const { results } = await env.h.prepare("SELECT slug, lastmod FROM apps WHERE status = 'published'").all();
      if (results && results.length > 0) {
        results.forEach((row: any) => {
          if (row.slug) {
            publishedApps.push({ slug: row.slug, lastmod: String(row.lastmod || "").split("T")[0] });
          }
        });
      }
    } catch (_) {}
  }

  // 2. Query R2 approved-apps.json if D1 had no rows
  if (publishedApps.length === 0) {
    try {
      let approvedObj = await getBucket(env).get("approved-apps.json") || await getBucket(env).get("reviews/approved-apps.json");
      if (approvedObj) {
        const list = JSON.parse(await approvedObj.text());
        if (Array.isArray(list)) {
          list.forEach((item: any) => {
            const rawSlug = item.slug || item.id || item.cleanSlug;
            if (rawSlug) {
              const clean = String(rawSlug).trim().replace(/^\//, "").replace(/^app\//, "").replace(/\.html$/i, "");
              publishedApps.push({ slug: clean, lastmod: String(item.lastmod || item.updatedAt || new Date().toISOString()).split("T")[0] });
            }
          });
        }
      }
    } catch (_) {}
  }

  // Deduplicate entries
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

// Admin AI Agent Handler
async function handleAdminAIAgent(request: Request, env: Env, corsHeaders: Record<string, string>, siteBase: string): Promise<Response> {
  try {
    const body = await request.json() as { prompt?: string; command?: string; key?: string };
    const userCommand = body.command || body.prompt || "حالة المنصة والنظام";

    let groqKey = body.key || env.GROQ_API_KEY;
    if (!groqKey && env.GROQ_API_KEYS) groqKey = env.GROQ_API_KEYS.split(",")[0].trim();

    let d1Count = 0;
    if (env.h) {
      const c = await env.h.prepare("SELECT COUNT(*) as total FROM links").first() as any;
      d1Count = c?.total || 0;
    }

    const agentPrompt = `أنت الوكيل الذكي لمنصة روح (roohpro.com).
النظام يعمل بموديل توجيه هجين (Hybrid Edge Router):
- مسار البوابة الرئيسي: ${siteBase}/app
- مسار التطبيقات المباشر: ${siteBase}/app/:slug
- قاعدة بيانات D1: ${env.h ? 'متصلة' : 'غير مفعلة'} (عدد الروابط: ${d1Count})
- R2 Storage: ${getBucket(env) ? 'متصل' : 'غير متصل'}`;

    let reply = "";
    if (groqKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: agentPrompt }, { role: "user", content: userCommand }],
          max_tokens: 1000
        })
      });
      if (res.ok) {
        const data = await res.json() as any;
        reply = data?.choices?.[0]?.message?.content || "";
      }
    }

    if (!reply) {
      reply = `🤖 **وكيل منصة روح (Rooh Edge Agent)**\n\nتم تنفيذ الأمر: "${userCommand}"\n- مسار البوابة الرئيسي: ${siteBase}/app\n- رابط التطبيق الاختباري: ${siteBase}/app/TikTok\n- حالة D1 Database: ${env.h ? 'نشط' : 'غير مرتبط'}\n- حالة R2 Storage: نشط`;
    }

    return new Response(JSON.stringify({ success: true, command: userCommand, reply }), {
      status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
