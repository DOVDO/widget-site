// ===== שכבת אחסון v3: מסמכים, תיקיות, קישורי נושן + ווי סנכרון ענן =====
// אותו מפתח כמו v2 — שדות חדשים (trash, foldersUpdated) מתווספים בלי לאבד נתונים
const STORE_KEY = "dov-widgets-data-v2";
const OLD_DOCS_KEY = "dov-widgets-docs-v1";

function nowIso() { return new Date().toISOString(); }

function uid() {
  try { return crypto.randomUUID(); } catch (e) {}
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function pad2(n) { return String(n).padStart(2, "0"); }

function defaultName() {
  const d = new Date();
  return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

// הודעה לשכבת הענן (אם קיימת) שמשהו השתנה מקומית
function dovNotify(kind, id) {
  try { if (window.dovStorageChanged) window.dovStorageChanged(kind, id); } catch (e) {}
}

function loadStore() {
  let store = null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const st = JSON.parse(raw);
      if (st && Array.isArray(st.docs) && Array.isArray(st.folders)) store = st;
    }
  } catch (e) {}
  if (!store) {
    // העברה מהמבנה הישן (רשימת מסמכים בלבד)
    store = { docs: [], folders: [] };
    try {
      const old = localStorage.getItem(OLD_DOCS_KEY);
      if (old) {
        JSON.parse(old).forEach((d) => {
          store.docs.push({
            id: d.id || uid(), type: "markdown", name: d.name || defaultName(),
            content: d.content || "", data: null, folderId: null, links: [],
            created: d.created || nowIso(), updated: d.updated || nowIso(),
          });
        });
      }
    } catch (e) {}
  }
  if (!store.trash || typeof store.trash !== "object") store.trash = {};
  if (!store.foldersUpdated) store.foldersUpdated = store.folders.length ? nowIso() : "";
  return store;
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// ----- מסמכים -----
// type: "markdown" או "sheet" (ובעתיד: "canvas" ועוד)
function createDoc(type, folderId) {
  const store = loadStore();
  const doc = {
    id: uid(), type: type || "markdown", name: defaultName(),
    content: "", data: null, folderId: folderId || null, links: [],
    created: nowIso(), updated: nowIso(),
  };
  store.docs.push(doc);
  saveStore(store);
  dovNotify("doc", doc.id);
  return doc;
}

function getDoc(id) {
  return loadStore().docs.find((d) => d.id === id) || null;
}

function updateDoc(id, patch) {
  const store = loadStore();
  const doc = store.docs.find((d) => d.id === id);
  if (!doc) return null;
  Object.assign(doc, patch);
  doc.updated = nowIso();
  saveStore(store);
  dovNotify("doc", id);
  return doc;
}

function deleteDoc(id) {
  const store = loadStore();
  store.docs = store.docs.filter((d) => d.id !== id);
  store.trash[id] = nowIso();
  saveStore(store);
  dovNotify("delete", id);
}

function listDocs(folderId) {
  return loadStore().docs
    .filter((d) => (d.folderId || null) === (folderId || null))
    .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
}

function moveDoc(id, folderId) {
  return updateDoc(id, { folderId: folderId || null });
}

// ----- תיקיות -----
function createFolder(name, parentId) {
  const store = loadStore();
  const folder = { id: uid(), name: name || "תיקייה חדשה", parentId: parentId || null, created: nowIso() };
  store.folders.push(folder);
  store.foldersUpdated = nowIso();
  saveStore(store);
  dovNotify("folders", null);
  return folder;
}

function getFolder(id) {
  return loadStore().folders.find((f) => f.id === id) || null;
}

function listFolders(parentId) {
  return loadStore().folders
    .filter((f) => (f.parentId || null) === (parentId || null))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}

function renameFolder(id, name) {
  const store = loadStore();
  const f = store.folders.find((x) => x.id === id);
  if (f && name) {
    f.name = name;
    store.foldersUpdated = nowIso();
    saveStore(store);
    dovNotify("folders", null);
  }
}

// מחיקת תיקייה: התוכן שלה (מסמכים ותתיקיות) עובר לתיקייה שמעליה
function deleteFolder(id) {
  const store = loadStore();
  const f = store.folders.find((x) => x.id === id);
  if (!f) return;
  const parent = f.parentId || null;
  const movedDocs = [];
  store.docs.forEach((d) => {
    if (d.folderId === id) { d.folderId = parent; d.updated = nowIso(); movedDocs.push(d.id); }
  });
  store.folders.forEach((x) => { if (x.parentId === id) x.parentId = parent; });
  store.folders = store.folders.filter((x) => x.id !== id);
  store.foldersUpdated = nowIso();
  saveStore(store);
  dovNotify("folders", null);
  movedDocs.forEach((docId) => dovNotify("doc", docId));
}

// ----- קישורי נושן: היכן כל קובץ משובץ בנושן -----
function addLink(docId, url, note) {
  const store = loadStore();
  const doc = store.docs.find((d) => d.id === docId);
  if (!doc) return null;
  if (!doc.links) doc.links = [];
  const link = { id: uid(), url: url, note: note || "", created: nowIso() };
  doc.links.push(link);
  doc.updated = nowIso();
  saveStore(store);
  dovNotify("doc", docId);
  return link;
}

function deleteLink(docId, linkId) {
  const store = loadStore();
  const doc = store.docs.find((d) => d.id === docId);
  if (!doc || !doc.links) return;
  doc.links = doc.links.filter((l) => l.id !== linkId);
  doc.updated = nowIso();
  saveStore(store);
  dovNotify("doc", docId);
}

// ===== ממשק פנימי לשכבת הענן (cloud.js) =====
// putDoc: הכנסה/החלפה בלי לעדכן חותמת זמן ובלי להודיע לענן (מניעת לולאת הד)
function dovPutDoc(doc) {
  const store = loadStore();
  const i = store.docs.findIndex((d) => d.id === doc.id);
  if (i >= 0) store.docs[i] = doc;
  else store.docs.push(doc);
  saveStore(store);
}

function dovGetMeta() {
  const store = loadStore();
  return { folders: store.folders, foldersUpdated: store.foldersUpdated || "", trash: store.trash || {} };
}

// מיזוג מצב מרוחק: החדש מנצח (לפי updated); מחזיר מה צריך לדחוף חזרה לענן
function dovMergeRemote(remoteDocs, meta, toDoc) {
  const store = loadStore();
  const res = { changed: false, pushDocIds: [], pushMeta: false };

  // 1) מיזוג רשימת המחוקים (tombstones) — איחוד, החדש מנצח
  const remoteTrash = (meta && meta.trash) || {};
  Object.keys(remoteTrash).forEach((id) => {
    if (!store.trash[id] || store.trash[id] < remoteTrash[id]) store.trash[id] = remoteTrash[id];
  });
  Object.keys(store.trash).forEach((id) => {
    if (!remoteTrash[id] || remoteTrash[id] < store.trash[id]) res.pushMeta = true;
  });

  // 2) מסמכים מרוחקים
  Object.keys(remoteDocs).forEach((id) => {
    const c = remoteDocs[id];
    if (c.deleted) {
      if (!store.trash[id] || store.trash[id] < (c.updated || "")) {
        store.trash[id] = c.updated || nowIso();
        res.pushMeta = true;
      }
      return;
    }
    const tomb = store.trash[id];
    if (tomb && tomb >= (c.updated || "")) { res.pushDocIds.push(id); return; }
    const local = store.docs.find((d) => d.id === id);
    if (!local) {
      store.docs.push(toDoc(id, c));
      res.changed = true;
    } else if ((c.updated || "") > (local.updated || "")) {
      Object.assign(local, toDoc(id, c));
      res.changed = true;
    } else if ((local.updated || "") > (c.updated || "")) {
      res.pushDocIds.push(id);
    }
  });

  // 3) מסמכים מקומיים שאינם בענן — לדחוף
  store.docs.forEach((d) => { if (!remoteDocs[d.id]) res.pushDocIds.push(d.id); });

  // 4) החלת מחיקות על המקומי
  const before = store.docs.length;
  store.docs = store.docs.filter((d) => {
    const t = store.trash[d.id];
    return !(t && t >= (d.updated || ""));
  });
  if (store.docs.length !== before) res.changed = true;

  // 5) תיקיות — הגרסה החדשה יותר מנצחת (כמקשה אחת)
  const rfU = (meta && meta.foldersUpdated) || "";
  const lfU = store.foldersUpdated || "";
  if (meta && Array.isArray(meta.folders) && rfU > lfU) {
    store.folders = meta.folders;
    store.foldersUpdated = rfU;
    res.changed = true;
  } else if (lfU > rfU) {
    res.pushMeta = true;
  }

  saveStore(store);
  return res;
}

window.dovStore = {
  getDocRaw: getDoc,
  putDoc: dovPutDoc,
  getMeta: dovGetMeta,
  mergeRemote: dovMergeRemote,
};
