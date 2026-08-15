import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as core from "./server-core";

import { registerRoutes as registerAuthRoutes } from "./routes/auth";
import { registerRoutes as registerSearchRoutes } from "./routes/search";
import { registerRoutes as registerAppRoutes } from "./routes/apps";
import { registerRoutes as registerAiRoutes } from "./routes/ai";
import { registerRoutes as registerAdminRoutes } from "./routes/admin";
import { registerRoutes as registerIntegrationRoutes } from "./routes/integrations";
import { registerRoutes as registerEnvRoutes } from "./routes/env";
import { registerRoutes as registerAgentRoutes } from "./routes/agent";
import { registerRoutes as registerArchiveRoutes } from "./routes/archive";

const {
  app, PORT, getApprovedAppsList, getIndexedAppPages, cleanSlugForSitemap, ensureAdminFirebaseInitialized,
  ensureGeminiKeysInFirestore, getSystemEnvConfigFromFs, saveSystemEnvConfigToFs, setupDailyAppsCron,
  syncAllPublishedAppsToArchive
} = core;


app.use(express.json());

// Global CORS Middleware allowing X-Admin-Email & X-Admin-Password headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, x-api-key, Bearer, Cache-Control, Pragma, X-Admin-Email, X-Admin-Password, x-admin-email, x-admin-password, X-Admin-Secret, x-admin-secret");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

registerAuthRoutes(app);
registerSearchRoutes(app);
registerAppRoutes(app);
registerAiRoutes(app);
registerAdminRoutes(app);
registerIntegrationRoutes(app);
registerEnvRoutes(app);
registerAgentRoutes(app);
registerArchiveRoutes(app);

async function startServer() {
  // Dynamic robots.txt endpoint
  app.get(['/robots.txt', '/robots.txt/'], (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    const siteUrl = process.env.SITE_URL || 'https://roohpro.com';
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
  });

  // Dynamic XML sitemap endpoint (Must be mounted BEFORE express.static so it's generated dynamically from Firestore)
  app.get(['/sitemap.xml', '/sitemap', '/sitemap.xml/'], async (req, res) => {
    try {
      ensureAdminFirebaseInitialized();
      const siteUrl = process.env.SITE_URL || 'https://roohpro.com';
      const appPages = await getIndexedAppPages();

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // الصفحة الرئيسية
      xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      xml += `  <url>\n    <loc>${siteUrl}/privacy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;

      // جميع صفحات المراجعات التي أنشأها الذكاء الاصطناعي ووافق عليها المطور
      for (const page of appPages) {
        const cleanSlug = cleanSlugForSitemap(page.slug);
        if (!cleanSlug) continue;

        xml += `  <url>\n`;
        xml += `    <loc>${siteUrl}/${cleanSlug}</loc>\n`;
        if (page.lastmod) {
          xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
        }
        xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }

      xml += `</urlset>`;
      res.header('Content-Type', 'application/xml; charset=utf-8');
      res.header('Cache-Control', 'public, max-age=300, s-maxage=600');
      res.status(200).send(xml);
    } catch (error) {
      console.error("Error generating dynamic sitemap from Firestore:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Server-Side Dynamic SEO Meta Tags Injection for Search Engine Crawlers & Social Cards
  app.get('*', async (req, res, next) => {
    const rawPath = req.path || '/';
    if (
      rawPath.startsWith('/api/') ||
      rawPath.startsWith('/assets/') ||
      rawPath.startsWith('/@') ||
      rawPath.includes('.') ||
      rawPath === '/' ||
      rawPath === '/app' ||
      rawPath === '/app/' ||
      rawPath.startsWith('/app/') ||
      rawPath === '/privacy' ||
      rawPath === '/sitemap.xml' ||
      rawPath === '/robots.txt'
    ) {
      return next();
    }

    const cleanSlug = rawPath.replace(/^\/+|\.html$/gi, '').trim().toLowerCase();
    if (!cleanSlug) return next();

    try {
      const approvedList = getApprovedAppsList();
      const appData = approvedList.find((a: any) => {
        const itemSlug = String(a.cleanSlug || a.slug || a.id || '').toLowerCase().replace(/^\/+|\.html$/gi, '').trim();
        return itemSlug === cleanSlug;
      });

      if (appData) {
        const title = appData.name || appData.title || cleanSlug;
        const pageTitle = `دليل ومراجعة شاملة لتطبيق ${title} | منصة روح`;
        const pageDesc = appData.description || `دليل واستعراض ومراجعة تفصيلية شاملة لتطبيق ${title} مع شرح كل المميزات وروابط التنزيل المباشرة والآمنة 100%.`;
        const pageImage = appData.iconUrl || `https://roohpro.com/assets/images/og-home.jpg`;
        const canonicalUrl = `https://roohpro.com/${cleanSlug}`;

        let indexPath = path.join(process.cwd(), "index.html");
        if (process.env.NODE_ENV === "production") {
          indexPath = path.join(process.cwd(), "dist", "index.html");
        }

        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, "utf-8");

          // Inject title, canonical, and social cards directly into HTML <head>
          html = html.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`);
          html = html.replace(/<meta name="description" content=".*?"/i, `<meta name="description" content="${pageDesc}"`);
          html = html.replace(/<link rel="canonical" href=".*?"/i, `<link rel="canonical" href="${canonicalUrl}"`);
          html = html.replace(/<meta property="og:title" content=".*?"/i, `<meta property="og:title" content="${pageTitle}"`);
          html = html.replace(/<meta property="og:description" content=".*?"/i, `<meta property="og:description" content="${pageDesc}"`);
          html = html.replace(/<meta property="og:url" content=".*?"/i, `<meta property="og:url" content="${canonicalUrl}"`);
          html = html.replace(/<meta property="og:image" content=".*?"/i, `<meta property="og:image" content="${pageImage}"`);
          html = html.replace(/<meta name="twitter:title" content=".*?"/i, `<meta name="twitter:title" content="${pageTitle}"`);
          html = html.replace(/<meta name="twitter:description" content=".*?"/i, `<meta name="twitter:description" content="${pageDesc}"`);
          html = html.replace(/<meta name="twitter:image" content=".*?"/i, `<meta name="twitter:image" content="${pageImage}"`);

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.status(200).send(html);
        }
      }
    } catch (err) {
      console.warn("[SEO Injection Notice]", err);
    }

    next();
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
  }

  if (process.env.NODE_ENV === "production") {
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    await ensureGeminiKeysInFirestore();
    try {
      const initEnvConfig = await getSystemEnvConfigFromFs();
      await saveSystemEnvConfigToFs(initEnvConfig);
      console.log("[System Config] System environment variables and API keys initialized successfully!");
    } catch (envErr) {
      console.warn("[System Config] Failed initializing environment config from Firestore on boot:", envErr);
    }
    setupDailyAppsCron();
    syncAllPublishedAppsToArchive().catch(err => console.warn("[Boot Sync Notice]", err));
  });
}

startServer();
