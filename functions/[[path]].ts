import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

export async function onRequest(context: { request: Request; env: any; next: () => Promise<Response>; waitUntil: (p: Promise<any>) => void }) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  const isJsOrCss = /\.(js|css)$/i.test(pathname);
  const isStaticAsset = isJsOrCss || pathname.includes('/assets/') || 
    /\.(png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|eot|map|txt|xml)$/i.test(pathname);

  // If request is for a static asset, delegate to Cloudflare ASSETS or context.next()
  if (isStaticAsset) {
    if (context.env?.ASSETS) {
      const assetRes = await context.env.ASSETS.fetch(context.request);
      const contentType = assetRes?.headers?.get("content-type") || "";
      if (assetRes && assetRes.status < 400 && !(isJsOrCss && contentType.includes("text/html"))) {
        return assetRes;
      }
    }
    if (typeof context.next === 'function') {
      const nextRes = await context.next();
      const contentType = nextRes?.headers?.get("content-type") || "";
      if (nextRes && nextRes.status < 400 && !(isJsOrCss && contentType.includes("text/html"))) {
        return nextRes;
      }
    }
    // Return explicit 404 with proper MIME type if asset is missing (prevent HTML fallback)
    if (isJsOrCss) {
      const isJs = /\.js$/i.test(pathname);
      return new Response(`/* Asset ${pathname} not found */`, {
        status: 404,
        headers: { "Content-Type": isJs ? "application/javascript; charset=utf-8" : "text/css; charset=utf-8" }
      });
    }
  }

  // Pass remaining requests to the main Server Router
  return handleUnifiedCloudflareRequest(context.request, context.env, {
    waitUntil: (p: Promise<any>) => context.waitUntil(p)
  });
}


