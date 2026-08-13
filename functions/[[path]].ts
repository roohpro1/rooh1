import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

export async function onRequest(context: { request: Request; env: any; waitUntil: (p: Promise<any>) => void }) {
  const url = new URL(context.request.url);
  
  // Serve static assets directly via env.ASSETS if available
  if (context.env.ASSETS) {
    let assetUrl = context.request.url;
    if (url.pathname.startsWith('/app/assets/')) {
      assetUrl = context.request.url.replace('/app/assets/', '/assets/');
    }

    const isStaticAsset = url.pathname.includes('/assets/') || 
      /\.(js|css|png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|eot|map|txt|xml)$/i.test(url.pathname);

    if (isStaticAsset) {
      const assetRes = await context.env.ASSETS.fetch(new Request(assetUrl, context.request));
      if (assetRes && assetRes.status !== 404) {
        return assetRes;
      }
    }
  }

  return handleUnifiedCloudflareRequest(context.request, context.env, {
    waitUntil: (p: Promise<any>) => context.waitUntil(p)
  });
}
