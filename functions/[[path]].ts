import { handleUnifiedCloudflareRequest } from "../src/server/unifiedRouter";

export async function onRequest(context: { request: Request; env: any; waitUntil: (p: Promise<any>) => void }) {
  return handleUnifiedCloudflareRequest(context.request, context.env, {
    waitUntil: (p: Promise<any>) => context.waitUntil(p)
  });
}
