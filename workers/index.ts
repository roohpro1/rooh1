import { Env } from './types';
import uploader from './uploader';
import sitemap from './sitemap';
import renderer from './renderer';

/**
 * Unified Cloudflare Worker Entrypoint (Rooh Platform Architecture - Fixed Version)
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    
    // --- اللمسة السحرية: حاول تخدم الملفات الثابتة (js, css, images) والمسارات الرئيسية أولاً ---
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      let assetRequest = request;
      if (path === '/app' || path === '/app/') {
        assetRequest = new Request(new URL('/index.html', request.url), request);
      } else if (path.startsWith('/app/assets/')) {
        const rewrittenPath = path.replace('/app/assets/', '/assets/');
        assetRequest = new Request(new URL(rewrittenPath, request.url), request);
      }

      // بنحاول نجيب الملف من الـ Assets (فولدر الـ dist)
      const assetResponse = await env.ASSETS.fetch(assetRequest);
      if (assetResponse.status === 200 || assetResponse.status === 304) {
        return assetResponse;
      }
    } catch (e) {
      // لو حصل استثناء، بنكمل
    }

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
        return await uploader.fetch(request, env, ctx);
      }

      // 2. Dynamic Sitemap Route (خريطة الموقع)
      if (path === '/sitemap.xml' && method === 'GET') {
        return await sitemap.fetch(request, env, ctx);
      }

      // 2b. Approved Apps Registry Endpoint (القائمة الثابتة المعتمدة - مع حماية كاملة)
      if ((path === '/approved-apps.json' || path === '/api/approved-apps') && method === 'GET') {
        try {
          let approvedData: string | null = null;
          if (env.ROOH_KV) {
            approvedData = await env.ROOH_KV.get('APPROVED_APPS_JSON');
          }
          if (!approvedData && env.R2_BUCKET) {
            const file = await env.R2_BUCKET.get('approved-apps.json');
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
          // في حال حدوث أي خطأ، نرجع مصفوفة فارغة لضمان عدم انهيار المتصفح
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
        if (env.R2_BUCKET) {
          await env.R2_BUCKET.put('approved-apps.json', body, {
            httpMetadata: { contentType: 'application/json; charset=utf-8' }
          });
        }
        return new Response(JSON.stringify({ success: true, message: 'approved-apps.json updated successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 3. مسار جلب الصفحات من R2 (يعمل بمعزل عن فايربيز)
      if (path.startsWith("/api/page/") && method === 'GET') {
        const pageName = path.replace("/api/page/", "");
        const file = await env.ROOH_BUCKET.get(`${pageName}.json`);
        
        if (!file) {
          return new Response(JSON.stringify({ error: "Page not found in R2 storage" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const content = await file.text();
        return new Response(content, {
          headers: { "Content-Type": "application/json" },
        });
      }

      // 4. مسار جلب المفاتيح من KV (لقراءة المفاتيح والتحكم بها)
      if (path === "/api/keys" && method === 'GET') {
        const keys = await env.ROOH_KV.get("AI_KEYS_LIST") || "[]";
        return new Response(keys, {
          headers: { "Content-Type": "application/json" },
        });
      }

      // 5. مسار حفظ أو تحديث المفاتيح في KV (من لوحة التحكم)
      if (path === "/api/keys" && method === 'POST') {
        const body = await request.json();
        await env.ROOH_KV.put("AI_KEYS_LIST", JSON.stringify(body));
        return new Response(JSON.stringify({ success: true, message: "Keys updated successfully in KV" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 6. Reserved SPA routes vs Clean Review Page Renderer Route
      if (method === 'GET') {
        const cleanPath = path.replace(/\/+$/, "");
        if (cleanPath === '/admin' || cleanPath === '/privacy' || cleanPath === '/app' || cleanPath === '') {
          return await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
        }
        if (path.startsWith('/review/') || (path !== '/' && !path.includes('.'))) {
          return await renderer.fetch(request, env, ctx);
        }
      }

      // Default Fallback
      return new Response(JSON.stringify({ 
        status: 'Rooh Platform Cloudflare Worker active', 
        message: 'All systems (KV, R2, Uploader, Sitemap, Renderer) are running successfully' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (err: any) {
      // معالجة عامة لأي خطأ طارئ لضمان عدم توقف الـ Worker
      return new Response(JSON.stringify({ 
        error: "Internal Worker Error", 
        details: err.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};