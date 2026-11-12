/* ===== charts.js =====
   Gráficos: barras, dona, barras horizontales y medidor de stock. */

/* gráficos */

function bars(d) {
  const m = Math.max(1, ...d.map((x) => x.v)),
    w = 300 / d.length;
  return `<svg viewBox="0 0 300 130" class="ch" role="img" aria-label="Ventas por día">${d
    .map((x, i) => {
      const h = (x.v / m) * 80;
      return `<rect x="${i * w + w * 0.17}" y="${100 - h}" width="${w * 0.66}" height="${Math.max(h, 2)}" rx="7" style="--d:${i * 70}ms" class="${x.hi ? "hi" : ""}"><title>${esc(x.l)}: ${money(x.v)}</title></rect><text x="${i * w + w / 2}" y="117" text-anchor="middle">${esc(x.l)}</text>${x.v ? `<text class="vl" x="${i * w + w / 2}" y="${96 - h}" text-anchor="middle">${short(x.v)}</text>` : ""}`;
    })
    .join("")}</svg>`;
}

function donut(o) {
  const e = Object.entries(o).sort((a, b) => b[1] - a[1]),
    tot = e.reduce((a, x) => a + x[1], 0);
  if (!tot) return `<p class="mu">Sin datos todavía</p>`;
  let off = 25;
  return `<div class="dn"><svg viewBox="0 0 42 42" width="140" height="140"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--ln)" stroke-width="5"/>${e
    .map(([k, v], i) => {
      const p = (v / tot) * 100,
        s = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--c${(i % 5) + 1})" stroke-width="5" stroke-dasharray="${p} ${100 - p}" stroke-dashoffset="${off}" style="--d:${i * 120}ms"><title>${esc(k)}: ${money(v)}</title></circle>`;
      off -= p;
      return s;
    })
    .join(
      "",
    )}<text x="21" y="22.4" text-anchor="middle" class="dt">${money(tot)}</text></svg><ul class="lg">${e.map(([k, v], i) => `<li><i style="background:var(--c${(i % 5) + 1})"></i>${esc(k)}<b>${Math.round((v / tot) * 100)}%</b></li>`).join("")}</ul></div>`;
}

function hbars(o, f) {
  const e = Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
    m = Math.max(1e-9, ...e.map((x) => x[1]));
  return (
    e
      .map(
        ([k, v]) =>
          `<div class="hb"><span>${esc(k)}</span><div><i style="width:${(v / m) * 100}%"></i></div><span>${f(v)}</span></div>`,
      )
      .join("") || `<p class="mu">Sin datos todavía</p>`
  );
}

const gauge = (p) => {
  const cap = Math.max(p.min * 3, p.stock, 1),
    pc = Math.max(0, Math.min(100, (p.stock / cap) * 100)),
    st = p.stock <= p.min ? "bd" : p.stock <= p.min * 1.5 ? "wn" : "ok";
  return `<div class="gg"><i class="${st}" style="width:${pc}%"></i><u style="left:${(p.min / cap) * 100}%"></u></div>`;
};
