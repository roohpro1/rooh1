import { Env } from './types';
import uploader from './uploader';
import sitemap from './sitemap';
import renderer from './renderer';

/**
 * Unified Cloudflare Worker Entrypoint (Rooh Platform Architecture - Safe Version)
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // 0. SPA Routing for /app, /app/*, and root /
      if (path === '/' || path === '/app' || path.startsWith('/app/')) {
        if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
          try {
            const assetRes = await env.ASSETS.fetch(request);
            if (assetRes && assetRes.status !== 404) {
              return assetRes;
            }
            // SPA Fallback: serve /index.html for React Router
            const indexReq = new Request(new URL('/index.html', request.url), request);
            const indexRes = await env.ASSETS.fetch(indexReq);
            if (indexRes && indexRes.status !== 404) {
              return indexRes;
            }
          } catch (e) {
            // Fallback if asset fetch fails
          }
        }
      }

      // 1. Dynamic Robots.txt Route
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

      // 2. Uploader API Route (رفع المحتوى)
      if (path === '/api/upload-review' && method === 'POST') {
        if (uploader && typeof uploader.fetch === 'function') {
          return await uploader.fetch(request, env, ctx);
        }
      }

      // 3. Dynamic Sitemap Route (خريطة الموقع)
      if (path === '/sitemap.xml' && method === 'GET') {
        if (sitemap && typeof sitemap.fetch === 'function') {
          return await sitemap.fetch(request, env, ctx);
        }
      }

      // 4. Approved Apps Registry Endpoint (القائمة الثابتة المعتمدة)
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

      // 5. مسار جلب الصفحات من R2
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

      // 6. مسار جلب المفاتيح من KV
      if (path === "/api/keys" && method === 'GET') {
        const keys = env.ROOH_KV ? await env.ROOH_KV.get("AI_KEYS_LIST") || "[]" : "[]";
        return new Response(keys, {
          headers: { "Content-Type": "application/json" },
        });
      }

      // 7. مسار حفظ المفاتيح في KV
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

      // 8. Dynamic App Review Renderer (STRICTLY for /review/*)
      if (method === 'GET' && path.startsWith('/review/')) {
        if (renderer && typeof renderer.fetch === 'function') {
          return await renderer.fetch(request, env, ctx);
        }
      }

      // 9. Generic Asset Fallback for static assets or index.html
      if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
        try {
          const assetRes = await env.ASSETS.fetch(request);
          if (assetRes && assetRes.status !== 404) {
            return assetRes;
          }
          const indexReq = new Request(new URL('/index.html', request.url), request);
          return await env.ASSETS.fetch(indexReq);
        } catch (e) {
          // ignore
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