// ===== שכבת אחסון v2: מסמכים, תיקיות וקישורי נושן =====
// מפתח חדש + העברה אוטומטית של מסמכים מהגרסה הישנה
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

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const st = JSON.parse(raw);
      if (st && Array.isArray(st.docs) && Array.isArray(st.folders)) return st;
    }
  } catch (e) {}
  // העברה מהמבנה הישן (רשימת מסמכים בלבד)
  const store = { docs: [], folders: [] };
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
  return store;
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// ----- מסמכים -----
// type: "markdown" או "sheet"
function createDoc(type, folderId) {
  const store = loadStore();
  const doc = {
    id: uid(), type: type || "markdown", name: defaultName(),
    content: "", data: null, folderId: folderId || null, links: [],
    created: nowIso(), updated: nowIso(),
  };
  store.docs.push(doc);
  saveStore(store);
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
  return doc;
}

function deleteDoc(id) {
  const store = loadStore();
  store.docs = store.docs.filter((d) => d.id !== id);
  saveStore(store);
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
  saveStore(store);
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
  if (f && name) { f.name = name; saveStore(store); }
}

// מחיקת תיקייה: התוכן שלה (מסמכים ותתיקיות) עובר לתיקייה שמעליה
function deleteFolder(id) {
  const store = loadStore();
  const f = store.folders.find((x) => x.id === id);
  if (!f) return;
  const parent = f.parentId || null;
  store.docs.forEach((d) => { if (d.folderId === id) d.folderId = parent; });
  store.folders.forEach((x) => { if (x.parentId === id) x.parentId = parent; });
  store.folders = store.folders.filter((x) => x.id !== id);
  saveStore(store);
}

// ----- קישורי נושן: היכן כל קובץ משובץ בנושן -----
function addLink(docId, url, note) {
  const store = loadStore();
  const doc = store.docs.find((d) => d.id === docId);
  if (!doc) return null;
  if (!doc.links) doc.links = [];
  const link = { id: uid(), url: url, note: note || "", created: nowIso() };
  doc.links.push(link);
  saveStore(store);
  return link;
}

function deleteLink(docId, linkId) {
  const store = loadStore();
  const doc = store.docs.find((d) => d.id === docId);
  if (!doc || !doc.links) return;
  doc.links = doc.links.filter((l) => l.id !== linkId);
  saveStore(store);
}
