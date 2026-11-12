/* ===== views.js =====
   Pantallas: lo que se dibuja en cada sección, el menú y la navegación. */

function go(t) {
  ui.tab = t;
  ui.open = "";
  ui.enter = 1;
  draw();
  scrollTo(0, 0);
}

const head = (t, s, a) =>
  `<div class="hd"><div><h1>${t}</h1><p class="mu">${s}${ui.tab == "ayuda" ? "" : ` · <a class="hl" onclick="go('ayuda')">¿Cómo funciona?</a>`}</p></div><div>${a || ""}</div></div>`;

const V = {
  res() {
    if (!S.ing.length && !S.prod.length)
      return (
        head("Bienvenido", "Controla ventas, inventario, proveedores y pedidos en un solo lugar.") +
        `<div class="empty"><p>Registras lo que vendes y los ingredientes se descuentan solos.</p>${OLD() ? `<button class="btn" onclick="importOld()">Importar los datos guardados en este navegador</button>` : ""}<button class="btn" onclick="demo()">Explorar con datos de ejemplo</button><button class="btn g" onclick="go('inv');ingModal()">Crear mi primer ingrediente</button></div>`
      );
    const days = [...Array(7)].map((_, i) => daysAgo(6 - i)),
      dv = days.map((d, i) => ({
        l: new Date(d + "T12:00").toLocaleDateString("es", { weekday: "short" }),
        v: S.sales.filter((s) => s.date == d).reduce((a, s) => a + s.rev, 0),
        hi: i == 6,
      })),
      w7 = S.waste.filter((w) => w.date > daysAgo(7)),
      s7 = S.sales.filter((s) => s.date > daysAgo(7)),
      low = S.ing.filter((p) => p.stock <= p.min),
      by = {},
      top = {};
    w7.forEach((w) => (by[w.reason] = (by[w.reason] || 0) + wsv(w)));
    s7.forEach((s) => (top[s.nm] = (top[s.nm] || 0) + s.qty));
    return (
      head("Resumen", "Así va tu cafetería esta semana") +
      `<div class="qa"><button class="btn" onclick="go('ventas')">Registrar venta</button><button class="btn s" onclick="wasteModal()">Registrar merma</button><button class="btn s" onclick="go('ped')">Hacer pedido</button><button class="btn s" onclick="recModal()">Registrar insumo</button></div><div class="kp"><div class="k"><span class="mu">Ventas de hoy</span><b>${money(dv[6].v)}</b></div><div class="k n"><span class="mu">Ventas 7 días</span><b>${money(dv.reduce((a, x) => a + x.v, 0))}</b></div><div class="k ${low.length ? "w" : "n"}"><span class="mu">Ingredientes bajos</span><b>${low.length}</b></div><div class="k ${w7.length ? "r" : "n"}"><span class="mu">Venta perdida (7 días)</span><b>${money(w7.reduce((a, w) => a + wsv(w), 0))}</b></div></div>
 <div class="g2"><div class="cd"><h2>Ventas por día</h2>${bars(dv)}</div><div class="cd"><h2>Lo más vendido</h2>${hbars(top, (v) => v + " u.")}</div><div class="cd"><h2>Mermas por motivo</h2>${donut(by)}</div>
 <div class="cd"><h2>Por reponer</h2>${
   low.length
     ? low
         .slice(0, 6)
         .map(
           (p) =>
             `<div class="li"><div style="flex:1;min-width:0"><b>${esc(p.name)}</b> ${supChip(p)}${gauge(p)}</div><span class="low qt">${fq(p.stock, p.unit)}</span></div>`,
         )
         .join("") +
       `<button class="btn s" style="margin-top:12px" onclick="go('ped')">Ver pedido por proveedor</button>`
     : `<p class="mu">Todo el inventario está por encima del mínimo.</p>`
 }</div></div>`
    );
  },
  ventas() {
    const l = S.sales.filter((s) => s.date == ui.vd),
      tot = l.reduce((a, s) => a + s.rev, 0);
    return (
      head(
        "Ventas",
        "Toca un producto para sumarlo a la cuenta",
        `<input type="date" value="${ui.vd}" onchange="ui.vd=this.value;draw()" style="width:auto">`,
      ) +
      `<div class="tb2"><input class="se" id="vs" type="search" placeholder="Buscar producto… (Enter agrega el primero)" aria-label="Buscar producto" value="${esc(ui.vq)}" oninput="ui.vq=this.value;$('#vl').innerHTML=ventasList()" onkeydown="if(event.key=='Enter')vEnter()"></div><div id="vl">${ventasList()}</div>` +
      `<div class="cd"><div class="hd" style="margin:0 0 6px"><h2>Vendido el ${ui.vd}</h2><b>${money(tot)}</b></div>${l.map((s) => `<div class="li"><span>${esc(s.nm)} <span class="mu">× ${s.qty}</span></span><span>${money(s.rev)} <button class="btn x" onclick="delSale('${s.id}')">Anular</button></span></div>`).join("") || `<p class="mu">Sin ventas registradas este día.</p>`}</div>`
    );
  },
  inv() {
    const cats = [...new Set(S.ing.map((p) => p.cat))].sort(),
      low = S.ing.filter((p) => p.stock <= p.min).length,
      ch = [["Todas", "Todas"], ...cats.map((c) => [c, c]), ["__low", "Bajo mínimo (" + low + ")"]];
    return (
      head(
        "Inventario",
        "Existencias por ingrediente. La marca vertical de la barra indica el mínimo.",
        `<button class="btn" onclick="ingModal()">+ Ingrediente</button>`,
      ) +
      `<div class="tb2"><input class="se" placeholder="Buscar ingrediente…" aria-label="Buscar ingrediente" value="${esc(ui.q)}" oninput="ui.q=this.value;$('#lst').innerHTML=invList()"><div class="chips">${ch.map(([v, l]) => `<button class="${ui.cat == v ? "on" : ""}" data-c="${esc(v)}" onclick="ui.cat=this.dataset.c;draw()">${esc(l)}</button>`).join("")}</div></div><div id="lst">${invList()}</div>`
    );
  },
  ped() {
    if (!S.ing.length)
      return (
        head("Pedidos", "Pedido por proveedor para la próxima semana") +
        `<div class="empty"><p>Agrega ingredientes para recibir sugerencias.</p><button class="btn" onclick="go('inv')">Ir a Inventario</button></div>`
      );
    const F2 = fcast(),
      kz = { aj: 0, eq: 0.5, ho: 1 }[ui.col],
      { u7, by30 } = cons(),
      U = F2.U,
      up = Math.round((U - 1) * 100);
    const rows = S.ing.map((p) => {
        const q = F2.W.out[p.id] || { base: 0, sd: 0 },
          fc = q.base * U,
          sf = Math.max(p.min, kz * q.sd),
          s0 = Math.max(0, Math.ceil(fc + sf - p.stock));
        return {
          p,
          w: u7[p.id] || 0,
          fc,
          sf,
          wq: fc > 0 ? (p.pkq ? Math.ceil(fc / p.pkq) * p.pkq : Math.ceil(fc)) : 0,
          s: p.pkq && s0 ? Math.ceil(s0 / p.pkq) * p.pkq : s0,
        };
      }),
      g = {};
    rows.forEach((r) => {
      const sp = supOf(r.p.id),
        k = sp ? sp.id : "_";
      (g[k] = g[k] || { sp, rows: [] }).rows.push(r);
    });
    const keys = Object.keys(g).sort((a, b) =>
        a == "_" ? 1 : b == "_" ? -1 : g[a].sp.name.localeCompare(g[b].sp.name),
      ),
      need = rows.filter((r) => r.s > 0),
      nos = need.filter((r) => !supOf(r.p.id)),
      top = F2.st.avg
        .map((v, i) => [v, i])
        .filter((x) => x[0] > 0)
        .sort((a, b) => b[0] - a[0])
        .slice(0, 2)
        .map((x) => WDL[x[1]]);
    return (
      head(
        "Pedidos",
        `Predicción para la próxima semana (${wr()}), agrupada por proveedor`,
        `<button class="btn" onclick="${keys.map((k) => `mkOrder('${k}')`).join(";")}">Generar todos</button>`,
      ) +
      `<div class="cd"><div class="pvh"><h2 style="margin:0">Calendario: esta semana y la próxima</h2><button class="btn s" onclick="calModal()">Ajustes y días especiales</button></div>${[
        0, 1,
      ]
        .map((w) => {
          const u = Math.round((F2.wU[w] - 1) * 100);
          return `<div class="wl">${w ? "Próxima semana" : "Esta semana"}<span class="chp ${u > 0 ? "" : "no"}">${u > 0 ? "+" + u + "% de demanda" : "Demanda normal"}</span></div><div class="wk">${F2.wks[w].map(wcell).join("")}</div>`;
        })
        .join("")}${(() => {
        const u = Math.round((F2.wU[1] - 1) * 100),
          nm = [
            ...new Set(
              F2.wks[1]
                .filter((x) => x.t == "fest" || x.t == "esp")
                .map((x) => x.nm)
                .filter(Boolean),
            ),
          ];
        return u >= 5
          ? `<div class="bn" style="margin-top:10px">Atención: la próxima semana ${nm.length ? "trae " + nm.join(", ") + " y se espera" : "se espera"} ${u}% más demanda.</div>`
          : "";
      })()}<p class="mu">${up > 0 ? `El pedido cubre ${wr()}: se espera <b>${up}% más demanda</b> que una semana normal por festivos, puentes o días especiales.` : `El pedido cubre ${wr()}: no hay festivos ni días especiales, se espera una semana normal.`}${top.length ? ` Tus días más pesados son ${top.join(" y ")}.` : ""}</p><div class="chips" style="margin-top:8px">${[
        ["aj", "Ajustado"],
        ["eq", "Equilibrado"],
        ["ho", "Holgado"],
      ]
        .map(
          ([v, l]) =>
            `<button class="${ui.col == v ? "on" : ""}" onclick="ui.col='${v}';draw()">Colchón: ${l}</button>`,
        )
        .join("")}</div></div>` +
      (F2.st.m
        ? `<div class="cd"><h2>Días pesados: venta promedio por día (últimas 8 semanas)</h2>${bars([1, 2, 3, 4, 5, 6, 0].map((w) => ({ l: WDN[w], v: F2.st.avg[w], hi: top.includes(WDL[w]) })))}</div>`
        : "") +
      `<div class="kp"><div class="k"><span class="mu">Ingredientes por pedir</span><b>${need.length}</b></div><div class="k n"><span class="mu">Proveedores a contactar</span><b>${new Set(need.map((r) => supOf(r.p.id)?.id).filter(Boolean)).size}</b></div><div class="k n"><span class="mu">Costo estimado</span><b>${money(need.reduce((a, r) => a + r.s * r.p.cost, 0))}</b></div><div class="k ${up > 0 ? "w" : "n"}"><span class="mu">Demanda esperada</span><b>${up > 0 ? "+" : ""}${up}%</b></div></div>
 <p class="mu" style="margin-bottom:12px">Pedido = demanda prevista + colchón − stock actual. La demanda parte de tus últimas ${F2.W.nW || 1} semana${F2.W.nW > 1 ? "s" : ""} (las recientes pesan más) y se ajusta por días pesados, festivos y puentes. El colchón cubre cuánto varían tus semanas (o tu stock mínimo, si es mayor): así no pides de más ni te quedas justo.</p>` +
      (nos.length
        ? `<div class="bn">${nos.length} ingrediente${nos.length > 1 ? "s" : ""} por pedir no tiene${nos.length > 1 ? "n" : ""} proveedor. <a class="hl" onclick="go('prov')">Asignar proveedor</a></div>`
        : "") +
      keys
        .map((k) => {
          const x = g[k],
            srt = x.rows.slice().sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name));
          return `<div class="cd" id="pv${k}"><div class="pvh"><div><h2 style="margin:0">${x.sp ? esc(x.sp.name) : "Sin proveedor asignado"}</h2><span class="mu">${x.sp ? esc(x.sp.phone || "Sin contacto") : "Asigna uno en la sección Proveedores"}</span></div><div class="pva"><button class="btn s" onclick="mkOrder('${k}')">Generar pedido</button><button class="btn g" id="cp${k}" onclick="copyOrder('${k}')" disabled>Copiar pedido</button><button class="btn g" onclick="recFromOrder('${k}')">Registrar insumo</button></div></div>
 ${srt
   .map((r) => {
     const p = r.p,
       u = Object.entries(by30[p.id] || {})
         .sort((a, b) => b[1] - a[1])
         .slice(0, 3)
         .map(([n, q]) => `${esc(n)} (${r2(q)} u.)`)
         .join(", ");
     return `<div class="or ${r.s > 0 ? "" : "off"}"><div class="ol"><input type="checkbox" class="oc" data-id="${p.id}" aria-label="Incluir ${esc(p.name)}" ${r.s > 0 ? "checked" : ""} onchange="togOrder(this,'${k}')"><div><b>${esc(p.name)}</b><div class="mu">${u ? "Vendido en 30 días: " + u : "Sin ventas registradas"}</div><input class="onr" placeholder="Notas (opcional)" aria-label="Notas" oninput="refOrder('${k}')"></div></div><div class="os"><div class="st"><span>Gasto 7 días</span><b>${fq(r.w, p.unit)}</b></div><div class="st" title="Demanda ${fq(r.fc, p.unit)} + colchón ${fq(r.sf, p.unit)}"><span>Previsto próxima semana</span><b>${fq(r.fc, p.unit)}</b></div><div class="st"><span>Stock actual</span><b class="${p.stock <= p.min ? "low" : ""}">${fq(p.stock, p.unit)}</b>${r.fc > 0 ? `<small class="mu">alcanza ~${p.stock / r.fc > 8 ? "8+" : String(Math.round((p.stock / r.fc) * 10) / 10).replace(".", ",")} sem.</small>` : ""}</div><label class="st pd"><span>Pedir (${esc(p.unit)})</span><input type="number" step="any" min="0" class="oq" data-id="${p.id}" data-s="${r.s}" data-w="${r.wq}" value="${r.s}" oninput="qtyIn(this,'${k}')">${p.pkq && r.s ? `<small class="mu">≈ ${pl(Math.ceil(r.s / p.pkq), p.pkn || "presentación")}</small>` : ""}</label></div></div>`;
   })
   .join(
     "",
   )}<div class="mu" id="oh${k}" style="display:none;margin-top:10px">Ajusta las cantidades y el pedido se actualiza solo. <a class="hl" onclick="resetOrder('${k}')">Volver al cálculo del sistema</a></div><textarea id="ot${k}" rows="7" readonly style="display:none;margin-top:8px"></textarea></div>`;
        })
        .join("")
    );
  },
  mer() {
    const l = S.waste.filter((w) => ui.wp >= 9999 || w.date > daysAgo(ui.wp)),
      by = {},
      bp = {};
    let tot = 0;
    l.forEach((w) => {
      const c = wsv(w);
      tot += c;
      by[w.reason] = (by[w.reason] || 0) + c;
      bp[w.nm] = (bp[w.nm] || 0) + c;
    });
    return (
      head(
        "Mermas y pérdidas",
        "Qué se pierde, por qué y cuánto dejas de vender",
        `<button class="btn" onclick="wasteModal()">+ Registrar merma</button>`,
      ) +
      `<div class="chips" style="margin-bottom:12px">${[
        [7, "7 días"],
        [30, "30 días"],
        [9999, "Todo"],
      ]
        .map(
          (o) =>
            `<button class="${ui.wp == o[0] ? "on" : ""}" onclick="ui.wp=${o[0]};draw()">${o[1]}</button>`,
        )
        .join("")}</div>
 <div class="kp"><div class="k r"><span class="mu">Venta perdida</span><b>${money(tot)}</b></div><div class="k n"><span class="mu">Registros</span><b>${l.length}</b></div></div>
 <div class="g2"><div class="cd"><h2>Por motivo</h2>${donut(by)}</div><div class="cd"><h2>Lo que más se pierde</h2>${hbars(bp, money)}</div></div>
 <div class="cd"><h2>Historial</h2>${
   l
     .slice()
     .reverse()
     .slice(0, 30)
     .map(
       (w) =>
         `<div class="li"><span>${esc(w.nm)} <span class="mu">× ${w.qty} · ${esc(w.reason)} · ${w.date} · ${money(wsv(w))}</span></span><button class="btn x" onclick="delWaste('${w.id}')">Anular</button></div>`,
     )
     .join("") || `<p class="mu">Sin registros en este periodo.</p>`
 }</div>`
    );
  },
  prod() {
    return (
      head(
        "Productos y recetas",
        "Lo que vendes, su precio y con qué ingredientes se prepara, organizado por categoría",
        `<button class="btn" onclick="prodModal()">+ Producto</button>`,
      ) +
      `<div class="tb2"><input class="se" type="search" placeholder="Buscar producto…" aria-label="Buscar producto" value="${esc(ui.pq)}" oninput="ui.pq=this.value;$('#pl').innerHTML=prodList()"></div><div id="pl">${prodList()}</div>`
    );
  },
  rec() {
    const l = S.recv.slice().reverse();
    return (
      head(
        "Recepciones",
        "Lo que llega de tus proveedores se suma al inventario",
        `<button class="btn" onclick="recModal()">+ Registrar insumo</button>`,
      ) +
      `<div class="cd">${
        l
          .slice(0, 40)
          .map(
            (e) =>
              `<div class="li" style="align-items:flex-start"><div><b>${esc(e.supNm || "Sin proveedor")}</b> <span class="mu">${e.date}</span><div class="mu">${(e.items || []).map((i) => `${esc(i.nm)}: ${esc(i.lbl)} (+${fq(i.q, i.un)})`).join(" · ")}</div>${e.note ? `<div class="mu">${esc(e.note)}</div>` : ""}</div><button class="btn x" onclick="ask('r${e.id}',()=>delRec('${e.id}'))">Anular</button></div>`,
          )
          .join("") ||
        `<div class="empty"><p>Aún no has registrado insumos de proveedores.</p><button class="btn" onclick="recModal()">Registrar insumo</button></div>`
      }</div>`
    );
  },
  prov() {
    const un = S.ing.filter((p) => !supOf(p.id));
    return (
      head(
        "Proveedores",
        "Registra a quién le compras cada ingrediente. Así sabrás a quién pedirle cuando algo baje del mínimo.",
        `<button class="btn" onclick="provModal()">+ Proveedor</button>`,
      ) +
      (un.length && S.prov.length
        ? `<div class="bn">Sin proveedor: ${un
            .slice(0, 8)
            .map((p) => esc(p.name))
            .join(", ")}${un.length > 8 ? "…" : ""}</div>`
        : "") +
      (S.prov.length
        ? `<div class="pg">${S.prov
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((v) => {
              const it = v.items.map(I).filter(Boolean),
                lo = it.filter((p) => p.stock <= p.min).length;
              return `<div class="cd"><div class="pvh"><div><h2 style="margin:0">${esc(v.name)}</h2><span class="mu">${esc(v.phone || "Sin contacto")}</span></div>${lo ? `<span class="pl bd">${lo} por pedir</span>` : `<span class="pl ok">Al día</span>`}</div>${v.notes ? `<p class="mu">${esc(v.notes)}</p>` : ""}<div class="cl">${it.map((p) => `<span class="chp ${p.stock <= p.min ? "lw" : ""}">${esc(p.name)}</span>`).join("") || `<span class="mu">Sin ingredientes asignados</span>`}</div><div class="pva" style="margin-top:12px"><button class="btn s" onclick="provModal('${v.id}')">Editar</button><button class="btn x" onclick="ask('v${v.id}',()=>rm('prov','${v.id}'))">Eliminar</button></div></div>`;
            })
            .join("")}</div>`
        : `<div class="empty"><p>Aún no tienes proveedores.</p><button class="btn" onclick="provModal()">Crear proveedor</button></div>`)
    );
  },
  ayuda() {
    const d = (t, b, o) => `<details class="dt2" ${o ? "open" : ""}><summary>${t}</summary>${b}</details>`;
    return (
      head(
        "Cómo funciona",
        "Guía rápida de ARTISAN CAFÉ. Todos los valores están en pesos colombianos (COP).",
        `<button class="btn s" onclick="tour()">Ver bienvenida</button>`,
      ) +
      `<div class="fl"><div><i>1</i><b>Ingredientes</b><span>Lo que compras: café, leche, pan, vasos. Con unidad, costo y mínimo.</span></div><div><i>2</i><b>Proveedores</b><span>A quién le compras cada ingrediente.</span></div><div><i>3</i><b>Productos y recetas</b><span>Lo que vendes, con precio y receta.</span></div><div><i>4</i><b>Ventas</b><span>Al vender se descuentan los ingredientes de la receta.</span></div><div><i>5</i><b>Pedidos</b><span>Con el gasto del mes calcula qué pedir a cada proveedor.</span></div><div><i>6</i><b>Resumen</b><span>Gráficos, alertas y accesos rápidos.</span></div></div>` +
      d(
        "Primeros pasos (en este orden)",
        `<ol><li>En <b>Inventario</b> crea tus ingredientes con su <b>inventario previo</b>: lo que ya tienes hoy.</li><li>En <b>Proveedores</b> registra a quién le compras y marca los ingredientes de cada uno.</li><li>En <b>Productos</b> crea cada producto con su precio y su receta.</li><li>En <b>Ventas</b> registra lo vendido cada día.</li><li>Cada semana entra a <b>Pedidos</b> y, cuando llegue la mercancía, regístrala en <b>Recepciones</b>.</li></ol>`,
        1,
      ) +
      d(
        "Ingredientes e inventario",
        `<p>Cada ingrediente tiene <b>unidad</b> (g, kg, ml, l, oz, lb o und), <b>stock mínimo</b> y su <b>proveedor</b>. El <b>costo por 1 unidad</b> en COP es opcional y se agrega al editar el ingrediente. Ejemplo: café en g a $55 por g equivale a $55.000 el kilo. El costo se usa para estimar el valor de los pedidos y de las mermas.</p><p>Toca un ingrediente para <b>Fijar</b> (escribir lo que contaste) o <b>Sumar</b> (registrar una compra). Puedes usar otra unidad de la misma familia y se convierte sola.</p><p>La barra muestra lo que queda y la marca vertical es el mínimo. Barra normal: bien. Ámbar: por acabarse. Rojo: en el mínimo o por debajo. La etiqueta junto al nombre indica a qué proveedor pedirle.</p>`,
      ) +
      d(
        "Proveedores",
        `<p>Crea un proveedor con su contacto y marca los ingredientes que le pides. Cada ingrediente tiene un solo proveedor: si lo pasas a otro, se mueve. Así, cuando un ingrediente baja del mínimo, la plataforma sabe a quién pedírselo y los pedidos salen agrupados por proveedor.</p>`,
      ) +
      d(
        "Productos y recetas",
        `<p>La receta dice cuánto de cada ingrediente lleva <b>una</b> unidad vendida. El producto guarda su precio de venta en COP. La foto se recorta cuadrada; con Zoom, Horizontal y Vertical eliges el encuadre.</p><p>Al crear un producto eliges su <b>categoría</b> (Bebidas calientes, Bebidas frías, Panadería…) o creas una nueva. Después puedes cambiarla con el botón <b>Categoría</b> de su tarjeta. Los ingredientes también se agrupan por categoría en el Inventario.</p>`,
      ) +
      d(
        "Ventas",
        `<p>Toca las tarjetas para armar la cuenta y pulsa <b>Registrar venta</b>. Se descuentan los ingredientes de cada receta. El número “disp.” indica cuántas unidades alcanzan con lo que hay. Si te equivocas, <b>Anular</b> devuelve los ingredientes. Puedes cambiar la fecha arriba para registrar un día anterior.</p><p>Usa el <b>buscador</b> para encontrar un producto sin desplazarte (con Enter agregas el primero). Los productos están agrupados por categoría y puedes plegar cada grupo tocando su título.</p>`,
      ) +
      d(
        "Pedidos y predicción",
        `<p>Cada proveedor tiene su tarjeta con sus ingredientes. Por cada uno ves el <b>gasto de 7 días</b>, lo <b>previsto para la próxima semana</b>, el <b>stock actual</b> y el pedido sugerido.</p><p>El <b>calendario</b> muestra esta semana y la próxima, con cada festivo y su festividad, los puentes y las vísperas. Si la próxima semana trae más movimiento, aparece un aviso para que te prepares.</p><p><b>Cómo se calcula:</b> se toman tus últimas 4 semanas (las recientes pesan más) y se ajustan por los <b>días pesados</b> de tus ventas y por los <b>festivos, puentes y vísperas</b> que vienen: en esos días se espera más demanda. Con las ventas de festivos pasados, la plataforma aprende cuánto suben realmente. Además puedes agregar <b>días especiales</b> (ferias, eventos) en <b>Ajustes y días especiales</b>.</p><p><b>Pedido = demanda prevista + colchón − stock actual.</b> El colchón cubre cuánto cambian tus semanas (o tu stock mínimo, si es mayor). Con <b>Ajustado</b> pides lo justo, con <b>Equilibrado</b> un margen moderado y con <b>Holgado</b> más margen. Si ya tienes stock de sobra, no pide. Las cantidades se redondean a presentaciones completas.</p><p>Ajusta cantidades, pulsa <b>Generar pedido</b> y luego <b>Copiar pedido</b> para enviarlo a ese proveedor. Mientras tengas pocas semanas de ventas, la predicción será menos precisa.</p>`,
      ) +
      d(
        "Recepciones: cuando llega un pedido",
        `<p>En <b>Recepciones</b> pulsa <b>Registrar insumo</b>, elige al proveedor y escribe lo que recibiste. Lo que llega <b>se suma</b> a lo que ya tenías: si tienes 104 g de cacao y llegan 2 paquetes de 250 g, el inventario queda en 604 g. Mientras escribes ves cómo quedará.</p><p>Para eso, en cada ingrediente define su <b>presentación de compra</b> (paquete, caja, bolsa…) y cuánto contiene (por ejemplo 250 g). Entonces puedes registrar el insumo en paquetes o en la unidad normal. En Pedidos, las cantidades sugeridas se redondean a presentaciones completas, y desde la tarjeta del proveedor, <b>Registrar insumo</b> carga el pedido ya listo para confirmar. Si te equivocas, <b>Anular</b> resta lo sumado.</p>`,
      ) +
      d(
        "Mermas y pérdidas",
        `<p>Registra lo que se pierde: un ingrediente suelto o un producto ya preparado (se descuentan todos sus ingredientes). Elige el motivo. La pantalla muestra la <b>venta perdida</b>: lo que dejaste de vender, al precio de venta. Si pierdes un producto preparado es cantidad × precio; si pierdes un ingrediente suelto se estima con el producto que más vendes que lo usa (cuántas unidades de ese producto salían con lo perdido). También muestra los motivos más frecuentes y lo que más se pierde. Las mermas también cuentan en el gasto de Pedidos.</p>`,
      ) +
      d(
        "Trabajo en equipo y datos",
        `<p>La información se guarda en una base de datos compartida: lo que registra una persona lo ven las demás. Cada persona necesita acceso de <b>Colaborador</b> o superior para registrar; con acceso de solo ver, la página es de solo lectura. Abajo en el menú aparece el estado de sincronización.</p><p>Cada registro se guarda con la persona que lo hizo, así dos personas pueden vender al mismo tiempo sin pisarse. La unidad de un ingrediente no se puede cambiar una vez creado.</p>`,
      ) +
      d(
        "Cómo se conectan las cosas",
        `<ul><li>Proveedor → Ingredientes: cada ingrediente pertenece a un proveedor.</li><li>Ingrediente → Producto: la receta usa ingredientes.</li><li>Producto → Ventas: vender descuenta sus ingredientes del Inventario.</li><li>Ventas y Mermas → Inventario: ambas bajan las existencias.</li><li>Recepciones → Inventario: lo que llega de cada proveedor se suma a lo que ya tenías.</li><li>Ventas y Mermas → Pedidos: su gasto calcula qué pedir, agrupado por proveedor.</li></ul>`,
      ) +
      `<div class="cd" style="margin-top:12px"><h2>Copia de seguridad</h2><p class="mu">Exporta tus datos para guardarlos o pasarlos a otra instalación, e impórtalos cuando los necesites.</p><div class="pva"><button class="btn s" onclick="expData()">Exportar datos</button><button class="btn s" onclick="impModal()">Importar datos</button></div></div>`
    );
  },
};

