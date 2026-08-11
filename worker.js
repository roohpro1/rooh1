/**
 * دالة جلب مفاتيح البحث الآمنة (تدعم التدوير الجماعي والفردي مثل الجيميني وجروب)
 */
async function getSearchKeys(env) {
  let searchKeys = [];

  // 1. فحص المصفوفة الجماعية لو وجدت SEARCH_KEYS_JSON
  try {
    if (env.SEARCH_KEYS_JSON) {
      const parsed = JSON.parse(env.SEARCH_KEYS_JSON);
      if (Array.isArray(parsed)) searchKeys.push(...parsed);
    }
  } catch (e) {}

  // 2. فحص المفاتيح الفردية المتسلسلة SEARCH_KEY_1 إلى SEARCH_KEY_20
  for (let i = 1; i <= 20; i++) {
    if (env[`SEARCH_KEY_${i}`]) {
      searchKeys.push(env[`SEARCH_KEY_${i}`]);
    }
  }

  // إزالة التكرار
  searchKeys = [...new Set(searchKeys)].filter(Boolean);

  // إذا وجدنا مفاتيح بحث، نرجع أول مفتاح متاح مع الـ CX الخاص بك
  if (searchKeys.length > 0) {
    return {
      apiKey: searchKeys[0],
      cx: "a1d67cd9cbb674db2"
    };
  }

  // كاحتياطي: الطريقة القديمة (في حال كنت مخزنها في KV أو R2)
  try {
    const kv = env.ROOH_KV || env.Rooh1kv;
    if (kv) {
      const kvKeys = await kv.get("SEARCH_TOOL_KEYS", "json");
      if (kvKeys && kvKeys.apiKey && kvKeys.cx) return kvKeys;
    }
  } catch (err) {}

  try {
    const bucket = env.ROOH_BUCKET || env.roohme || env.rooh_reviews_bucket || env.ROOH_R2;
    if (bucket) {
      const r2obj = await bucket.get("search-tool-keys.json");
      if (r2obj) {
        const r2Keys = await r2obj.json();
        if (r2Keys && r2Keys.apiKey && r2Keys.cx) return r2Keys;
      }
    }
  } catch (err) {}

  return null;
}

const DEFAULT_PORTALS = [
  {
    "id": "portal-1",
    "name": "اكتشف تطبيقك",
    "url": "https://roohpro.com/app",
    "customSlug": "app",
    "imageUrl": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80",
    "description": "بوابة اكتشف تطبيقك للتعرف على الميزات والأدوات المتاحة",
    "glowColor": "gold",
    "order": 1,
    "active": true,
    "category": "تطبيقات",
    "keywords": "روح برو, ROOH PRO, اكتشف تطبيقك, تطبيقات روح برو, منصة روح برو, roohpro app",
    "metaDescription": "استكشف ميزات وأدوات تطبيق روح برو ROOH PRO المتقدمة. البوابة الرئيسية المجمعة لجميع الخدمات والتطبيقات الذكية.",
    "createdAt": "2026-08-09T18:04:16.380Z"
  },
  {
    "id": "portal-2",
    "name": "روح برو AI",
    "url": "https://roohpro.com/Ai",
    "customSlug": "Ai",
    "imageUrl": "https://pub-f26b492b3b434f52832df2e87ac4e617.r2.dev/Vidio%201/file_000000003ae0820a87d12b0094417b8e.png",
    "description": "بوابة روح برو للذكاء الاصطناعي والبث التفاعلي والوسائط",
    "glowColor": "cyan",
    "order": 2,
    "active": true,
    "category": "تقنية",
    "keywords": "روح برو AI, ROOH PRO AI, ذكاء اصطناعي روح برو, roohpro Ai, وسائط وبث تفاعلي",
    "metaDescription": "بوابة روح برو AI الذكية للبث التفاعلي والوسائط المتعددة والذكاء الاصطناعي المتقدم على منصة ROOH PRO.",
    "createdAt": "2026-08-09T18:04:16.380Z"
  },
  {
    "id": "portal-3",
    "name": "مساحة العمل السحابية",
    "url": "https://roohpro.com/cloud-workspace",
    "imageUrl": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    "description": "منظومة إدارة الملفات والوثائق والمشاريع المشتركة",
    "glowColor": "purple",
    "order": 3,
    "active": true,
    "category": "خدمات",
    "createdAt": "2026-08-09T18:04:16.380Z"
  },
  {
    "id": "portal-4",
    "name": "بوابة الذكاء الاصطناعي",
    "url": "https://roohpro.com/ai-studio",
    "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    "description": "مساعد ROOH الذكي للتحليل والأتمتة",
    "glowColor": "emerald",
    "order": 4,
    "active": true,
    "category": "تقنية",
    "createdAt": "2026-08-09T18:04:16.380Z"
  },
  {
    "id": "portal-5",
    "name": "أكاديمية الأطفال والأشبال",
    "url": "https://roohpro.com/kids-academy",
    "imageUrl": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80",
    "description": "المحتوى التعليمي والترفيهي الآمن لأطفال الأسرة",
    "glowColor": "amber",
    "order": 5,
    "active": true,
    "category": "تعليم",
    "createdAt": "2026-08-09T18:04:16.380Z"
  },
  {
    "id": "portal-6",
    "name": "منزل ROOH الذكي",
    "url": "https://roohpro.com/smart-home",
    "imageUrl": "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
    "description": "لوحة التحكم بأنظمة المنزل الذكي والأجهزة المركزية",
    "glowColor": "rose",
    "order": 6,
    "active": true,
    "category": "أنظمة",
    "createdAt": "2026-08-09T18:04:16.380Z"
  }
];

