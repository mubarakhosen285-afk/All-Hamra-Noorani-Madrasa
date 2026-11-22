/* =====================================================================
   site-extras.js — পাবলিক পেজের অতিরিক্ত সেকশন (নতুন ফিচার)
   পরিচিতি • শিক্ষক পরিষদ • ভর্তি তথ্য • ছবি গ্যালারি • সাধারণ জিজ্ঞাসা
   + ভাসমান কল/WhatsApp বাটন ও "উপরে যান" বাটন

   Firebase থেকে শুধু পড়ে: publicSite   (কিছু লেখে না; পুরোনো ডেটায় হাত দেয় না)
   মূল স্ক্রিপ্টের তৈরি করা Firebase অ্যাপই ব্যবহার করে।
   ===================================================================== */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  /* শুধু https:// লিংক অথবা সাইটের ভেতরের পাথ গ্রহণ করে */
  const safeUrl = (u) => {
    u = String(u || "").trim();
    if (!u) return "";
    if (/^https:\/\//i.test(u)) return u;
    if (/^[\w\-./%ঀ-৿ ]+$/.test(u) && !u.includes("..") && u[0] !== "/") { try { return encodeURI(decodeURI(u)); } catch (e) { return ""; } }
    return "";
  };
  const paras = (txt) => String(txt || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const initial = (n) => (String(n || "").trim()[0] || "•");

  /* অ্যাডমিন যেসব আইটেম "লুকানো" করেছে সেগুলো বাদ */
  const vis = (list) => (Array.isArray(list) ? list : []).filter((x) => x && !x.hidden);

  function show(id, on) { const s = $(id); if (s) s.hidden = !on; }

  /* ---------------- পরিচিতি ---------------- */
  function renderAbout(a) {
    a = a || {};
    const text = paras(a.text);
    const stats = (Array.isArray(a.stats) ? a.stats : []).filter((s) => s && s.value);
    const addr = String(a.address || "").trim();
    const map = safeUrl(a.mapUrl);
    if (!text.length && !stats.length && !addr && !map) return show("about", false);

    const t = $("aboutText"); t.textContent = "";
    text.forEach((p) => t.appendChild(el("p", null, p)));
    if (!text.length) t.hidden = true; else t.hidden = false;

    const sg = $("aboutStats"); sg.textContent = "";
    stats.slice(0, 4).forEach((s) => {
      const c = el("div", "statCard");
      c.appendChild(el("b", null, s.value));
      c.appendChild(el("span", null, s.label || ""));
      sg.appendChild(c);
    });
    sg.hidden = !stats.length;

    const ad = $("aboutAddr"); ad.textContent = "";
    if (addr) ad.appendChild(el("div", "addrLine", "📍 " + addr));
    if (map) {
      const l = el("a", "mapBtn", "🗺️ ম্যাপে দেখুন");
      l.href = map; l.target = "_blank"; l.rel = "noopener";
      ad.appendChild(l);
    }
    ad.hidden = !(addr || map);
    const grid = $("aboutGrid");
    if (grid) grid.classList.toggle("noText", !text.length);
    show("about", true);
  }

  /* ---------------- শিক্ষক ---------------- */
  function renderTeachers(list) {
    list = vis(list).filter((x) => x.name);
    if (!list.length) return show("teachers", false);
    const g = $("teachersGrid"); g.textContent = "";
    list.forEach((t) => {
      const c = el("article", "teacherCard");
      const av = el("div", "teacherAvatar");
      const ph = safeUrl(t.photo);
      const fallback = () => { av.textContent = initial(t.name); av.classList.add("noPhoto"); };
      if (ph) {
        const img = new Image(); img.alt = t.name; img.loading = "lazy"; img.decoding = "async";
        img.onerror = () => { img.remove(); fallback(); };
        img.src = ph; av.appendChild(img);
      } else fallback();
      c.appendChild(av);
      c.appendChild(el("h3", null, t.name));
      if (t.designation) c.appendChild(el("div", "teacherRole", t.designation));
      if (t.qualification) c.appendChild(el("div", "teacherQual", t.qualification));
      g.appendChild(c);
    });
    show("teachers", true);
  }

  /* ---------------- ভর্তি তথ্য ---------------- */
  function renderAdmission(a) {
    a = a || {};
    const fees = (Array.isArray(a.classFees) ? a.classFees : []).filter((f) => f && f.cls && (f.admFee || f.monthlyFee));
    const rows = [
      ["🎓", "ভর্তির শ্রেণি", fees.length ? "" : a.classes], ["🎂", "বয়স", a.age],
      ["💰", fees.length ? "অন্যান্য ফি" : "ফি / বেতন", a.fee], ["📅", "শেষ তারিখ / সময়", a.lastDate]
    ].filter((r) => r[2]);
    const docs = paras(a.docs);
    const note = String(a.note || "").trim();
    if (!rows.length && !fees.length && !docs.length && !note && !a.open) return show("admission", false);

    const badge = $("admBadge");
    badge.textContent = a.open ? "✅ ভর্তি চলছে" : "⏸ ভর্তি এখন বন্ধ";
    badge.className = "admBadge " + (a.open ? "open" : "closed");

    const g = $("admRows"); g.textContent = "";
    rows.forEach((r) => {
      const d = el("div", "admRow");
      d.appendChild(el("span", "admIcon", r[0]));
      const w = el("div");
      w.appendChild(el("small", null, r[1])); w.appendChild(el("b", null, r[2]));
      d.appendChild(w); g.appendChild(d);
    });
    g.hidden = !rows.length;

    /* শ্রেণিভেদে আলাদা ভর্তি ফি ও মাসিক বেতন */
    const fb = $("admFees");
    if (fb) {
      fb.textContent = "";
      if (fees.length) {
        fb.appendChild(el("h3", null, "💰 শ্রেণিভিত্তিক ফি"));
        const wrap = el("div", "feeTableWrap");
        const tb = el("table", "feeTable");
        const hr = el("tr");
        ["শ্রেণি", "ভর্তি ফি", "মাসিক বেতন"].forEach((h) => hr.appendChild(el("th", null, h)));
        const th = el("thead"); th.appendChild(hr); tb.appendChild(th);
        const body = el("tbody");
        fees.forEach((f) => {
          const tr = el("tr");
          tr.appendChild(el("td", "feeCls", f.cls));
          tr.appendChild(el("td", null, f.admFee || "—"));
          tr.appendChild(el("td", null, f.monthlyFee || "—"));
          body.appendChild(tr);
        });
        tb.appendChild(body); wrap.appendChild(tb); fb.appendChild(wrap);
      }
      fb.hidden = !fees.length;
    }

    const dl = $("admDocs"); dl.textContent = "";
    if (docs.length) {
      dl.appendChild(el("h3", null, "📄 প্রয়োজনীয় কাগজপত্র"));
      const ul = el("ul"); docs.forEach((d) => ul.appendChild(el("li", null, d))); dl.appendChild(ul);
    }
    dl.hidden = !docs.length;

    const n = $("admNote"); n.textContent = note; n.hidden = !note;

    /* যোগাযোগের বাটন — আগের যোগাযোগ সেকশনের নম্বর থেকেই নেওয়া হয় */
    const call = document.querySelector(".contactItem.phone");
    const wa = document.querySelector(".contactItem.whatsapp");
    const cta = $("admCta"); cta.textContent = "";
    if (call) { const b = el("a", "ctaBtn call", "📞 কল করুন"); b.href = call.href; cta.appendChild(b); }
    if (wa) { const b = el("a", "ctaBtn wa", "💬 WhatsApp-এ জানুন"); b.href = wa.href; b.target = "_blank"; b.rel = "noopener"; cta.appendChild(b); }
    show("admission", true);
  }

  /* ---------------- গ্যালারি + লাইটবক্স ---------------- */
  let gal = [], gi = 0, lastFocus = null;
  function renderGallery(list) {
    gal = vis(list).map((x) => ({ url: safeUrl(x && x.url), caption: (x && x.caption) || "" })).filter((x) => x.url);
    if (!gal.length) return show("gallery", false);
    const g = $("galleryGrid"); g.textContent = "";
    gal.forEach((p, i) => {
      const b = el("button", "galItem"); b.type = "button"; b.setAttribute("aria-label", p.caption || ("ছবি " + (i + 1)));
      const img = new Image(); img.src = p.url; img.alt = p.caption || ""; img.loading = "lazy"; img.decoding = "async";
      img.onerror = () => { b.remove(); };
      b.appendChild(img);
      if (p.caption) b.appendChild(el("span", "galCap", p.caption));
      b.addEventListener("click", () => openLb(i));
      g.appendChild(b);
    });
    show("gallery", true);
  }
  function lbShow() {
    const p = gal[gi]; if (!p) return;
    $("lbImg").src = p.url; $("lbImg").alt = p.caption;
    $("lbCap").textContent = p.caption;
    $("lbCount").textContent = (gi + 1) + " / " + gal.length;
  }
  function openLb(i) {
    gi = i; lastFocus = document.activeElement; lbShow();
    const m = $("galleryLightbox"); m.classList.add("show"); m.setAttribute("aria-hidden", "false");
    document.body.dataset.prevOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    $("lbClose").focus();
  }
  function closeLb() {
    const m = $("galleryLightbox"); m.classList.remove("show"); m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = document.body.dataset.prevOverflow || "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const step = (d) => { gi = (gi + d + gal.length) % gal.length; lbShow(); };

  /* ---------------- FAQ ---------------- */
  function renderFaq(list) {
    list = vis(list).filter((x) => x.q);
    if (!list.length) return show("faq", false);
    const g = $("faqList"); g.textContent = "";
    list.forEach((f) => {
      const d = el("details", "faqItem");
      d.appendChild(el("summary", null, f.q));
      d.appendChild(el("p", null, f.a || ""));
      g.appendChild(d);
    });
    show("faq", true);
  }

  /* ---------------- Firebase থেকে পড়া ---------------- */
  async function load() {
    try {
      const appMod = await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js");
      const dbMod = await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js");
      let app;
      try { app = appMod.getApp(); }
      catch (e) { await new Promise((r) => setTimeout(r, 1500)); app = appMod.getApp(); }
      const snap = await dbMod.get(dbMod.ref(dbMod.getDatabase(app), "publicSite"));
      const d = snap.exists() ? snap.val() : {};
      const off = d.sectionOff || {};      // অ্যাডমিন যে সেকশন "লুকানো" করেছে
      renderAbout(off.about ? null : d.about); renderTeachers(off.teachers ? [] : d.teachers);
      renderAdmission(off.admission ? null : d.admission);
      renderGallery(off.gallery ? [] : d.gallery); renderFaq(off.faq ? [] : d.faq);
      /* লিংকে # থাকলে (যেমন #gallery) সেকশন তৈরি হওয়ার পর সেখানে যাওয়া */
      if (location.hash && $(location.hash.slice(1))) $(location.hash.slice(1)).scrollIntoView();
    } catch (e) { console.warn("Site extras load failed:", e); }
  }

  /* ---------------- ভাসমান বাটন ---------------- */
  function setupFab() {
    const top = $("toTopBtn"); if (!top) return;
    const onScroll = () => { top.classList.toggle("show", window.scrollY > 500); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    /* কল/WhatsApp বাটনের নম্বর — যোগাযোগ সেকশন থেকেই */
    const call = document.querySelector(".contactItem.phone"), wa = document.querySelector(".contactItem.whatsapp");
    const fc = $("fabCall"), fw = $("fabWa");
    if (fc) { if (call) fc.href = call.href; else fc.remove(); }
    if (fw) { if (wa) fw.href = wa.href; else fw.remove(); }
  }

  function init() {
    setupFab();
    const m = $("galleryLightbox");
    if (m) {
      m.querySelectorAll("[data-lb-close]").forEach((e) => e.addEventListener("click", closeLb));
      $("lbPrev").addEventListener("click", () => step(-1));
      $("lbNext").addEventListener("click", () => step(1));
      document.addEventListener("keydown", (e) => {
        if (!m.classList.contains("show")) return;
        if (e.key === "Escape") closeLb();
        else if (e.key === "ArrowLeft") step(-1);
        else if (e.key === "ArrowRight") step(1);
      });
    }
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
