/* ===== predict.js =====
   Predicción de pedidos: festivos de Colombia, días pesados, puentes, gasto semanal y venta perdida. */

function wr() {
  const A = new Date(),
    B = new Date();
  A.setDate(A.getDate() + 1);
  B.setDate(B.getDate() + 7);
  const f = (x) => x.toLocaleDateString("es", { day: "numeric", month: "short" });
  return f(A) + " al " + f(B);
}

function cons() {
  const f7 = daysAgo(7),
    f30 = daysAgo(30),
    u7 = {},
    u30 = {},
    by7 = {},
    by30 = {};
  let first = today();
  [...S.sales, ...S.waste].forEach((e) => {
    if (e.date < first) first = e.date;
    if (e.date > f30)
      for (const k in e.use) {
        u30[k] = (u30[k] || 0) + e.use[k];
        if (e.k == "s") (by30[k] = by30[k] || {})[e.nm] = ((by30[k] || {})[e.nm] || 0) + e.qty;
        if (e.date > f7) {
          u7[k] = (u7[k] || 0) + e.use[k];
          if (e.k == "s") (by7[k] = by7[k] || {})[e.nm] = ((by7[k] || {})[e.nm] || 0) + e.qty;
        }
      }
  });
  return {
    u7,
    u30,
    by7,
    by30,
    d: Math.min(30, Math.max(7, Math.round((new Date(today()) - new Date(first)) / 864e5) + 1)),
  };
}

const FN = {
  "2026-01-01": "Año Nuevo",
  "2026-01-12": "Reyes Magos",
  "2026-03-23": "San José",
  "2026-04-02": "Jueves Santo",
  "2026-04-03": "Viernes Santo",
  "2026-05-01": "Día del Trabajo",
  "2026-05-18": "Ascensión del Señor",
  "2026-06-08": "Corpus Christi",
  "2026-06-15": "Sagrado Corazón",
  "2026-06-29": "San Pedro y San Pablo",
  "2026-07-20": "Independencia de Colombia",
  "2026-08-07": "Batalla de Boyacá",
  "2026-08-17": "Asunción de la Virgen",
  "2026-10-12": "Día de la Raza",
  "2026-11-02": "Todos los Santos",
  "2026-11-16": "Independencia de Cartagena",
  "2026-12-08": "Inmaculada Concepción",
  "2026-12-25": "Navidad",
  "2027-01-01": "Año Nuevo",
  "2027-01-11": "Reyes Magos",
  "2027-03-22": "San José",
  "2027-03-25": "Jueves Santo",
  "2027-03-26": "Viernes Santo",
  "2027-05-01": "Día del Trabajo",
  "2027-05-10": "Ascensión del Señor",
  "2027-05-31": "Corpus Christi",
  "2027-06-07": "Sagrado Corazón",
  "2027-07-05": "San Pedro y San Pablo",
  "2027-07-12": "Virgen de Chiquinquirá",
  "2027-07-20": "Independencia de Colombia",
  "2027-08-07": "Batalla de Boyacá",
  "2027-08-16": "Asunción de la Virgen",
  "2027-10-18": "Día de la Raza",
  "2027-11-01": "Todos los Santos",
  "2027-11-15": "Independencia de Cartagena",
  "2027-12-08": "Inmaculada Concepción",
  "2027-12-25": "Navidad",
};

const FS = new Set(Object.keys(FN)),
  DEF = { fest: 15, puen: 20, visp: 10 },
  TG = { fest: "Festivo", puen: "Puente", visp: "Víspera" },
  WDN = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  WDL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  fx = (x) => x.toFixed(2).replace(".", ",");

const addD = (d, n) => {
    const x = new Date(d + "T12:00:00");
    x.setDate(x.getDate() + n);
    return new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  },
  wdOf = (d) => new Date(d + "T12:00:00").getDay();

function dtype(d) {
  if (S.cal.some((x) => x.date == d)) return "esp";
  if (FS.has(d)) return "fest";
  const w = wdOf(d);
  if (
    (w == 6 && (FS.has(addD(d, 2)) || FS.has(addD(d, -1)))) ||
    (w == 0 && (FS.has(addD(d, 1)) || FS.has(addD(d, -2)))) ||
    (w == 1 && FS.has(addD(d, 1))) ||
    (w == 5 && FS.has(addD(d, -1)))
  )
    return "puen";
  return FS.has(addD(d, 1)) || (w == 5 && FS.has(addD(d, 3))) ? "visp" : "n";
}