const rowHtml = (p) => {
  const st =
      p.stock <= 0
        ? ["Agotado", "bd"]
        : p.stock <= p.min
          ? ["Bajo", "bd"]
          : p.stock <= p.min * 1.5
            ? ["Por acabarse", "wn"]
            : ["Bien", "ok"],
    sp = supOf(p.id);
  return `<div class="rw"><div class="rh" onclick="ui.open=ui.open=='${p.id}'?'':'${p.id}';$('#lst').innerHTML=invList()"><div><b>${esc(p.name)}</b><div class="mu">${esc(p.cat)} · ${sp ? esc(sp.name) : "Sin proveedor"}</div></div>${gauge(p)}<div class="qt"><div class="${p.stock <= p.min ? "low" : ""}">${fq(p.stock, p.unit)}</div><span class="pl ${st[1]}">${st[0]}</span></div></div>${ui.open == p.id ? `<div class="rx"><input type="number" step="any" id="i${p.id}" placeholder="Cantidad" aria-label="Cantidad"><select id="u${p.id}" aria-label="Unidad">${uopts(p.unit)}</select><button class="btn s" onclick="setStock('${p.id}',1)">Fijar</button><button class="btn s" onclick="setStock('${p.id}',0)">Sumar</button><span class="mu">Mín. ${fq(p.min, p.unit)} · $${r2(p.cost)}/${esc(p.unit)}${p.pkq ? ` · ${esc(p.pkn || "presentación")} de ${fq(p.pkq, p.unit)}` : ""}</span><button class="btn s" onclick="editIng('${p.id}')">Editar</button><button class="btn x" onclick="ask('i${p.id}',()=>delIng('${p.id}'))">Eliminar</button></div>` : ""}</div>`;
};

