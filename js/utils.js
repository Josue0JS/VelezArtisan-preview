/* ===== utils.js =====
   Utilidades generales: formato de dinero y cantidades, unidades, avisos, paneles y tablas de texto. */

const F = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ml: 1, l: 1000, und: 1 },
  FAM = { g: "m", kg: "m", oz: "m", lb: "m", ml: "v", l: "v", und: "u" },
  DEFC = [
    "Café",
    "Lácteos",
    "Panadería",
    "Frutas y verduras",
    "Bebidas",
    "Jarabes y salsas",
    "Desechables",
    "Otros",
  ];

const $ = (s) => document.querySelector(s),
  uid = () => Math.random().toString(36).slice(2, 9);

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const today = () => daysAgo(0);
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

const money = (n) => {
    const r = Math.round(n);
    return (r < 0 ? "-" : "") + "$" + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  },
  short = (v) =>
    v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "k" : Math.round(v);

const fq = (q, u) =>
  String(u == "g" || u == "ml" ? Math.round(q) : r2(q)).replace(".", ",") + " " + (u == "un" ? "und" : u);

const uopts = (b) =>
  F[b]
    ? Object.keys(F)
        .filter((u) => FAM[u] == FAM[b])
        .map((u) => `<option ${u == b ? "selected" : ""}>${u}</option>`)
        .join("")
    : `<option>${esc(b)}</option>`;

const conv = (q, a, b) => (F[a] && F[b] && FAM[a] == FAM[b] ? (q * F[a]) / F[b] : q);

function save() {}

function toast(t) {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = t;
  document.body.append(e);
  setTimeout(() => e.classList.add("out"), 2500);
  setTimeout(() => e.remove(), 2850);
}

function ask(k, f) {
  if (ui.del == k) {
    ui.del = "";
    f();
  } else {
    ui.del = k;
    toast("Pulsa otra vez para confirmar");
    setTimeout(() => {
      if (ui.del == k) ui.del = "";
    }, 3000);
  }
}

function modal(t, b) {
  $("#mo").innerHTML =
    `<div class="sh" onclick="event.stopPropagation()"><div class="sht"><h2>${t}</h2><button class="x2" aria-label="Cerrar" onclick="closeM()">✕</button></div>${b}</div>`;
  $("#mo").className = "on";
}

function closeM() {
  $("#mo").className = "";
}

const pl = (n, w) => n + " " + (n == 1 ? w : /[aeios]$/i.test(w) ? w + "s" : w + "es");

const DEFP = ["Bebidas calientes", "Bebidas frías", "Panadería", "Postres", "Sándwiches", "Otros"],
  nrm = (t) =>
    String(t || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  pcats = () => [...new Set([...DEFP, ...S.prod.map((x) => x.cat).filter(Boolean)])].sort();

function tbl(R) {
  const w = [0, 1, 2, 3].map((i) => Math.max(...R.map((r) => r[i].length))),
    c = (t, n) => {
      const d = n - t.length,
        l = Math.floor(d / 2);
      return " ".repeat(l) + t + " ".repeat(d - l);
    },
    line = (r) =>
      r
        .map((t, i) => c(t, w[i]))
        .join(" | ")
        .trimEnd();
  return [line(R[0]), w.map((n) => "-".repeat(n)).join("-+-"), ...R.slice(1).map(line)].join("\n");
}
