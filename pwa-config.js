/* =====================================================================
   PWA সেটিংস — Notification চালু করতে হলে শুধু এই ফাইলটি বদলাতে হবে।
   (বিস্তারিত: নির্দেশনা ফাইলের "Notification চালু করার নিয়ম" অংশ)

   ENABLE_NOTIFICATIONS : true করলে অভিভাবকদের অ্যাপে "নোটিফিকেশন চালু করুন" বাটন আসবে
   VAPID_KEY            : Firebase Console → Project settings → Cloud Messaging →
                          Web configuration → Web Push certificates → "Key pair"
                          (এই কী আমি বানাইনি — আপনাকে Firebase থেকে নিজে নিতে হবে)
   ===================================================================== */
window.ALHAMRA_PWA = {
  ENABLE_NOTIFICATIONS: false,
  VAPID_KEY: "",

  /* বর্তমান Firebase প্রজেক্টের (ওয়েবসাইটে আগে থেকেই থাকা) একই তথ্য — নতুন কিছু নয় */
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyCIoSIq3Ci9wODl_OMk5XDMrAK7mVLQvzs",
    authDomain: "madrasa-admission-system.firebaseapp.com",
    databaseURL: "https://madrasa-admission-system-default-rtdb.firebaseio.com",
    projectId: "madrasa-admission-system",
    storageBucket: "madrasa-admission-system.firebasestorage.app",
    messagingSenderId: "722552487890",
    appId: "1:722552487890:web:7a8f6d8deb5da44c11520b"
  },
  FIREBASE_SDK_VERSION: "12.17.1"
};
