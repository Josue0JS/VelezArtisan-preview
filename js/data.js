/* ===== data.js =====
   Capa de datos: guardar, borrar y reconstruir el inventario a partir de los registros; copia de seguridad y datos de ejemplo. */

function fail(e) {
  toast(
    e && (e.code == "invalid_argument" || e.code == "permission-denied")
      ? "No tienes permiso para guardar cambios"
      : e && e.code == "quota_exceeded"
        ? "La base de datos está llena"
        : "No se pudo guardar. Revisa tu conexión",
  );
}

function lsave() {
  try {
    localStorage.setItem(LK, JSON.stringify(C));
  } catch (e) {
    toast("Almacenamiento lleno");
  }
}

function put(c, id, d) {
  C[c][id] = d;
  if (DB) WQ = WQ.then(() => DB.doc(c + "/" + id).set(d)).catch(fail);
  else lsave();
  scheduleRebuild();
}

function rm(c, id) {
  delete C[c][id];
  if (DB) WQ = WQ.then(() => DB.doc(c + "/" + id).delete()).catch(fail);
  else lsave();
  scheduleRebuild();
}

function emit(date, evs) {
  const id = date + "_" + UID,
    E = evs.map((e) => ({ id: uid(), t: Date.now(), date, ...e })),
    cur = C.led[id]?.ev || [];
  C.led[id] = { date, uid: UID, ev: [...cur, ...E] };
  WQ = WQ.then(() =>
    DB.doc("led/" + id).set(
      { date, uid: UID, ev: firebase.firestore.FieldValue.arrayUnion(...E) },
      { merge: true },
    ),
  ).catch(fail);
  scheduleRebuild();
}

