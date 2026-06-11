// ============================================
// storage.js — שכבת האחסון של המסמכים
// גרסה 0.2: שמירה מקומית בדפדפן (localStorage).
// בגרסה עתידית נחליף רק את הקובץ הזה באחסון ענן —
// ושאר האתר לא יצטרך להשתנות. זה הרעיון של "שכבה".
// ============================================

const STORAGE_KEY = "dov-widgets-docs-v1";

function loadAllDocs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveAllDocs(docs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    alert("השמירה נכשלה — ייתכן שהאחסון חסום בדפדפן הזה");
  }
}

// שם ברירת מחדל: תאריך ושעת היצירה, למשל: 11.06.2026 16:09
function defaultName(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear() +
    " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function createDoc() {
  const docs = loadAllDocs();
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : "doc-" + Date.now();
  const now = Date.now();
  docs[id] = { id: id, name: defaultName(), content: "", created: now, updated: now };
  saveAllDocs(docs);
  return docs[id];
}

function getDoc(id) {
  return loadAllDocs()[id] || null;
}

function updateDoc(id, fields) {
  const docs = loadAllDocs();
  if (!docs[id]) return;
  Object.assign(docs[id], fields, { updated: Date.now() });
  saveAllDocs(docs);
}

function deleteDoc(id) {
  const docs = loadAllDocs();
  delete docs[id];
  saveAllDocs(docs);
}

// רשימה ממוינת — האחרון שעודכן ראשון
function listDocs() {
  return Object.values(loadAllDocs()).sort((a, b) => b.updated - a.updated);
}
