import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

const STATIC_ASSET_REGEX = /\.(js|css|png|jpg|jpeg|gif|svg|json|ico|woff2?|ttf|eot|map|webp|avif|wasm)$/i;

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname;

    // 0. Domain Canonical Handling
    // When accessed directly or through reverse proxy, we serve the request cleanly.
    // We only set canonical SEO metadata in the HTML tags without blocking client execution.

    // Static asset handling using env.ASSETS if available (only true asset files with extensions or /assets/ /app/assets/)
    const isStaticAsset = STATIC_ASSET_REGEX.test(path) || path.startsWith("/assets/") || path.startsWith("/app/assets/");
    if (isStaticAsset) {
      if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
        let assetRes: Response | null = null;
        
        // معالجة مسارات الأصول الخاصة بالبوابة الفرعية /app/assets/
        if (path.startsWith("/app/assets/")) {
          const strippedPath = path.replace(/^\/app/, "");
          const assetReq = new Request(new URL(strippedPath, request.url), request);
          try {
            assetRes = await env.ASSETS.fetch(assetReq);
          } catch (_) {}

          if (!assetRes || assetRes.status === 404) {
            const rawAssetReq = new Request(new URL(path, request.url), request);
            try {
              assetRes = await env.ASSETS.fetch(rawAssetReq);
            } catch (_) {}
          }
        }
        
        if (!assetRes || assetRes.status === 404) {
          try {
            assetRes = await env.ASSETS.fetch(request);
          } catch (_) {}
        }
        
        if (assetRes && (assetRes.status === 200 || assetRes.status === 304)) {
          return assetRes;
        }
      }
    }

    // Delegate all API & App routing to unified Cloudflare router engine
    return handleUnifiedCloudflareRequest(request, env, ctx);
  }
};