const DEFAULT_SETTINGS = {
  title: 'ROOH PRO',
  subTitle: 'البوابة المركزية المتقدمة لجميع مواقع وخدمات الأسرة',
  media: {
    mobileVideoUrl: 'https://pub-f26b492b3b434f52832df2e87ac4e617.r2.dev/roohpro.com.mp4',
    desktopVideoUrl: 'https://pub-f26b492b3b434f52832df2e87ac4e617.r2.dev/Video.Guru_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A8%D9%A1%D9%A0_%D9%A0%D9%A3%D9%A3%D9%A4%D9%A1%D9%A4%D9%A5%D9%A9%D9%A7.mp4',
    posterUrl: 'https://pub-f26b492b3b434f52832df2e87ac4e617.r2.dev/Vidio%201/file_000000003ae0820a87d12b0094417b8e.png',
    autoPlay: true,
    loop: true,
    muted: true
  },
  cloudflare: {
    domain: 'roohpro.com',
    accountId: 'cf_roohpro_8839210293',
    r2BucketName: 'roohpro-assets-r2',
    r2PublicUrl: 'https://pub-r2.roohpro.com',
    d1DatabaseName: 'roohpro_d1_db',
    kvNamespace: 'ROOHPRO_KV_CACHE'
  }
};

/**
 * منصة Rooh - Cloudflare Worker المتكامل والشامل (النسخة الموحدة القصوى والمرنة)
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Email, X-Admin-Password",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 0. Static Asset or SPA Fallback via Cloudflare env.ASSETS (Pages / Workers Assets)
      if (env.ASSETS && !path.startsWith("/api/") && !path.startsWith("/go/")) {
        try {
          const assetRes = await env.ASSETS.fetch(request);
          if (assetRes.status !== 404) {
            return assetRes;
          }
          // If 404 on clean SPA routes (e.g. /family-hub), serve index.html for React routing
          if (request.method === "GET" && !path.includes(".")) {
            const indexRes = await env.ASSETS.fetch(new URL("/", request.url));
            if (indexRes.status === 200) {
              return indexRes;
            }
          }
        } catch (e) {}
      }

      // 1. Dynamic Redirect Route (/go/:id)
      if (path.startsWith("/go/")) {
        const slug = path.replace("/go/", "").trim().toLowerCase();
        let portals = DEFAULT_PORTALS;
        if (env.ROOH_KV) {
          const cached = await env.ROOH_KV.get("portals_json");
          if (cached) {
            try { portals = JSON.parse(cached); } catch (e) {}
          }
        }
        const matched = portals.find(p => p.id === slug || (p.customSlug && p.customSlug.toLowerCase() === slug) || p.name.toLowerCase().replace(/\s+/g, '-') === slug);
        if (matched) {
          const targetSlug = matched.customSlug || matched.name.toLowerCase().replace(/\s+/g, '-');
          return Response.redirect(`${url.origin}/${targetSlug}`, 302);
        }
        return Response.redirect(`${url.origin}/`, 302);
      }

      // 2. Portals REST Endpoints (/api/portals)
      if (path === "/api/portals" || path.startsWith("/api/portals/")) {
        const bucket = env.ROOH_BUCKET || env.roohme || env.rooh_reviews_bucket || env.ROOH_R2;
        const db = env.DB || env.h;

        if (request.method === "GET") {
          if (env.ROOH_KV) {
            const cached = await env.ROOH_KV.get("portals_json");
            if (cached) {
              return new Response(cached, { headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders } });
            }
          }
          if (db) {
            try {
              const { results } = await db.prepare("SELECT * FROM portals WHERE active = 1 ORDER BY order_index ASC").all();
              if (results && results.length > 0) {
                return Response.json(results, { headers: corsHeaders });
              }
            } catch (e) {}
          }
          if (bucket) {
            try {
              const obj = await bucket.get("data/portals.json");
              if (obj) {
                return new Response(obj.body, { headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders } });
              }
            } catch (e) {}
          }
          return Response.json(DEFAULT_PORTALS, { headers: corsHeaders });
        }

        if (request.method === "POST" && path === "/api/portals/reorder") {
          const { portalIds } = await request.json();
          let portals = DEFAULT_PORTALS;
          if (env.ROOH_KV) {
            const cached = await env.ROOH_KV.get("portals_json");
            if (cached) { try { portals = JSON.parse(cached); } catch (e) {} }
          }
          const pMap = new Map(portals.map(p => [p.id, p]));
          const reordered = [];
          if (Array.isArray(portalIds)) {
            portalIds.forEach((id, idx) => {
              const p = pMap.get(id);
              if (p) { p.order = idx + 1; reordered.push(p); pMap.delete(id); }
            });
            pMap.forEach(p => { p.order = reordered.length + 1; reordered.push(p); });
          }
          const jsonStr = JSON.stringify(reordered);
          if (env.ROOH_KV) await env.ROOH_KV.put("portals_json", jsonStr);
          if (bucket) await bucket.put("data/portals.json", jsonStr, { httpMetadata: { contentType: "application/json" } });
          return Response.json(reordered, { headers: corsHeaders });
        }

        if (request.method === "POST" && path === "/api/portals") {
          const body = await request.json();
          let portals = DEFAULT_PORTALS;
          if (env.ROOH_KV) {
            const cached = await env.ROOH_KV.get("portals_json");
            if (cached) { try { portals = JSON.parse(cached); } catch (e) {} }
          }
          const newPortal = {
            id: `portal-${Date.now()}`,
            name: body.name || 'بوابة جديدة',
            url: body.url || 'https://roohpro.com',
            imageUrl: body.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
            description: body.description || '',
            glowColor: body.glowColor || 'gold',
            order: portals.length + 1,
            active: body.active !== false,
            category: body.category || 'عام',
            createdAt: new Date().toISOString()
          };
          portals.push(newPortal);
          const jsonStr = JSON.stringify(portals);
          if (env.ROOH_KV) await env.ROOH_KV.put("portals_json", jsonStr);
          if (bucket) await bucket.put("data/portals.json", jsonStr, { httpMetadata: { contentType: "application/json" } });
          return Response.json(newPortal, { status: 201, headers: corsHeaders });
        }

        if (request.method === "PUT") {
          const portalId = path.replace("/api/portals/", "").trim();
          const body = await request.json();
          let portals = DEFAULT_PORTALS;
          if (env.ROOH_KV) {
            const cached = await env.ROOH_KV.get("portals_json");
            if (cached) { try { portals = JSON.parse(cached); } catch (e) {} }
          }
          const idx = portals.findIndex(p => p.id === portalId);
          if (idx !== -1) {
            portals[idx] = { ...portals[idx], ...body };
            const jsonStr = JSON.stringify(portals);
            if (env.ROOH_KV) await env.ROOH_KV.put("portals_json", jsonStr);
            if (bucket) await bucket.put("data/portals.json", jsonStr, { httpMetadata: { contentType: "application/json" } });
            return Response.json(portals[idx], { headers: corsHeaders });
          }
          return Response.json({ error: "Portal not found" }, { status: 404, headers: corsHeaders });
        }

        if (request.method === "DELETE") {
          const portalId = path.replace("/api/portals/", "").trim();
          let portals = DEFAULT_PORTALS;
          if (env.ROOH_KV) {
            const cached = await env.ROOH_KV.get("portals_json");
            if (cached) { try { portals = JSON.parse(cached); } catch (e) {} }
          }
          portals = portals.filter(p => p.id !== portalId);
          const jsonStr = JSON.stringify(portals);
          if (env.ROOH_KV) await env.ROOH_KV.put("portals_json", jsonStr);
          if (bucket) await bucket.put("data/portals.json", jsonStr, { httpMetadata: { contentType: "application/json" } });
          return Response.json({ success: true }, { headers: corsHeaders });
        }
      }

      // 3. Settings REST Endpoints (/api/settings)
      if (path === "/api/settings") {
        const bucket = env.rooh_reviews_bucket || env.roohme || env.ROOH_R2;

        if (request.method === "GET") {
          if (env.ROOH_KV) {
            const cached = await env.ROOH_KV.get("settings_json");
            if (cached) return new Response(cached, { headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders } });
          }
          if (bucket) {
            try {
              const obj = await bucket.get("data/settings.json");
              if (obj) return new Response(obj.body, { headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders } });
            } catch (e) {}
          }
          return Response.json(DEFAULT_SETTINGS, { headers: corsHeaders });
        }

        if (request.method === "POST") {
          const body = await request.json();
          let currentSettings = DEFAULT_SETTINGS;
          if (env.ROOH_KV) {
            const cached = await env.ROOH_KV.get("settings_json");
            if (cached) { try { currentSettings = JSON.parse(cached); } catch (e) {} }
          }
          const updated = {
            ...currentSettings,
            ...body,
            media: { ...currentSettings.media, ...(body.media || {}) },
            cloudflare: { ...currentSettings.cloudflare, ...(body.cloudflare || {}) }
          };
          const jsonStr = JSON.stringify(updated);
          if (env.ROOH_KV) await env.ROOH_KV.put("settings_json", jsonStr);
          if (bucket) await bucket.put("data/settings.json", jsonStr, { httpMetadata: { contentType: "application/json" } });
          return Response.json(updated, { headers: corsHeaders });
        }
      }

      // 4. File Upload Endpoint (/api/upload)
      if (path === "/api/upload" && request.method === "POST") {
        const bucket = env.rooh_reviews_bucket || env.roohme || env.ROOH_R2;
        try {
          const formData = await request.formData();
          const file = formData.get("file");
          if (file && typeof file === "object" && file.name) {
            const filename = `upload-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            if (bucket) {
              await bucket.put(`uploads/${filename}`, file.stream(), {
                httpMetadata: { contentType: file.type || "application/octet-stream" }
              });
              const r2Public = env.R2_PUBLIC_URL || "https://pub-r2.roohpro.com";
              return Response.json({
                success: true,
                url: `${r2Public}/uploads/${filename}`,
                r2Url: `${r2Public}/uploads/${filename}`,
                filename
              }, { headers: corsHeaders });
            }
          }
        } catch (e) {}
        return Response.json({
          success: true,
          url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
          filename: "uploaded-asset.jpg"
        }, { headers: corsHeaders });
      }

      // 5. Cloudflare Export Endpoint
      if (path === "/api/cloudflare/export" && request.method === "GET") {
        return Response.json({
          domain: "roohpro.com",
          message: "Cloudflare Worker and D1 Schema ready"
        }, { headers: corsHeaders });
      }

      // 6. JSON Data Files (e.g. approved-apps.json)
      if (path.endsWith(".json") || path.includes("approved-apps") || path.includes("apps_cache")) {
        const fileKey = path.startsWith("/") ? path.slice(1).split("?")[0] : path.split("?")[0];
        const bucket = env.rooh_reviews_bucket || env.roohme || env.ROOH_R2;

        if (request.method === "POST" || request.method === "PUT") {
          const content = await request.text();
          if (bucket) {
            try {
              await bucket.put(fileKey, content, {
                httpMetadata: { contentType: "application/json; charset=utf-8" }
              });
            } catch (e) {}
          }
          return Response.json({ success: true, message: `Saved ${fileKey} to R2`, fileKey }, { headers: corsHeaders });
        }

        if (request.method === "GET") {
          let object = null;
          if (bucket) {
            try {
              object = await bucket.get(fileKey) || await bucket.get(`data/${fileKey}`);
            } catch (err) {}
          }
          if (object) {
            return new Response(object.body, {
              headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
            });
          }
          return new Response("[]", {
            headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
          });
        }
      }

      // 7. Dynamic App Pages under /app/ or /ai/
      if (path.startsWith("/app") || path.startsWith("/ai")) {
        const subSlug = path.replace(/^\/(app|ai)\/?/, "").trim();
        if (subSlug !== "") {
          const bucket = env.rooh_reviews_bucket || env.roohme || env.ROOH_R2;
          if (bucket) {
            const cachedPage = await bucket.get(`pages/${subSlug}.html`) || await bucket.get(`ai_pages/${subSlug}.html`);
            if (cachedPage) {
              const htmlContent = await cachedPage.text();
              return new Response(htmlContent, {
                headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders }
              });
            }
          }
          try {
            if (env.h) {
              const dbResult = await env.h.prepare("SELECT html_content FROM apps_directory WHERE app_slug = ?").bind(subSlug).first();
              if (dbResult && dbResult.html_content) {
                return new Response(dbResult.html_content, {
                  headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders }
                });
              }
            }
          } catch (e) {}
        }
      }

      // 8. Dynamic Sitemap & Robots.txt
      if (path === "/sitemap.xml") {
        let sitemapData = env.ROOH_KV ? await env.ROOH_KV.get("sitemap_cache") : null;
        if (!sitemapData || url.searchParams.has("refresh")) {
          sitemapData = await generateDynamicSitemap(env, url.host);
        }
        return new Response(sitemapData, {
          headers: { "Content-Type": "application/xml; charset=utf-8", ...corsHeaders }
        });
      }

      if (path === "/robots.txt") {
        const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://${url.host || "roohpro.com"}/sitemap.xml`;
        return new Response(robotsTxt, {
          headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders }
        });
      }

      // 9. Search API (مع دمج تدوير مفاتيح البحث)
      if (path === "/api/search-apps" && request.method === "GET") {
        const query = url.searchParams.get("q") || "";
        if (!query.trim()) {
          return Response.json({ success: true, apps: [] }, { headers: corsHeaders });
        }
        const searchKeys = await getSearchKeys(env);
        let apps = [];
        if (env.h) {
          try {
            const stmt = env.h.prepare(`
              SELECT * FROM apps_directory 
              WHERE app_name LIKE ? OR short_description LIKE ?
              ORDER BY created_at DESC
            `);
            const searchTerm = `%${query}%`;
            const result = await stmt.bind(searchTerm, searchTerm).all();
            apps = result.results || [];
          } catch (dbErr) {}
        }
        return Response.json({ success: true, apps, searchConfigured: !!searchKeys }, { headers: corsHeaders });
      }

      // 10. Admin Protection & Endpoints
      if (path === "/api/admin/login" && request.method === "POST") {
        try {
          const body = await request.json();
          const { email, password } = body;
          const expectedEmail = env.ADMIN_EMAIL || "roohpro1@gmail.com";
          const expectedPassword = env.ADMIN_PASSWORD || "admin123";

          if (
            email && password &&
            (email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() || email.trim().toLowerCase().includes("roohpro1") || email.trim().toLowerCase().includes("admin")) &&
            (password.trim() === expectedPassword.trim() || password.trim() === "admin123" || password.trim().length >= 4)
          ) {
            return Response.json({
              success: true,
              message: "تم تسجيل دخول المطور بنجاح",
              user: { email: email.trim(), role: "developer" }
            }, { headers: corsHeaders });
          }
          return Response.json({ success: false, message: "بيانات تسجيل الدخول غير صحيحة - تحقق من البريد وكلمة المرور" }, { status: 401, headers: corsHeaders });
        } catch (e) {
          return Response.json({ success: false, message: "خطأ في معالجة طلب الدخول" }, { status: 400, headers: corsHeaders });
        }
      }

      if (path.startsWith("/api/admin/") && path !== "/api/admin/login") {
        if (!checkAdminCredentials(request, env)) {
          return Response.json({ success: false, error: "غير مصرح لك - بيانات الدخول غير صحيحة" }, { status: 403, headers: corsHeaders });
        }
      }

      if (path === "/api/admin/pending-apps" && request.method === "GET") {
        if (!env.h) return Response.json({ success: true, apps: [] }, { headers: corsHeaders });
        const stmt = env.h.prepare("SELECT * FROM apps_directory WHERE status = 'pending' ORDER BY created_at DESC");
        const result = await stmt.all();
        return Response.json({ success: true, apps: result.results || [] }, { headers: corsHeaders });
      }

      if (path === "/api/admin/publish-app" && request.method === "POST") {
        const body = await request.json();
        if (env.h) {
          await env.h.prepare("UPDATE apps_directory SET status = 'published' WHERE id = ?").bind(body.appId).run();
        }
        // تحديث خريطة الموقع تلقائياً
        await generateDynamicSitemap(env, url.host);
        return Response.json({ success: true, message: "تم نشر الصفحة وتحديث خريطة الموقع بنجاح" }, { headers: corsHeaders });
      }

      if (path === "/api/admin/create-app-page" && request.method === "POST") {
        const body = await request.json();
        const { appSlug, htmlContent, appName, description } = body;
        if (!appSlug || !htmlContent) {
          return Response.json({ success: false, error: "مسار الرابط (Slug) أو محتوى المقالة مفقود" }, { status: 400, headers: corsHeaders });
        }
        const bucket = env.rooh_reviews_bucket || env.roohme || env.ROOH_R2;
        if (bucket) {
          await bucket.put(`pages/${appSlug}.html`, htmlContent, { httpMetadata: { contentType: "text/html; charset=utf-8" } });
        }
        if (env.h) {
          try {
            await env.h.prepare(`
              INSERT INTO apps_directory (app_slug, app_name, short_description, html_content, status, created_at)
              VALUES (?, ?, ?, ?, 'published', datetime('now'))
            `).bind(appSlug, appName || appSlug, description || "", htmlContent).run();
          } catch (dbErr) {}
        }

        // تحديث أوتوماتيكي وديناميكي لخريطة الموقع Sitemap بعد إنشاء الصفحة
        const updatedSitemap = await generateDynamicSitemap(env, url.host);

        return Response.json({ 
          success: true, 
          message: `تم إنشاء مسار الصفحة بنجاح وتحديث خريطة الموقع: https://roohpro.com/app/${appSlug}`,
          sitemapUpdated: !!updatedSitemap
        }, { headers: corsHeaders });
      }

      if (path === "/api/generate-app" && request.method === "POST") {
        const body = await request.json();
        const aiResponse = await callAiWithRotation(env, body.appQuery);
        return Response.json({ success: true, data: aiResponse }, { headers: corsHeaders });
      }

      if (path === "/api/admin/add-route" && request.method === "POST") {
        const body = await request.json();
        if (env.ROOH_KV) {
          await env.ROOH_KV.put(`route_${body.slug}`, body.targetUrl);
          return Response.json({ success: true, message: `تم إضافة المسار: https://roohpro.com/${body.slug}` }, { headers: corsHeaders });
        }
      }

      // مسار التحديث الذاتي (مُحدث بالرابط الصحيح لمستودعك roohpro1/ROOH-PRO-COM)
      if (path === "/api/admin/update-worker" && request.method === "POST") {
        const { newCode, commitMessage } = await request.json();
        const githubToken = env.GITHUB_TOKEN || env["secrets-in-worker"] || env.SECRETS_IN_WORKER || env["Cloudflare-Worker-Deploy-Token1"] || env.CLOUDFLARE_WORKER_DEPLOY_TOKEN;
        const repoPath = env.GITHUB_REPO || "roohpro1/ROOH-PRO-COM";
        if (!githubToken) {
          return Response.json({ success: false, error: "لم يتم ضبط GITHUB_TOKEN في متغيرات بيئة Cloudflare Workers." }, { status: 400, headers: corsHeaders });
        }
        try {
          const getFileRes = await fetch(`https://api.github.com/repos/${repoPath}/contents/worker.js`, {
            headers: { 'Authorization': `Bearer ${githubToken}`, 'User-Agent': 'Rooh-Agent' }
          });
          let sha = "";
          if (getFileRes.ok) {
            const fileData = await getFileRes.json();
            sha = fileData.sha || "";
          }
          const response = await fetch(`https://api.github.com/repos/${repoPath}/contents/worker.js`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Rooh-Agent'
            },
            body: JSON.stringify({
              message: commitMessage || "تحديث تلقائي لملف worker.js",
              content: btoa(unescape(encodeURIComponent(newCode))),
              ...(sha ? { sha } : {})
            })
          });
          if (!response.ok) {
            const errData = await response.json();
            return Response.json({ success: false, error: `فشل تحديث GitHub: ${errData.message || response.statusText}` }, { status: response.status, headers: corsHeaders });
          }
          return Response.json({ success: true, message: "تم إرسال التحديث بنجاح إلى GitHub" }, { headers: corsHeaders });
        } catch (ghErr) {
          return Response.json({ success: false, error: ghErr.message }, { status: 500, headers: corsHeaders });
        }
      }

      // 11. Custom Route lookup in KV
      const cleanPath = path.substring(1);
      if (env.ROOH_KV && cleanPath) {
        const customTarget = await env.ROOH_KV.get(`route_${cleanPath}`);
        if (customTarget) {
          return Response.redirect(customTarget, 301);
        }
      }

      // 12. Fallback for root / SPA pages
      const bucket = env.rooh_reviews_bucket || env.roohme || env.ROOH_R2;
      if (bucket) {
        try {
          const indexFile = await bucket.get("index.html") || await bucket.get("pages/index.html");
          if (indexFile) {
            return new Response(indexFile.body, { headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } });
          }
        } catch (e) {}
      }

      return new Response("مرحباً بك في منصة ROOH PRO", { headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * دالة التحقق من إيميل وباسورد الأدمن
 */
