/* ===== proveedores.js =====
   Acciones de Proveedores: crear, editar y asignar ingredientes. */

function setSup(iid, pid) {
  S.prov.forEach((o) => {
    const has = o.items.includes(iid),
      want = o.id == pid;
    if (has != want)
      put("prov", o.id, {
        name: o.name,
        phone: o.phone || "",
        notes: o.notes || "",
        items: want ? [...o.items, iid] : o.items.filter((i) => i != iid),
      });
  });
}

function provModal(id) {
  if (!S.ing.length) return toast("Primero crea ingredientes");
  const v = id ? PV(id) : { name: "", phone: "", notes: "", items: [] };
  modal(
    id ? "Editar proveedor" : "Nuevo proveedor",
    `<div class="fm"><label class="w2">Nombre del proveedor<input id="vn" value="${esc(v.name)}"></label><label class="w2">Teléfono o contacto<input id="vp" value="${esc(v.phone || "")}"></label><label class="w2">Notas (días de entrega, pedido mínimo…)<input id="vo" value="${esc(v.notes || "")}"></label></div><h2 style="margin-top:14px">Ingredientes que le pides</h2><input placeholder="Buscar ingrediente…" aria-label="Buscar ingrediente" oninput="const q=this.value.toLowerCase();document.querySelectorAll('.pil').forEach(e=>e.style.display=e.dataset.n.includes(q)?'':'none')"><div class="pls">${S.ing
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => {
        const o = supOf(p.id);
        return `<label class="pil" data-n="${esc(p.name.toLowerCase())}"><input type="checkbox" class="pi" value="${p.id}" ${v.items.includes(p.id) ? "checked" : ""}><span>${esc(p.name)}<em class="mu">${o && o.id != id ? " · hoy con " + esc(o.name) : ""}</em></span></label>`;
      })
      .join(
        "",
      )}</div><p class="mu">Si eliges un ingrediente que ya tiene otro proveedor, pasa a este.</p><p style="margin-top:14px"><button class="btn" onclick="saveProv('${id || ""}')">Guardar proveedor</button></p>`,
  );
}

function saveProv(id) {
  const n = $("#vn").value.trim();
  if (!n) return toast("Falta el nombre");
  const items = [...document.querySelectorAll(".pi:checked")].map((x) => x.value),
    pid = id || uid();
  put("prov", pid, { name: n, phone: $("#vp").value.trim(), notes: $("#vo").value.trim(), items });
  S.prov.forEach((o) => {
    if (o.id != pid && o.items.some((i) => items.includes(i)))
      put("prov", o.id, {
        name: o.name,
        phone: o.phone || "",
        notes: o.notes || "",
        items: o.items.filter((i) => !items.includes(i)),
      });
  });
  closeM();
  toast("Proveedor guardado");
}
