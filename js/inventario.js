/* ===== inventario.js =====
   Acciones de Inventario: ingredientes, existencias y categorías. */

function togInv(c) {
  ui.ci[c] = !ui.ci[c];
  $("#lst").innerHTML = invList();
}

function setStock(id, fix) {
  const p = I(id),
    v = $("#i" + id).value;
  if (v === "") return toast("Escribe una cantidad");
  const n = conv(num(v), $("#u" + id).value, p.unit);
  emit(today(), [fix ? { k: "set", iid: id, v: n } : { k: "in", iid: id, v: n }]);
  toast(fix ? "Existencia actualizada" : "Entrada registrada");
}

function ingModal() {
  const cats = [...new Set([...DEFC, ...S.ing.map((p) => p.cat)])].sort();
  modal(
    "Nuevo ingrediente",
    `<div class="fm"><label class="w2">Nombre<input id="pn"></label><label>Categoría<select id="pc" onchange="$('#pcn').style.display=this.value=='__n'?'block':'none'">${cats.map((c) => `<option>${esc(c)}</option>`).join("")}<option value="__n">Nueva categoría…</option></select><input id="pcn" placeholder="Nombre" style="display:none;margin-top:6px"></label><label>Unidad<select id="pu">${Object.keys(
      F,
    )
      .map((u) => `<option>${u}</option>`)
      .join(
        "",
      )}</select></label><label>Stock mínimo<input id="pm" type="number" step="any" value="0"></label><label>Presentación de compra<input id="pkn" list="pkl" placeholder="paquete, caja, bolsa…"><datalist id="pkl"><option>paquete<option>bolsa<option>caja<option>botella<option>bulto<option>lata<option>frasco<option>bloque</datalist></label><label>Contenido de cada una (en la unidad)<input id="pkq" type="number" step="any" placeholder="Ej. 250"></label><label class="w2">Proveedor<select id="pvs"><option value="">Sin proveedor</option>${S.prov.map((v) => `<option value="${v.id}" >${esc(v.name)}</option>`).join("")}</select></label><label class="w2">Inventario previo (en la unidad elegida)<input id="ps" type="number" step="any" value="0"></label></div><p style="margin-top:14px"><button class="btn" onclick="addIng()">Guardar ingrediente</button></p>`,
  );
}

function addIng() {
  const n = $("#pn").value.trim();
  if (!n) return toast("Falta el nombre");
  const id = uid(),
    s0 = num($("#ps").value);
  put("ing", id, {
    name: n,
    cat: ($("#pc").value == "__n" ? $("#pcn").value.trim() : $("#pc").value) || "General",
    unit: $("#pu").value,
    cost: 0,
    min: num($("#pm").value),
    pkn: $("#pkn").value.trim(),
    pkq: num($("#pkq").value),
  });
  if (s0) emit(today(), [{ k: "set", iid: id, v: s0 }]);
  if ($("#pvs").value) setSup(id, $("#pvs").value);
  closeM();
  toast("Ingrediente guardado");
}

function editIng(id) {
  const p = I(id),
    cats = [...new Set([...DEFC, ...S.ing.map((x) => x.cat)])].sort();
  modal(
    "Editar ingrediente",
    `<div class="fm"><label class="w2">Nombre<input id="en" value="${esc(p.name)}"></label><label>Categoría<select id="ec" onchange="$('#ecn').style.display=this.value=='__n'?'block':'none'">${cats.map((c) => `<option ${c == p.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}<option value="__n">Nueva categoría…</option></select><input id="ecn" placeholder="Nombre" style="display:none;margin-top:6px"></label><label>Unidad<input value="${esc(p.unit)}" disabled></label><label>Costo por 1 unidad (COP)<input id="ek" type="number" step="any" value="${p.cost}"></label><label>Stock mínimo<input id="em" type="number" step="any" value="${p.min}"></label><label>Presentación de compra<input id="pkn" list="pkl" value="${esc(p.pkn || "")}" placeholder="paquete, caja, bolsa…"><datalist id="pkl"><option>paquete<option>bolsa<option>caja<option>botella<option>bulto<option>lata<option>frasco<option>bloque</datalist></label><label>Contenido de cada una (en la unidad)<input id="pkq" type="number" step="any" value="${p.pkq || ""}" placeholder="Ej. 250"></label><label class="w2">Proveedor<select id="pvs"><option value="">Sin proveedor</option>${S.prov.map((v) => `<option value="${v.id}" ${supOf(id)?.id == v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label><label class="w2">Existencia actual<input id="es" type="number" step="any" value="${r2(p.stock)}"></label></div><p class="mu">La unidad no se puede cambiar para no alterar el historial. Si te equivocaste, crea el ingrediente de nuevo.</p><p style="margin-top:14px"><button class="btn" onclick="saveIng('${id}')">Guardar cambios</button></p>`,
  );
}

function saveIng(id) {
  const p = I(id),
    n = $("#en").value.trim();
  if (!n) return toast("Falta el nombre");
  put("ing", id, {
    name: n,
    cat: ($("#ec").value == "__n" ? $("#ecn").value.trim() : $("#ec").value) || "General",
    unit: p.unit,
    cost: num($("#ek").value),
    min: num($("#em").value),
    pkn: $("#pkn").value.trim(),
    pkq: num($("#pkq").value),
  });
  const v = num($("#es").value);
  if (Math.abs(v - p.stock) > 1e-9) emit(today(), [{ k: "set", iid: id, v }]);
  setSup(id, $("#pvs").value);
  closeM();
  toast("Ingrediente actualizado");
}

function delIng(id) {
  setSup(id, "");
  rm("ing", id);
  S.prod.forEach((p) => {
    if (p.lines.some((l) => l.iid == id))
      put("prod", p.id, { ...C.prod[p.id], lines: p.lines.filter((l) => l.iid != id) });
  });
}