function invList() {
  const q = ui.q.toLowerCase(),
    l = S.ing
      .filter(
        (p) =>
          (ui.cat == "Todas" || (ui.cat == "__low" ? p.stock <= p.min : p.cat == ui.cat)) &&
          p.name.toLowerCase().includes(q),
      )
      .sort(
        (a, b) => (a.stock / (a.min || 1) > 1) - (b.stock / (b.min || 1) > 1) || a.name.localeCompare(b.name),
      );
  if (!l.length)
    return `<div class="cd"><div class="empty"><p>${S.ing.length ? "Nada coincide con tu búsqueda." : "Aún no hay ingredientes."}</p>${S.ing.length ? "" : `<button class="btn" onclick="ingModal()">Crear ingrediente</button>`}</div></div>`;
  const g = {};
  l.forEach((p) => (g[p.cat] = g[p.cat] || []).push(p));
  return Object.keys(g)
    .sort((a, b) => a.localeCompare(b))
    .map((c) => {
      const lw = g[c].filter((p) => p.stock <= p.min).length;
      return secHtml(
        c,
        g[c].length,
        q || ui.cat != "Todas" || !ui.ci[c],
        "togInv",
        g[c].map(rowHtml).join(""),
        lw ? `<span class="pl bd">${lw} por reponer</span>` : "",
      );
    })
    .join("");
}

