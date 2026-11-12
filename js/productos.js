/* ===== productos.js =====
   Acciones de Productos y recetas: crear, foto, categoría y eliminar. */

function togPro(c) {
  ui.cp[c] = !ui.cp[c];
  $("#pl").innerHTML = prodList();
}

function catModal(id) {
  const p = PR(id),
    cats = pcats();
  modal(
    "Categoría de " + esc(p.name),
    `<div class="fm"><label class="w2">Categoría<select id="mc" onchange="$('#mcn').style.display=this.value=='__n'?'block':'none'">${cats.map((c) => `<option ${c == (p.cat || "Otros") ? "selected" : ""}>${esc(c)}</option>`).join("")}<option value="__n">Nueva categoría…</option></select><input id="mcn" placeholder="Nombre" style="display:none;margin-top:6px"></label></div><p style="margin-top:14px"><button class="btn" onclick="saveCat('${id}')">Guardar</button></p>`,
  );
}

function saveCat(id) {
  const v = $("#mc").value,
    c = (v == "__n" ? $("#mcn").value.trim() : v) || "Otros";
  put("prod", id, { ...C.prod[id], cat: c });
  closeM();
  toast("Categoría actualizada");
}

function prodModal() {
  modal(
    "Nuevo producto",
    `<div class="fm"><label>Nombre<input value="${esc(D.name)}" oninput="D.name=this.value"></label><label>Precio de venta (COP)<input type="number" step="any" value="${esc(D.price)}" oninput="D.price=this.value"></label><label class="w2">Categoría<select onchange="D.cat=this.value;$('#dcn').style.display=this.value=='__n'?'block':'none'"><option value="">Elige…</option>${pcats()
      .map((c) => `<option ${D.cat == c ? "selected" : ""}>${esc(c)}</option>`)
      .join(
        "",
      )}<option value="__n" ${D.cat == "__n" ? "selected" : ""}>Nueva categoría…</option></select><input id="dcn" placeholder="Nombre de la categoría" value="${esc(D.catn)}" oninput="D.catn=this.value" style="display:${D.cat == "__n" ? "block" : "none"};margin-top:6px"></label><label class="w2">Foto<input type="file" accept="image/*" onchange="pickPhoto(this)"></label></div>${D.photo ? `<div class="pvw"><img id="pv" src="${D.photo}" alt=""></div>${IMG ? `<div class="fm"><label>Zoom<input type="range" min="1" max="3" step="0.01" value="${D.z}" oninput="D.z=+this.value;renderPhoto()"></label><label>Horizontal<input type="range" min="0" max="1" step="0.01" value="${D.x}" oninput="D.x=+this.value;renderPhoto()"></label><label class="w2">Vertical<input type="range" min="0" max="1" step="0.01" value="${D.y}" oninput="D.y=+this.value;renderPhoto()"></label></div>` : ""}` : ""}<h2 style="margin-top:16px">Receta por unidad vendida</h2>${S.ing.length ? `<div class="fm" style="grid-template-columns:2fr 1fr 1fr auto;align-items:end"><label>Ingrediente<select id="dl" onchange="$('#du').innerHTML=uopts(I(this.value).unit)">${S.ing.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label><label>Cantidad<input id="dq" type="number" step="any" min="0"></label><label>Unidad<select id="du">${uopts(S.ing[0].unit)}</select></label><button class="btn s" onclick="addLine()">Añadir</button></div>` : `<p class="mu">Primero crea ingredientes.</p>`}${D.lines.map((l, i) => `<div class="li"><span>${r2(l.qty)} ${esc(I(l.iid)?.unit)} · ${esc(I(l.iid)?.name)}</span><button class="btn x" onclick="D.lines.splice(${i},1);prodModal()">Quitar</button></div>`).join("")}<label class="mu" style="display:block;margin-top:10px">Preparación<textarea rows="3" oninput="D.steps=this.value">${esc(D.steps)}</textarea></label><p style="margin-top:14px"><button class="btn" onclick="addProd()">Guardar producto</button></p>`,
  );
}

function addLine() {
  const q = num($("#dq").value);
  if (q <= 0) return toast("Indica la cantidad");
  const i = I($("#dl").value);
  D.lines.push({ iid: i.id, qty: Math.round(conv(q, $("#du").value, i.unit) * 1e4) / 1e4 });
  prodModal();
}

function addProd() {
  if (!D.name.trim()) return toast("Falta el nombre");
  if (!D.lines.length) return toast("Agrega al menos un ingrediente");
  put("prod", uid(), {
    name: D.name.trim(),
    price: num(D.price),
    photo: D.photo,
    steps: D.steps,
    cat: (D.cat == "__n" ? D.catn.trim() : D.cat) || "Otros",
    lines: D.lines,
  });
  D = { name: "", price: "", steps: "", photo: "", cat: "", catn: "", lines: [] };
  IMG = null;
  closeM();
  toast("Producto guardado");
}

function delProd(id) {
  rm("prod", id);
  delete ui.cart[id];
}

let IMG = null;
function renderPhoto() {
  const W = 500,
    H = 500,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, W, H);
  const s = Math.max(W / IMG.width, H / IMG.height) * D.z,
    dw = IMG.width * s,
    dh = IMG.height * s;
  x.drawImage(IMG, (W - dw) * D.x, (H - dh) * D.y, dw, dh);
  D.photo = c.toDataURL("image/jpeg", 0.82);
  const v = $("#pv");
  if (v) v.src = D.photo;
}

function pickPhoto(el) {
  const f = el.files[0];
  if (!f) return;
  const im = new Image(),
    u = URL.createObjectURL(f);
  im.onload = () => {
    IMG = im;
    URL.revokeObjectURL(u);
    D.z = 1;
    D.x = 0.5;
    D.y = 0.5;
    renderPhoto();
    prodModal();
  };
  im.onerror = () => {
    URL.revokeObjectURL(u);
    toast("No se pudo cargar esa imagen");
  };
  im.src = u;
}
