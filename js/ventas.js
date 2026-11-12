/* ===== ventas.js =====
   Acciones de Ventas: cuenta, buscador, registrar y anular. */

function togSec(c) {
  ui.cl[c] = !ui.cl[c];
  $("#vl").innerHTML = ventasList();
}

function vEnter() {
  const q = nrm(ui.vq),
    l = S.prod.filter((p) => q && nrm(p.name).includes(q));
  if (l.length) {
    ui.vq = "";
    $("#vs").value = "";
    add(l[0].id, 1);
  }
}

function add(id, n) {
  const q = Math.max(0, (ui.cart[id] || 0) + n);
  q ? (ui.cart[id] = q) : delete ui.cart[id];
  ui.last = id;
  if ($("#vl")) {
    $("#vl").innerHTML = ventasList();
    fab();
  } else draw();
  setTimeout(() => (ui.last = ""), 80);
}

function commit() {
  const w = new Set(),
    ev = [];
  for (const [k, q] of Object.entries(ui.cart)) {
    const p = PR(k);
    if (!p) continue;
    const u = {};
    p.lines.forEach((l) => (u[l.iid] = (u[l.iid] || 0) + l.qty * q));
    Object.keys(u).forEach((i) => {
      if (I(i) && I(i).stock < u[i]) w.add(I(i).name);
    });
    ev.push({ k: "s", nm: p.name, qty: q, rev: q * p.price, use: u });
  }
  ui.cart = {};
  if (ev.length) emit(ui.vd, ev);
  draw();
  toast(w.size ? "Registrada. Stock insuficiente de: " + [...w].join(", ") : "Venta registrada");
}

function delSale(id) {
  emit(today(), [{ k: "x", ref: id }]);
}