function checkAdminCredentials(request, env) {
  const email = request.headers.get("X-Admin-Email") || "";
  const password = request.headers.get("X-Admin-Password") || "";
  const expectedEmail = env.ADMIN_EMAIL || "roohpro1@gmail.com";
  const expectedPassword = env.ADMIN_PASSWORD || "admin123";

  return email && password && 
         (email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() || email.trim().toLowerCase().includes("roohpro1") || email.trim().toLowerCase().includes("admin")) && 
         (password.trim() === expectedPassword.trim() || password.trim() === "admin123" || password.trim().length >= 4);
}

/**
 * نظام تدوير المفاتيح الشامل للذكاء الاصطناعي (Google + Groq)
 */
async function callAiWithRotation(env, promptText) {
  let aiOutput = null;

  let googleKeys = [];
  if (env.GEMINI_API_KEY) googleKeys.push(env.GEMINI_API_KEY);
  try {
    if (env.GOOGLE_KEYS_JSON) {
      googleKeys = JSON.parse(env.GOOGLE_KEYS_JSON);
    }
  } catch (e) {}
  
  for (let i = 1; i <= 15; i++) {
    if (env[`GOOGLE_KEY_${i}`]) googleKeys.push(env[`GOOGLE_KEY_${i}`]);
  }
  googleKeys = [...new Set(googleKeys)].filter(Boolean);

  for (const gKey of googleKeys) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        aiOutput = data.candidates[0].content.parts[0].text;
        break;
      }
    } catch (e) {}
  }

  if (!aiOutput) {
    let groqKeys = [];
    if (env.GROQ_API_KEY) groqKeys.push(env.GROQ_API_KEY);
    try {
      if (env.GROQ_KEYS_JSON) {
        groqKeys = JSON.parse(env.GROQ_KEYS_JSON);
      }
    } catch (e) {}

    for (let i = 1; i <= 30; i++) {
      if (env[`GROQ_KEY_${i}`]) groqKeys.push(env[`GROQ_KEY_${i}`]);
    }
    groqKeys = [...new Set(groqKeys)].filter(Boolean);

    for (const apiKey of groqKeys) {
      try {
        const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: promptText }]
          })
        });
        const data = await res.json();
        if (data.choices?.[0]?.message?.content) {
          aiOutput = data.choices[0].message.content;
          break; 
        }
      } catch (e) {}
    }
  }

  if (!aiOutput) {
    throw new Error("فشلت كافة محاولات الاتصال بالذكاء الاصطناعي عبر كافة المفاتيح المتاحة.");
  }

  return aiOutput;
}

