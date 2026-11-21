/* =====================================================================
   exam-routine.js — পাবলিক পেজে পরীক্ষার রুটিন দেখানো (নতুন ফিচার)
   Firebase থেকে শুধু পড়ে: publicExamRoutine  (কিছু লেখে না, পুরোনো ডেটায় হাত দেয় না)
   মূল স্ক্রিপ্টের তৈরি করা Firebase অ্যাপটিই ব্যবহার করে — আলাদা কনফিগ নেই।
   ===================================================================== */
(function () {
"use strict";
window.__examRoutineReady = true;   // এই ফাইল লোড হয়েছে তার চিহ্ন

const CLASSES = [
  { key: "c0", name: "শিশু শ্রেণি", short: "শিশু" },
  { key: "c1", name: "প্রথম শ্রেণি", short: "প্রথম" },
  { key: "c2", name: "দ্বিতীয় শ্রেণি", short: "দ্বিতীয়" },
  { key: "c3", name: "তৃতীয় শ্রেণি", short: "তৃতীয়" }
];
const DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const bn = (n) => String(n ?? "").replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

const $ = (id) => document.getElementById(id);
const btn = $("examRoutineBtn");
const modal = $("examRoutineModal");
if (btn && modal) {
  let routine = null;      // বর্তমান পাবলিক রুটিন
  let filter = "all";
  let lastFocus = null;
  let prevOverflow = "";

  const parseDate = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const dayDiff = (d) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  };
  const badgeFor = (d) => {
    const n = dayDiff(d);
    return n === 0 ? "আজ" : n === 1 ? "আগামীকাল" : null;
  };
  const examTitle = (name) => {
    if (!name) return "পরীক্ষার রুটিন";
    return name + (/[া-ৌ]$/.test(name) ? "র" : " এর") + " রুটিন";
  };

  async function fetchRoutine() {
    try {
      const appMod = await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js");
      const dbMod = await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js");
      let app;
      try { app = appMod.getApp(); }
      catch (e) { await new Promise((r) => setTimeout(r, 1500)); app = appMod.getApp(); }   // মূল স্ক্রিপ্ট একটু দেরিতে হলে
      const snap = await dbMod.get(dbMod.ref(dbMod.getDatabase(app), "publicExamRoutine"));
      routine = snap.exists() ? snap.val() : null;
    } catch (e) {
      console.warn("Exam routine load failed:", e);
      return false;
    }
    return true;
  }

  function updateButton() {
    const label = $("examRoutineBtnLabel"), sub = $("examRoutineBtnSub");
    if (routine && Array.isArray(routine.rows) && routine.rows.length) {
      if (label) label.textContent = "📅 " + examTitle(routine.examName).replace(" রুটিন", " রুটিন দেখুন");
      if (sub) sub.textContent = bn(routine.year || "") + " সালের পরীক্ষার সময়সূচি";
      btn.classList.add("has-routine");
    } else {
      if (label) label.textContent = "📅 পরীক্ষার রুটিন দেখুন";
      if (sub) sub.textContent = "রুটিন প্রকাশ হলে এখানে দেখা যাবে";
      btn.classList.remove("has-routine");
    }
  }

  function subjectText(row, key) { return (row.subjects && row.subjects[key]) || ""; }

  function render() {
    const body = $("rtBody"), tools = $("rtTools"), foot = $("rtFoot");
    body.textContent = ""; tools.textContent = ""; foot.textContent = "";
    foot.hidden = true;

    if (!routine || !Array.isArray(routine.rows) || !routine.rows.length) {
      $("rtTitle").textContent = "পরীক্ষার রুটিন";
      $("rtMeta").textContent = "";
      const empty = el("div", "rtEmpty");
      empty.appendChild(el("div", "rtEmptyIcon", "🗓️"));
      empty.appendChild(el("h3", null, "এখনো কোনো রুটিন প্রকাশ হয়নি"));
      empty.appendChild(el("p", null, "পরীক্ষার রুটিন প্রকাশ হলে এখানেই দেখতে পাবেন। অনুগ্রহ করে একটু পরে আবার দেখুন।"));
      body.appendChild(empty);
      return;
    }

    $("rtTitle").textContent = routine.title || examTitle(routine.examName);
    $("rtMeta").textContent = [routine.examName, routine.year ? bn(routine.year) + " সাল" : ""].filter(Boolean).join(" • ");

    // শ্রেণি ফিল্টার
    const chips = el("div", "rtChips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", "শ্রেণি অনুযায়ী দেখুন");
    [{ key: "all", short: "সব শ্রেণি" }].concat(CLASSES).forEach((c) => {
      const b = el("button", "rtChip" + (filter === c.key ? " on" : ""), c.short);
      b.type = "button";
      b.setAttribute("aria-pressed", filter === c.key ? "true" : "false");
      b.addEventListener("click", () => { filter = c.key; render(); });
      chips.appendChild(b);
    });
    tools.appendChild(chips);
    const pr = el("button", "rtPrint", "🖨️ প্রিন্ট");
    pr.type = "button";
    pr.addEventListener("click", () => window.print());
    tools.appendChild(pr);

    const shown = filter === "all" ? CLASSES : CLASSES.filter((c) => c.key === filter);
    const rows = routine.rows.filter((r) => filter === "all" || subjectText(r, filter));

    if (!rows.length) {
      body.appendChild(el("div", "rtEmpty", "এই শ্রেণির জন্য কোনো পরীক্ষা নেই।"));
    } else {
      // ডেস্কটপ: টেবিল
      const wrap = el("div", "rtTableWrap");
      const table = el("table", "rtTable");
      const thead = el("thead"); const hr = el("tr");
      ["তারিখ", "বার", "সময়"].concat(shown.map((c) => c.name)).forEach((h) => hr.appendChild(el("th", null, h)));
      thead.appendChild(hr); table.appendChild(thead);
      const tbody = el("tbody");
      rows.forEach((r) => {
        const d = parseDate(r.date);
        const tr = el("tr");
        if (d && dayDiff(d) < 0) tr.className = "past";
        if (d && dayDiff(d) === 0) tr.className = "today";
        const tdDate = el("td", "rtDate", d ? bn(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + bn(d.getFullYear()) : r.date);
        const tdDay = el("td", null, d ? DAYS[d.getDay()] : "");
        const bd = d && badgeFor(d);
        if (bd) tdDay.appendChild(el("span", "rtBadge", bd));
        tr.appendChild(tdDate); tr.appendChild(tdDay); tr.appendChild(el("td", "rtTime", r.time || "—"));
        shown.forEach((c) => {
          const v = subjectText(r, c.key);
          tr.appendChild(el("td", v ? "rtSub" : "rtNone", v || "—"));
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); wrap.appendChild(table); body.appendChild(wrap);

      // মোবাইল: দিন-ভিত্তিক কার্ড
      const cards = el("div", "rtCards");
      rows.forEach((r) => {
        const d = parseDate(r.date);
        const card = el("article", "rtCard" + (d && dayDiff(d) < 0 ? " past" : "") + (d && dayDiff(d) === 0 ? " today" : ""));
        const side = el("div", "rtCardDate");
        side.appendChild(el("b", null, d ? bn(d.getDate()) : ""));
        side.appendChild(el("span", null, d ? MONTHS[d.getMonth()] : ""));
        const main = el("div", "rtCardMain");
        const head = el("div", "rtCardHead");
        head.appendChild(el("strong", null, d ? DAYS[d.getDay()] : r.date));
        const bd = d && badgeFor(d);
        if (bd) head.appendChild(el("span", "rtBadge", bd));
        if (r.time) head.appendChild(el("span", "rtTimeChip", "⏰ " + r.time));
        main.appendChild(head);
        const ul = el("ul", "rtSubjects");
        shown.forEach((c) => {
          const v = subjectText(r, c.key);
          if (!v) return;
          const li = el("li");
          li.appendChild(el("span", "rtCls", c.short));
          li.appendChild(el("span", "rtSubj", v));
          ul.appendChild(li);
        });
        main.appendChild(ul);
        card.appendChild(side); card.appendChild(main); cards.appendChild(card);
      });
      body.appendChild(cards);
    }

    if (routine.note) { foot.hidden = false; foot.appendChild(el("b", null, "📌 নির্দেশনা: ")); foot.appendChild(document.createTextNode(routine.note)); }
  }

  function open() {
    lastFocus = document.activeElement;
    filter = "all";
    $("rtBody").textContent = "লোড হচ্ছে...";
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = modal.querySelector(".rtClose"); if (close) close.focus();
    render();                                   // আগে যা আছে দেখাই
    fetchRoutine().then((ok) => { updateButton(); if (modal.classList.contains("show")) render(); });
  }
  function close() {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = prevOverflow;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btn.addEventListener("click", open);
  modal.querySelectorAll("[data-rt-close]").forEach((e) => e.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("show")) close(); });
  window.addEventListener("beforeprint", () => document.body.classList.add("rtPrinting"));
  window.addEventListener("afterprint", () => document.body.classList.remove("rtPrinting"));

  fetchRoutine().then(updateButton);
}
})();
