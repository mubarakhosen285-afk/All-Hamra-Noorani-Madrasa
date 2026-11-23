/* =====================================================================
   আল হামরা মাদ্রাসা — Service Worker
   - GitHub Pages সাবফোল্ডারে চলার জন্য সব পথ আপেক্ষিক (relative)।
   - Firebase Database / শিক্ষার্থীর তথ্য / বেতন কখনোই ক্যাশ করা হয় না
     (Firebase এর অনুরোধ এই ফাইল স্পর্শই করে না)।
   - শুধু অ্যাপের কাঠামো (HTML, CSS, লোগো, আইকন, ফন্ট, Firebase SDK কোড) ক্যাশ হয়।
   - নতুন সংস্করণ দিলে নিচের VERSION বদলান।
   ===================================================================== */
const VERSION = 'v1.6.0';
const SHELL_CACHE = 'alhamra-shell-' + VERSION;
const RUNTIME_CACHE = 'alhamra-runtime-' + VERSION;

const SHELL_FILES = [
  './',
  'index.html',
  'class-c0.html',
  'class-c1.html',
  'class-c2.html',
  'class-c3.html',
  'results.html',
  'silebas.html',
  'offline.html',
  'style.css',
  'design-upgrade.css',
  'madrasa.jpeg',
  'manifest.json',
  'pwa.js',
  'exam-routine.js',
  'routine.html',
  'mobile-fit.css',
  'site-extras.js',
  'nav-restore.js',
  'pwa-config.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];

/* শুধু এই বাইরের হোস্টগুলো ক্যাশ হবে — এগুলো পাবলিক স্ট্যাটিক ফাইল */
function isCacheableCrossOrigin(url) {
  if (url.hostname === 'fonts.googleapis.com') return true;
  if (url.hostname === 'fonts.gstatic.com') return true;
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) return true;
  return false;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      /* একটি ফাইল না পেলেও বাকিগুলো সংরক্ষিত হবে */
      return Promise.allSettled(SHELL_FILES.map(function (f) {
        return cache.add(new Request(f, { cache: 'reload' }));
      }));
    })
  );
  /* skipWaiting এখানে নয়: ব্যবহারকারী "আপডেট করুন" চাপলে pwa.js বার্তা পাঠাবে */
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('alhamra-') === 0 && k !== SHELL_CACHE && k !== RUNTIME_CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function okToStore(res) {
  return res && (res.ok || res.type === 'opaque');
}

/* নেটওয়ার্ক আগে, না পেলে ক্যাশ, তাও না পেলে offline পেজ */
function networkFirstPage(request) {
  var timeout = new Promise(function (_, reject) { setTimeout(reject, 6000); });
  return Promise.race([fetch(request), timeout]).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(SHELL_CACHE).then(function (c) { c.put(request, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(request, { ignoreSearch: true }).then(function (hit) {
      return hit || caches.match('offline.html');
    });
  });
}

/* ক্যাশ থেকে দ্রুত দেখাও, পেছনে নতুনটা এনে রাখো */
function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (hit) {
      var fetching = fetch(request).then(function (res) {
        if (okToStore(res)) cache.put(request, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || fetching;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstPage(request));
      return;
    }
    /* সার্ভিস ওয়ার্কার ফাইল নিজে কখনো ক্যাশ নয় */
    if (url.pathname.endsWith('/service-worker.js')) return;
    event.respondWith(
      staleWhileRevalidate(request, SHELL_CACHE).then(function (res) {
        return res || fetch(request);
      })
    );
    return;
  }

  if (isCacheableCrossOrigin(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  /* বাকি সব (Firebase Database, Auth, Storage ইত্যাদি) — সরাসরি নেটওয়ার্কে, ক্যাশ ছাড়া */
});

/* ---------- Push Notification (ভবিষ্যতের জন্য প্রস্তুত) ---------- */
self.addEventListener('push', function (event) {
  var payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (e) { payload = { notification: { body: event.data ? event.data.text() : '' } }; }

  var n = payload.notification || {};
  var d = payload.data || {};
  var title = n.title || d.title || 'আল হামরা মাদ্রাসা';
  var link = d.url || (payload.fcmOptions && payload.fcmOptions.link) || (n.click_action) || './';

  event.waitUntil(self.registration.showNotification(title, {
    body: n.body || d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    lang: 'bn',
    tag: d.tag || undefined,
    data: { url: link }
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === target && 'focus' in list[i]) return list[i].focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
