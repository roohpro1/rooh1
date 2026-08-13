import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

export async function onRequest(context: { request: Request; env: any; waitUntil: (p: Promise<any>) => void }) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // حماية: إذا كان الطلب يستهدف ملف JS أو CSS، لا تدع أي شيء آخر يلمسه
  if (/\.(js|css)$/i.test(pathname)) {
    const isJs = /\.js$/i.test(pathname);
    return new Response(`/* Asset ${pathname} not found */`, {
      status: 404,
      headers: { "Content-Type": isJs ? "application/javascript" : "text/css" }
    });
  }

  // تمرير باقي الطلبات للـ Router الأساسي
  return handleUnifiedCloudflareRequest(context.request, context.env, {
    waitUntil: (p: Promise<any>) => context.waitUntil(p)
  });
}

