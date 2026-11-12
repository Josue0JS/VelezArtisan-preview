/* ===== recepciones.js =====
   Acciones de Recepciones: registrar insumos que llegan de los proveedores y sumarlos al inventario. */

let RC = { date: "", sup: "", note: "", total: "", rows: [] };

const recU = (p) => (p.pkq ? "pk" : p.unit),
  recQty = (r) => {
    const p = I(r.iid),
      n = num(r.q);
    return !p ? 0 : r.u == "pk" ? n * (p.pkq || 1) : conv(n, r.u, p.unit);
  };

const recPrev = (r) => {
  const p = I(r.iid),
    n = recQty(r);
  return n > 0 ? `+${fq(n, p.unit)} → quedará ${fq(p.stock + n, p.unit)}` : `Hay ${fq(p.stock, p.unit)}`;
};

function recOpts(p, r) {
  return (
    (p.pkq
      ? `<option value="pk" ${r.u == "pk" ? "selected" : ""}>${esc(p.pkn || "presentación")} (${r2(p.pkq)} ${esc(p.unit)})</option>`
      : "") +
    (F[p.unit]
      ? Object.keys(F)
          .filter((u) => FAM[u] == FAM[p.unit])
          .map((u) => `<option ${r.u == u ? "selected" : ""}>${u}</option>`)
          .join("")
      : `<option>${esc(p.unit)}</option>`)
  );
}

function recRows() {
  return (
    RC.rows
      .map((r, i) => {
        const p = I(r.iid);
        return p
          ? `<div class="rcr"><div><b>${esc(p.name)}</b><div class="mu" id="rp${i}">${recPrev(r)}</div></div><input type="number" step="any" min="0" value="${esc(r.q)}" aria-label="Cantidad de ${esc(p.name)}" oninput="RC.rows[${i}].q=this.value;$('#rp${i}').textContent=recPrev(RC.rows[${i}])"><select aria-label="Unidad" onchange="RC.rows[${i}].u=this.value;$('#rp${i}').textContent=recPrev(RC.rows[${i}])">${recOpts(p, r)}</select><button class="btn x" aria-label="Quitar" onclick="RC.rows.splice(${i},1);recDraw()">✕</button></div>`
          : "";
      })
      .join("") || `<p class="mu">Elige un proveedor o agrega ingredientes para registrar lo que llegó.</p>`
  );
}

function recDraw() {
  modal(
    "Registrar insumo",
    `<div class="fm"><label>Fecha<input type="date" value="${RC.date}" oninput="RC.date=this.value"></label><label>Proveedor<select onchange="RC.sup=this.value;RC.rows=((PV(this.value)||{items:[]}).items).filter(i=>I(i)).map(i=>({iid:i,q:'',u:recU(I(i))}));recDraw()"><option value="">Sin proveedor</option>${S.prov.map((v) => `<option value="${v.id}" ${RC.sup == v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label></div><div id="rr">${recRows()}</div><label class="mu" style="display:block;margin-top:8px">Agregar otro ingrediente<select onchange="if(this.value){RC.rows.push({iid:this.value,q:'',u:recU(I(this.value))});recDraw()}"><option value="">Elegir…</option>${S.ing
      .filter((p) => !RC.rows.some((r) => r.iid == p.id))
      .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
      .join(
        "",
      )}</select></label><div class="fm" style="margin-top:10px"><label class="w2">Nota (opcional)<input value="${esc(RC.note)}" oninput="RC.note=this.value"></label></div><p style="margin-top:14px"><button class="btn" onclick="saveRec()">Sumar al inventario</button></p>`,
  );
}

function recModal() {
  if (!S.ing.length) return toast("Primero crea ingredientes");
  RC = { date: today(), sup: "", note: "", total: "", rows: [] };
  recDraw();
}

function recFromOrder(k) {
  const rows = [];
  document.querySelectorAll("#pv" + k + " .or").forEach((r) => {
    const c = r.querySelector(".oc"),
      q = num(r.querySelector(".oq").value);
    if (c.checked && q > 0) {
      const p = I(c.dataset.id);
      rows.push(
        p.pkq ? { iid: p.id, q: String(r2(q / p.pkq)), u: "pk" } : { iid: p.id, q: String(q), u: p.unit },
      );
    }
  });
  if (!rows.length) return toast("Selecciona ingredientes en el pedido");
  RC = { date: today(), sup: k == "_" ? "" : k, note: "", total: "", rows };
  recDraw();
}

function saveRec() {
  const items = RC.rows
    .map((r) => {
      const p = I(r.iid),
        n = recQty(r);
      return p && n > 0
        ? {
            iid: p.id,
            nm: p.name,
            q: n,
            un: p.unit,
            lbl: `${r2(num(r.q))} ${r.u == "pk" ? pl(num(r.q), p.pkn || "presentación").replace(/^[\d.,]+ /, "") : r.u}`,
          }
        : null;
    })
    .filter(Boolean);
  if (!items.length) return toast("Escribe al menos una cantidad");
  const sp = PV(RC.sup);
  emit(RC.date || today(), [{ k: "rc", sup: RC.sup, supNm: sp ? sp.name : "", items, note: RC.note.trim() }]);
  closeM();
  toast("Insumo registrado: inventario actualizado");
}

function delRec(id) {
  emit(today(), [{ k: "x", ref: id }]);
}
