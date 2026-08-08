import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Dynamic Sitemap Generator Script
 * Fetches all app reviews and pages from Firestore and outputs a valid XML sitemap.
 */
async function generateSitemap() {
  const siteUrl = process.env.SITE_URL || 'https://roohme.web.app';
  console.log(`[Sitemap Generator] Generating sitemap for: ${siteUrl}`);

  let appUrls = [];

  try {
    if (getApps().length === 0) {
      initializeApp();
    }
    const db = getFirestore();
    const appsSnap = await db.collection("apps").get();

    appsSnap.forEach((doc) => {
      const data = doc.data();
      const isPublic =
        data.isApproved === true ||
        data.published === true ||
        data.status === "approved" ||
        data.status === "published";

      if (!isPublic) return;

      let rawSlug = String(data.slug || "").trim();
      if (rawSlug.toLowerCase().endsWith(".html")) {
        rawSlug = rawSlug.substring(0, rawSlug.length - 5);
      }
      const fallbackSlug = data.name
        ? String(data.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        : doc.id;
      let slug = rawSlug || fallbackSlug;
      if (slug.toLowerCase().endsWith(".html")) {
        slug = slug.substring(0, slug.length - 5);
      }

      if (!slug) return;

      const dateVal = data.updatedAt || data.createdAt;
      let updatedAt = new Date().toISOString().split('T')[0];
      if (dateVal) {
        try {
          const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
          if (!isNaN(d.getTime())) {
            updatedAt = d.toISOString().split('T')[0];
          }
        } catch (_) {}
      }

      appUrls.push({
        loc: `${siteUrl}/${slug}`,
        lastmod: updatedAt,
        changefreq: 'weekly',
        priority: '0.8'
      });
    });
  } catch (err) {
    console.warn('[Sitemap Generator] Warning: Could not fetch from Firestore, generating base sitemap.', err.message);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main Static Pages -->
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <!-- Dynamic App Reviews & Pages (${appUrls.length}) -->
  ${appUrls.map(item => `
  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('')}
</urlset>`;

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(outputPath, sitemapXml, 'utf-8');
  console.log(`[Sitemap Generator] Successfully saved sitemap.xml to: ${outputPath}`);
}

generateSitemap().catch(err => {
  console.error('[Sitemap Generator] Error:', err);
});