function tour() {
  modal(
    "Bienvenido a ARTISAN CAFÉ",
    `<p class="mu">Así funciona, en pesos colombianos (COP):</p><ol><li><b>Ingredientes:</b> en Inventario agrega lo que compras, con unidad, costo e inventario previo.</li><li><b>Proveedores:</b> registra a quién le compras cada ingrediente.</li><li><b>Productos:</b> crea lo que vendes, con precio y receta.</li><li><b>Ventas:</b> registra lo vendido y los ingredientes se descuentan solos.</li><li><b>Pedidos:</b> cada semana verás qué pedir a cada proveedor según tu gasto del mes. Cuando llegue, lo registras en <b>Recepciones</b> y se suma al inventario.</li></ol><p style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn" onclick="endTour(0)">Entendido</button><button class="btn g" onclick="endTour(1)">Ver guía completa</button></p>`,
  );
}

function endTour(g) {
  try {
    localStorage.setItem("tour", "1");
  } catch (e) {}
  closeM();
  if (g) go("ayuda");
}

const supChip = (p) => {
  const v = supOf(p.id);
  return v ? `<span class="chp">${esc(v.name)}</span>` : `<span class="chp no">Sin proveedor</span>`;
};

const NAVG = [
    ["", ["res"]],
    ["Operación", ["ventas", "inv", "ped", "rec", "mer"]],
    ["Catálogo", ["prod", "prov"]],
    ["Equipo", ["hor"]],
    ["", ["ayuda"]],
  ],
  SEC = ["rec", "mer", "prod", "prov", "hor", "ayuda"],
  MORE =
    "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='5' cy='12' r='1.3'/><circle cx='12' cy='12' r='1.3'/><circle cx='19' cy='12' r='1.3'/></svg>";

