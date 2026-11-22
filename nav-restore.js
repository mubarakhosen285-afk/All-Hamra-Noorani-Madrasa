/* =====================================================================
   nav-restore.js — পাবলিক পেজে "ব্যাক" ঠিকমতো কাজ করার জন্য (নতুন)
   সমস্যা: কোনো লিংকে গিয়ে ব্যাক এলে পেজ আবার লোড হয়ে একেবারে উপরে/অন্য জায়গায় চলে যেত।
   সমাধান:
     ১) লিংকে যাওয়ার আগে স্ক্রল-অবস্থান মনে রাখা, ব্যাক এলে ঠিক সেখানেই ফিরিয়ে দেওয়া
     ২) পেজের ভেতরের মেনু (#classes, #contact ইত্যাদি) চাপলে নতুন ইতিহাস না বানানো —
        ফলে ব্যাক চাপলে সরাসরি আগের পেজে যাবে, একই জায়গায় আটকে থাকবে না
   কোনো ডেটা/Firebase/লগইনে হাত দেয় না।
   ===================================================================== */
(function () {
  'use strict';
  var KEY = 'alhamra_scroll_v1:' + location.pathname;

  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

  function save() {
    try { sessionStorage.setItem(KEY, String(Math.round(window.pageYOffset || document.documentElement.scrollTop || 0))); } catch (e) {}
  }
  var timer = null;
  window.addEventListener('scroll', function () {
    if (timer) return;
    timer = setTimeout(function () { timer = null; save(); }, 150);
  }, { passive: true });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });

  /* ---------- ব্যাক/ফরওয়ার্ডে ফিরলে আগের জায়গায় ---------- */
  var nav = null;
  try { nav = performance.getEntriesByType('navigation')[0]; } catch (e) {}
  var isBack = !!(nav && nav.type === 'back_forward');
  if (isBack) {
    var y = 0;
    try { y = parseInt(sessionStorage.getItem(KEY) || '0', 10) || 0; } catch (e) {}
    if (y > 0) {
      var stop = false, tries = 0;
      var cancel = function () { stop = true; };
      window.addEventListener('wheel', cancel, { passive: true, once: true });
      window.addEventListener('touchstart', cancel, { passive: true, once: true });
      window.addEventListener('keydown', cancel, { once: true });
      var tick = function () {
        if (stop) return;
        tries++;
        var max = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0) - window.innerHeight;
        if (max >= y - 2) { window.scrollTo(0, y); if (Math.abs((window.pageYOffset || 0) - y) < 3) return; }
        else window.scrollTo(0, Math.max(0, max));      // কনটেন্ট এখনো তৈরি হচ্ছে — যতদূর যায়
        if (tries < 40) setTimeout(tick, 150);          // সর্বোচ্চ ~৬ সেকেন্ড, Firebase কনটেন্ট আসার জন্য
      };
      tick();
      window.addEventListener('load', function () { if (!stop) { tries = 0; tick(); } });
    }
  }

  /* ---------- পেজের ভেতরের # লিংকে নতুন ইতিহাস নয় ---------- */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = (a.getAttribute('href') || '').slice(1);
    if (!id) return;
    var target = null;
    try { target = document.getElementById(decodeURIComponent(id)); } catch (err) {}
    if (!target) return;                                 // পপআপ ইত্যাদির লিংক — তাদের নিজস্ব কোড চলবে
    e.preventDefault();
    try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (err) { target.scrollIntoView(); }
    try { history.replaceState(history.state, '', '#' + id); } catch (err) {}
    save();
  });
})();