let rebuildQueued = false;
function scheduleRebuild() {
  if (rebuildQueued) return;
  rebuildQueued = true;
  const flush = () => {
    rebuildQueued = false;
    rebuild();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
  else setTimeout(flush, 0);
}

function rebuild() {
  S.ing = Object.entries(C.ing).map(([id, d]) => ({
    ...d,
    id,
    stock: 0,
    unit: d.unit == "un" ? "und" : d.unit,
  }));
  S.prod = Object.entries(C.prod).map(([id, d]) => ({ ...d, id }));
  S.prov = Object.entries(C.prov || {}).map(([id, d]) => ({ ...d, id, items: d.items || [] }));
  S.cal = Object.entries(C.cal || {}).map(([id, d]) => ({ ...d, id }));
  S.cfg = (C.cfg || {}).pred || {};
  const evs = [];
  Object.values(C.led).forEach((d) => (d.ev || []).forEach((e) => evs.push(e)));
  const vo = new Set(evs.filter((e) => e.k == "x").map((e) => e.ref)),
    ok = evs.filter((e) => e.k != "x" && !vo.has(e.id)).sort((a, b) => a.t - b.t),
    st = {};
  S.ing.forEach((p) => (st[p.id] = 0));
  ok.forEach((e) => {
    if (e.k == "set") {
      if (e.iid in st) st[e.iid] = e.v;
    } else if (e.k == "in") {
      if (e.iid in st) st[e.iid] += e.v;
    } else if (e.k == "rc") {
      (e.items || []).forEach((i) => {
        if (i.iid in st) st[i.iid] += i.q;
      });
    } else for (const k in e.use || {}) if (k in st) st[k] -= e.use[k];
  });
  S.ing.forEach((p) => (p.stock = st[p.id]));
  S.sales = ok.filter((e) => e.k == "s");
  S.waste = ok.filter((e) => e.k == "w");
  S.recv = ok.filter((e) => e.k == "rc");
  draw();
}

const OLD = () => null;

function importOld() {
  const r = OLD();
  if (!r) return;
  const led = {},
    t0 = Date.now();
  let n = 0;
  const push = (date, e) => {
    (led[date] = led[date] || []).push({
      id: uid(),
      t: new Date(date + "T12:00:00").getTime() + n++,
      date,
      ...e,
    });
  };
  r.ing.forEach((i) =>
    put("ing", i.id, { name: i.name, cat: i.cat, unit: i.unit, cost: i.cost, min: i.min }),
  );
  r.prod.forEach((p) =>
    put("prod", p.id, {
      name: p.name,
      price: p.price,
      photo: p.photo || "",
      steps: p.steps || "",
      lines: p.lines,
    }),
  );
  (r.sales || []).forEach((x) => push(x.date, { k: "s", nm: x.nm, qty: x.qty, rev: x.rev, use: x.use }));
  (r.waste || []).forEach((x) =>
    push(x.date, { k: "w", nm: x.nm, qty: x.qty, reason: x.reason, use: x.use }),
  );
  r.ing.forEach((i) => push(today(), { k: "set", iid: i.id, v: i.stock }));
  Object.entries(led).forEach(([d, ev]) => {
    ev.forEach((e) => {
      if (e.k == "set") e.t = t0 + n++;
    });
    const id = d + "_" + UID,
      cur = C.led[id]?.ev || [];
    put("led", id, { date: d, uid: UID, ev: [...cur, ...ev] });
  });
  toast("Datos importados");
}

function bkJson() {
  return JSON.stringify({ v: 1, ing: C.ing, prod: C.prod, led: C.led, prov: C.prov, cal: C.cal, cfg: C.cfg });
}

function expData() {
  modal(
    "Exportar datos",
    `<p class="mu">Copia este texto y guárdalo, o pégalo en Importar datos de otra instalación.</p><textarea id="bk" rows="8" readonly style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:pre">${esc(bkJson())}</textarea><p style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn" onclick="copyBk()">Copiar texto</button>${STANDALONE ? `<button class="btn s" onclick="dlData()">Descargar archivo</button>` : ""}</p>`,
  );
}

function copyBk() {
  const t = $("#bk"),
    ok = () => toast("Copia copiada");
  t.select();
  try {
    navigator.clipboard.writeText(t.value).then(ok, () => {
      document.execCommand("copy");
      ok();
    });
  } catch (e) {
    document.execCommand("copy");
    ok();
  }
}

function dlData() {
  const b = new Blob([bkJson()], { type: "application/json" }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = "artisan-copia-" + today() + ".json";
  a.click();
}

function impModal() {
  modal(
    "Importar datos",
    `<p class="mu">Pega aquí la copia exportada${STANDALONE ? " o elige el archivo" : ""}. Los registros se agregan a los actuales; si ya existe uno igual, se reemplaza.</p>${STANDALONE ? `<input type="file" accept=".json,application/json" onchange="const f=this.files[0];if(f)f.text().then(t=>$('#bk').value=t)" style="margin-bottom:8px">` : ""}<textarea id="bk" rows="8" placeholder="Pega la copia aquí…"></textarea><p style="margin-top:12px"><button class="btn" onclick="impData()">Importar</button></p>`,
  );
}

function impData() {
  let j;
  try {
    j = JSON.parse($("#bk").value);
  } catch (e) {
    return toast("El texto no es una copia válida");
  }
  let n = 0;
  BKC.forEach((c) =>
    Object.entries(j[c] || {}).forEach(([id, d]) => {
      put(c, id, d);
      n++;
    }),
  );
  if (j.cfg && j.cfg.pred) {
    put("cfg", "pred", j.cfg.pred);
    n++;
  }
  closeM();
  toast(n + " registros importados");
}

function demo() {
  const mk = (name, cat, unit, cost, min, stock) => ({ id: uid(), name, cat, unit, cost, min, stock }),
    ing = [
      mk("Café en grano", "Café", "g", 55, 1500, 6000),
      mk("Leche", "Lácteos", "ml", 4, 6000, 12000),
      mk("Azúcar", "Otros", "g", 3, 1000, 4000),
      mk("Pan", "Panadería", "und", 1200, 15, 45),
      mk("Jamón", "Lácteos", "g", 40, 500, 2000),
      mk("Queso", "Lácteos", "g", 35, 500, 2000),
      mk("Vasos", "Desechables", "und", 150, 50, 300),
    ];
  const L = (n, q) => ({ iid: ing.find((i) => i.name == n).id, qty: q }),
    prod = [
      {
        id: uid(),
        name: "Espresso",
        cat: "Bebidas calientes",
        price: 4500,
        photo: "",
        steps: "Extraer 30 ml en unos 28 segundos.",
        lines: [L("Café en grano", 18), L("Vasos", 1)],
      },
      {
        id: uid(),
        name: "Latte",
        cat: "Bebidas calientes",
        price: 8500,
        photo: "",
        steps: "Espresso doble y leche vaporizada.",
        lines: [L("Café en grano", 18), L("Leche", 200), L("Azúcar", 5), L("Vasos", 1)],
      },
      {
        id: uid(),
        name: "Sándwich",
        cat: "Sándwiches",
        price: 12000,
        photo: "",
        steps: "Pan, jamón y queso a la plancha.",
        lines: [L("Pan", 1), L("Jamón", 40), L("Queso", 30)],
      },
    ];
  const PK = {
    "Café en grano": ["bolsa", 500],
    Leche: ["bolsa", 900],
    Azúcar: ["bolsa", 1000],
    Pan: ["paquete", 12],
    Queso: ["bloque", 500],
    Jamón: ["paquete", 500],
    Vasos: ["paquete", 50],
  };
  ing.forEach((i) => {
    if (PK[i.name]) {
      i.pkn = PK[i.name][0];
      i.pkq = PK[i.name][1];
    }
  });
  const led = {};
  let n = 0;
  const push = (date, e) => {
    (led[date] = led[date] || []).push({
      id: uid(),
      t: new Date(date + "T12:00:00").getTime() + n++,
      date,
      ...e,
    });
  };
  ing.forEach((i) => {
    put("ing", i.id, {
      name: i.name,
      cat: i.cat,
      unit: i.unit,
      cost: i.cost,
      min: i.min,
      pkn: i.pkn || "",
      pkq: i.pkq || 0,
    });
    push(daysAgo(7), { k: "set", iid: i.id, v: i.stock });
  });
  prod.forEach((p) =>
    put("prod", p.id, {
      name: p.name,
      cat: p.cat,
      price: p.price,
      photo: "",
      steps: p.steps,
      lines: p.lines,
    }),
  );
  [
    ["Café Andino S.A.S.", "300 111 2233", "Entrega martes y viernes", ["Café en grano", "Azúcar"]],
    ["Lácteos La Sabana", "310 222 3344", "Pedido mínimo $150.000", ["Leche", "Queso", "Jamón"]],
    ["Panadería El Trigal", "320 333 4455", "Entrega diaria", ["Pan"]],
    ["Insumos Medellín", "315 444 5566", "", ["Vasos"]],
  ].forEach(([n, ph, no, it]) =>
    put("prov", uid(), {
      name: n,
      phone: ph,
      notes: no,
      items: it.map((x) => ing.find((i) => i.name == x).id),
    }),
  );
  for (let d = 6; d >= 0; d--)
    prod.forEach((p, j) => {
      const q = ((d * 3 + j * 2) % 5) + 2,
        u = {};
      p.lines.forEach((l) => (u[l.iid] = l.qty * q));
      push(daysAgo(d), { k: "s", nm: p.name, qty: q, rev: q * p.price, use: u });
    });
  [
    ["Leche", 800, "Caducado", 2],
    ["Pan", 3, "Dañado", 1],
    ["Café en grano", 60, "Derrame", 3],
    ["Leche", 400, "Error de preparación", 4],
  ].forEach(([nm, q, r, d]) => {
    const i = ing.find((x) => x.name == nm);
    push(daysAgo(d), { k: "w", nm, qty: q, reason: r, use: { [i.id]: q } });
  });
  Object.entries(led).forEach(([d, ev]) => put("led", d + "_" + UID, { date: d, uid: UID, ev }));
}