function moreM() {
  modal(
    "Más secciones",
    `<div class="mg2">${SEC.map((id) => {
      const t = TABS.find((x) => x[0] == id);
      return `<button class="mb ${ui.tab == id ? "on" : ""}" onclick="closeM();go('${id}')"><i>${t[2]}</i>${t[1]}</button>`;
    }).join("")}<button class="mb" onclick="closeM();logout()">Cerrar sesión</button></div>`,
  );
}

const secHtml = (c, n, open, fn, inner, extra = "") =>
  `<div class="cd sec ${open ? "" : "col"}"><button class="sh2" data-c="${esc(c)}" onclick="${fn}(this.dataset.c)">${esc(c)}<span class="chp">${n}</span>${extra}<i class="cv"></i></button><div class="sb">${inner}</div></div>`;

const tileHtml = (p) => {
  const a = avail(p),
    q = ui.cart[p.id] || 0;
  return `<div class="tl ${a <= 0 ? "off" : ""} ${q ? "sel" : ""} ${ui.last == p.id ? "bump" : ""}" onclick="add('${p.id}',1)">${p.photo ? `<img src="${p.photo}" alt="" loading="lazy" decoding="async">` : `<div class="ph">${esc((p.name || "?")[0].toUpperCase())}</div>`}<div class="tb"><b>${esc(p.name)}</b><span class="mu">${money(p.price)} · ${a <= 0 ? "sin stock" : "disp. " + a}</span></div>${q ? `<div class="qb"><button aria-label="Quitar uno" onclick="event.stopPropagation();add('${p.id}',-1)">−</button><span>${q}</span><button aria-label="Agregar uno">+</button></div>` : ""}</div>`;
};

