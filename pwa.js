/* =====================================================================
   আল হামরা মাদ্রাসা — PWA সহায়ক স্ক্রিপ্ট
   কাজ: Service Worker চালু করা, "অ্যাপ ইনস্টল করুন" বাটন, অফলাইন বার্তা,
        নতুন সংস্করণের বার্তা, (ঐচ্ছিক) Notification চালু করার বাটন।
   এই ফাইল Firebase Database বা লগইনের কোডে হাত দেয় না।
   ===================================================================== */
(function () {
  'use strict';

  var scriptSrc = (document.currentScript && document.currentScript.src) || location.href;
  var cfg = window.ALHAMRA_PWA || {};

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  /* ---------- স্টাইল (সবুজ-সোনালি, বিদ্যমান ডিজাইনের সাথে মেলানো) ---------- */
  var css = [
    'html{-webkit-text-size-adjust:100%;text-size-adjust:100%}',
    'body{-webkit-tap-highlight-color:rgba(27,94,66,.15)}',
    '.pwaBar{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;',
    'max-width:460px;margin:0 auto;background:#0f3d2e;color:#fff;border:1px solid #c9a227;border-radius:16px;',
    'padding:12px 14px;box-shadow:0 12px 30px rgba(0,0,0,.28);font-family:"Hind Siliguri",system-ui,sans-serif;',
    'font-size:.95rem;line-height:1.5;display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.pwaBar .pwaTxt{flex:1 1 150px}',
    '.pwaBar button{font:inherit;font-weight:600;border:0;border-radius:10px;padding:9px 14px;cursor:pointer}',
    '.pwaBar .pwaGo{background:#c9a227;color:#0f3d2e}',
    '.pwaBar .pwaNo{background:transparent;color:#e7efe8;padding:9px 8px}',
    '.pwaStatus{position:fixed;top:0;left:0;right:0;z-index:2147483001;text-align:center;padding:8px 12px;',
    'padding-top:max(8px,env(safe-area-inset-top));font-family:"Hind Siliguri",system-ui,sans-serif;font-size:.9rem;font-weight:600}',
    '.pwaStatus.off{background:#a6402f;color:#fff}',
    '.pwaStatus.on{background:#1b5e42;color:#fff}'
  ].join('');
  var st = document.createElement('style');
  st.setAttribute('data-pwa', '1');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- নিচের বার তৈরি (ইনস্টল / আপডেট / নোটিফিকেশন) ---------- */
  function showBar(id, text, goLabel, onGo, noLabel, onNo) {
    var old = document.getElementById(id);
    if (old) old.remove();
    var bar = document.createElement('div');
    bar.className = 'pwaBar';
    bar.id = id;
    bar.setAttribute('role', 'status');
    var t = document.createElement('div');
    t.className = 'pwaTxt';
    t.textContent = text;
    bar.appendChild(t);
    if (goLabel) {
      var go = document.createElement('button');
      go.type = 'button'; go.className = 'pwaGo'; go.textContent = goLabel;
      go.addEventListener('click', function () { onGo && onGo(bar); });
      bar.appendChild(go);
    }
    if (noLabel) {
      var no = document.createElement('button');
      no.type = 'button'; no.className = 'pwaNo'; no.textContent = noLabel;
      no.addEventListener('click', function () { bar.remove(); onNo && onNo(); });
      bar.appendChild(no);
    }
    document.body.appendChild(bar);
    return bar;
  }

  /* ---------- অফলাইন / অনলাইন বার্তা ---------- */
  var statusEl = null, statusTimer = null;
  function showStatus(kind, text, autoHideMs) {
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'pwaStatus';
      statusEl.setAttribute('role', 'status');
      document.body.appendChild(statusEl);
    }
    clearTimeout(statusTimer);
    statusEl.className = 'pwaStatus ' + kind;
    statusEl.textContent = text;
    statusEl.style.display = 'block';
    if (autoHideMs) statusTimer = setTimeout(function () { statusEl.style.display = 'none'; }, autoHideMs);
  }
  window.addEventListener('offline', function () {
    showStatus('off', '📡 ইন্টারনেট সংযোগ নেই — তথ্য দেখতে ইন্টারনেট চালু করুন');
  });
  window.addEventListener('online', function () {
    showStatus('on', '✅ ইন্টারনেট ফিরে এসেছে', 3000);
  });
  function initialStatus() { if (navigator.onLine === false) window.dispatchEvent(new Event('offline')); }
  if (document.body) initialStatus(); else document.addEventListener('DOMContentLoaded', initialStatus);

  /* ---------- অ্যাপ ইনস্টল ---------- */
  var deferredPrompt = null;
  var DISMISS_KEY = 'alhamra_install_dismissed_at';
  function recentlyDismissed() {
    var t = parseInt(safeGet(DISMISS_KEY) || '0', 10);
    return t && (Date.now() - t) < 7 * 24 * 3600 * 1000;
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone || recentlyDismissed()) return;
    showBar('pwaInstallBar', '📲 "আল হামরা মাদ্রাসা" অ্যাপটি মোবাইলে ইনস্টল করুন', 'ইনস্টল করুন', function (bar) {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; bar.remove(); });
    }, 'পরে', function () { safeSet(DISMISS_KEY, String(Date.now())); });
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    var b = document.getElementById('pwaInstallBar');
    if (b) b.remove();
  });
  /* কোনো জায়গা থেকে নিজের বাটনে ইনস্টল চালু করতে: window.alHamraInstall() */
  window.alHamraInstall = function () {
    if (deferredPrompt) { deferredPrompt.prompt(); return true; }
    return false;
  };

  /* iPhone (Safari) এ install prompt নেই — একবার নিয়ম দেখাও */
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  if (isIOS && !isStandalone && !recentlyDismissed()) {
    window.addEventListener('load', function () {
      showBar('pwaIosBar', 'ইনস্টল করতে Safari-র শেয়ার বাটন চাপুন, তারপর "Add to Home Screen" বেছে নিন।', null, null, 'ঠিক আছে',
        function () { safeSet(DISMISS_KEY, String(Date.now())); });
    });
  }

  /* ---------- Service Worker ---------- */
  var swReg = null;
  var canSW = 'serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  if (canSW) {
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading) return;
      reloading = true;
      location.reload();
    });

    window.addEventListener('load', function () {
      var swUrl = new URL('service-worker.js', scriptSrc).href;
      navigator.serviceWorker.register(swUrl).then(function (reg) {
        swReg = reg;
        function promptUpdate(worker) {
          showBar('pwaUpdateBar', '🔄 অ্যাপের নতুন সংস্করণ এসেছে।', 'আপডেট করুন', function () {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }, 'পরে');
        }
        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(w);
          });
        });
        /* অ্যাপ খোলা থাকলে মাঝে মাঝে নতুন সংস্করণ খোঁজা */
        setInterval(function () { reg.update().catch(function () {}); }, 60 * 60 * 1000);
        setupNotifications();
      }).catch(function (err) {
        console.warn('Service Worker চালু হয়নি:', err);
      });
    });
  }

  /* ---------- Notification (ডিফল্টে বন্ধ — pwa-config.js এ চালু করতে হয়) ---------- */
  function setupNotifications() {
    if (!cfg.ENABLE_NOTIFICATIONS || !cfg.VAPID_KEY) return;
    if (!('Notification' in window) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') { enableNotifications(true); return; }
    if (Notification.permission === 'denied') return;
    if (safeGet('alhamra_notif_dismissed') === 'yes') return;
    showBar('pwaNotifBar', '🔔 মাদ্রাসার নোটিশ ও পরীক্ষার খবর নোটিফিকেশনে পেতে চান?', 'চালু করুন', function (bar) {
      enableNotifications(false).then(function () { bar.remove(); });
    }, 'পরে', function () { safeSet('alhamra_notif_dismissed', 'yes'); });
  }

  function enableNotifications(silent) {
    var v = cfg.FIREBASE_SDK_VERSION;
    var base = 'https://www.gstatic.com/firebasejs/' + v + '/';
    var permissionStep = silent ? Promise.resolve('granted') : Notification.requestPermission();
    return permissionStep.then(function (p) {
      if (p !== 'granted') return null;
      return Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-messaging.js')]).then(function (m) {
        var app = m[0].initializeApp(cfg.FIREBASE_CONFIG, 'alhamra-messaging');
        var messaging = m[1].getMessaging(app);
        return m[1].getToken(messaging, { vapidKey: cfg.VAPID_KEY, serviceWorkerRegistration: swReg }).then(function (token) {
          window.dispatchEvent(new CustomEvent('alhamra:fcm-token', { detail: { token: token } }));
          m[1].onMessage(messaging, function (payload) {
            var n = (payload && payload.notification) || {};
            showBar('pwaMsgBar', (n.title ? n.title + ' — ' : '') + (n.body || ''), null, null, 'বন্ধ করুন');
          });
          return token;
        });
      });
    }).catch(function (err) { console.warn('Notification চালু করা যায়নি:', err); });
  }
  window.alHamraEnableNotifications = function () { return enableNotifications(false); };
})();
