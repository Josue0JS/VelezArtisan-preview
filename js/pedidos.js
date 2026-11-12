/* ===== pedidos.js =====
   Acciones de Pedidos: generar, ajustar y copiar el pedido por proveedor. */

function buildOrder(k) {
  const box = $("#pv" + k);
  if (!box) return;
  const sp = PV(k),
    L = [...box.querySelectorAll(".or")]
      .filter((r) => r.querySelector(".oc").checked && num(r.querySelector(".oq").value) > 0)
      .map((r) => {
        const p = I(r.querySelector(".oc").dataset.id),
          q = num(r.querySelector(".oq").value);
        return [
          p.name,
          fq(p.stock, p.unit),
          fq(q, p.unit),
          [
            p.pkq ? pl(Math.ceil(q / p.pkq), p.pkn || "presentación") + " de " + fq(p.pkq, p.unit) : "",
            r.querySelector(".onr").value.trim(),
          ]
            .filter(Boolean)
            .join(" · "),
        ];
      }),
    t = $("#ot" + k);
  t.style.display = "block";
  $("#oh" + k).style.display = "block";
  t.value = L.length
    ? `Pedido ARTISAN CAFÉ${sp ? " para " + sp.name : ""}\n\n` +
      tbl([["Producto", "Stock", "Pedido", "Notas"], ...L])
    : "Con tu stock actual y la demanda prevista no hace falta pedir nada de este proveedor. Si quieres pedir algo, escribe la cantidad en el ingrediente.";
  $("#cp" + k).disabled = !L.length;
}

function togOrder(c, k) {
  const r = c.closest(".or"),
    q = r.querySelector(".oq");
  if (c.checked) {
    const a = num(q.dataset.s),
      w = num(q.dataset.w);
    q.value = a > 0 ? a : w;
  } else q.value = 0;
  r.classList.toggle("off", !c.checked);
  refOrder(k);
}

function qtyIn(q, k) {
  const r = q.closest(".or"),
    on = num(q.value) > 0;
  r.querySelector(".oc").checked = on;
  r.classList.toggle("off", !on);
  refOrder(k);
}

function resetOrder(k) {
  const box = $("#pv" + k);
  box.querySelectorAll(".or").forEach((r) => {
    const q = r.querySelector(".oq"),
      v = num(q.dataset.s);
    q.value = v;
    r.querySelector(".oc").checked = v > 0;
    r.classList.toggle("off", !(v > 0));
  });
  buildOrder(k);
}

function mkOrder(k) {
  const box = $("#pv" + k);
  if (!box) return;
  box.dataset.gen = 1;
  buildOrder(k);
}

function refOrder(k) {
  const box = $("#pv" + k);
  if (box && box.dataset.gen) buildOrder(k);
}

function copyOrder(k) {
  const t = $("#ot" + k),
    ok = () => toast("Pedido copiado");
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
