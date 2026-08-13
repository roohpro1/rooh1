import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Static asset handling using env.ASSETS if available
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|json|ico|woff2?|ttf|eot|map|webp)$/i.test(path) || path.startsWith("/app/assets/") || path.startsWith("/assets/");
    if (isStaticAsset && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      try {
        let assetRes = await env.ASSETS.fetch(request);
        if ((!assetRes || assetRes.status === 404) && path.startsWith("/app/assets/")) {
          const strippedReq = new Request(new URL(path.replace(/^\/app/, ""), request.url), request);
          assetRes = await env.ASSETS.fetch(strippedReq);
        }
        if (assetRes && (assetRes.status === 200 || assetRes.status === 304)) {
          return assetRes;
        }
      } catch (_) {}
    }

    // Delegate all API & App routing to unified Cloudflare router engine
    return handleUnifiedCloudflareRequest(request, env, ctx);
  }
};
