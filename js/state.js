/* ===== state.js =====
   Estado de la aplicación: datos en memoria, pestañas, filtros y acceso rápido a ingredientes, productos y proveedores. */

const TABS = [
  [
    "res",
    "Resumen",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 20V10M12 20V4M19 20v-7'/></svg>",
  ],
  [
    "ventas",
    "Ventas",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6'/></svg>",
  ],
  [
    "inv",
    "Inventario",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10'/></svg>",
  ],
  [
    "ped",
    "Pedidos",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 4h2l2 11h10l2-8H6'/><circle cx='9' cy='19' r='1.5'/><circle cx='17' cy='19' r='1.5'/></svg>",
  ],
  [
    "mer",
    "Mermas",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6'/></svg>",
  ],
  [
    "prod",
    "Productos",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2'/></svg>",
  ],
  [
    "rec",
    "Recepciones",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3v10M8 9l4 4 4-4M4 15v4h16v-4'/></svg>",
  ],
  [
    "prov",
    "Proveedores",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 6h11v10H3zM14 10h4l3 3v3h-7'/><circle cx='7' cy='18' r='1.8'/><circle cx='17' cy='18' r='1.8'/></svg>",
  ],
  [
    "hor",
    "Horarios",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='5' width='18' height='16' rx='2'/><path d='M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 18h2'/></svg>",
  ],
  [
    "ayuda",
    "Ayuda",
    "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9'/><path d='M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01'/></svg>",
  ],
];

const MOT = ["Caducado", "Dañado", "Error de preparación", "Derrame", "Otro"];

let S = { ing: [], prod: [], prov: [], sales: [], waste: [], recv: [], cal: [], cfg: {} },
  D = { name: "", price: "", steps: "", photo: "", cat: "", catn: "", lines: [] };

const C = { ing: {}, prod: {}, led: {}, prov: {}, cfg: {}, cal: {}, hor: {} },
  LK = "cafe3";
let DB = null,
  UID = "u",
  CANW = true,
  READY = false,
  SYNC = "Conectando…",
  WQ = Promise.resolve();

let ui = {
  tab: "res",
  q: "",
  cat: "Todas",
  open: "",
  cart: {},
  col: "eq",
  vq: "",
  pq: "",
  cl: {},
  ci: {},
  cp: {},
  vd: today(),
  wp: 30,
  del: "",
};

const I = (id) => S.ing.find((p) => p.id == id),
  PR = (id) => S.prod.find((p) => p.id == id),
  num = (v) => parseFloat(v) || 0,
  r2 = (n) => +(+n).toFixed(2);

const ucost = (u) => Object.entries(u).reduce((a, [k, q]) => a + q * (I(k)?.cost || 0), 0),
  pcost = (p) => ucost(Object.fromEntries(p.lines.map((l) => [l.iid, l.qty])));

const avail = (p) =>
  Math.max(
    0,
    Math.floor(
      Math.min(
        ...p.lines.map((l) => {
          const i = I(l.iid);
          return i ? i.stock / l.qty : 0;
        }),
      ),
    ),
  );

const PV = (id) => S.prov.find((p) => p.id == id),
  supOf = (iid) => S.prov.find((p) => p.items.includes(iid));
