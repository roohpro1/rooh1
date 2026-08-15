import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// رابط الـ Worker الديناميكي الحقيقي الخاص بك
const WORKER_SITEMAP_URL = 'https://roohpro.com/sitemap.xml';

function fetchUrlWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        return fetchUrlWithRedirects(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function fetchAndSaveSitemap() {
  const distDir = path.join(__dirname, 'dist');
  const outputPath = path.join(distDir, 'sitemap.xml');
  const publicDir = path.join(__dirname, 'public');
  const publicPath = path.join(publicDir, 'sitemap.xml');
  
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  try {
    const { statusCode, data } = await fetchUrlWithRedirects(WORKER_SITEMAP_URL);
    if (statusCode === 200 && data && data.includes('<urlset')) {
      fs.writeFileSync(outputPath, data);
      console.log('Successfully fetched and generated dynamic sitemap from worker at:', outputPath);
      
      if (fs.existsSync(publicDir)) {
        fs.writeFileSync(publicPath, data);
        console.log('Successfully saved copy to public/sitemap.xml');
      }
      return;
    } else {
      console.warn(`Worker sitemap endpoint returned status ${statusCode}. Generating sitemap from local approved-apps.json...`);
    }
  } catch (err) {
    console.warn('Notice fetching sitemap from worker:', err.message, '- Generating from local approved-apps.json...');
  }

  generateSitemapFromApprovedApps(outputPath, publicPath);
}

function generateSitemapFromApprovedApps(outputPath, publicPath) {
  const siteUrl = 'https://roohpro.com';
  let apps = [];
  const localJsonPaths = [
    path.join(__dirname, 'data', 'approved-apps.json'),
    path.join(__dirname, 'public', 'approved-apps.json'),
    path.join(__dirname, 'public', 'reviews', 'approved-apps.json')
  ];

  for (const jsonPath of localJsonPaths) {
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          apps = parsed;
          console.log(`Loaded ${apps.length} apps from ${jsonPath} for sitemap generation.`);
          break;
        }
      } catch (e) {
        console.warn(`Failed to parse ${jsonPath}:`, e.message);
      }
    }
  }

  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${siteUrl}/app</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${siteUrl}/privacy</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;

  const addedSlugs = new Set();
  for (const item of apps) {
    let rawSlug = item.cleanSlug || item.slug || item.id;
    if (rawSlug) {
      let clean = String(rawSlug).trim().replace(/^\//, '').replace(/\.html$/i, '');
      if (clean.endsWith('-review')) {
        clean = clean.replace(/-review$/i, '');
      }
      if (clean && !addedSlugs.has(clean) && !['sitemap.xml', 'privacy', 'app', ''].includes(clean)) {
        addedSlugs.add(clean);
        const lastmod = (item.lastmod || item.updatedAt || today).split('T')[0];
        xml += `  <url>\n    <loc>${siteUrl}/app/${clean}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
    }
  }

  xml += `</urlset>`;

  try {
    fs.writeFileSync(outputPath, xml);
    if (fs.existsSync(path.dirname(publicPath))) {
      fs.writeFileSync(publicPath, xml);
    }
    console.log(`Successfully generated dynamic sitemap (${addedSlugs.size + 2} URLs) from local data!`);
  } catch (err) {
    console.error('Error writing generated sitemap:', err);
  }
}

function writeRobotsTxt() {
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://roohpro.com/sitemap.xml
`;
  const distRobots = path.join(__dirname, 'dist', 'robots.txt');
  const publicRobots = path.join(__dirname, 'public', 'robots.txt');

  try {
    if (fs.existsSync(path.dirname(distRobots))) {
      fs.writeFileSync(distRobots, robotsTxt, 'utf8');
      console.log('Successfully wrote dist/robots.txt');
    }
    if (fs.existsSync(path.dirname(publicRobots))) {
      fs.writeFileSync(publicRobots, robotsTxt, 'utf8');
      console.log('Successfully wrote public/robots.txt');
    }
  } catch (err) {
    console.error('Error writing robots.txt:', err);
  }
}

writeRobotsTxt();
fetchAndSaveSitemap();

