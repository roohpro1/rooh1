import { Env } from './types';

/**
 * Worker Script 3: The Renderer (Rooh Platform)
 * 
 * 1. Intercepts incoming requests to /review/:slug or /:slug.
 * 2. Checks Cloudflare Edge Cache.
 * 3. Resolves slug to R2 object key from Cloudflare R2 bucket (or Firestore metadata query).
 * 4. Serves heavy HTML content directly from R2 with ultra-fast latency.
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Route matching for review pages (e.g., /review/whatsapp or /whatsapp)
    let slug = '';
    if (pathname.startsWith('/review/')) {
      slug = pathname.replace('/review/', '').trim();
    } else if (pathname !== '/' && !pathname.includes('.')) {
      slug = pathname.replace('/', '').trim();
    }

    if (!slug) {
      return fetch(request); // Pass through to standard app
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    // 1. Check Cloudflare Edge Cache
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }

    try {
      // 2. Try fetching heavy HTML directly from R2 Bucket
      const r2Key = `reviews/${cleanSlug}.html`;
      let object = await env.R2_BUCKET.get(r2Key);

      // Fallback: If not found by key convention, query Firestore REST API
      if (!object) {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/apps?key=${env.FIREBASE_API_KEY}&pageSize=1000`;
        const fsRes = await fetch(firestoreUrl);
        if (fsRes.ok) {
          const fsData: any = await fsRes.json();
          const docs = fsData.documents || [];
          const matchedDoc = docs.find((d: any) => d.fields?.slug?.stringValue === cleanSlug);
          if (matchedDoc && matchedDoc.fields?.r2Key?.stringValue) {
            const resolvedKey = matchedDoc.fields.r2Key.stringValue;
            object = await env.R2_BUCKET.get(resolvedKey);
          }
        }
      }

      if (!object) {
        return new Response(
          `<!DOCTYPE html>
           <html dir="rtl" lang="ar">
           <head><meta charset="UTF-8"><title>المراجعة غير موجودة | موقع مراجع التطبيقات</title></head>
           <body style="font-family:sans-serif; text-align:center; padding:50px; background:#f8fafc;">
             <h2>عذراً، لم يتم العثور على مراجعة هذا التطبيق! 🔍</h2>
             <p>قد تكون المراجعة ما زالت قيد التوليد أو تم نقلها.</p>
             <a href="/" style="color:#2563eb; text-decoration:underline;">العودة للصفحة الرئيسية</a>
           </body>
           </html>`,
          {
            status: 404,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }

      // 3. Serve content from R2
      const htmlBody = await object.text();
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
      headers.set('X-Served-By', 'Cloudflare-R2-Edge');

      response = new Response(htmlBody, {
        status: 200,
        headers,
      });

      // Cache response at Cloudflare Edge
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    } catch (err: any) {
      console.error('Renderer Worker Exception:', err);
      return new Response('Internal Server Error rendering review page.', { status: 500 });
    }
  },
};
