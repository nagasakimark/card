// Card Maker — make a card from shapes and colours ("This is for you.", Let's Try! 1, Unit 7).
// Drag a shape onto the card (or tap it). Tap a shape on the card to say it and to change it.
// Shapes stay in the order they were placed in. The card is kept in this browser.

// ---------------------------------------------------------------- data
const SHAPES = {
  circle: "M50,6 a44,44 0 1 1 -0.1,0 z",
  triangle: "M50,8 L94,88 L6,88 z",
  square: "M10,10 H90 V90 H10 z",
  rectangle: "M4,26 H96 V74 H4 z",
  star: "M50,4 L61,37 L96,37 L68,58 L78,92 L50,72 L22,92 L32,58 L4,37 L39,37 z",
  diamond: "M50,4 L90,50 L50,96 L10,50 z",
  heart: "M50,90 C18,68 4,50 4,32 C4,16 16,6 29,6 C39,6 46,12 50,20 C54,12 61,6 71,6 C84,6 96,16 96,32 C96,50 82,68 50,90 z",
};
const SHAPE_JA = { circle: "まる", triangle: "さんかく", square: "しかく", rectangle: "ながしかく", star: "ほし", diamond: "ひしがた", heart: "ハート" };
const COLORS = [["red", "#e53935"], ["blue", "#1e63d6"], ["yellow", "#f7c400"], ["green", "#2e9d47"], ["pink", "#ec5c9a"],
  ["orange", "#f57c00"], ["purple", "#7b45c4"], ["brown", "#8b5a2b"], ["black", "#222222"], ["white", "#ffffff"]];
const COLOR = Object.fromEntries(COLORS);

const TEXT = {
  ja: { title: "カードメーカー", sub: "かたちを カードに ドラッグしよう", smaller: "小さく", bigger: "大きく", turn: "まわす", del: "けす",
        give: "This is for you!", clear: "ぜんぶけす", clearAsk: "ぜんぶ けしても いい？", yes: "けす", no: "やめる",
        lang: "English", empty: "かたちを えらんで カードに おいてね" },
  en: { title: "Card Maker", sub: "Drag shapes onto the card", smaller: "Smaller", bigger: "Bigger", turn: "Turn", del: "Delete",
        give: "This is for you!", clear: "Clear all", clearAsk: "Clear the whole card?", yes: "Clear", no: "Cancel",
        lang: "日本語", empty: "Pick a shape and put it on the card" },
};
let lang = (() => { try { return localStorage.getItem("card:lang") || "ja"; } catch { return "ja"; } })();
const t = k => TEXT[lang][k];

const ICONS = {
  minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  turn: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const svgShape = (shape, fill) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${SHAPES[shape]}" fill="${fill}" stroke="rgba(0,0,0,.28)" stroke-width="3" stroke-linejoin="round"/></svg>`;
const article = c => /^[aeiou]/.test(c) ? "An" : "A";

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

// ---------------------------------------------------------------- state
const st = { color: COLORS[0], items: [], sel: null };
const KEY = "card:v1";
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(st.items.map(({ shape, color, x, y, size, rot }) => ({ shape, color: color[0], x, y, size, rot })))); } catch {}
}

// ---------------------------------------------------------------- layout
const card = h("div", { class: "card", "aria-label": "card" });
const caption = h("div", { class: "say", "aria-live": "polite" });
const palette = h("div", { class: "shapes" });
const swatches = h("div", { class: "colors" });
const btnIcon = (name, label, fn, cls = "ib") => h("button", { class: cls, type: "button", "aria-label": label, "data-tip": label, onclick: fn, html: icon(name) });
const selbar = h("div", { class: "selbar", hidden: true });
const confirmBox = h("div", { class: "confirm", hidden: true });
const app = h("main", { class: "app" });
document.body.append(app);

function render() {
  document.documentElement.lang = lang;
  document.title = `${TEXT.ja.title}｜${TEXT.en.title}`;
  selbar.replaceChildren(
    btnIcon("minus", t("smaller"), () => resize(1 / 1.2)),
    btnIcon("plus", t("bigger"), () => resize(1.2)),
    btnIcon("turn", t("turn"), () => { if (!st.sel) return; st.sel.rot = (st.sel.rot + 30) % 360; paint(st.sel); save(); }),
    btnIcon("trash", t("del"), () => remove(st.sel)));
  swatches.replaceChildren(...COLORS.map(c => {
    const b = h("button", { class: "sw", type: "button", title: c[0], "aria-label": c[0], "aria-pressed": String(c === st.color) });
    b.style.setProperty("--c", c[1]);
    b.onclick = () => { st.color = c; drawPalette(); if (st.sel) { st.sel.color = c; paint(st.sel); say(st.sel); save(); } };
    return b;
  }));
  app.replaceChildren(
    h("header", { class: "top" },
      h("div", { class: "brand" }, h("span", { class: "logo", html: svgShape("heart", "#ec5c9a") }),
        h("div", {}, h("h1", {}, t("title")), h("p", {}, t("sub")))),
      h("button", { class: "lang", type: "button", onclick: () => { lang = lang === "ja" ? "en" : "ja"; try { localStorage.setItem("card:lang", lang); } catch {} render(); },
        html: icon("globe") + `<span>${t("lang")}</span>` })),
    h("section", { class: "side" }, palette, swatches),
    h("section", { class: "main" }, h("div", { class: "cardwrap" }, card, selbar, confirmBox), caption),
    h("footer", { class: "bar" },
      h("button", { class: "pill", type: "button", onclick: give, html: icon("star") + `<span>${t("give")}</span>` }),
      h("button", { class: "pill ghost", type: "button", onclick: askClear, html: icon("trash") + `<span>${t("clear")}</span>` })));
  drawPalette();
  if (st.sel) say(st.sel); else idle();
}
function idle() { caption.replaceChildren(h("b", {}, "What do you want?"), h("small", {}, t("empty"))); }

