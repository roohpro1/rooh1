/**
 * Cloudflare Worker: Rooh Platform /app Reverse Proxy (Vanilla JS Edition)
 * Assign this Worker to Route: `roohpro.com/app*` in Cloudflare Dashboard
 *
 * Target: Transparently fetches from `rooh1.pages.dev` while keeping URL as `https://roohpro.com/app...`
 */

const DEFAULT_ORIGIN = "rooh1.pages.dev";
const DEFAULT_DOMAIN = "roohpro.com";

export default {
  async fetch(request, env, ctx) {
    const originHost = (env.APP_ORIGIN_HOST || DEFAULT_ORIGIN).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const publicDomain = (env.PUBLIC_DOMAIN || DEFAULT_DOMAIN).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

    const url = new URL(request.url);
    const method = request.method;

    // Handle preflight OPTIONS immediately with CORS headers
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, X-Admin-Email, X-Admin-Password, X-Admin-Secret, X-API-Key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Build the target URL pointing directly to the app origin
    const targetUrl = new URL(request.url);
    targetUrl.hostname = originHost;
    targetUrl.protocol = "https:";
    targetUrl.port = "";

    // Prepare headers for proxying
    const headers = new Headers(request.headers);
    headers.set("Host", originHost);
    headers.set("X-Forwarded-Host", publicDomain);
    headers.set("X-Forwarded-Proto", "https");
    headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || headers.get("X-Forwarded-For") || "");
    headers.set("X-Reverse-Proxy", "roohpro-app-proxy");
    headers.set("X-From-Proxy", "true");

    const hasBody = !["GET", "HEAD", "OPTIONS"].includes(method);
    const requestInit = {
      method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
    };

    try {
      let originResponse = await fetch(targetUrl.toString(), requestInit);

      // Handle origin redirect responses (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(originResponse.status)) {
        const location = originResponse.headers.get("Location");
        if (location) {
          try {
            const locUrl = new URL(location, targetUrl.toString());
            if (locUrl.hostname === originHost || locUrl.hostname.includes("pages.dev") || locUrl.hostname.includes("workers.dev")) {
              locUrl.hostname = publicDomain;
              locUrl.protocol = "https:";
            }
            if (locUrl.pathname === "/" || locUrl.pathname === "") {
              locUrl.pathname = "/app";
            }

            if (locUrl.toString() === url.toString()) {
              originResponse = await fetch(targetUrl.toString(), { ...requestInit, redirect: "follow" });
            } else {
              const respHeaders = new Headers(originResponse.headers);
              respHeaders.set("Location", locUrl.toString());
              return new Response(originResponse.body, {
                status: originResponse.status,
                statusText: originResponse.statusText,
                headers: respHeaders,
              });
            }
          } catch (_) {}
        }
      }

      // Check for SPA HTML Navigation Fallback if origin returned 404
      const isHtmlReq = (request.headers.get("accept") || "").includes("text/html") || !url.pathname.includes(".");
      if (originResponse.status === 404 && isHtmlReq && method === "GET") {
        const fallbackUrl = new URL(targetUrl.toString());
        fallbackUrl.pathname = "/app";
        try {
          const fallbackRes = await fetch(fallbackUrl.toString(), { method: "GET", headers });
          if (fallbackRes.ok) {
            originResponse = fallbackRes;
          }
        } catch (_) {}
      }

      const responseHeaders = new Headers(originResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD");
      responseHeaders.set("X-Proxy-Target", originHost);

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders,
      });

    } catch (err) {
      console.error("[RoohPro App Proxy Error]:", err);
      return new Response(
        `<!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>جاري تشغيل منصة روح...</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #09090b; color: #f4f4f5; }
            .card { max-width: 500px; margin: auto; padding: 24px; background: #18181b; border: 1px solid #27272a; border-radius: 16px; }
            .spinner { width: 40px; height: 40px; border: 3px solid #3f3f46; border-top-color: #10b981; border-radius: 50%; animation: spin 1s infinite linear; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
          <script>setTimeout(() => window.location.reload(), 3000);</script>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>جاري تحديث واجهة التطبيق</h2>
            <p>يتم الاتصال بخوادم التطبيق، سيتم التحديث تلقائياً خلال لحظات...</p>
          </div>
        </body>
        </html>`,
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "3" },
        }
      );
    }
  },
};