function revByDay() {
  const r = {};
  S.sales.forEach((s) => (r[s.date] = (r[s.date] || 0) + s.rev));
  return r;
}

function wdStats() {
  const r = revByDay(),
    f = daysAgo(56),
    sum = Array(7).fill(0),
    cnt = Array(7).fill(0);
  Object.entries(r).forEach(([d, v]) => {
    if (d > f && d < today() && dtype(d) == "n") {
      const w = wdOf(d);
      sum[w] += v;
      cnt[w]++;
    }
  });
  const avg = sum.map((v, i) => (cnt[i] ? v / cnt[i] : 0)),
    have = avg.filter((x) => x > 0),
    m = have.length ? have.reduce((a, b) => a + b) / have.length : 0;
  return { avg, m, idx: avg.map((v) => (m && v ? v / m : 1)) };
}

function mult() {
  const r = revByDay(),
    st = wdStats(),
    L = { fest: [], puen: [], visp: [] };
  Object.entries(r).forEach(([d, v]) => {
    if (d >= today()) return;
    const t = dtype(d);
    if (t in L && st.avg[wdOf(d)] > 0) L[t].push(Math.min(2, Math.max(0.6, v / st.avg[wdOf(d)])));
  });
  const o = {};
  ["fest", "puen", "visp"].forEach((t) => {
    const def = 1 + (S.cfg[t] != null ? S.cfg[t] : DEF[t]) / 100,
      a = L[t],
      n = a.length,
      lr = n ? a.reduce((x, y) => x + y) / n : 0;
    o[t] = { n, lr, f: n >= 3 ? lr : n >= 1 ? (lr + def) / 2 : def };
  });
  return o;
}

function weekly() {
  const t0 = new Date(today() + "T12:00:00"),
    wk = {},
    tot = {};
  let first = today();
  [...S.sales, ...S.waste].forEach((e) => {
    if (e.date < first) first = e.date;
    const b = Math.round((t0 - new Date(e.date + "T12:00:00")) / 864e5);
    for (const k in e.use) {
      tot[k] = (tot[k] || 0) + e.use[k];
      if (b >= 0 && b < 28) (wk[k] = wk[k] || [0, 0, 0, 0])[Math.floor(b / 7)] += e.use[k];
    }
  });
  const d = Math.round((t0 - new Date(first + "T12:00:00")) / 864e5) + 1,
    nW = Math.min(4, Math.floor(d / 7)),
    W = [0.4, 0.3, 0.2, 0.1].slice(0, nW),
    out = {};
  S.ing.forEach((p) => {
    const v = (wk[p.id] || [0, 0, 0, 0]).slice(0, nW);
    let base, sd;
    if (!nW) {
      base = ((tot[p.id] || 0) / d) * 7;
      sd = 0.2 * base;
    } else {
      base = v.reduce((a, x, i) => a + x * W[i], 0) / W.reduce((a, b) => a + b);
      const m = v.reduce((a, b) => a + b) / nW;
      sd = nW > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (nW - 1)) : 0.2 * base;
    }
    out[p.id] = { base, sd };
  });
  return { out, nW, d };
}

function nearFest(d) {
  for (const o of [1, 2, 3, -1, -2, -3]) {
    const n = FN[addD(d, o)];
    if (n) return n;
  }
  return "";
}

function dayInfo(d, M, st) {
  const t = dtype(d),
    c = S.cal.find((x) => x.date == d);
  return {
    d,
    t,
    nm: c ? c.name : t == "fest" ? FN[d] || "" : t == "n" ? "" : nearFest(d),
    f: t == "esp" ? 1 + num(c.pct) / 100 : t == "n" ? 1 : M[t].f,
    idx: st.idx[wdOf(d)],
  };
}

function wcell(x) {
  const past = x.d < today();
  return `<div class="wd ${x.t != "n" ? "hot" : ""} ${past ? "past" : ""} ${x.d == today() ? "today" : ""}"><span>${WDN[wdOf(x.d)]}</span><b>${+x.d.slice(8)}</b><i class="tg2">${x.t == "n" ? "" : x.t == "esp" ? "Especial" : TG[x.t]}</i><span class="fn">${esc(x.nm || "")}</span><span class="mu">${x.t == "n" ? "" : "×" + fx(x.f)}</span></div>`;
}