const cardHtml = (p) =>
  `<div class="pc">${p.photo ? `<img src="${p.photo}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : `<div class="ph">${esc((p.name || "?")[0].toUpperCase())}</div>`}<div class="tb"><h2 style="margin:0">${esc(p.name)}</h2><p class="pcp">${money(p.price)}</p><pre>${p.lines.map((l) => `${r2(l.qty)} ${esc(I(l.iid)?.unit || "")} ${esc(I(l.iid)?.name || "(eliminado)")}`).join("\n")}</pre>${p.steps ? `<pre>${esc(p.steps)}</pre>` : ""}<div class="pva"><button class="btn s" onclick="catModal('${p.id}')">Categoría</button><button class="btn x" onclick="ask('p${p.id}',()=>delProd('${p.id}'))">Eliminar</button></div></div></div>`;

function byCat(l) {
  const g = {};
  l.forEach((p) => {
    const c = p.cat || "Otros";
    (g[c] = g[c] || []).push(p);
  });
  return g;
}

function ventasList() {
  const q = nrm(ui.vq),
    g = byCat(S.prod.filter((p) => !q || nrm(p.name).includes(q))),
    cats = Object.keys(g).sort((a, b) => a.localeCompare(b));
  if (!cats.length)
    return `<div class="empty"><p>${S.prod.length ? "Ningún producto coincide con “" + esc(ui.vq) + "”." : "Aún no tienes productos con receta."}</p>${S.prod.length ? "" : `<button class="btn" onclick="go('prod');prodModal()">Crear producto</button>`}</div>`;
  return cats
    .map((c) =>
      secHtml(
        c,
        g[c].length,
        q || !ui.cl[c],
        "togSec",
        `<div class="tg">${g[c].map(tileHtml).join("")}</div>`,
      ),
    )
    .join("");
}

