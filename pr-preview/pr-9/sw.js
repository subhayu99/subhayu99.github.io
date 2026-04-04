// Cache version — updated on each build via build-version.json check
// When a new build is deployed, the SW fetches build-version.json,
// detects a version change, and invalidates all old caches.
let CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'portfolio-';

function cacheName(type) {
  return `${CACHE_PREFIX}${type}-${CACHE_VERSION}`;
}

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/data/resume.json',
];

// Install — pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName('static')).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — purge ALL old caches (any cache that doesn't match current version)
self.addEventListener('activate', (event) => {
  const currentCaches = [cacheName('static'), cacheName('dynamic')];
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (!currentCaches.includes(name)) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for data & navigation, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // build-version.json — always network, never cache
  if (url.pathname.endsWith('build-version.json')) {
    event.respondWith(fetch(request));
    return;
  }

  // Data requests — network first, cache fallback
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(request, 'dynamic'));
    return;
  }

  // Navigation — network first so new index.html is picked up
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, 'static'));
    return;
  }

  // Hashed assets (Vite adds content hashes) — cache first, they're immutable
  if (url.pathname.match(/\/assets\/.*\.[a-f0-9]{8}\./)) {
    event.respondWith(cacheFirst(request, 'static'));
    return;
  }

  // Everything else — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, 'dynamic'));
});

async function networkFirst(request, type) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName(type));
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineResponse(request);
  }
}

async function cacheFirst(request, type) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName(type));
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineResponse(request);
  }
}

async function staleWhileRevalidate(request, type) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName(type)).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || offlineResponse(request);
}

function offlineResponse(request) {
  if (request.mode === 'navigate') {
    return caches.match('/index.html');
  }
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// Periodically check for new builds
self.addEventListener('message', (event) => {
  if (event.data === 'CHECK_VERSION') {
    checkForUpdate();
  }
});

async function checkForUpdate() {
  try {
    const response = await fetch('/build-version.json?t=' + Date.now());
    if (!response.ok) return;
    const data = await response.json();
    if (data.version && data.version !== CACHE_VERSION) {
      CACHE_VERSION = data.version;
      // Notify all clients to reload
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({ type: 'NEW_VERSION', version: data.version });
      });
    }
  } catch {
    // Silently fail — will check again next time
  }
}
