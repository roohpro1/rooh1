// workers/uploader.ts
var uploader_default = {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${env.AUTH_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized access." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      const payload = await request.json();
      if (!payload.appId || !payload.slug || !payload.reviewContentHtml) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: appId, slug, or reviewContentHtml." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const cleanSlug = payload.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const r2Key = `reviews/${cleanSlug}.html`;
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const r2Bucket = env.R2_BUCKET || env.ROOH_BUCKET || env.ROOH_R2 || env.roohme;
      if (!r2Bucket) {
        return new Response(JSON.stringify({ error: "R2 bucket storage binding not found." }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      await r2Bucket.put(r2Key, payload.reviewContentHtml, {
        httpMetadata: {
          contentType: "text/html; charset=utf-8",
          cacheControl: "public, max-age=31536000, immutable"
        },
        customMetadata: {
          appId: payload.appId,
          slug: cleanSlug,
          uploadedAt: nowIso
        }
      });
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/apps/${payload.appId}?key=${env.FIREBASE_API_KEY}`;
      const firestoreFields = {
        fields: {
          slug: { stringValue: cleanSlug },
          r2Key: { stringValue: r2Key },
          status: { stringValue: "published" },
          isApproved: { booleanValue: true },
          name: { stringValue: payload.name || payload.appId },
          playStoreUrl: { stringValue: payload.playStoreUrl || "" },
          iconUrl: { stringValue: payload.iconUrl || "" },
          description: { stringValue: payload.description || "" },
          lastmod: { stringValue: nowIso.split("T")[0] },
          updatedAt: { timestampValue: nowIso }
        }
      };
      const firestoreRes = await fetch(firestoreUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(firestoreFields)
      });
      if (!firestoreRes.ok) {
        const errText = await firestoreRes.text();
        console.error("Firestore REST API Error:", errText);
        return new Response(
          JSON.stringify({
            error: "Failed to update Firestore metadata.",
            details: errText,
            r2Key
          }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: "Review uploaded to R2 and metadata updated in Firestore successfully!",
          appId: payload.appId,
          slug: cleanSlug,
          r2Key,
          publicUrl: `${env.SITE_URL || "https://roohpro.com"}/review/${cleanSlug}`
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Uploader Worker Exception:", err);
      return new Response(
        JSON.stringify({ error: "Internal server error", message: err?.message || String(err) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};

// workers/sitemap.ts
var sitemap_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/sitemap.xml") {
      return new Response("Not Found", { status: 404 });
    }
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }
    const siteUrl = env.SITE_URL || "https://roohpro.com";
    try {
      let publishedApps = [];
      try {
        let approvedJsonStr = null;
        if (env.ROOH_KV) {
          approvedJsonStr = await env.ROOH_KV.get("APPROVED_APPS_JSON");
        }
        if (!approvedJsonStr && env.R2_BUCKET) {
          const approvedObj = await env.R2_BUCKET.get("approved-apps.json");
          if (approvedObj) {
            approvedJsonStr = await approvedObj.text();
          }
        }
        if (approvedJsonStr) {
          const parsed = JSON.parse(approvedJsonStr);
          if (Array.isArray(parsed)) {
            publishedApps = parsed.filter((item) => item && (item.isApproved !== false && item.status !== "pending") && (item.slug || item.cleanSlug)).map((item) => ({
              slug: String(item.cleanSlug || item.slug).replace(/^\/+|\.html$/gi, ""),
              lastmod: item.lastmod || item.updatedAt ? String(item.lastmod || item.updatedAt).split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
            }));
          }
        }
      } catch (r2Err) {
        console.warn("R2/KV approved-apps.json read warning:", r2Err);
      }
      if (publishedApps.length === 0) {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/apps?key=${env.FIREBASE_API_KEY}&pageSize=3000`;
        const res = await fetch(firestoreUrl);
        if (res.ok) {
          const data = await res.json();
          const documents = data.documents || [];
          publishedApps = documents.map((doc) => {
            const fields = doc.fields || {};
            const status = fields.status?.stringValue || "";
            const isApproved = fields.isApproved?.booleanValue === true;
            const rawSlug = fields.slug?.stringValue || "";
            const slug = rawSlug.toLowerCase().replace(/^\/+|\.html$/gi, "").trim();
            const lastmod = fields.lastmod?.stringValue || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
            if ((status === "published" || isApproved) && status !== "pending" && isApproved !== false && slug) {
              return { slug, lastmod };
            }
            return null;
          }).filter(Boolean);
        }
      }
      if (publishedApps.length === 0) {
        const seedSlugs = [
          "whatsapp-messenger",
          "chatgpt",
          "telegram-messenger",
          "duolingo",
          "spotify-music",
          "capcut-video-editor",
          "tiktok",
          "instagram",
          "snapchat",
          "facebook",
          "pubg-mobile",
          "free-fire"
        ];
        publishedApps = seedSlugs.map((s) => ({ slug: s, lastmod: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] }));
      }
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${siteUrl}/privacy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
      const seenSlugs = /* @__PURE__ */ new Set();
      for (const app of publishedApps) {
        const cleanSlug = app.slug.replace(/^\/+|\.html$/gi, "").trim();
        if (!cleanSlug || seenSlugs.has(cleanSlug))
          continue;
        seenSlugs.add(cleanSlug);
        xml += `  <url>\n`;
        xml += `    <loc>${siteUrl}/${cleanSlug}</loc>\n`;
        xml += `    <lastmod>${app.lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
      xml += `</urlset>`;
      response = new Response(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
          "X-Sitemap-Apps-Count": String(publishedApps.length)
        }
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (err) {
      console.error("Dynamic Sitemap Error:", err);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
        status: 500,
        headers: { "Content-Type": "application/xml; charset=utf-8" }
      });
    }
  }
};

// workers/renderer.ts
var renderer_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    let slug = "";
    if (pathname.startsWith("/review/")) {
      slug = pathname.replace("/review/", "").trim();
    } else if (pathname !== "/" && !pathname.includes(".")) {
      slug = pathname.replace("/", "").trim();
    }
    
    // إصلاح: إرجاع null بدلاً من fetch(request) لتفادي الحلقة المفرغة (Infinite Loop)
    if (!slug) {
      return null;
    }
    
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }
    try {
      const r2Bucket = env.R2_BUCKET || env.ROOH_BUCKET || env.ROOH_R2 || env.roohme;
      const r2Key = `reviews/${cleanSlug}.html`;
      let object = r2Bucket ? await r2Bucket.get(r2Key) : null;
      if (!object && r2Bucket) {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/apps?key=${env.FIREBASE_API_KEY}&pageSize=1000`;
        const fsRes = await fetch(firestoreUrl);
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          const docs = fsData.documents || [];
          const matchedDoc = docs.find((d) => d.fields?.slug?.stringValue === cleanSlug);
          if (matchedDoc && matchedDoc.fields?.r2Key?.stringValue) {
            const resolvedKey = matchedDoc.fields.r2Key.stringValue;
            object = await r2Bucket.get(resolvedKey);
          }
        }
      }
      
      // إصلاح: إذا لم نعثر على مراجعة في R2، نرجع null ليتسنى للموجه الرئيسي فتح الواجهة SPA
      if (!object) {
        return null;
      }
      
      const htmlBody = await object.text();
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("Content-Type", "text/html; charset=utf-8");
      headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400");
      headers.set("X-Served-By", "Cloudflare-R2-Edge");
      response = new Response(htmlBody, {
        status: 200,
        headers
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (err) {
      console.error("Renderer Worker Exception:", err);
      return new Response("Internal Server Error rendering review page.", { status: 500 });
    }
  }
};

// workers/index.ts
var STATIC_ASSET_REGEX = /\.(js|css|png|jpg|jpeg|gif|svg|json|ico|woff2?|ttf|eot|map|webp)$/i;
var RESERVED_PATHS = ["/privacy", "/robots.txt", "/sitemap.xml", "/approved-apps.json"];

var workers_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname;
    const method = request.method;
    const acceptHeader = request.headers.get("accept") || "";

    try {
      const isStaticAsset = STATIC_ASSET_REGEX.test(path) || path.startsWith("/app/assets/") || path.startsWith("/assets/");
      if (isStaticAsset) {
        if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
          let assetRes = null;
          if (path.startsWith("/app/assets/")) {
            const strippedPath = path.replace(/^\/app/, "");
            const strippedReq = new Request(new URL(strippedPath, request.url), request);
            assetRes = await env.ASSETS.fetch(strippedReq);
          }
          if (!assetRes || assetRes.status === 404) {
            assetRes = await env.ASSETS.fetch(request);
          }
          if ((!assetRes || assetRes.status === 404) && path.startsWith("/assets/")) {
            const prefixedPath = "/app" + path;
            const prefixedReq = new Request(new URL(prefixedPath, request.url), request);
            assetRes = await env.ASSETS.fetch(prefixedReq);
          }
          if (assetRes && (assetRes.status === 200 || assetRes.status === 304)) {
            if (path.endsWith(".js") || path.endsWith(".mjs")) {
              const headers = new Headers(assetRes.headers);
              headers.set("Content-Type", "application/javascript; charset=utf-8");
              return new Response(assetRes.body, {
                status: assetRes.status,
                statusText: assetRes.statusText,
                headers
              });
            }
            if (path.endsWith(".css")) {
              const headers = new Headers(assetRes.headers);
              headers.set("Content-Type", "text/css; charset=utf-8");
              return new Response(assetRes.body, {
                status: assetRes.status,
                statusText: assetRes.statusText,
                headers
              });
            }
            return assetRes;
          }
        }
        return new Response("Asset Not Found", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }

      if ((path === "/robots.txt" || path === "/robots.txt/") && method === "GET") {
        const txt = `User-agent: *\nAllow: /\n\nSitemap: https://roohpro.com/sitemap.xml\n`;
        return new Response(txt, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400"
          }
        });
      }

      if (path === "/api/upload-review" && method === "POST") {
        if (uploader_default && typeof uploader_default.fetch === "function") {
          return await uploader_default.fetch(request, env, ctx);
        }
      }

      if (path === "/sitemap.xml" && method === "GET") {
        if (sitemap_default && typeof sitemap_default.fetch === "function") {
          return await sitemap_default.fetch(request, env, ctx);
        }
      }

      if ((path === "/approved-apps.json" || path === "/api/approved-apps") && method === "GET") {
        try {
          let approvedData = null;
          if (env.ROOH_KV) {
            approvedData = await env.ROOH_KV.get("APPROVED_APPS_JSON");
          }
          const r2Bucket = env.R2_BUCKET || env.ROOH_BUCKET || env.ROOH_R2 || env.roohme;
          if (!approvedData && r2Bucket) {
            const file = await r2Bucket.get("approved-apps.json");
            if (file) {
              approvedData = await file.text();
            }
          }
          return new Response(approvedData || "[]", {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=60, s-maxage=300"
            }
          });
        } catch (e) {
          return new Response("[]", {
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }
      }

      if ((path === "/approved-apps.json" || path === "/api/approved-apps") && method === "POST") {
        const body = await request.text();
        if (env.ROOH_KV) {
          await env.ROOH_KV.put("APPROVED_APPS_JSON", body);
        }
        const r2Bucket = env.R2_BUCKET || env.ROOH_BUCKET || env.ROOH_R2 || env.roohme;
        if (r2Bucket) {
          await r2Bucket.put("approved-apps.json", body, {
            httpMetadata: { contentType: "application/json; charset=utf-8" }
          });
        }
        return new Response(JSON.stringify({ success: true, message: "approved-apps.json updated successfully" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path.startsWith("/api/page/") && method === "GET") {
        const pageName = path.replace("/api/page/", "");
        const r2Bucket = env.ROOH_BUCKET || env.R2_BUCKET || env.ROOH_R2 || env.roohme;
        if (r2Bucket) {
          const file = await r2Bucket.get(`${pageName}.json`);
          if (file) {
            const content = await file.text();
            return new Response(content, {
              headers: { "Content-Type": "application/json" }
            });
          }
        }
        return new Response(JSON.stringify({ error: "Page not found in R2 storage" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/api/keys" && method === "GET") {
        const keys = env.ROOH_KV ? await env.ROOH_KV.get("AI_KEYS_LIST") || "[]" : "[]";
        return new Response(keys, {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/api/keys" && method === "POST") {
        const body = await request.json();
        if (env.ROOH_KV) {
          await env.ROOH_KV.put("AI_KEYS_LIST", JSON.stringify(body));
        }
        return new Response(JSON.stringify({ success: true, message: "Keys updated successfully in KV" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // إصلاح: تجربة جلب صفحة المراجعة من R2 أولاً لمسارات /review/ أو المسارات الديناميكية
      if (method === "GET" && path !== "/" && !RESERVED_PATHS.includes(path) && !path.startsWith("/api/")) {
        if (renderer_default && typeof renderer_default.fetch === "function") {
          const renderedRes = await renderer_default.fetch(request, env, ctx);
          if (renderedRes) {
            return renderedRes;
          }
        }
      }

      const isHtmlNavRequest = acceptHeader.includes("text/html") || !path.includes(".");
      if (isHtmlNavRequest && env.ASSETS && typeof env.ASSETS.fetch === "function") {
        try {
          const assetRes = await env.ASSETS.fetch(request);
          if (assetRes && assetRes.status !== 404) {
            return assetRes;
          }
          const indexReq = new Request(new URL("/index.html", request.url), request);
          const indexRes = await env.ASSETS.fetch(indexReq);
          if (indexRes && indexRes.status !== 404) {
            return indexRes;
          }
        } catch (e) {
        }
      }

      return new Response(JSON.stringify({
        status: "Rooh Platform Cloudflare Worker active",
        message: "All systems running successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({
        error: "Internal Worker Error",
        details: err.message || "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

export {
  workers_default as default
};
//# sourceMappingURL=index.js.map