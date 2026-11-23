/* =====================================================================
   exam-routine.js — হোম পেজের "পরীক্ষার রুটিন" বাটন
   রুটিন এখন আলাদা পেজে (routine.html) খোলে — পপআপ নেই।
   Firebase থেকে শুধু পড়ে: publicExamRoutine  (কিছু লেখে না, পুরোনো ডেটায় হাত দেয় না)
   রুটিন পাবলিক না থাকলে বাটনও দেখা যায় না।
   ===================================================================== */
(function () {
"use strict";
window.__examRoutineReady = true;   // এই ফাইল লোড হয়েছে তার চিহ্ন

const $ = (id) => document.getElementById(id);
const btn = $("examRoutineBtn");
const CACHE_KEY = "alhamra_exam_routine_v1";   // routine.html এর সাথে একই ক্যাশ — অফলাইনেও কাজ করে
if (!btn) return;

let routine = null;
try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); if (c && c.routine) routine = c.routine; } catch (e) {}
const saveCache = () => {
  try {
    if (routine) localStorage.setItem(CACHE_KEY, JSON.stringify({ routine: routine, savedAt: Date.now() }));
    else localStorage.removeItem(CACHE_KEY);
  } catch (e) {}
};
const examTitle = (name) => {
  if (!name) return "পরীক্ষার রুটিন";
  return name + (/[া-ৌ]$/.test(name) ? "র" : " এর") + " রুটিন";
};

async function fetchRoutine() {
  if (navigator.onLine === false) return false;
  try {
    const appMod = await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js");
    const dbMod = await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js");
    let app;
    try { app = appMod.getApp(); }
    catch (e) { await new Promise((r) => setTimeout(r, 1500)); app = appMod.getApp(); }   // মূল স্ক্রিপ্ট একটু দেরিতে হলে
    const snap = await dbMod.get(dbMod.ref(dbMod.getDatabase(app), "publicExamRoutine"));
    routine = snap.exists() ? snap.val() : null;
    saveCache();
  } catch (e) {
    console.warn("Exam routine load failed:", e);
    return false;
  }
  return true;
}

function updateButton() {
  const on = routine && Array.isArray(routine.rows) && routine.rows.length;
  btn.hidden = !on;
  btn.classList.toggle("has-routine", !!on);
  if (on) {
    const t = $("rhbTitle"), s = $("rhbSub");
    if (t) t.textContent = routine.title || examTitle(routine.examName);
    if (s) s.textContent = routine.examTime ? "⏰ " + routine.examTime : "দেখতে ট্যাপ করুন";
  }
}

btn.addEventListener("click", (e) => { e.preventDefault(); location.href = "routine.html"; });

updateButton();                       // আগে ব্রাউজারে রাখা রুটিন দিয়ে বাটন দেখাই (নেট না থাকলেও)
fetchRoutine().then(updateButton);
})();
