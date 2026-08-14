import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

export async function onRequest(context: {
  request: Request;
  env: any;
  next: () => Promise<Response>;
  waitUntil: (p: Promise<any>) => void;
}): Promise<Response> {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;

  // 1. Canonical Domain Redirection:
  // If accessed via *.pages.dev or *.workers.dev, immediately 301 redirect to primary custom domain https://roohpro.com
  // Ensures sub-path /app and nested paths work seamlessly under https://roohpro.com
  if (
    (hostname.endsWith(".pages.dev") || hostname.endsWith(".workers.dev")) &&
    !hostname.includes("localhost") &&
    !hostname.includes("127.0.0.1") &&
    !hostname.includes("roohpro.com")
  ) {
    const targetCanonicalUrl = `https://roohpro.com${pathname}${url.search}`;
    return new Response(null, {
      status: 301,
      headers: {
        Location: targetCanonicalUrl,
        "Cache-Control": "public, max-age=86400",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  }

  const isJsOrCss = /\.(js|css)$/i.test(pathname);
  const isStaticAsset =
    isJsOrCss ||
    pathname.includes("/assets/") ||
    pathname.startsWith("/app/assets/") ||
    /\.(png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|eot|map|txt|xml|webp|avif|wasm)$/i.test(pathname);

  // 2. Static Asset handling:
  if (isStaticAsset) {
    if (context.env?.ASSETS && typeof context.env.ASSETS.fetch === "function") {
      let assetRes: Response | null = null;
      if (pathname.startsWith("/app/")) {
        const strippedPath = pathname.replace(/^\/app/, "");
        const assetReq = new Request(new URL(strippedPath, context.request.url), context.request);
        try {
          assetRes = await context.env.ASSETS.fetch(assetReq);
        } catch (_) {}
      }
      if (!assetRes || assetRes.status === 404) {
        try {
          assetRes = await context.env.ASSETS.fetch(context.request);
        } catch (_) {}
      }
      const contentType = assetRes?.headers?.get("content-type") || "";
      if (assetRes && assetRes.status < 400 && !(isJsOrCss && contentType.includes("text/html"))) {
        return assetRes;
      }
    }
    if (typeof context.next === "function") {
      try {
        const nextRes = await context.next();
        const contentType = nextRes?.headers?.get("content-type") || "";
        if (nextRes && nextRes.status < 400 && !(isJsOrCss && contentType.includes("text/html"))) {
          return nextRes;
        }
      } catch (_) {}
    }
    // Return explicit 404 with proper MIME type if asset is missing (prevent HTML fallback on scripts)
    if (isJsOrCss) {
      const isJs = /\.js$/i.test(pathname);
      return new Response(`/* Asset ${pathname} not found */`, {
        status: 404,
        headers: {
          "Content-Type": isJs ? "application/javascript; charset=utf-8" : "text/css; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }
  }

  // 3. Pass API, Sitemap, and Dynamic Review requests to the unified router
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

  // 4. Instant Main Portal Gateway Route (/app, /app/, /) -> Immediate SPA delivery
  if (pathname === "/app" || pathname === "/app/" || pathname === "/" || pathname === "/index.html") {
    if (context.env?.ASSETS && typeof context.env.ASSETS.fetch === "function") {
      try {
        const indexReq = new Request(new URL("/index.html", context.request.url), context.request);
        const indexRes = await context.env.ASSETS.fetch(indexReq);
        if (indexRes && indexRes.status < 400) {
          const headers = new Headers(indexRes.headers);
          headers.set("Content-Type", "text/html; charset=utf-8");
          headers.set("Cache-Control", "public, max-age=0, must-revalidate");
          return new Response(indexRes.body, {
            status: 200,
            headers
          });
        }
      } catch (_) {}
    }
    if (typeof context.next === "function") {
      try {
        const nextRes = await context.next();
        if (nextRes && nextRes.status < 400) {
          return nextRes;
        }
      } catch (_) {}
    }
  }

  // 5. Try resolving pre-rendered R2 HTML review for article paths (/app/:slug, /:slug)
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
                "Cache-Control": "public, max-age=3600, s-maxage=86400"
              }
            });
          }
        } catch (_) {}
      }
    }
  }

  // 6. Default Route -> Deliver the real built index.html from Cloudflare Pages ASSETS
  if (context.env?.ASSETS && typeof context.env.ASSETS.fetch === "function") {
    try {
      const indexReq = new Request(new URL("/index.html", context.request.url), context.request);
      const indexRes = await context.env.ASSETS.fetch(indexReq);
      if (indexRes && indexRes.status < 400) {
        const headers = new Headers(indexRes.headers);
        headers.set("Content-Type", "text/html; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=0, must-revalidate");
        return new Response(indexRes.body, {
          status: 200,
          headers
        });
      }
    } catch (_) {}
  }

  if (typeof context.next === "function") {
    try {
      const nextRes = await context.next();
      if (nextRes && nextRes.status < 400) {
        return nextRes;
      }
    } catch (_) {}
  }

  // Fallback to unified router
  return handleUnifiedCloudflareRequest(context.request, context.env, {
    waitUntil: (p: Promise<any>) => context.waitUntil(p)
  });
}
