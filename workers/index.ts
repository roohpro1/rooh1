import { Env } from './types';
import uploader from './uploader';
import sitemap from './sitemap';
import renderer from './renderer';

/**
 * Unified Cloudflare Worker Entrypoint (Rooh Platform Architecture - Safe Version)
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    
    // 1. محاولة خدمة الملفات الثابتة (Assets) بحماية كاملة
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse && assetResponse.status === 200) {
          return assetResponse;
        }
      } catch (e) {
        // إذا لم يوجد الملف، كمل لباقي الكود
      }
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // 0. Dynamic Robots.txt Route
      if ((path === '/robots.txt' || path === '/robots.txt/') && method === 'GET') {
        const txt = `User-agent: *\nAllow: /\n\nSitemap: https://roohpro.com/sitemap.xml\n`;
        return new Response(txt, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400'
          }
        });
      }

      // 1. Uploader API Route (رفع المحتوى)
      if (path === '/api/upload-review' && method === 'POST') {
        if (uploader && typeof uploader.fetch === 'function') {
          return await uploader.fetch(request, env, ctx);
        }
      }

      // 2. Dynamic Sitemap Route (خريطة الموقع)
      if (path === '/sitemap.xml' && method === 'GET') {
        if (sitemap && typeof sitemap.fetch === 'function') {
          return await sitemap.fetch(request, env, ctx);
        }
      }

      // 2b. Approved Apps Registry Endpoint (القائمة الثابتة المعتمدة)
      if ((path === '/approved-apps.json' || path === '/api/approved-apps') && method === 'GET') {
        try {
          let approvedData: string | null = null;
          if (env.ROOH_KV) {
            approvedData = await env.ROOH_KV.get('APPROVED_APPS_JSON');
          }
          const r2Bucket = env.R2_BUCKET || env.ROOH_BUCKET || env.ROOH_R2 || env.roohme;
          if (!approvedData && r2Bucket) {
            const file = await r2Bucket.get('approved-apps.json');
            if (file) {
              approvedData = await file.text();
            }
          }
          return new Response(approvedData || '[]', {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=60, s-maxage=300'
            }
          });
        } catch (e) {
          return new Response('[]', { 
            headers: { 'Content-Type': 'application/json; charset=utf-8' } 
          });
        }
      }

      if ((path === '/approved-apps.json' || path === '/api/approved-apps') && method === 'POST') {
        const body = await request.text();
        if (env.ROOH_KV) {
          await env.ROOH_KV.put('APPROVED_APPS_JSON', body);
        }
        const r2Bucket = env.R2_BUCKET || env.ROOH_BUCKET || env.ROOH_R2 || env.roohme;
        if (r2Bucket) {
          await r2Bucket.put('approved-apps.json', body, {
            httpMetadata: { contentType: 'application/json; charset=utf-8' }
          });
        }
        return new Response(JSON.stringify({ success: true, message: 'approved-apps.json updated successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 3. مسار جلب الصفحات من R2
      if (path.startsWith("/api/page/") && method === 'GET') {
        const pageName = path.replace("/api/page/", "");
        const r2Bucket = env.ROOH_BUCKET || env.R2_BUCKET || env.ROOH_R2 || env.roohme;
        if (r2Bucket) {
          const file = await r2Bucket.get(`${pageName}.json`);
          if (file) {
            const content = await file.text();
            return new Response(content, {
              headers: { "Content-Type": "application/json" },
            });
          }
        }
        return new Response(JSON.stringify({ error: "Page not found in R2 storage" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 4. مسار جلب المفاتيح من KV
      if (path === "/api/keys" && method === 'GET') {
        const keys = env.ROOH_KV ? await env.ROOH_KV.get("AI_KEYS_LIST") || "[]" : "[]";
        return new Response(keys, {
          headers: { "Content-Type": "application/json" },
        });
      }

      // 5. مسار حفظ المفاتيح في KV
      if (path === "/api/keys" && method === 'POST') {
        const body = await request.json();
        if (env.ROOH_KV) {
          await env.ROOH_KV.put("AI_KEYS_LIST", JSON.stringify(body));
        }
        return new Response(JSON.stringify({ success: true, message: "Keys updated successfully in KV" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 6. Clean Review Page Renderer Route
      if (method === 'GET' && (path.startsWith('/review/') || (path !== '/' && !path.includes('.')))) {
        if (renderer && typeof renderer.fetch === 'function') {
          return await renderer.fetch(request, env, ctx);
        }
      }

      // Default Fallback
      return new Response(JSON.stringify({ 
        status: 'Rooh Platform Cloudflare Worker active', 
        message: 'All systems running successfully' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (err: any) {
      return new Response(JSON.stringify({ 
        error: "Internal Worker Error", 
        details: err.message || "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};