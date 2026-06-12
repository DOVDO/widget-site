// ===== חלון ניהול קישורי נושן — משותף לכל הדפים =====
// משתמש בפונקציות של storage.js (getDoc, addLink, deleteLink)

function openLinksModal(docId, onClose) {
  if (!document.getElementById("linksUiStyle")) {
    const st = document.createElement("style");
    st.id = "linksUiStyle";
    st.textContent = [
      "#linksOverlay { position: fixed; inset: 0; background: rgba(15,15,15,.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 14px; }",
      "#linksBox { background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,.25); width: 100%; max-width: 460px; max-height: 80vh; display: flex; flex-direction: column; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #37352f; }",
      ".lb-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e9e9e7; font-size: 15px; }",
      ".lb-close { border: none; background: none; font-size: 15px; cursor: pointer; color: #9b9a97; }",
      ".lb-close:hover { color: #37352f; }",
      ".lb-list { flex: 1; overflow-y: auto; padding: 8px 16px; }",
      ".lb-empty { color: #9b9a97; font-size: 13px; padding: 14px 0; text-align: center; }",
      ".lb-row { border: 1px solid #e9e9e7; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }",
      ".lb-rnote { font-size: 13.5px; font-weight: 600; margin-bottom: 2px; }",
      ".lb-rurl { font-size: 11.5px; color: #2383e2; word-break: break-all; text-decoration: none; display: block; margin-bottom: 6px; direction: ltr; text-align: right; }",
      ".lb-rbtns { display: flex; gap: 6px; }",
      ".lb-rbtns button { border: 1px solid #d3d3d0; background: #fff; border-radius: 6px; padding: 2px 8px; font-size: 11.5px; cursor: pointer; font-family: inherit; }",
      ".lb-rbtns button:hover { background: #f1f1ef; }",
      ".lb-rbtns .lb-del { color: #c4554d; }",
      ".lb-sec { font-size: 12px; font-weight: 700; color: #787774; margin: 6px 0 4px; }",
      ".lb-kinds { display: flex; gap: 6px; }",
      ".lb-kinds button { flex: 1; border: 1px solid #d3d3d0; background: #fff; border-radius: 6px; padding: 5px; font-size: 12.5px; cursor: pointer; font-family: inherit; }",
      ".lb-kinds button.on { background: #2383e2; border-color: #2383e2; color: #fff; }",
      ".lb-form { padding: 10px 16px; border-top: 1px solid #e9e9e7; display: flex; flex-direction: column; gap: 6px; }",
      ".lb-form input { border: 1px solid #d3d3d0; border-radius: 6px; padding: 6px 8px; font-size: 13px; font-family: inherit; }",
      ".lb-form input:focus { outline: none; border-color: #2383e2; }",
      ".lb-url { direction: ltr; text-align: left; }",
      ".lb-add { border: none; background: #2383e2; color: #fff; border-radius: 6px; padding: 7px; font-size: 13px; cursor: pointer; font-family: inherit; }",
      ".lb-add:hover { background: #1b6ec2; }",
      ".lb-tip { font-size: 11px; color: #9b9a97; padding: 0 16px 12px; }",
    ].join("\n");
    document.head.appendChild(st);
  }

  const prev = document.getElementById("linksOverlay");
  if (prev) prev.remove();

  const overlay = document.createElement("div");
  overlay.id = "linksOverlay";
  overlay.setAttribute("dir", "rtl");

  const box = document.createElement("div");
  box.id = "linksBox";

  const head = document.createElement("div");
  head.className = "lb-head";
  const title = document.createElement("b");
  title.textContent = "🔗 היכן הקובץ משובץ בנושן";
  const closeBtn = document.createElement("button");
  closeBtn.className = "lb-close";
  closeBtn.textContent = "✕";
  head.appendChild(title);
  head.appendChild(closeBtn);

  const list = document.createElement("div");
  list.className = "lb-list";

  const form = document.createElement("div");
  form.className = "lb-form";
  // סוג הקישור: בלוק (היכן הקובץ משובץ) או דף (לאיזה דף נושן הוא שייך)
  let kind = "block";
  let kindManual = false;
  const kindsRow = document.createElement("div");
  kindsRow.className = "lb-kinds";
  const kindBlockBtn = document.createElement("button");
  kindBlockBtn.textContent = "\ud83e\uddf1 קישור בלוק";
  const kindPageBtn = document.createElement("button");
  kindPageBtn.textContent = "\ud83d\udcc4 קישור דף";
  function setKind(k, manual) {
    kind = k;
    if (manual) kindManual = true;
    kindBlockBtn.className = k === "block" ? "on" : "";
    kindPageBtn.className = k === "page" ? "on" : "";
  }
  kindBlockBtn.addEventListener("click", () => setKind("block", true));
  kindPageBtn.addEventListener("click", () => setKind("page", true));
  kindsRow.appendChild(kindBlockBtn);
  kindsRow.appendChild(kindPageBtn);
  setKind("block", false);
  const urlInput = document.createElement("input");
  urlInput.className = "lb-url";
  urlInput.placeholder = "הדבק קישור לבלוק / לדף בנושן";
  urlInput.addEventListener("input", () => {
    if (kindManual) return;
    // זיהוי אוטומטי: קישור לבלוק בנושן מכיל # עם מזהה הבלוק
    setKind(urlInput.value.indexOf("#") >= 0 ? "block" : "page", false);
  });
  const noteInput = document.createElement("input");
  noteInput.placeholder = "הערה — למשל: עמוד יומן הלמידה";
  const addBtn = document.createElement("button");
  addBtn.className = "lb-add";
  addBtn.textContent = "➕ הוסף קישור";
  form.appendChild(kindsRow);
  form.appendChild(urlInput);
  form.appendChild(noteInput);
  form.appendChild(addBtn);

  const tip = document.createElement("div");
  tip.className = "lb-tip";
  tip.textContent = "טיפ: לבלוק — ⋯ ← Copy link to block. לדף — ⋯ ← Copy link. הסוג מזוהה אוטומטית וניתן לשנות ידנית";

  box.appendChild(head);
  box.appendChild(list);
  box.appendChild(form);
  box.appendChild(tip);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function render() {
    list.innerHTML = "";
    const d = getDoc(docId);
    const links = (d && d.links) || [];
    if (!links.length) {
      const empty = document.createElement("div");
      empty.className = "lb-empty";
      empty.textContent = "אין עדיין קישורים — הקובץ הזה לא מתועד בשום מקום בנושן";
      list.appendChild(empty);
      return;
    }
    const kindOf = (l) => l.kind || ((l.url || "").indexOf("#") >= 0 ? "block" : "page");
    [
      ["\ud83e\uddf1 קישורי בלוקים — היכן הקובץ משובץ", links.filter((l) => kindOf(l) === "block")],
      ["\ud83d\udcc4 קישורי דפים — לאילו דפים הקובץ שייך", links.filter((l) => kindOf(l) === "page")],
    ].forEach(([secTitle, secLinks]) => {
      if (!secLinks.length) return;
      const sec = document.createElement("div");
      sec.className = "lb-sec";
      sec.textContent = secTitle;
      list.appendChild(sec);
      secLinks.forEach(renderRow);
    });
    function renderRow(l) {
      const row = document.createElement("div");
      row.className = "lb-row";
      const note = document.createElement("div");
      note.className = "lb-rnote";
      note.textContent = l.note || "(ללא הערה)";
      const url = document.createElement("a");
      url.className = "lb-rurl";
      url.textContent = l.url;
      url.href = l.url;
      url.target = "_blank";
      url.rel = "noopener";
      const btns = document.createElement("div");
      btns.className = "lb-rbtns";
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "📋 העתק";
      copyBtn.addEventListener("click", () => {
        try { navigator.clipboard.writeText(l.url); copyBtn.textContent = "הועתק ✓"; } catch (e) {}
        setTimeout(() => { copyBtn.textContent = "📋 העתק"; }, 1200);
      });
      const delBtn = document.createElement("button");
      delBtn.className = "lb-del";
      delBtn.textContent = "🗑️ הסר";
      delBtn.addEventListener("click", () => {
        deleteLink(docId, l.id);
        render();
      });
      btns.appendChild(copyBtn);
      btns.appendChild(delBtn);
      row.appendChild(note);
      row.appendChild(url);
      row.appendChild(btns);
      list.appendChild(row);
    }
  }

  addBtn.addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (!url) { urlInput.focus(); return; }
    addLink(docId, url, noteInput.value.trim(), kind);
    kindManual = false;
    urlInput.value = "";
    noteInput.value = "";
    render();
    urlInput.focus();
  });

  function close() {
    overlay.remove();
    if (typeof onClose === "function") onClose();
  }
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });

  render();
  urlInput.focus();
}
