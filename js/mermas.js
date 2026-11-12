/* ===== mermas.js =====
   Acciones de Mermas: registrar y anular pérdidas. */

function wasteModal() {
  if (!S.ing.length) return toast("Primero crea ingredientes");
  modal(
    "Registrar merma",
    `<div class="fm"><label class="w2">Qué se perdió<select id="wp"><optgroup label="Ingredientes">${S.ing.map((p) => `<option value="i:${p.id}">${esc(p.name)} (${esc(p.unit)})</option>`).join("")}</optgroup>${S.prod.length ? `<optgroup label="Productos preparados">${S.prod.map((p) => `<option value="p:${p.id}">${esc(p.name)}</option>`).join("")}</optgroup>` : ""}</select></label><label>Cantidad<input id="wq" type="number" min="0" step="any" value="1"></label><label>Fecha<input id="wd" type="date" value="${today()}"></label><label class="w2">Motivo<select id="wr">${MOT.map((m) => `<option>${m}</option>`).join("")}</select></label></div><p style="margin-top:14px"><button class="btn" onclick="addWaste()">Registrar</button></p>`,
  );
}

function addWaste() {
  const [k, id] = $("#wp").value.split(":"),
    q = num($("#wq").value);
  if (q <= 0) return toast("Indica la cantidad");
  let u = {},
    nm;
  if (k == "i") {
    u[id] = q;
    nm = I(id).name;
  } else {
    const p = PR(id);
    nm = p.name;
    p.lines.forEach((l) => (u[l.iid] = (u[l.iid] || 0) + l.qty * q));
  }
  emit($("#wd").value || today(), [
    { k: "w", nm, qty: q, reason: $("#wr").value, use: u, val: Math.round(lostVal(k, id, q)) },
  ]);
  closeM();
  toast("Merma registrada");
}

function delWaste(id) {
  emit(today(), [{ k: "x", ref: id }]);
}