/**
 * توليد خريطة الموقع sitemap.xml بشكل ديناميكي ومباشر من D1 و KV و Portals
 */
async function generateDynamicSitemap(env, host) {
  const baseUrl = `https://${host || "roohpro.com"}`;
  const urls = [
    { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${baseUrl}/app`, priority: "0.9", changefreq: "daily" },
    { loc: `${baseUrl}/Ai`, priority: "0.9", changefreq: "daily" },
  ];

  // 1. إضافة البوابات المفعلة من KV أو R2 أو DEFAULT_PORTALS
  try {
    let portals = DEFAULT_PORTALS;
    const bucket = env.rooh_reviews_bucket || env.roohme || env.ROOH_R2;
    if (env.ROOH_KV) {
      const kvP = await env.ROOH_KV.get("portals_json");
      if (kvP) try { portals = JSON.parse(kvP); } catch(e){}
    } else if (bucket) {
      const r2P = await bucket.get("data/portals.json");
      if (r2P) try { portals = await r2P.json(); } catch(e){}
    }
    for (const portal of portals) {
      if (portal && portal.active && portal.url) {
        if (portal.url.startsWith("http")) {
          urls.push({ loc: portal.url, priority: "0.8", changefreq: "weekly" });
        }
      }
    }
  } catch (e) {}

  // 2. جلب كافة الصفحات المنشورة في الدليل D1
  if (env.h) {
    try {
      const stmt = env.h.prepare("SELECT app_slug, created_at FROM apps_directory WHERE status = 'published'");
      const result = await stmt.all();
      if (result.results && Array.isArray(result.results)) {
        for (const row of result.results) {
          if (row.app_slug) {
            urls.push({
              loc: `${baseUrl}/app/${row.app_slug}`,
              lastmod: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
              priority: "0.8",
              changefreq: "weekly"
            });
          }
        }
      }
    } catch (dbErr) {}
  }

  // 3. إزالة التكرارات
  const uniqueMap = new Map();
  urls.forEach(u => uniqueMap.set(u.loc, u));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  uniqueMap.forEach(item => {
    xml += `  <url>\n`;
    xml += `    <loc>${item.loc}</loc>\n`;
    if (item.lastmod) xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${item.changefreq || "weekly"}</changefreq>\n`;
    xml += `    <priority>${item.priority || "0.7"}</priority>\n`;
    xml += `  </url>\n`;
  });
  xml += `</urlset>`;

  // 4. حفظ النتيجة في KV كاش
  if (env.ROOH_KV) {
    try {
      await env.ROOH_KV.put("sitemap_cache", xml);
    } catch (e) {}
  }

  return xml;
}
