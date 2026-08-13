import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

export async function onRequest(context: { request: Request; env: any; waitUntil: (p: Promise<any>) => void }) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  const isJsOrCss = /\.(js|css)$/i.test(pathname);
  const isStaticAsset = isJsOrCss || pathname.includes('/assets/') || 
    /\.(png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|eot|map|txt|xml)$/i.test(pathname);

  // Serve static assets directly via env.ASSETS if available
  if (context.env.ASSETS && isStaticAsset) {
    // 1. Try original request
    let assetRes = await context.env.ASSETS.fetch(context.request);
    let contentType = assetRes?.headers?.get("content-type") || "";

    if (assetRes && assetRes.status < 400 && !(isJsOrCss && contentType.includes("text/html"))) {
      return assetRes;
    }

    // 2. Try URL rewritten to remove /app/ or any path prefix before /assets/
    if (pathname.includes('/assets/')) {
      const cleanAssetPath = '/assets/' + pathname.split('/assets/')[1];
      const rewrittenUrl = new URL(cleanAssetPath, url.origin);
      assetRes = await context.env.ASSETS.fetch(new Request(rewrittenUrl.toString(), context.request));
      contentType = assetRes?.headers?.get("content-type") || "";
      if (assetRes && assetRes.status < 400 && !(isJsOrCss && contentType.includes("text/html"))) {
        return assetRes;
      }
    }

    // 3. If it's a JS or CSS file and not found as static asset, NEVER return HTML shell. Return a 404 with proper MIME type.
    if (isJsOrCss) {
      const isJs = /\.js$/i.test(pathname);
      return new Response(`/* Asset not found: ${pathname} */`, {
        status: 404,
        headers: {
          "Content-Type": isJs ? "application/javascript; charset=utf-8" : "text/css; charset=utf-8"
        }
      });
    }
  }

  return handleUnifiedCloudflareRequest(context.request, context.env, {
    waitUntil: (p: Promise<any>) => context.waitUntil(p)
  });
}

