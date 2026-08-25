import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

export async function onRequest(context: {
  request: Request;
  env: any;
  next: () => Promise<Response>;
  waitUntil: (p: Promise<any>) => void;
}): Promise<Response> {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // 1. Static Assets (JS, CSS, images, icons, fonts) -> Let Cloudflare Pages Edge serve directly
  const isStaticAsset =
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/app/assets/") ||
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|eot|map|txt|xml|webp|avif|wasm)$/i.test(pathname);

  if (isStaticAsset) {
    if (typeof context.next === "function") {
      try {
        const nextRes = await context.next();
        if (nextRes && nextRes.status < 400) {
          return nextRes;
        }
      } catch (_) {}
    }
    if (context.env?.ASSETS && typeof context.env.ASSETS.fetch === "function") {
      try {
        const assetRes = await context.env.ASSETS.fetch(context.request);
        if (assetRes && assetRes.status < 400) {
          return assetRes;
        }
      } catch (_) {}
    }
  }

  // 2. Pass API, Sitemap, and Dynamic Review requests to the unified router backend
  const isApiOrSpecial =
    pathname.startsWith("/api/") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/approved-apps.json";

  if (isApiOrSpecial) {
    return handleUnifiedCloudflareRequest(context.request, context.env, {
      waitUntil: (p: Promise<any>) => context.waitUntil(p)
    });
  }

  // 3. Try resolving pre-rendered R2 HTML review for article paths (/app/:slug, /:slug)
  if (context.request.method === "GET" && pathname.length > 1 && !pathname.startsWith("/assets/")) {
    const bucket =
      context.env?.roohme ||
      context.env?.ROOH_R2 ||
      context.env?.REVIEWS_BUCKET ||
      context.env?.ROOH_BUCKET ||
      context.env?.R2_BUCKET ||
      null;

    if (bucket) {
      const cleanSlug = pathname
        .replace(/^\/app\/?/i, "")
        .replace(/^\/+|\.html$/gi, "")
        .trim()
        .toLowerCase();

      if (cleanSlug && !["index.html", "admin", "privacy", "manifest.json", "sw.js", "app"].includes(cleanSlug)) {
        try {
          const r2Obj =
            (await bucket.get(`${cleanSlug}.html`)) ||
            (await bucket.get(`reviews/${cleanSlug}.html`)) ||
            (await bucket.get(`app/${cleanSlug}.html`));

          if (r2Obj) {
            const body = await r2Obj.text();
            return new Response(body, {
              status: 200,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "public, max-age=3600, s-maxage=86400",
                "Access-Control-Allow-Origin": "*"
              }
            });
          }
        } catch (_) {}
      }
    }
  }

  // 4. Main Portal Gateway & All Client Routes -> Deliver the real built index.html via context.next()
  if (typeof context.next === "function") {
    try {
      const nextRes = await context.next();
      if (nextRes && nextRes.status < 400) {
        return nextRes;
      }
    } catch (_) {}
  }

  if (context.env?.ASSETS && typeof context.env.ASSETS.fetch === "function") {
    try {
      const indexReq = new Request(new URL("/index.html", context.request.url), context.request);
      const indexRes = await context.env.ASSETS.fetch(indexReq);
      if (indexRes && indexRes.status < 400) {
        const headers = new Headers(indexRes.headers);
        headers.set("Content-Type", "text/html; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=0, must-revalidate");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(indexRes.body, {
          status: 200,
          headers
        });
      }
    } catch (_) {}
  }

  // Fallback to unified router
  return handleUnifiedCloudflareRequest(context.request, context.env, {
    waitUntil: (p: Promise<any>) => context.waitUntil(p)
  });
}

