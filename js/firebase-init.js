/* ============================================================
   firebase-init.js — loads the Firebase SDK and connects to
   Firestore + anonymous Auth. This is a module script so it can
   use `import`; it exposes what storage.js needs on `window.__fb`.

   window.__fbReady resolves once setup is done (or gives up, if
   no config was provided — see firebase-config.js).
   ============================================================ */

window.__fbReady = (async () => {
  const config = window.FIREBASE_CONFIG;
  if (!config || !config.apiKey || String(config.apiKey).startsWith('YOUR_')) {
    console.warn(
      'Firebase is not configured yet (js/firebase-config.js still has placeholder ' +
      'values). Falling back to this-browser-only storage. See SETUP_FIREBASE.md.'
    );
    return;
  }

  try {
    const FIREBASE_SDK_VERSION = '10.12.2';
    const { initializeApp } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
    );
    const {
      getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot
    } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
    );
    const { getAuth, signInAnonymously } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`
    );

    const app = initializeApp(config);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Anonymous sign-in: not a real per-user identity, just a token that
    // lets Firestore Security Rules require "some signed-in client" rather
    // than being wide open to anyone who finds the config values.
    await signInAnonymously(auth);

    window.__fb = { db, doc, getDoc, setDoc, deleteDoc, onSnapshot };
    console.info('Firebase connected — data will sync across devices.');
  } catch (err) {
    console.error('Firebase setup failed, falling back to this-browser-only storage:', err);
  }
})();
