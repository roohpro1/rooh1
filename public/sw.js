const CACHE_NAME = 'rooh-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  // Never intercept API, admin, or cross-origin requests
  if (url.pathname.startsWith('/api') || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Network-first with guaranteed Response return
  event.respondWith(
    fetch(event.request)
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // If offline and requesting an HTML document, return a basic offline response
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return new Response(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>منصة روح</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>تعذر الاتصال بالشبكة</h2><p>يرجى التحقق من اتصالك بالإنترنت ثم إعادة المحاولة.</p><button onclick="location.reload()" style="padding:10px 20px;border-radius:8px;cursor:pointer;">إعادة المحاولة</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
          );
        }
        return new Response('Network error occurred', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

