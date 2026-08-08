import { Env, ReviewUploadPayload } from './types';

/**
 * Worker Script 1: The Uploader (Rooh Platform)
 * 
 * 1. Receives heavy AI-generated 1500+ word review HTML/Markdown.
 * 2. Uploads the heavy content file directly to Cloudflare R2 storage.
 * 3. Saves ONLY lightweight metadata to Firebase Firestore via REST API.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Authenticate Request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.AUTH_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized access.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const payload: ReviewUploadPayload = await request.json();

      if (!payload.appId || !payload.slug || !payload.reviewContentHtml) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: appId, slug, or reviewContentHtml.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Format clean slug
      const cleanSlug = payload.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const r2Key = `reviews/${cleanSlug}.html`;
      const nowIso = new Date().toISOString();

      // 2. Upload Heavy Review Content to Cloudflare R2
      await env.R2_BUCKET.put(r2Key, payload.reviewContentHtml, {
        httpMetadata: {
          contentType: 'text/html; charset=utf-8',
          cacheControl: 'public, max-age=31536000, immutable',
        },
        customMetadata: {
          appId: payload.appId,
          slug: cleanSlug,
          uploadedAt: nowIso,
        },
      });

      // 3. Post Lightweight Metadata to Firebase Firestore REST API
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/apps/${payload.appId}?key=${env.FIREBASE_API_KEY}`;
      
      const firestoreFields = {
        fields: {
          slug: { stringValue: cleanSlug },
          r2Key: { stringValue: r2Key },
          status: { stringValue: 'published' },
          isApproved: { booleanValue: true },
          name: { stringValue: payload.name || payload.appId },
          playStoreUrl: { stringValue: payload.playStoreUrl || '' },
          iconUrl: { stringValue: payload.iconUrl || '' },
          description: { stringValue: payload.description || '' },
          lastmod: { stringValue: nowIso.split('T')[0] },
          updatedAt: { timestampValue: nowIso },
        },
      };

      const firestoreRes = await fetch(firestoreUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firestoreFields),
      });

      if (!firestoreRes.ok) {
        const errText = await firestoreRes.text();
        console.error('Firestore REST API Error:', errText);
        return new Response(
          JSON.stringify({
            error: 'Failed to update Firestore metadata.',
            details: errText,
            r2Key,
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Review uploaded to R2 and metadata updated in Firestore successfully!',
          appId: payload.appId,
          slug: cleanSlug,
          r2Key,
          publicUrl: `${env.SITE_URL || 'https://roohme.web.app'}/review/${cleanSlug}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err: any) {
      console.error('Uploader Worker Exception:', err);
      return new Response(
        JSON.stringify({ error: 'Internal server error', message: err?.message || String(err) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