function drawPalette() {
  palette.replaceChildren(...Object.keys(SHAPES).map(sh => {
    const b = h("button", { class: "shape", type: "button", title: sh, "aria-label": `${st.color[0]} ${sh}`, html: svgShape(sh, st.color[1]) });
    b.addEventListener("pointerdown", e => dragNew(e, sh));
    b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); add(sh, .5, .5); } });
    return b;
  }));
  swatches.querySelectorAll(".sw").forEach((b, i) => b.setAttribute("aria-pressed", String(COLORS[i] === st.color)));
}

// ---------------------------------------------------------------- shapes on the card
function paint(it) {
  it.el.innerHTML = svgShape(it.shape, it.color[1]);
  it.el.setAttribute("aria-label", `${it.color[0]} ${it.shape}`);
  Object.assign(it.el.style, { left: it.x * 100 + "%", top: it.y * 100 + "%", width: it.size * 100 + "%", transform: `translate(-50%,-50%) rotate(${it.rot}deg)` });
}
function say(it) {
  const words = `${article(it.color[0])} ${it.color[0]} ${it.shape}, please.`;
  caption.replaceChildren(h("b", {}, words), lang === "ja" ? h("small", {}, `${it.color[0]} の ${SHAPE_JA[it.shape]}`) : null);
}
function select(it) {
  st.sel = it;
  st.items.forEach(i => i.el.classList.toggle("sel", i === it));
  selbar.hidden = !it;
}
function add(shape, x, y, opts = {}) {
  const it = { shape, color: opts.color || st.color, x, y, size: opts.size || .2, rot: opts.rot || 0 };
  it.el = h("div", { class: "item", role: "button", tabindex: "0" });
  it.el.addEventListener("pointerdown", e => dragItem(e, it));
  it.el.addEventListener("keydown", e => keyItem(e, it));
  card.append(it.el);                       // a new shape goes on top; after that its place in the stack never changes
  st.items.push(it);
  paint(it);
  if (!opts.quiet) { select(it); say(it); save(); }
  return it;
}
function remove(it) {
  if (!it) return;
  it.el.remove(); st.items.splice(st.items.indexOf(it), 1);
  if (st.sel === it) { select(null); idle(); }
  save();
}
function resize(k) { if (!st.sel) return; st.sel.size = Math.max(.06, Math.min(.7, st.sel.size * k)); paint(st.sel); save(); }
const rel = e => { const r = card.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };

function dragNew(e, shape) {
  e.preventDefault();
  const ghost = h("div", { class: "dragshape", html: svgShape(shape, st.color[1]) });
  document.body.append(ghost);
  const mv = ev => { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; };
  mv(e);
  const sx = e.clientX, sy = e.clientY;
  const up = ev => {
    removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
    ghost.remove();
    const [x, y] = rel(ev);
    if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) add(shape, .3 + Math.random() * .4, .3 + Math.random() * .4);   // a tap adds it to the card
    else if (x > 0 && x < 1 && y > 0 && y < 1) add(shape, x, y);
  };
  addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
}
function dragItem(e, it) {
  e.preventDefault(); e.stopPropagation();
  select(it);                               // (no bringing to the front: the order stays as placed)
  const [sx, sy] = rel(e), ox = it.x, oy = it.y;
  let moved = false;
  it.el.setPointerCapture(e.pointerId);
  const mv = ev => { const [x, y] = rel(ev); if (Math.hypot(x - sx, y - sy) > .01) moved = true; it.x = ox + x - sx; it.y = oy + y - sy; paint(it); };
  const up = ev => {
    it.el.removeEventListener("pointermove", mv); it.el.removeEventListener("pointerup", up); it.el.removeEventListener("pointercancel", up);
    const [x, y] = rel(ev);
    if (x < -.05 || x > 1.05 || y < -.05 || y > 1.05) remove(it);   // dragged off the card
    else { if (!moved) say(it); save(); }
  };
  it.el.addEventListener("pointermove", mv); it.el.addEventListener("pointerup", up); it.el.addEventListener("pointercancel", up);
}
function keyItem(e, it) {
  const step = e.shiftKey ? .05 : .01;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (moves[e.key]) { e.preventDefault(); select(it); it.x += moves[e.key][0]; it.y += moves[e.key][1]; paint(it); save(); }
  else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(it); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(it); say(it); }
}
card.addEventListener("pointerdown", e => { if (e.target === card) { select(null); idle(); } });

// ---------------------------------------------------------------- buttons
function give() {
  select(null);
  card.classList.remove("give"); void card.offsetWidth; card.classList.add("give");
  caption.replaceChildren(h("b", {}, "This is for you!"), h("small", {}, "Thank you!"));
}
function askClear() {
  if (!st.items.length) return;
  confirmBox.replaceChildren(h("div", { class: "confirmcard" }, h("b", {}, t("clearAsk")),
    h("div", { class: "row" },
      h("button", { class: "pill", type: "button", onclick: () => { [...st.items].forEach(remove); confirmBox.hidden = true; idle(); }, html: icon("trash") + `<span>${t("yes")}</span>` }),
      h("button", { class: "pill ghost", type: "button", onclick: () => { confirmBox.hidden = true; } }, t("no")))));
  confirmBox.hidden = false;
}
// ---------------------------------------------------------------- start
render();
try {
  for (const it of JSON.parse(localStorage.getItem(KEY) || "[]"))
    if (SHAPES[it.shape] && COLOR[it.color]) add(it.shape, it.x, it.y, { color: COLORS.find(c => c[0] === it.color), size: it.size, rot: it.rot, quiet: true });
} catch {}
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
