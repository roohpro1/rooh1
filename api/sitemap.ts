import type { Request, Response } from 'express';

function cleanSlugForXml(input: string): string {
  if (!input) return "";
  let s = String(input).trim();
  if (s.includes("http://") || s.includes("https://")) {
    try {
      const u = new URL(s);
      s = u.pathname.replace(/^\/+/, "");
    } catch (_) {
      s = s.replace(/^https?:\/\/[^\/]+\//, "");
    }
  }
  if (s.toLowerCase().endsWith(".html")) {
    s = s.substring(0, s.length - 5);
  }
  return s.split('?')[0].split('#')[0].replace(/[^a-zA-Z0-9\-_]/g, "-").replace(/^-+|-+$/g, "").trim();
}

export default async function handler(req: Request, res: Response) {
  try {
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'roohpro.com';
    const siteUrl = `${protocol}://${host}`;

    const seenSlugs = new Set<string>();
    let appUrls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

    // Query Cloudflare R2 / KV / D1 or Firestore REST API for approved apps
    try {
      const approvedRes = await fetch(`${siteUrl}/approved-apps.json`).catch(() => null);
      if (approvedRes && approvedRes.ok) {
        const approvedList = await approvedRes.json();
        if (Array.isArray(approvedList)) {
          approvedList.forEach((item: any) => {
            const rawSlug = item.cleanSlug || item.slug || item.id;
            const cleanSlug = cleanSlugForXml(rawSlug);
            const updatedAt = item.lastmod || item.updatedAt ? String(item.lastmod || item.updatedAt).split('T')[0] : new Date().toISOString().split('T')[0];
            if (cleanSlug && !seenSlugs.has(cleanSlug)) {
              seenSlugs.add(cleanSlug);
              appUrls.push({
                loc: `${siteUrl}/app/${cleanSlug}`,
                lastmod: updatedAt,
                changefreq: 'weekly',
                priority: '0.8',
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('[Sitemap API] Approved apps fetch notice:', e);
    }

    // Query Firestore REST API for apps documents
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0951591986";
    const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-remixremixremixr-f90e7953-c5a1-4541-b13d-95e6eb5f6d0b";
    const apiKey = process.env.VITE_FIREBASE_API_KEY || "";
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/apps?key=${apiKey}&pageSize=1000`;

    try {
      const response = await fetch(firestoreUrl);
      if (response.ok) {
        const data = await response.json();
        const documents = data.documents || [];

        documents.forEach((doc: any) => {
          const fields = doc.fields || {};
          const docId = doc.name ? doc.name.split('/').pop() : '';
          
          const isApproved = fields.isApproved?.booleanValue ?? fields.published?.booleanValue ?? true;
          const status = fields.status?.stringValue || 'published';

          // EXCLUDE pending or unapproved draft articles from sitemap
          if (status === 'pending' || status === 'draft' || isApproved === false) {
            return;
          }
          
          const rawSlug = fields.slug?.stringValue || fields.articleUrl?.stringValue || (docId ? docId.replace(/\./g, '-') + '-review' : '');
          const cleanSlug = cleanSlugForXml(rawSlug);

          const updatedAt = fields.updatedAt?.timestampValue || fields.createdAt?.timestampValue
            ? new Date(fields.updatedAt?.timestampValue || fields.createdAt?.timestampValue).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

          if (cleanSlug && !seenSlugs.has(cleanSlug)) {
            seenSlugs.add(cleanSlug);
            appUrls.push({
              loc: `${siteUrl}/app/${cleanSlug}`,
              lastmod: updatedAt,
              changefreq: 'weekly',
              priority: '0.8',
            });
          }
        });
      }
    } catch (e) {
      console.warn('[Sitemap API] Failed to query Firestore REST API:', e);
    }

    // XML Generation

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/app</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  ${appUrls
    .map(
      (item) => `
  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
    )
    .join('')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error('[Sitemap API] Error generating sitemap:', err);
    return res.status(500).send('Error generating sitemap');
  }
}
