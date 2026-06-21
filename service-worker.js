// ── Jakibra Restaurant — Service Worker ──
const CACHE_VERSION = 'v1';
const CACHE_STATIC  = `jakibra-static-${CACHE_VERSION}`;
const CACHE_IMAGES  = `jakibra-images-${CACHE_VERSION}`;
const ALL_CACHES    = [CACHE_STATIC, CACHE_IMAGES];

// Core assets to pre-cache on install
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
 '/icons/icon.png',
  // External CDN assets (cached on first fetch)
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Outfit:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css',
  'https://unpkg.com/swiper/swiper-bundle.min.css',
  'https://unpkg.com/swiper/swiper-bundle.min.js'
];

// ── INSTALL: Pre-cache static assets ──
self.addEventListener('install', event => {
  console.log('[SW] Installing Jakibra Service Worker...');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        // Cache what we can; don't fail install if CDN is unreachable
        return Promise.allSettled(
          STATIC_ASSETS.map(url => cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err)))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: Clean old caches ──
self.addEventListener('activate', event => {
  console.log('[SW] Activating Jakibra Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => !ALL_CACHES.includes(key))
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── FETCH: Smart caching strategy ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Strategy 1: Images → Cache-first (long-lived)
  if (request.destination === 'image' || url.hostname === 'images.unsplash.com' || url.hostname === 'ui-avatars.com') {
    event.respondWith(cacheFirstImages(request));
    return;
  }

  // Strategy 2: Google Maps embeds → Network-only (requires live connection)
  if (url.hostname.includes('google.com/maps')) {
    event.respondWith(fetch(request).catch(() => offlineFallback()));
    return;
  }

  // Strategy 3: HTML pages → Network-first, fallback to cache
  if (request.destination === 'document') {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  // Strategy 4: Everything else (CSS, JS, fonts) → Stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Cache-first for images ──
async function cacheFirstImages(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_IMAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#FDF5F5"/><text x="50%" y="50%" text-anchor="middle" fill="#8A4A52" font-size="14" font-family="sans-serif">Image unavailable offline</text></svg>', {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

// ── Network-first for HTML ──
async function networkFirstHtml(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/index.html') || offlineFallback();
  }
}

// ── Stale-while-revalidate for CSS/JS/fonts ──
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await fetchPromise || offlineFallback();
}

// ── Offline fallback page ──
function offlineFallback() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Jakibra Restaurant — Offline</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Outfit', sans-serif; background: #1A0608; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 2rem; }
        .container { max-width: 400px; }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { font-size: 1.8rem; margin-bottom: 0.5rem; color: #E8314F; }
        p { color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 1.5rem; }
        .wa-link { display: inline-flex; align-items: center; gap: 0.5rem; background: #25D366; color: white; text-decoration: none; padding: 0.85rem 1.75rem; border-radius: 50px; font-weight: 600; }
        .retry { display: block; margin-top: 1rem; color: rgba(255,255,255,0.4); font-size: 0.85rem; cursor: pointer; text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🍽️</div>
        <h1>You're Offline</h1>
        <p>It looks like you don't have an internet connection right now. You can still reach us on WhatsApp to place an order!</p>
        <a href="https://wa.me/233240274887" class="wa-link">📱 WhatsApp Us</a>
        <span class="retry" onclick="window.location.reload()">Try again</span>
      </div>
    </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', event => {
  let data = {
    title: '🍽️ Jakibra Restaurant',
    body: 'Check out today\'s specials!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: 'jakibra-promo',
    url: '/index.html#products'
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: { url: data.url },
      actions: [
        { action: 'view-menu', title: '📋 View Menu' },
        { action: 'whatsapp',  title: '💬 WhatsApp Order' }
      ],
      vibrate: [200, 100, 200]
    })
  );
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', event => {
  event.notification.close();

  let targetUrl = '/index.html';

  if (event.action === 'view-menu') {
    targetUrl = '/index.html#products';
  } else if (event.action === 'whatsapp') {
    targetUrl = 'https://wa.me/233240274887';
  } else if (event.notification.data?.url) {
    targetUrl = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/index.html') && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