function prodList() {
  const q = nrm(ui.pq),
    g = byCat(S.prod.filter((p) => !q || nrm(p.name).includes(q))),
    cats = Object.keys(g).sort((a, b) => a.localeCompare(b));
  if (!cats.length)
    return `<div class="empty"><p>${S.prod.length ? "Ningún producto coincide con “" + esc(ui.pq) + "”." : "Crea tu primer producto con su receta y foto."}</p>${S.prod.length ? "" : `<button class="btn" onclick="prodModal()">Crear producto</button>`}</div>`;
  return cats
    .map((c) =>
      secHtml(
        c,
        g[c].length,
        q || !ui.cp[c],
        "togPro",
        `<div class="pr">${g[c].map(cardHtml).join("")}</div>`,
      ),
    )
    .join("");
}

function draw() {
  if (ui.tab === "hor" && typeof V.hor !== "function") {
    $("#m").innerHTML = '<div class="sk"></div><div class="sk"></div><div class="sk s"></div>';
    loadHorarios()
      .then(() => { if (ui.tab === "hor") draw(); })
      .catch(() => {
        $("#m").innerHTML = '<div class="bn">No se pudo cargar la sección de Horarios. Comprueba tu conexión y vuelve a entrar.</div>';
      });
  }
  const T = Object.fromEntries(TABS.map((t) => [t[0], t]));
  $("#nv").innerHTML =
    `<div class="br">ARTISAN<br>CAFÉ</div>` +
    NAVG.map(
      ([g, ids]) =>
        (g ? `<div class="gl">${g}</div>` : "") +
        ids
          .map(
            (id) =>
              `<button class="${ui.tab == id ? "on" : ""} ${SEC.includes(id) ? "sec" : ""}" onclick="go('${id}')"><i>${T[id][2]}</i>${T[id][1]}</button>`,
          )
          .join(""),
    ).join("") +
    `<button class="more ${SEC.includes(ui.tab) ? "on" : ""}" onclick="moreM()"><i>${MORE}</i>Más</button>`;
  $("#nv").insertAdjacentHTML(
    "beforeend",
    `<div class="sy">${esc(SYNC || "Sincronizado")}</div><button class="lo" onclick="logout()">Cerrar sesión</button>`,
  );
  const page = V[ui.tab];
  $("#m").innerHTML = READY
    ? (CANW
        ? ""
        : `<div class="bn">Modo solo lectura: pide que te den permiso de Colaborador para registrar datos.</div>`) +
      (typeof page === "function"
        ? page()
        : `<div class="sk"></div><div class="sk"></div><div class="sk s"></div>`)
    : `<div class="sk"></div><div class="sk"></div><div class="sk s"></div>`;
  if (READY && !ui.first) {
    ui.first = 1;
    ui.enter = 1;
  }
  if (ui.enter) {
    ui.enter = 0;
    enterFx();
  } else $("#m").classList.remove("enter");
  fab();
  if (READY && !ui.toured) {
    ui.toured = 1;
    let seen = 0;
    try {
      seen = localStorage.getItem("tour");
    } catch (e) {}
    if (!seen) tour();
  }
}

function fab() {
  const e = Object.entries(ui.cart).filter((x) => PR(x[0])),
    el = $("#fab");
  if (ui.tab != "ventas" || !e.length) {
    el.innerHTML = "";
    return;
  }
  const n = e.reduce((a, x) => a + x[1], 0),
    t = e.reduce((a, [k, q]) => a + q * PR(k).price, 0);
  const had = el.children && el.children.length;
  el.innerHTML = `<div class="pill ${had ? "" : "in"}"><span><b>${n}</b> en la cuenta · ${money(t)}</span><button class="btn g" onclick="ui.cart={};draw()">Vaciar</button><button class="btn" onclick="commit()">Registrar venta</button></div>`;
}