function fcast() {
  const M = mult(),
    st = wdStats(),
    days = [...Array(7)].map((_, i) => dayInfo(addD(today(), i + 1), M, st)),
    U = days.reduce((a, x) => a + x.idx * x.f, 0) / days.reduce((a, x) => a + x.idx, 0),
    mon = addD(today(), -((wdOf(today()) + 6) % 7)),
    wks = [0, 1].map((w) => [...Array(7)].map((_, i) => dayInfo(addD(mon, w * 7 + i), M, st))),
    wU = wks.map((a) => a.reduce((s, x) => s + x.idx * x.f, 0) / a.reduce((s, x) => s + x.idx, 0));
  return { M, st, days, U, wks, wU, W: weekly() };
}

function calModal() {
  const M = mult(),
    up = S.cal.filter((x) => x.date >= today()).sort((a, b) => a.date.localeCompare(b.date)),
    ln = (t, l) =>
      `${l}: ${M[t].n ? `${M[t].n} día${M[t].n > 1 ? "s" : ""} con ventas, ×${fx(M[t].f)}` : `sin datos aún, ×${fx(M[t].f)}`}`;
  modal(
    "Ajustes de predicción",
    `<p class="mu">Estos porcentajes suben la demanda prevista en esos días. Cuando tengas ventas de festivos y puentes pasados, la plataforma las usa para afinar el valor.</p><div class="fm"><label>Festivo (%)<input id="cf" type="number" value="${S.cfg.fest != null ? S.cfg.fest : DEF.fest}"></label><label>Puente (%)<input id="cp" type="number" value="${S.cfg.puen != null ? S.cfg.puen : DEF.puen}"></label><label>Víspera (%)<input id="cv" type="number" value="${S.cfg.visp != null ? S.cfg.visp : DEF.visp}"></label></div><p class="mu">Usado hoy: ${ln("fest", "Festivo")} · ${ln("puen", "Puente")} · ${ln("visp", "Víspera")}</p><p style="margin:10px 0"><button class="btn" onclick="saveCfg()">Guardar porcentajes</button></p><h2 style="margin-top:16px">Días especiales</h2><p class="mu">Ferias, eventos, temporada alta… que no sean festivos.</p><div class="fm"><label>Fecha<input id="sd2" type="date"></label><label>Aumento (%)<input id="sp2" type="number" value="25"></label><label class="w2">Nombre<input id="sn2" placeholder="Feria, evento…"></label></div><p style="margin:8px 0"><button class="btn s" onclick="addCal()">Agregar día especial</button></p>${up.map((x) => `<div class="li"><span>${x.date} · ${esc(x.name || "Especial")} <span class="mu">+${x.pct}%</span></span><button class="btn x" onclick="rm('cal','${x.id}');calModal()">Quitar</button></div>`).join("")}`,
  );
}

function saveCfg() {
  put("cfg", "pred", { fest: num($("#cf").value), puen: num($("#cp").value), visp: num($("#cv").value) });
  closeM();
  toast("Ajustes guardados");
}

function addCal() {
  const d = $("#sd2").value;
  if (!d) return toast("Elige la fecha");
  put("cal", uid(), { date: d, name: $("#sn2").value.trim(), pct: num($("#sp2").value) });
  calModal();
}

function lostVal(k, id, q) {
  if (k == "p") {
    const p = PR(id);
    return p ? q * p.price : 0;
  }
  const c = cons().by30[id] || {},
    ps = S.prod.filter((p) => p.lines.some((l) => l.iid == id));
  if (!ps.length) return 0;
  const p = ps.sort((a, b) => (c[b.name] || 0) - (c[a.name] || 0))[0],
    l = p.lines.find((l) => l.iid == id);
  return (q / l.qty) * p.price;
}

const wsv = (w) => {
  if (w.val != null) return w.val;
  const p = S.prod.find((x) => x.name == w.nm);
  if (p) return w.qty * p.price;
  const id = Object.keys(w.use || {})[0];
  return id ? lostVal("i", id, w.qty) : 0;
};
