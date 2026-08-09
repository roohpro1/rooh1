import { Env } from './types';

/**
 * Worker Script 2: Dynamic Sitemap Generator (Rooh Platform)
 * 
 * 1. Intercepts requests to /sitemap.xml.
 * 2. Queries Firestore REST API for all published apps.
 * 3. Excludes pending or unpublished documents.
 * 4. Generates a valid XML sitemap with smart Edge caching for instant Googlebot indexing.
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== '/sitemap.xml') {
      return new Response('Not Found', { status: 404 });
    }

    // Edge Cache Check
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);

    if (response) {
      return response;
    }

    const siteUrl = env.SITE_URL || 'https://roohpro.com';

    try {
      let publishedApps: Array<{ slug: string; lastmod: string }> = [];

      // Priority 1: Read approved-apps.json directly from Cloudflare R2 Bucket or KV (Zero Firebase quota consumption)
      try {
        let approvedJsonStr: string | null = null;

        if (env.ROOH_KV) {
          approvedJsonStr = await env.ROOH_KV.get('APPROVED_APPS_JSON');
        }

        if (!approvedJsonStr && env.R2_BUCKET) {
          const approvedObj = await env.R2_BUCKET.get('approved-apps.json');
          if (approvedObj) {
            approvedJsonStr = await approvedObj.text();
          }
        }

        if (approvedJsonStr) {
          const parsed = JSON.parse(approvedJsonStr);
          if (Array.isArray(parsed)) {
            publishedApps = parsed
              .filter((item: any) => item && (item.isApproved !== false && item.status !== 'pending') && (item.slug || item.cleanSlug))
              .map((item: any) => ({
                slug: String(item.cleanSlug || item.slug).replace(/^\/+|\.html$/gi, ''),
                lastmod: item.lastmod || item.updatedAt ? String(item.lastmod || item.updatedAt).split('T')[0] : new Date().toISOString().split('T')[0]
              }));
          }
        }
      } catch (r2Err) {
        console.warn('R2/KV approved-apps.json read warning:', r2Err);
      }

      // Priority 2: Fallback to Firestore REST API if R2/KV approved-apps.json is empty
      if (publishedApps.length === 0) {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/apps?key=${env.FIREBASE_API_KEY}&pageSize=3000`;
        const res = await fetch(firestoreUrl);

        if (res.ok) {
          const data: any = await res.json();
          const documents = data.documents || [];

          publishedApps = documents
            .map((doc: any) => {
              const fields = doc.fields || {};
              const status = fields.status?.stringValue || '';
              const isApproved = fields.isApproved?.booleanValue === true;
              const rawSlug = fields.slug?.stringValue || '';
              const slug = rawSlug.toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
              const lastmod = fields.lastmod?.stringValue || new Date().toISOString().split('T')[0];

              if ((status === 'published' || isApproved) && status !== 'pending' && isApproved !== false && slug) {
                return { slug, lastmod };
              }
              return null;
            })
            .filter(Boolean);
        }
      }

      // Priority 3: Default Seed apps fallback to guarantee a valid sitemap
      if (publishedApps.length === 0) {
        const seedSlugs = [
          "whatsapp-messenger", "chatgpt", "telegram-messenger", "duolingo",
          "spotify-music", "capcut-video-editor", "tiktok", "instagram",
          "snapchat", "facebook", "pubg-mobile", "free-fire"
        ];
        publishedApps = seedSlugs.map(s => ({ slug: s, lastmod: new Date().toISOString().split('T')[0] }));
      }

      // Generate Clean XML Sitemap
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Main Pages
      xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${siteUrl}/privacy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;

      // Published Clean Review Route URLs (Strictly clean slug without .html)
      const seenSlugs = new Set<string>();
      for (const app of publishedApps) {
        const cleanSlug = app.slug.replace(/^\/+|\.html$/gi, '').trim();
        if (!cleanSlug || seenSlugs.has(cleanSlug)) continue;
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
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
          'X-Sitemap-Apps-Count': String(publishedApps.length),
        },
      });

      // Cache response in Cloudflare Edge Cache asynchronously
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    } catch (err: any) {
      console.error('Dynamic Sitemap Error:', err);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
        status: 500,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }
  },
};
