// ===== שכבת סנכרון ענן (Firebase Firestore) =====
// נטען אחרי storage.js. דורש את ספריות firebase-app-compat + firebase-firestore-compat.
(function () {
  const DOV_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDmM3fc235YjrIFSZc-DDbqPZ2GGoy5quY",
    authDomain: "dov-widgets.firebaseapp.com",
    projectId: "dov-widgets",
    storageBucket: "dov-widgets.firebasestorage.app",
    messagingSenderId: "344927449910",
    appId: "1:344927449910:web:5a0ab8fca87d35d3f5f997",
  };

  const SPACE_KEY = "dov-widgets-space";
  let db = null;
  let statusEl = null;
  let pushTimer = null;
  const pendingDocs = new Set();
  let pendingMeta = false;

  function spaceId() {
    try { return localStorage.getItem(SPACE_KEY) || ""; } catch (e) { return ""; }
  }
  function setSpaceId(id) {
    try {
      if (id) localStorage.setItem(SPACE_KEY, String(id).trim());
      else localStorage.removeItem(SPACE_KEY);
    } catch (e) {}
  }
  function newSpaceId() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // מזהה ייחודי וקבוע למכשיר הזה — כדי שלא נגיב לשינויים שאנחנו עצמנו כתבנו
  const CLIENT_KEY = "dov-client-id";
  function clientId() {
    try {
      let id = localStorage.getItem(CLIENT_KEY);
      if (!id) { id = newSpaceId(); localStorage.setItem(CLIENT_KEY, id); }
      return id;
    } catch (e) { return "anon"; }
  }

  // האזנה חיה למסמך בודד (Firestore onSnapshot). מחזיר פונקציית ביטול.
  // מדלג על שינויים שמקורם במכשיר הזה כדי למנוע הד.
  function watchDoc(id, cb) {
    if (!ready() || !id) return function () {};
    try {
      return docRef(id).onSnapshot(function (snap) {
        if (!snap.exists) return;
        if (snap.metadata && snap.metadata.hasPendingWrites) return;
        const c = snap.data();
        if (!c || c.deleted) return;
        if (c.lastWriter && c.lastWriter === clientId()) return;
        try { cb(c); } catch (e) {}
      }, function (err) { console.error("watchDoc error", err); });
    } catch (e) { console.error("watchDoc failed", e); return function () {}; }
  }

  function initDb() {
    if (db) return true;
    try {
      if (typeof firebase === "undefined" || !firebase.firestore) return false;
      if (!firebase.apps.length) firebase.initializeApp(DOV_FIREBASE_CONFIG);
      db = firebase.firestore();
      return true;
    } catch (e) {
      console.error("cloud init failed", e);
      return false;
    }
  }
  function ready() { return !!spaceId() && initDb(); }

  function setStatus(text, color) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.style.color = color || "#9b9a97";
    }
  }

  function docRef(id) { return db.collection("spaces").doc(spaceId()).collection("docs").doc(id); }
  function metaRef() { return db.collection("spaces").doc(spaceId()).collection("meta").doc("main"); }

  // Firestore לא תומך במערכים מקוננים — לכן data נשמר כמחרוזת JSON
  function docToCloud(d) {
    return {
      type: d.type || "markdown",
      name: d.name || "",
      content: d.content || "",
      dataJson: d.data ? JSON.stringify(d.data) : "",
      folderId: d.folderId || null,
      links: d.links || [],
      created: d.created || "",
      updated: d.updated || "",
      lastWriter: clientId(),
    };
  }
  function cloudToDoc(id, c) {
    let data = null;
    try { data = c.dataJson ? JSON.parse(c.dataJson) : null; } catch (e) {}
    return {
      id: id,
      type: c.type || "markdown",
      name: c.name || "",
      content: c.content || "",
      data: data,
      folderId: c.folderId || null,
      links: c.links || [],
      created: c.created || "",
      updated: c.updated || "",
    };
  }

  async function pushDocNow(id) {
    const d = window.dovStore.getDocRaw(id);
    if (d) {
      await docRef(id).set(docToCloud(d));
      return;
    }
    // המסמך נמחק מקומית — כותבים מצבת מחיקה כדי שכל המכשירים ימחקו
    const trash = window.dovStore.getMeta().trash || {};
    const t = trash[id];
    if (t) await docRef(id).set({ deleted: true, updated: t });
  }

  async function pushMetaNow() {
    const m = window.dovStore.getMeta();
    await metaRef().set({
      folders: m.folders || [],
      foldersUpdated: m.foldersUpdated || "",
      trash: m.trash || {},
    });
  }

  async function flush() {
    if (!ready()) return;
    try {
      const ids = Array.from(pendingDocs);
      pendingDocs.clear();
      for (const id of ids) await pushDocNow(id);
      if (pendingMeta) { pendingMeta = false; await pushMetaNow(); }
      setStatus("מסונכרן בענן ☁️✓", "#0f7b6c");
    } catch (e) {
      console.error("cloud push failed", e);
      setStatus("⚠️ שגיאת סנכרון — שמור מקומית בלבד", "#e03e3e");
    }
  }

  // נקרא מ-storage.js על כל שינוי מקומי
  function queuePush(kind, id) {
    if (!ready()) return;
    if ((kind === "doc" || kind === "delete") && id) pendingDocs.add(id);
    if (kind === "folders" || kind === "delete") pendingMeta = true;
    clearTimeout(pushTimer);
    setStatus("מסנכרן… ⏳");
    pushTimer = setTimeout(flush, 1200);
  }

  // משיכת כל המרחב + דחיפת מה שחדש יותר מקומית (כולל העברה ראשונית)
  async function pullAll() {
    if (!ready()) { setStatus("ענן: לא מחובר"); return false; }
    setStatus("טוען מהענן… ⏳");
    try {
      const snap = await db.collection("spaces").doc(spaceId()).collection("docs").get();
      const remote = {};
      snap.forEach((s) => { remote[s.id] = s.data(); });
      let meta = null;
      try {
        const m = await metaRef().get();
        if (m.exists) meta = m.data();
      } catch (e) {}
      const res = window.dovStore.mergeRemote(remote, meta, cloudToDoc);
      res.pushDocIds.forEach((id) => pendingDocs.add(id));
      if (res.pushMeta) pendingMeta = true;
      if (pendingDocs.size || pendingMeta) await flush();
      else setStatus("מסונכרן בענן ☁️✓", "#0f7b6c");
      return res.changed;
    } catch (e) {
      console.error("cloud pull failed", e);
      setStatus("⚠️ אין חיבור לענן — עובד מקומית", "#e03e3e");
      return false;
    }
  }

  // משיכת מסמך בודד (לדפי העריכה): מחזיר true אם המקומי הוחלף בגרסה חדשה מהענן
  async function pullDoc(id) {
    if (!ready() || !id) return false;
    try {
      const s = await docRef(id).get();
      if (!s.exists) { queuePush("doc", id); return false; }
      const c = s.data();
      if (c.deleted) return false;
      const local = window.dovStore.getDocRaw(id);
      if (!local || (c.updated || "") > (local.updated || "")) {
        window.dovStore.putDoc(cloudToDoc(id, c));
        return true;
      }
      if ((local.updated || "") > (c.updated || "")) queuePush("doc", id);
      else setStatus("מסונכרן בענן ☁️✓", "#0f7b6c");
      return false;
    } catch (e) {
      console.error("cloud pullDoc failed", e);
      return false;
    }
  }

  window.dovCloud = {
    spaceId: spaceId,
    setSpaceId: setSpaceId,
    newSpaceId: newSpaceId,
    pullAll: pullAll,
    pullDoc: pullDoc,
    flush: flush,
    bindStatus: function (el) { statusEl = el; },
    isReady: ready,
    clientId: clientId,
    watchDoc: watchDoc,
  };
  window.dovStorageChanged = queuePush;

  // דחיפה מיידית כשהווידג'ט מוסתר/נסגר — נושן סוגר iframes בלי אזהרה,
  // וההמתנה של 1.2 שניות עלולה לאבד את השינוי האחרון
  function hardFlush() { clearTimeout(pushTimer); flush(); }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") hardFlush(); });
  window.addEventListener("pagehide", hardFlush);
})();
