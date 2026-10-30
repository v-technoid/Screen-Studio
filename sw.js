/* Recnook service worker
 *
 * What it does
 *  - Saves the app shell on the first visit so every tool opens with no network.
 *  - Your own files (HTML, CSS, JS, icons) use "network first": when you are online you always get the
 *    latest deploy, and the saved copy is only used when the network is missing or slow. This avoids the
 *    classic bug where new HTML runs against an old cached app.js.
 *  - OCR engine files from jsDelivr are saved the first time someone uses OCR, so it can work offline later.
 *  - Never touches /_vercel/ (analytics), non-GET requests, or any other third-party request.
 *
 * Deploying a change: nothing to do for normal edits, files refresh on the next online visit.
 * If you ADD a page or file that must work offline, add it to SHELL below and bump CACHE_VERSION.
 */
const CACHE_VERSION = 'v15';
const SHELL_CACHE = 'ss-shell-' + CACHE_VERSION;
const RUNTIME_CACHE = 'ss-runtime-' + CACHE_VERSION;

const SHELL = [
  '/',
  '/screen-recorder',
  '/blur-and-trim-video',
  '/audio-trimmer',
  '/screenshot-annotate-ocr',
  '/combine-videos-images',
  '/privacy',
  '/styles.css',
  '/app.js',
  '/site.js',
  '/manifest.webmanifest',
  '/asset/fonts/inter-400.woff2',
  '/asset/fonts/inter-600.woff2',
  '/asset/fonts/inter-800.woff2',
  '/asset/favicon.svg',
  '/asset/icon-192.png',
  '/asset/icon-512.png',
  '/asset/apple-touch-icon.png'
];

const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== SHELL_CACHE && key !== RUNTIME_CACHE) return caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function fetchWithTimeout(request, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error('network timeout')); }, ms);
    fetch(request).then(
      function (res) { clearTimeout(timer); resolve(res); },
      function (err) { clearTimeout(timer); reject(err); }
    );
  });
}

// Pages: try the network, fall back to the saved copy of that same page, then to the home page.
async function handleNavigation(request) {
  var cache = await caches.open(SHELL_CACHE);
  var key = new URL(request.url).pathname;
  try {
    var fresh = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (fresh && fresh.ok && !fresh.redirected) cache.put(key, fresh.clone());
    return fresh;
  } catch (err) {
    var saved = (await cache.match(key)) || (await cache.match('/'));
    return saved || Response.error();
  }
}

// Same-origin files: network first, saved copy as the fallback.
async function handleAsset(request) {
  var cache = await caches.open(SHELL_CACHE);
  try {
    var fresh = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    var saved = await cache.match(request, { ignoreSearch: true });
    return saved || Response.error();
  }
}

// OCR engine from jsDelivr: saved copy first (these files are big and versioned), network on first use.
async function handleOcrFile(request) {
  var cache = await caches.open(RUNTIME_CACHE);
  var saved = await cache.match(request.url);
  if (saved) return saved;
  // Ask for a real CORS response (jsDelivr allows it) so the cached copy is not an opaque, quota-padded one.
  var corsRequest = new Request(request.url, { mode: 'cors', credentials: 'omit' });
  var fresh = await fetch(corsRequest);
  if (fresh && fresh.ok) cache.put(request.url, fresh.clone());
  return fresh;
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  if (url.pathname.indexOf('/_vercel/') === 0) return;

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(handleNavigation(request));
    } else {
      event.respondWith(handleAsset(request));
    }
    return;
  }

  if (url.hostname === 'cdn.jsdelivr.net' && /tesseract/i.test(url.pathname)) {
    event.respondWith(handleOcrFile(request));
  }
  // Anything else (badge images, third-party widgets) goes straight to the network.
});
