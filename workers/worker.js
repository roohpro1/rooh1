/**
 * Rooh Platform - Portal 1 Standalone Cloudflare Worker (البوابة الأولى)
 *
 * المسئوليات الرئيسية لـ "البوابة الأولى":
 * 1. محرك البحث والترشيحات للتطبيقات (Candidate App Search Flow).
 * 2. محرك الذكاء الاصطناعي لتوليد المقالات الشاملة والمراجعات (1500+ كلمة) طبقاً للمعايير الصحفية المعتمدة.
 * 3. رفع وحفظ المقالات في Cloudflare R2 مع توليد الروابط النظيفة (SEO Clean Slugs).
 * 4. الربط المباشر مع البوابة الرئيسية (Master Gateway Service Binding) لإرسال بيانات الأرشفة والتحديثات التلقائية.
 * 5. وكيل الإدارة والذكاء الاصطناعي (Admin AI Agent).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, X-Admin-Email, X-Admin-Password, X-Admin-Secret, X-API-Key, X-Portal-Source",
  "Access-Control-Max-Age": "86400",
};

function getBucket(env) {
  return env.roohme || env.ROOH_R2 || env.REVIEWS_BUCKET || env.ROOH_BUCKET || null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (path === "/api/portal1/health" || path === "/api/health") {
      return new Response(JSON.stringify({
        status: "ok",
        portal: "Portal 1 Standalone Worker",
        timestamp: new Date().toISOString(),
        hasR2: !!getBucket(env),
        hasD1: !!env.h,
        hasMasterGateway: !!env.MASTER_GATEWAY
      }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
      });
    }

    // Candidate apps search
    if (path === "/api/portal1/candidates" || path === "/api/candidates") {
      const q = (url.searchParams.get("q") || "").trim();
      if (!q) {
        return new Response(JSON.stringify({ error: "Missing query parameter 'q'" }), {
          status: 400, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }
      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=software&limit=15`);
        const itunesData = itunesRes.ok ? await itunesRes.json() : { results: [] };
        return new Response(JSON.stringify({
          success: true,
          query: q,
          candidates: itunesData.results || []
        }), {
          status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
        });
      }
    }

    return new Response(JSON.stringify({
      message: "Portal 1 Standalone Worker is running",
      path
    }), {
      status: 200, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
    });
  }
};
