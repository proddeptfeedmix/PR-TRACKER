/* ============================================================
   firebase-config.js — YOUR Firebase project settings.

   Get these values from: Firebase Console → Project settings →
   "Your apps" → Web app (</>) → SDK setup and configuration.

   These values are NOT secret — they identify your project, the
   same way a URL does. It is safe for them to be public in your
   GitHub repo and visible in the deployed site's source. Actual
   access control is handled by Firestore Security Rules (see
   firestore.rules) and Firebase Authentication, not by hiding
   this file.

   Until you fill this in, the app falls back to storing data in
   this browser only (same as before) and will not sync across
   devices.
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
