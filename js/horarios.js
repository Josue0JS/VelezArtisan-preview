/* ===== horarios.js =====
   Horarios del equipo (independiente del inventario): equipo y reglas, lectura de novedades escritas,
   generación de la semana siguiente, tabla editable, guardado, copia para Excel e impresión. */

const HDN = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"],
  HDL = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
  HSK = [
    ["srv", "Servicio"],
    ["brr", "Barra"],
    ["bar", "Barismo"],
    ["caj", "Caja"],
  ];

/* Estado de la pantalla: semana mostrada, horario en pantalla, novedades escritas */
const HZ = { start: "", doc: null, notes: "", dirty: 0, tm: null };

/* ---------- Parámetros por defecto (se editan en "Equipo y reglas") ---------- */
/* Turnos: ap = apertura, ci = cierre, int = intermedio. nr = días en que NO puede descansar (0 = lunes). */
const hwDef = () => {
  const A = { e: 10, i: 11, c: 19, s: 20 }, //  entra el equipo, inicia servicio, cierra el local, sale el equipo
    B = { e: 9, i: 10, c: 20, s: 21 };
  return {
    team: [
      { id: "e1", name: "Elvis Carrillo", lid: 1, sk: ["srv", "brr", "bar", "caj"], tp: ["ap", "ci"], nr: [] },
      { id: "e2", name: "Santiago Rodríguez", lid: 0, sk: ["srv"], tp: ["int"], nr: [4, 5] },
      { id: "e3", name: "Josué Lorenzo", lid: 1, sk: ["srv", "brr", "bar", "caj"], tp: ["ap", "ci"], nr: [] },
      { id: "e4", name: "Rosimar Lázaro", lid: 0, sk: ["srv", "brr", "bar", "caj"], tp: ["ap", "ci"], nr: [] },
      { id: "e5", name: "Cesar Tovar", lid: 0, sk: ["srv", "brr", "bar", "caj"], tp: ["ap", "ci"], nr: [] },
      { id: "e6", name: "Gabriel Sanchez", lid: 0, sk: ["srv", "brr", "bar"], tp: ["ap", "ci"], nr: [] },
    ],
    rules: {
      dias: [A, A, A, B, B, B, A], // lunes a domingo
      minHora: 2, //     personas mínimas por hora de servicio
      minPico: 3, //     personas mínimas en horas pico
      picos: "12-14, 17-19",
      minApert: 2, //    personas en la hora de preparación (antes de abrir)
      minCierre: 2, //   personas en la hora de limpieza y cierre
      horasSemana: 45, // horas que se buscan por persona (6 días)
      limiteOrd: 42, //  horas ordinarias de la semana (el resto es extra)
      almuerzo: 30,
      minDia: 4, //      personas mínimas por día
      minCaj: 2, //      personas con caja por día
      minBar: 2, //      personas con barismo por día
      maxCierres: 4, //  cierres por persona en la semana
      domTodos: 1, //    el domingo trabaja todo el equipo
    },
  };
};

function hwCfg() {
  const d = hwDef(),
    c = C.hor && C.hor.cfg;
  if (!c || !Array.isArray(c.team) || !c.team.length) return d;
  const dm = Object.fromEntries(d.team.map((p) => [p.id, p])),
    r = { ...d.rules, ...(c.rules || {}) };
  if (!Array.isArray(r.dias) || r.dias.length != 7 || r.dias.some((x) => !x || x.e == null)) r.dias = d.rules.dias;
  return {
    team: c.team.map((p) => ({
      ...p,
      sk: p.sk || [],
      tp: p.tp || (dm[p.id] && dm[p.id].tp) || ["ap", "ci"],
      nr: p.nr || (dm[p.id] && dm[p.id].nr) || [],
    })),
    rules: r,
  };
}

/* ---------- Utilidades ---------- */
const hwFmt = (n) => (+n).toFixed(1).replace(".", ","),
  hwCap = (s) => s.charAt(0).toUpperCase() + s.slice(1),
  hwNext = () => addD(today(), ((8 - new Date().getDay()) % 7) || 7),
  hwNum = (s) => {
    s = String(s ?? "").trim().replace(",", ".");
    if (s.includes(":")) {
      const [h, m] = s.split(":");
      return +h + (+m || 0) / 60;
    }
    return s === "" ? NaN : parseFloat(s);
  };

function hwTpl(str) {
  const out = [],
    re = /(\d{1,2}(?:[:.,]\d{1,2})?)\s*-\s*(\d{1,2}(?:[:.,]\d{1,2})?)/g;
  let m;
  while ((m = re.exec(String(str || "")))) {
    const a = hwNum(m[1]),
      b = hwNum(m[2]);
    if (b > a && a >= 0 && b <= 24) out.push([a, b]);
  }
  return out;
}

const hwSh = (s) => {
    const m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(s || "");
    return m ? [+m[1], +m[2]] : null;
  },
  hwRng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

function hwPeaks(rl) {
  const s = new Set();
  hwTpl(rl.picos).forEach(([a, b]) => {
    for (let h = Math.floor(a); h < b; h++) s.add(h);
  });
  return s;
}

function hwMinH(rl, pk, h, boost, date) {
  const t = dtype(date),
    b = (boost || 0) + (t == "fest" || t == "puen" ? 1 : 0);
  return Math.max(1, pk.has(h) ? +rl.minPico + b : +rl.minHora);
}

const hwRuns = (hs) => {
  const r = [];
  hs.forEach((h) => {
    const l = r[r.length - 1];
    if (l && l[1] == h) l[1] = h + 1;
    else r.push([h, h + 1]);
  });
  return r.map(([a, b]) => a + ":00–" + b + ":00").join(", ");
};

/* ---------- Lectura de las novedades escritas ---------- */
const HDW = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"],
  HTYPE = { d: "descanso", v: "vacaciones", i: "incapacidad" }, //  d = negro, v = azul claro, i = verde
  HART = { d: "el", v: "las", i: "la" },
  HRANK = { d: 1, v: 2, i: 3 };

const hwLev = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
};

/* "lunes a miércoles", "martes y jueves", "toda la semana" */
function hwDayTxt(ds) {
  if (ds.length >= 7) return "toda la semana";
  ds = [...ds].sort((a, b) => a - b);
  const runs = [];
  ds.forEach((d) => {
    const l = runs[runs.length - 1];
    if (l && l[1] == d - 1) l[1] = d;
    else runs.push([d, d]);
  });
  const parts = runs.map(([a, b]) => (a == b ? HDL[a] : b - a >= 2 ? HDL[a] + " a " + HDL[b] : HDL[a] + " y " + HDL[b]));
  return parts.length > 1 ? parts.slice(0, -1).join(", ") + " y " + parts[parts.length - 1] : parts[0] || "";
}

/* Días que menciona un texto: lunes, "del lunes al miércoles", "hasta el jueves", "desde el viernes", "el 12", "fin de semana" */
function hwDays(t, dates) {
  if (/toda la semana|todos los dias|semana completa/.test(t)) return [0, 1, 2, 3, 4, 5, 6];
  if (/entre semana/.test(t)) return [0, 1, 2, 3, 4];
  if (/fin(es)? de semana/.test(t)) return [5, 6];
  const re = /\b(lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)\b/g,
    ms = [],
    out = [];
  let m;
  while ((m = re.exec(t))) ms.push({ d: HDW.findIndex((x) => m[1].startsWith(x)), i: m.index, e: re.lastIndex });
  for (let k = 0; k < ms.length; k++) {
    const n = ms[k + 1],
      pre = t.slice(Math.max(0, ms[k].i - 14), ms[k].i);
    if (n && /^\s*(al|a|hasta( el)?|-)\s*$/.test(t.slice(ms[k].e, n.i)) && ms[k].d <= n.d) {
      for (let d = ms[k].d; d <= n.d; d++) out.push(d);
      k++;
    } else if (/hasta (el )?$/.test(pre)) for (let d = 0; d <= ms[k].d; d++) out.push(d);
    else if (/desde (el )?$/.test(pre)) for (let d = ms[k].d; d <= 6; d++) out.push(d);
    else out.push(ms[k].d);
  }
  const dr = /\bel (\d{1,2})\b(?!\s*(:|h\b|am|pm|a las))/g;
  while ((m = dr.exec(t))) {
    const i = dates.findIndex((x) => +x.slice(8) == +m[1]);
    if (i >= 0) out.push(i);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function hwHour(h, ap) {
  h = +h;
  if (ap == "pm" && h < 12) h += 12;
  else if (ap == "am" && h == 12) h = 0;
  else if (!ap && h >= 1 && h <= 7) h += 12;
  return h;
}

/* Personas nombradas (tolera una letra de error), agrupadas cuando van juntas: "Cesar y Gabriel" */
function hwGroups(t, names, team) {
  const men = [],
    re = /[a-z]+/g;
  let m;
  while ((m = re.exec(t))) {
    const w = m[0];
    for (const x of names)
      if (w == x.k || (x.k.length >= 5 && w.length >= 4 && !HDW.includes(w) && hwLev(w, x.k) <= 1)) {
        men.push({ p: x.p, i: m.index, e: re.lastIndex });
        break;
      }
  }
  const all = /\b(todos|todo el equipo|todo el personal)\b/.exec(t);
  if (all) return [{ ps: team.slice(), start: all.index, end: all.index + all[0].length }];
  const groups = [];
  men.forEach((x) => {
    const g = groups[groups.length - 1];
    if (g && /^[\s,]*(y|e)?[\s,]*$/.test(t.slice(g.end, x.i))) {
      if (!g.ps.includes(x.p)) g.ps.push(x.p);
      g.end = x.e;
    } else groups.push({ ps: [x.p], start: x.i, end: x.e });
  });
  return groups;
}

function hwParse(text, team, dates) {
  const R = { cons: {}, boost: [0, 0, 0, 0, 0, 0, 0], pref: {}, ok: [], unk: [], warn: [] },
    names = team.map((p) => ({ p, k: nrm(p.name).split(/\s+/)[0] }));
  team.forEach((p) => (R.cons[p.id] = Array.from({ length: 7 }, () => ({}))));
  const TM = "(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?",
    reRange = new RegExp("(?:\\bde |\\bdesde |\\b)" + TM + "\\s*(?:-|a|hasta)\\s*(?:las )?" + TM + "\\b"),
    reSE = new RegExp("(?:entra|entrada|ingresa|ingreso|empieza|inicia|llega|comienza)\\s*(?:a las|a la|a|las)?\\s*" + TM),
    reEE = new RegExp("(?:sale|salida|termina|se va|finaliza)\\s*(?:a las|a la|a|las)?\\s*" + TM),
    reSM = new RegExp("(?:desde las|despues de las|luego de las)\\s*" + TM),
    reEM = new RegExp("(?:hasta las|antes de las)\\s*" + TM),
    tv = (m, o) => hwHour(m[o], m[o + 2]) + (m[o + 1] ? +m[o + 1] / 60 : 0),
    clean = (s) => s.replace(/\bel \d{1,2}\b(?!\s*(:|h\b|am|pm|a las))/g, " ");

  /* Qué dice un texto sobre una persona: tipo de ausencia, horas, abrir/cerrar */
  const act = (t) => {
    const A = { any: false, type: null, pref: false, fixed: null, startEq: null, endEq: null, startMin: null, endMax: null };
    let m;
    const mr = reRange.exec(t);
    if (mr) {
      const a = tv(mr, 1),
        b = tv(mr, 4);
      if (b > a && b <= 24) {
        A.fixed = [a, b];
        t = t.replace(mr[0], " ");
      }
    }
    if ((m = reSE.exec(t))) A.startEq = tv(m, 1);
    if ((m = reEE.exec(t))) A.endEq = tv(m, 1);
    if ((m = reSM.exec(t))) A.startMin = tv(m, 1);
    if ((m = reEM.exec(t))) A.endMax = tv(m, 1);
    A.noClose = /\bno (puede |podra |va a |debe |quiere )?(cerrar|cierre|cierra)\b/.test(t);
    A.noOpen = /\bno (puede |podra |va a |debe |quiere )?(abrir|apertura|abre)\b/.test(t);
    A.open = !A.noOpen && /\b(abre|abrir|apertura|turno de (la )?manana|en la manana|temprano)\b/.test(t);
    A.close = !A.noClose && /\b(cierra|cerrar|cierre|turno de (la )?tarde|en la tarde|en la noche)\b/.test(t);
    if (/\b(incapacidad\w*|incapacitad\w*|enferm\w*|cita medica|reposo|hospital\w*|urgencias)\b/.test(t)) A.type = "i";
    else if (/\b(vacacion\w*|vacas)\b/.test(t)) A.type = "v";
    else if (/\b(descans\w*|libre|permiso|licencia|calamidad|falta|no (trabaja|viene|asiste|labora)|no puede (venir|trabajar|asistir)|ausente|compensatorio)\b/.test(t)) A.type = "d";
    A.pref = /\b(prefiere|quiere|quisiera|le gustaria|pidio|solicito|solicita|pide)\b/.test(t);
    A.any = !!(A.type || A.fixed || A.startEq != null || A.endEq != null || A.startMin != null || A.endMax != null || A.noClose || A.noOpen || A.open || A.close);
    return A;
  };

  const sents = String(text || "")
    .split(/\n|;|\.(?=\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const raw of sents) {
    const t = " " + nrm(raw) + " ",
      all = hwDays(t, dates);
    let handled = false;

    /* Día fuerte o flojo (no necesita nombre) */
    if (all.length && /\b(refuerzo|evento|reserva|grupo grande|dia fuerte|mas gente|mas personal|alta demanda|promocion|lleno)\b/.test(t)) {
      all.forEach((d) => R.boost[d]++);
      R.ok.push({ t: "e", s: "Más gente en horas pico: " + hwDayTxt(all) });
      handled = true;
    } else if (all.length && /\b(poco movimiento|dia flojo|baja demanda|menos gente)\b/.test(t)) {
      all.forEach((d) => R.boost[d]--);
      R.ok.push({ t: "e", s: "Menos gente en horas pico: " + hwDayTxt(all) });
      handled = true;
    }

    const groups = hwGroups(t, names, team);
    if (!groups.length) {
      if (!handled) R.unk.push({ s: raw, why: act(clean(t)).any ? "No encontré el nombre de la persona" : "No la entendí" });
      continue;
    }

    /* Una cláusula por persona o grupo: "Cesar descansa el martes y Gabriel el jueves" */
    const prefix = t.slice(0, groups[0].start),
      pDays = hwDays(prefix, dates);
    let prevType = null,
      got = false;
    groups.forEach((g, gi) => {
      const ct = t.slice(g.start, gi + 1 < groups.length ? groups[gi + 1].start : t.length);
      let days = hwDays(ct, dates);
      if (!days.length) days = pDays;
      let a = act(clean(ct));
      if (!a.any) a = act(clean(prefix));
      if (!a.any && prevType && days.length) a = { any: true, type: prevType, pref: false, fixed: null, startEq: null, endEq: null, startMin: null, endMax: null };
      if (!a.any) return;
      const needDays = a.type || a.fixed || a.startEq != null || a.endEq != null;
      if (needDays && !days.length) {
        R.unk.push({ s: raw, why: "Falta el día (por ejemplo: el martes)" });
        got = true;
        return;
      }
      const ud = days.length ? days : [0, 1, 2, 3, 4, 5, 6],
        dtx = days.length ? " " + hwDayTxt(days) : "";
      for (const p of g.ps) {
        const c = R.cons[p.id],
          nm = p.name.split(" ")[0],
          add = (t2, s) => R.ok.push({ t: t2, s: nm + ": " + s });
        if (a.type == "d" && a.pref) {
          R.pref[p.id] = ud[0];
          add("d", "prefiere descansar el " + HDL[ud[0]] + (ud[0] == 6 ? " (si el domingo trabaja todo el equipo, no se puede)" : ""));
        } else if (a.type) {
          ud.forEach((d) => {
            if (!c[d].off || HRANK[a.type] > HRANK[c[d].off]) c[d].off = a.type;
          });
          add(a.type, HTYPE[a.type] + dtx);
        }
        if (a.fixed) {
          ud.forEach((d) => (c[d].fixed = a.fixed));
          add("h", "de " + hwFmt(a.fixed[0]) + " a " + hwFmt(a.fixed[1]) + dtx);
        }
        if (a.startEq != null) {
          ud.forEach((d) => (c[d].startEq = a.startEq));
          add("h", "entra a las " + hwFmt(a.startEq) + dtx);
        }
        if (a.endEq != null) {
          ud.forEach((d) => (c[d].endEq = a.endEq));
          add("h", "sale a las " + hwFmt(a.endEq) + dtx);
        }
        if (a.startMin != null) {
          ud.forEach((d) => (c[d].startMin = a.startMin));
          add("h", "entra desde las " + hwFmt(a.startMin) + dtx);
        }
        if (a.endMax != null) {
          ud.forEach((d) => (c[d].endMax = a.endMax));
          add("h", "sale hasta las " + hwFmt(a.endMax) + dtx);
        }
        [
          ["noClose", "no cierra"],
          ["noOpen", "no abre"],
          ["open", "abre"],
          ["close", "cierra"],
        ].forEach(([k, l]) => {
          if (a[k]) {
            ud.forEach((d) => (c[d][k] = true));
            add("h", l + dtx);
          }
        });
      }
      prevType = a.type || prevType;
      got = true;
    });
    if (!got && !handled) R.unk.push({ s: raw, why: "Vi el nombre pero no entendí qué cambia (descanso, vacaciones, incapacidad, una hora…)" });
  }

  /* Choques: ausencia y hora el mismo día */
  team.forEach((p) =>
    R.cons[p.id].forEach((c, d) => {
      if (c.off && (c.fixed || c.startEq != null || c.endEq != null || c.startMin != null || c.endMax != null || c.open || c.close))
        R.warn.push(p.name.split(" ")[0] + ": el " + HDL[d] + " tiene " + HTYPE[c.off] + " y también una hora; se respeta " + HART[c.off] + " " + HTYPE[c.off]);
    }),
  );
  return R;
}

/* ---------- Revisión de un horario (avisos) ---------- */
function hwCheck(cells, boost, cfg, dates) {
  const { team, rules: rl } = cfg,
    pk = hwPeaks(rl),
    W = [];
  for (let d = 0; d < 7; d++) {
    const D = rl.dias[d],
      sh = team.map((p) => hwSh((cells[p.id] || [])[d])),
      iss = {},
      at = (h) => team.filter((p, k) => sh[k] && sh[k][0] <= h && sh[k][1] >= h + 1);
    if (!sh.some(Boolean)) {
      W.push(hwCap(HDL[d]) + ": no hay nadie programado");
      continue;
    }
    for (let h = D.i; h < D.c; h++) {
      const on = at(h),
        need = hwMinH(rl, pk, h, boost[d], dates[d]),
        add = (m) => (iss[m] = iss[m] || []).push(h);
      if (on.length < need) add("menos de " + need + " personas");
      if (!on.some((p) => p.sk.includes("caj"))) add("sin nadie en caja");
      if (!on.some((p) => p.sk.includes("bar"))) add("sin nadie en barismo");
    }
    for (const m in iss) W.push(hwCap(HDL[d]) + " " + hwRuns(iss[m]) + ": " + m);
    if (!team.some((p, k) => sh[k] && p.lid)) W.push(hwCap(HDL[d]) + ": no hay ningún líder programado");
    if (at(D.e).length < +rl.minApert)
      W.push(hwCap(HDL[d]) + " " + D.e + ":00–" + D.i + ":00 (preparación): menos de " + rl.minApert + " personas");
    if (at(D.c).length < +rl.minCierre)
      W.push(hwCap(HDL[d]) + " " + D.c + ":00–" + D.s + ":00 (limpieza y cierre): menos de " + rl.minCierre + " personas");
    team.forEach((p, k) => {
      if (sh[k] && sh[k][1] - sh[k][0] > 10)
        W.push(hwCap(HDL[d]) + ": " + p.name.split(" ")[0] + " tiene más de 10 horas");
    });
  }
  return W.slice(0, 14);
}

/* ---------- Generación ---------- */
function hwGen(seed) {
  const cfg = hwCfg(),
    team = cfg.team,
    rl = cfg.rules,
    DY = rl.dias,
    n = team.length,
    start = HZ.start,
    dates = [...Array(7)].map((_, i) => addD(start, i)),
    P = hwParse(HZ.notes, team, dates),
    rnd = hwRng(seed),
    pk = hwPeaks(rl),
    warns = [];

  /* 1) Día de descanso de cada persona (rotativo; respeta los días en que alguien no puede descansar) */
  const restsOf = (doc) => {
      const r = {};
      if (doc)
        team.forEach((p) => {
          const a = (doc.cells || {})[p.id];
          if (a) {
            const i = a.slice(0, 6).findIndex((x) => !x);
            if (i >= 0) r[p.id] = i;
          }
        });
      return r;
    },
    prevRest = restsOf(C.hor && C.hor["w_" + addD(start, -7)]),
    prev2 = restsOf(C.hor && C.hor["w_" + addD(start, -14)]),
    offFix = team.map((p) => P.cons[p.id].map((c) => !!c.off)),
    need = team.map((p, k) => k).filter((k) => !offFix[k].some(Boolean)),
    maxD = rl.domTodos ? 6 : 7,
    allD = [...Array(maxD).keys()],
    allowed = need.map((k) => {
      const a = allD.filter((d) => !team[k].nr.includes(d));
      return a.length ? a : allD;
    }),
    cur = Array(n).fill(-1);
  let bestR = null,
    bestRS = 1e18;
  const restScore = () => {
    let s = 0;
    const cnt = [];
    for (let d = 0; d < 7; d++) {
      const w = team.filter((p, k) => !offFix[k][d] && cur[k] != d);
      cnt.push(w.length);
      if (w.length < +rl.minDia) s += 800 * (+rl.minDia - w.length);
      if (!w.some((p) => p.lid)) s += 1000;
      if (w.filter((p) => p.sk.includes("caj")).length < +rl.minCaj) s += 500;
      if (w.filter((p) => p.sk.includes("bar")).length < +rl.minBar) s += 500;
      if (w.filter((p) => p.tp.includes("ap") || !p.tp.length).length < +rl.minApert) s += 400;
      if (w.filter((p) => p.tp.includes("ci") || !p.tp.length).length < +rl.minCierre) s += 400;
    }
    const used = cnt.slice(0, maxD),
      mean = used.reduce((a, b) => a + b, 0) / used.length;
    s += used.reduce((a, c) => a + (c - mean) ** 2, 0) * 40;
    need.forEach((k) => {
      const id = team[k].id,
        cc = P.cons[id][cur[k]] || {};
      if (cc.fixed || cc.startEq != null || cc.endEq != null) s += 600;
      if (P.pref[id] != null && cur[k] != P.pref[id]) s += 25;
      if (prevRest[id] != null) {
        if (cur[k] == prevRest[id]) s += 70;
        else if (cur[k] == (prevRest[id] + 1) % maxD) s -= 10;
      }
      if (prev2[id] != null && cur[k] == prev2[id]) s += 30;
    });
    return s + rnd() * 4;
  };
  const rec = (j) => {
    if (j == need.length) {
      const s = restScore();
      if (s < bestRS) {
        bestRS = s;
        bestR = cur.slice();
      }
      return;
    }
    for (const d of allowed[j]) {
      cur[need[j]] = d;
      rec(j + 1);
    }
    cur[need[j]] = -1;
  };
  rec(0);
  const rest = bestR || cur,
    works = team.map((p, k) => [...Array(7)].map((_, d) => !offFix[k][d] && rest[k] != d));

  /* 2) Turnos posibles: apertura, cierre o intermedio según la persona y el día */
  const types = (k, d) => {
      const D = DY[d],
        tp = team[k].tp.length ? team[k].tp : ["ap", "ci", "int"],
        o = [];
      if (tp.includes("ap")) o.push([D.e, D.e + 8], [D.e, D.e + 7]);
      if (tp.includes("ci")) o.push([D.s - 8, D.s], [D.s - 7, D.s]);
      if (tp.includes("int"))
        for (const len of [8, 7]) for (let s = D.e + 1; s + len <= D.s - 1; s++) o.push([s, s + len]);
      return o;
    },
    okc = (c, i, o, D) =>
      (c.startEq == null || i == c.startEq) &&
      (c.endEq == null || o == c.endEq) &&
      (c.startMin == null || i >= c.startMin) &&
      (c.endMax == null || o <= c.endMax) &&
      (!c.noClose || o < D.s) &&
      (!c.noOpen || i > D.e) &&
      (!c.open || i <= D.e) &&
      (!c.close || o >= D.s),
    cand = (k, d) => {
      const c = P.cons[team[k].id][d],
        D = DY[d];
      if (c.fixed) return [c.fixed];
      let L = types(k, d).filter(([i, o]) => okc(c, i, o, D));
      if (!L.length) {
        const g = [];
        for (const h of [8, 7]) {
          if (c.startEq != null) g.push([c.startEq, c.startEq + h]);
          else if (c.endEq != null) g.push([c.endEq - h, c.endEq]);
          else for (let i = D.e; i <= D.s - h; i++) g.push([i, i + h]);
        }
        L = g.filter(([i, o]) => i >= 0 && o <= 24 && okc(c, i, o, D));
        if (!L.length) {
          L = types(k, d);
          warns.push("No pude cumplir una novedad de " + team[k].name.split(" ")[0] + " el " + HDL[d]);
        }
      }
      return L;
    },
    CA = team.map((p, k) => works[k].map((w, d) => (w ? cand(k, d) : null)));

  /* 3) Búsqueda del mejor reparto de turnos */
  const minH = dates.map((dt, d) => {
      const a = {};
      for (let h = DY[d].i; h < DY[d].c; h++) a[h] = hwMinH(rl, pk, h, P.boost[d], dt);
      return a;
    }),
    flex = team.map((p) => p.tp.includes("ap") && p.tp.includes("ci")),
    perDay = +rl.horasSemana / 6,
    score = (A) => {
      let s = 0;
      for (let d = 0; d < 7; d++) {
        const D = DY[d],
          side = [];
        let pc = 0,
          cc = 0,
          lead = false;
        for (let k = 0; k < n; k++) {
          const x = A[k][d];
          if (!x) continue;
          if (x[0] <= D.e && x[1] >= D.e + 1) pc++;
          if (x[0] <= D.c && x[1] >= D.c + 1) cc++;
          if (team[k].lid) {
            const op = x[0] <= D.e,
              cl = x[1] >= D.s;
            if (op || cl) lead = true;
            side.push(op ? "a" : cl ? "c" : "i");
          }
        }
        if (side.length && !lead) s += 120;
        if (side.length > 1 && side[0] != "i" && side.every((v) => v == side[0])) s += 60;
        if (pc < +rl.minApert) s += 250 * (+rl.minApert - pc);
        if (cc < +rl.minCierre) s += 250 * (+rl.minCierre - cc);
        for (let h = D.i; h < D.c; h++) {
          let c = 0,
            cj = 0,
            br = 0;
          for (let k = 0; k < n; k++) {
            const x = A[k][d];
            if (x && x[0] <= h && x[1] >= h + 1) {
              c++;
              if (team[k].sk.includes("caj")) cj++;
              if (team[k].sk.includes("bar")) br++;
            }
          }
          const m = minH[d][h];
          if (c < m) s += 300 * (m - c);
          else if (c > m + 2) s += 6 * (c - m - 2);
          if (!cj) s += 400;
          if (!br) s += 400;
        }
      }
      const cl = [],
        op = [];
      for (let k = 0; k < n; k++) {
        let H = 0,
          nw = 0,
          c = 0,
          o = 0;
        for (let d = 0; d < 7; d++) {
          const x = A[k][d];
          if (!x) continue;
          nw++;
          H += x[1] - x[0];
          if (x[1] >= DY[d].s) c++;
          if (x[0] <= DY[d].e) o++;
          const y = A[k][d + 1];
          if (y && x[1] >= DY[d].s && y[0] <= DY[d + 1].e) s += 15;
        }
        s += 500 * Math.abs(H - perDay * nw);
        if (c > +rl.maxCierres) s += 80 * (c - +rl.maxCierres);
        if (flex[k]) {
          cl.push(c);
          op.push(o);
        }
      }
      const vr = (a, w) => {
        const m = a.reduce((x, y) => x + y, 0) / (a.length || 1);
        return a.reduce((x, y) => x + (y - m) ** 2, 0) * w;
      };
      return s + vr(cl, 10) + vr(op, 6);
    };
  let bestA = null,
    bestS = 1e18;
  const slots = [];
  CA.forEach((r, k) =>
    r.forEach((L, d) => {
      if (L && L.length > 1) slots.push([k, d]);
    }),
  );
  for (let r = 0; r < 10; r++) {
    const A = CA.map((row) => row.map((L) => (L ? L[Math.floor(rnd() * L.length)] : null)));
    let cs = score(A);
    for (let it = 0; it < 500 && slots.length; it++) {
      const [k, d] = slots[Math.floor(rnd() * slots.length)];
      let bc = A[k][d],
        bs = cs;
      for (const c of CA[k][d]) {
        A[k][d] = c;
        const s = score(A);
        if (s < bs || (s == bs && rnd() < 0.3)) {
          bs = s;
          bc = c;
        }
      }
      A[k][d] = bc;
      cs = bs;
    }
    if (cs < bestS) {
      bestS = cs;
      bestA = A.map((row) => row.slice());
    }
  }
  const out = {},
    off = (p, d) => ({ v: "V", i: "I" })[P.cons[p.id][d].off] || "";
  team.forEach((p, k) => (out[p.id] = bestA[k].map((x, d) => (x ? x[0] + "-" + x[1] : off(p, d)))));
  return {
    start,
    cells: out,
    notes: HZ.notes,
    boost: P.boost,
    ok: P.ok,
    unk: P.unk,
    pre: [...P.warn, ...warns],
    t: Date.now(),
  };
}

/* ---------- Totales ---------- */
function hwTot(cfg, row) {
  const tot = (row || []).reduce((a, s) => {
      const x = hwSh(s);
      return a + (x ? x[1] - x[0] : 0);
    }, 0),
    lim = +cfg.rules.limiteOrd;
  return { tot, s: Math.min(tot, lim), zo: Math.max(0, tot - lim) };
}

/* ---------- Pantalla ---------- */
const hwWeekLabel = (st) => {
  const f = (d) => new Date(d + "T12:00").toLocaleDateString("es", { day: "2-digit", month: "short" }).replace(".", "").toUpperCase();
  return f(st) + " - " + f(addD(st, 6));
};

function hwLoad() {
  const s = C.hor && C.hor["w_" + HZ.start];
  HZ.doc = s ? JSON.parse(JSON.stringify(s)) : null;
  HZ.notes = s ? s.notes || "" : "";
  HZ.dirty = 0;
}

function hwWarnHtml() {
  if (!HZ.doc) return "";
  const cfg = hwCfg(),
    dates = [...Array(7)].map((_, i) => addD(HZ.start, i)),
    w = [...(HZ.doc.pre || []), ...hwCheck(HZ.doc.cells, HZ.doc.boost || [0, 0, 0, 0, 0, 0, 0], cfg, dates)];
  return w.length
    ? `<h2>Para revisar</h2><ul class="hz-ul">${w.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
    : `<p class="mu">Sin avisos: cada hora tiene gente suficiente, caja y barismo cubiertos.</p>`;
}

/* Cómo se ve cada celda: turno (verde), descanso (negro), vacaciones (azul claro), incapacidad (verde semi claro) */
const hwCV = (c) => {
  const s = hwSh(c);
  if (s) return { cls: "hz-on", i: hwFmt(s[0]), o: hwFmt(s[1]), h: s[1] - s[0] };
  if (c === "V") return { cls: "hz-vac", i: "VAC", o: "", h: 0 };
  if (c === "I") return { cls: "hz-inc", i: "INC", o: "", h: 0 };
  return { cls: "hz-off", i: "", o: "", h: 0 };
};

function hwTable(doc, cfg) {
  const team = cfg.team,
    dates = [...Array(7)].map((_, i) => addD(doc.start, i)),
    dh = (d) => {
      const t = dtype(dates[d]),
        tag = t == "fest" ? "Festivo" : t == "puen" ? "Puente" : "";
      return `<th colspan="3" class="${d == 6 ? "hz-dom" : ""}">${HDN[d]}<b>${+dates[d].slice(8)}</b>${tag ? `<small>${tag}</small>` : ""}</th>`;
    };
  return `<div class="hz-info"><span><b>PDV</b> ${team.length - 1} PAX</span><span><b>Tiempo de almuerzo</b> ${esc(cfg.rules.almuerzo)} min</span><span><b>Semana</b> ${hwWeekLabel(doc.start)}</span></div>
<div class="hz-wrap"><table class="hz"><thead><tr><th rowspan="2" class="hz-nm">Empleado</th>${[0, 1, 2, 3, 4, 5, 6].map(dh).join("")}<th colspan="4" class="hz-dom">TOTAL HORAS</th></tr>
<tr>${[0, 1, 2, 3, 4, 5, 6].map((d) => `<th>Ingreso</th><th>Salida</th><th>#horas</th>`).join("")}<th class="hz-dom">Semana</th><th class="hz-dom">S</th><th class="hz-dom">ZO</th><th class="hz-dom">NA</th></tr></thead><tbody>${team
    .map((p) => {
      const row = doc.cells[p.id] || Array(7).fill(""),
        t = hwTot(cfg, row);
      return `<tr><th class="hz-nm">${esc(p.name)}</th>${row
        .map((c, d) => {
          const v = hwCV(c),
            k = p.id + "_" + d;
          return `<td class="${v.cls}"><input id="hz_i_${k}" value="${v.i}" inputmode="decimal" aria-label="Ingreso ${esc(p.name)} ${HDL[d]}" onchange="hwEdit('${p.id}',${d},0)"></td><td class="${v.cls}"><input id="hz_o_${k}" value="${v.o}" inputmode="decimal" aria-label="Salida ${esc(p.name)} ${HDL[d]}" onchange="hwEdit('${p.id}',${d},1)"></td><td id="hz_h_${k}">${hwFmt(v.h)}</td>`;
        })
        .join("")}<td class="hz-tt" id="hz_t_${p.id}">${hwFmt(t.tot)}</td><td id="hz_s_${p.id}">${hwFmt(t.s)}</td><td id="hz_z_${p.id}">${hwFmt(t.zo)}</td><td>0,0</td></tr>`;
    })
    .join("")}</tbody></table></div>
<div class="hz-lg"><span><i class="hz-d hz-d-h2"></i>Turno</span><span><i class="hz-d hz-d-d"></i>Descanso</span><span><i class="hz-d hz-d-v"></i>Vacaciones</span><span><i class="hz-d hz-d-i"></i>Incapacidad</span></div>`;
}

const hwItem = (x) => (typeof x == "string" ? { t: "h", s: x } : x),
  hwDot = (t) => `<i class="hz-d hz-d-${t}"></i>`;

const HGUIDE = `<details class="hz-gd"><summary>¿Qué frases entiende?</summary>
<div class="hz-gl"><p><span class="hz-d hz-d-d"></span><b>Descanso</b> (negro): <i>Cesar descansa el martes</i> · <i>Gabriel libre el jueves</i> · <i>Rosimar permiso el viernes</i> · <i>Josué prefiere descansar el sábado</i></p>
<p><span class="hz-d hz-d-v"></span><b>Vacaciones</b> (azul claro): <i>Elvis vacaciones del lunes al miércoles</i> · <i>Cesar de vacaciones toda la semana</i> · <i>Gabriel vacaciones desde el jueves</i></p>
<p><span class="hz-d hz-d-i"></span><b>Incapacidad</b> (verde semi claro): <i>Josué incapacidad hasta el jueves</i> · <i>Rosimar enferma viernes y sábado</i> · <i>Cesar cita médica el martes</i></p>
<p><span class="hz-d hz-d-h"></span><b>Horas</b>: <i>Gabriel entra a las 14 el viernes</i> · <i>Cesar sale a las 18 el lunes</i> · <i>Rosimar de 10 a 18 el sábado</i> · <i>Josué desde las 12</i> · <i>Elvis hasta las 17</i></p>
<p><span class="hz-d hz-d-h"></span><b>Abrir o cerrar</b>: <i>Josué no puede cerrar el jueves</i> · <i>Cesar no abre</i> · <i>Elvis abre el lunes</i> · <i>Rosimar cierra el viernes</i></p>
<p><span class="hz-d hz-d-e"></span><b>Demanda</b>: <i>Evento el sábado, más gente</i> · <i>Lunes día flojo</i></p>
<p class="mu">Puedes juntar varias personas: <i>Cesar y Gabriel descansan el martes</i> o <i>Cesar descansa el martes y Gabriel el jueves</i>. Si falta el día, el sistema te lo dice. Una novedad por renglón.</p></div></details>`;

V.hor = function () {
  const cfg = hwCfg(),
    nxt = hwNext();
  if (!HZ.start) HZ.start = nxt;
  if (!HZ.doc && !HZ.dirty && C.hor && C.hor["w_" + HZ.start]) hwLoad();
  const lb = HZ.start == nxt ? "Próxima semana" : HZ.start < nxt ? "Semana anterior" : "Semana más adelante",
    doc = HZ.doc,
    ex = `Ejemplo:\nCesar descansa el martes\nElvis vacaciones del lunes al miércoles\nJosué incapacidad hasta el jueves\nGabriel entra a las 14 el viernes\nRosimar de 10 a 18 el sábado\nEvento el sábado, más gente`,
    oks = (doc && doc.ok ? doc.ok : []).map(hwItem),
    unk = (doc && doc.unk ? doc.unk : []).map((x) => (typeof x == "string" ? { s: x, why: "" } : x));
  return (
    head(
      "Horarios",
      `${lb} · ${hwWeekLabel(HZ.start)}`,
      `<button class="btn" onclick="hwRun()">Generar horario</button> <button class="btn s" onclick="hwTeamModal()">Equipo y reglas</button>`,
    ) +
    `<div class="hz-nav hz-np"><button class="btn s" onclick="hwWeek(-7)">‹ Semana anterior</button>${HZ.start != nxt ? `<button class="btn g" onclick="hwWeek(0)">Ir a la próxima semana</button>` : ""}<button class="btn s" onclick="hwWeek(7)">Semana siguiente ›</button></div>` +
    `<div class="cd hz-np"><h2>Novedades y parámetros de esta semana</h2><p class="mu">Escribe lo que cambia esta semana: descansos, vacaciones, incapacidades, horas de entrada o salida, quién no puede abrir o cerrar, días con evento. Una novedad por renglón.</p><textarea id="hzn" rows="5" placeholder="${esc(ex)}" oninput="HZ.notes=this.value;HZ.dirty=1">${esc(HZ.notes)}</textarea>${HGUIDE}<p style="margin-top:12px"><button class="btn" onclick="hwRun()">${doc ? "Generar de nuevo" : "Generar horario"}</button></p></div>` +
    (doc
      ? `${
          oks.length || unk.length
            ? `<div class="cd hz-np"><h2>Lo que entendí de las novedades</h2>${oks.length ? `<ul class="hz-ul hz-ok">${oks.map((x) => `<li>${hwDot(x.t)}${esc(x.s)}</li>`).join("")}</ul>` : ""}${unk.length ? `<p class="mu" style="margin-top:8px">No pude aplicar estas (corrígelas y vuelve a generar):</p><ul class="hz-ul hz-bad">${unk.map((x) => `<li>${esc(x.s)}${x.why ? ` <small>— ${esc(x.why)}</small>` : ""}</li>`).join("")}</ul>` : ""}</div>`
            : ""
        }<div class="cd"><div class="pvh hz-np"><h2 style="margin:0">Horario de la semana</h2><span class="hz-bt"><button class="btn" onclick="hwSave()">${HZ.dirty ? "Guardar horario" : "Guardado ✓"}</button><button class="btn s" onclick="hwCopy()">Copiar para Excel</button><button class="btn s" onclick="window.print()">Imprimir</button></span></div>${hwTable(doc, cfg)}<p class="mu hz-np" style="margin-top:10px">Puedes corregir cualquier hora tocándola. Escribe <b>V</b> para vacaciones, <b>I</b> para incapacidad, o borra ingreso y salida para dejar descanso. Las horas van en formato de 24 horas.</p></div><div class="cd hz-np" id="hz_w">${hwWarnHtml()}</div>`
      : `<div class="empty hz-np"><p>Todavía no hay horario para esta semana. Escribe las novedades (si las hay) y pulsa <b>Generar horario</b>.</p></div>`)
  );
};

/* ---------- Acciones ---------- */
function hwWeek(n) {
  HZ.start = n == 0 ? hwNext() : addD(HZ.start, n);
  HZ.doc = null;
  HZ.notes = "";
  HZ.dirty = 0;
  hwLoad();
  draw();
}

function hwRun() {
  if (HZ.doc) return ask("hzgen", hwRun2);
  hwRun2();
}

function hwRun2() {
  const ta = $("#hzn");
  if (ta) HZ.notes = ta.value;
  HZ.doc = hwGen(Date.now());
  HZ.dirty = 1;
  draw();
  toast("Horario generado. Revísalo y pulsa Guardar");
}

function hwEdit(pid, d, w) {
  const ie = $("#hz_i_" + pid + "_" + d),
    oe = $("#hz_o_" + pid + "_" + d),
    ch = (w ? oe : ie).value.trim().toLowerCase(),
    k = pid + "_" + d,
    cur = HZ.doc.cells[pid][d];
  let val;
  if (/^v/.test(ch)) val = "V";
  else if (/^i/.test(ch)) val = "I";
  else if (!ie.value.trim() && !oe.value.trim()) val = "";
  else {
    const a = hwNum(ie.value),
      b = hwNum(oe.value);
    if (!isFinite(a) || !isFinite(b)) return; //  falta el otro dato: espera a que lo escriban
    if (!(b > a && a >= 0 && b <= 24)) {
      toast("La salida debe ser después del ingreso");
      val = cur;
    } else val = a + "-" + b;
  }
  HZ.doc.cells[pid][d] = val;
  HZ.dirty = 1;
  const v = hwCV(val);
  ie.value = v.i;
  oe.value = v.o;
  ie.parentNode.className = oe.parentNode.className = v.cls;
  $("#hz_h_" + k).textContent = hwFmt(v.h);
  const t = hwTot(hwCfg(), HZ.doc.cells[pid]);
  $("#hz_t_" + pid).textContent = hwFmt(t.tot);
  $("#hz_s_" + pid).textContent = hwFmt(t.s);
  $("#hz_z_" + pid).textContent = hwFmt(t.zo);
  $("#hz_w").innerHTML = hwWarnHtml();
  const bt = document.querySelector(".hz-bt .btn");
  if (bt) bt.textContent = "Guardar horario";
}

function hwSave() {
  if (!HZ.doc) return;
  const ta = $("#hzn");
  if (ta) HZ.notes = ta.value;
  const d = HZ.doc;
  put("hor", "w_" + HZ.start, {
    start: HZ.start,
    cells: d.cells,
    notes: HZ.notes,
    boost: d.boost || [0, 0, 0, 0, 0, 0, 0],
    ok: d.ok || [],
    unk: d.unk || [],
    pre: d.pre || [],
    t: Date.now(),
  });
  HZ.dirty = 0;
  draw();
  toast("Horario guardado");
}

function hwCopy() {
  const cfg = hwCfg(),
    doc = HZ.doc,
    dates = [...Array(7)].map((_, i) => addD(doc.start, i)),
    L = [];
  L.push(["", ...dates.flatMap((x, d) => [HDN[d], "", ""]), "TOTAL HORAS", "S", "ZO", "NA"].join("\t"));
  L.push(["", ...dates.flatMap((x) => [+x.slice(8), "", ""]), "", "", "", ""].join("\t"));
  L.push(["Empleado", ...dates.flatMap(() => ["Ingreso", "Salida", "#horas"]), "Semana", "", "", ""].join("\t"));
  cfg.team.forEach((p) => {
    const row = doc.cells[p.id] || [],
      t = hwTot(cfg, row);
    L.push(
      [
        p.name,
        ...row.flatMap((c) => {
          const s = hwSh(c);
          return s ? [hwFmt(s[0]), hwFmt(s[1]), hwFmt(s[1] - s[0])] : c === "V" ? ["VAC", "VAC", "0,0"] : c === "I" ? ["INC", "INC", "0,0"] : ["", "", "0,0"];
        }),
        hwFmt(t.tot),
        hwFmt(t.s),
        hwFmt(t.zo),
        "0,0",
      ].join("\t"),
    );
  });
  const txt = L.join("\n"),
    ok = () => toast("Copiado: pégalo en Excel");
  try {
    navigator.clipboard.writeText(txt).then(ok, () => toast("No se pudo copiar"));
  } catch (e) {
    toast("No se pudo copiar");
  }
}

/* ---------- Equipo y reglas ---------- */
const HDS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  HTP = [
    ["ap", "Apertura"],
    ["ci", "Cierre"],
    ["int", "Intermedio"],
  ];

function hwTeamModal(keep) {
  if (!keep) HZ.tm = JSON.parse(JSON.stringify(hwCfg()));
  const { team, rules: r } = HZ.tm,
    f = (id, l, v) => `<label>${l}<input id="${id}" value="${esc(v)}" inputmode="decimal"></label>`,
    ck = (c, v, l, on) => `<label class="pil"><input type="checkbox" class="${c}" value="${v}" ${on ? "checked" : ""}><span>${l}</span></label>`;
  modal(
    "Equipo y reglas",
    `<p class="mu">Estos datos son solo parámetros para generar: no aparecen en el horario.</p><h2>Equipo</h2><div id="hzt">${team
      .map(
        (p, i) =>
          `<div class="hz-p"><input class="hz-n" value="${esc(p.name)}" placeholder="Nombre" aria-label="Nombre"><div class="hz-k"><span class="mu hz-lb">Funciones</span><label class="pil"><input type="checkbox" class="hz-l" ${p.lid ? "checked" : ""}><span>Líder</span></label>${HSK.map(([k, l]) => ck("hz-s", k, l, p.sk.includes(k))).join("")}</div><div class="hz-k"><span class="mu hz-lb">Turnos</span>${HTP.map(([k, l]) => ck("hz-t", k, l, p.tp.includes(k))).join("")}</div><div class="hz-k"><span class="mu hz-lb">No puede descansar</span>${HDS.map((l, d) => ck("hz-r", d, l, p.nr.includes(d))).join("")}<button class="btn x" onclick="hwDelP(${i})">Quitar</button></div></div>`,
      )
      .join("")}</div><p style="margin:8px 0 14px"><button class="btn s" onclick="hwAddP()">+ Persona</button></p><h2>Horario de cada día</h2><p class="mu">La hora en que entra el equipo, cuándo inicia el servicio, cuándo cierra el local y cuándo sale el equipo (la última hora es de limpieza y cierre). Formato de 24 horas.</p><div class="hz-dg"><b></b><b>Entra</b><b>Inicia servicio</b><b>Cierra local</b><b>Sale</b>${r.dias
      .map(
        (D, d) =>
          `<span>${HDS[d]}</span>${["e", "i", "c", "s"].map((k) => `<input id="hd_${k}_${d}" value="${esc(D[k])}" inputmode="decimal" aria-label="${HDS[d]} ${k}">`).join("")}`,
      )
      .join("")}</div><h2 style="margin-top:14px">Reglas</h2><div class="fm">${f("hr_minHora", "Personas mínimas por hora", r.minHora)}${f("hr_minPico", "Personas mínimas en hora pico", r.minPico)}<label class="w2">Horas pico (ej. 12-14, 17-19)<input id="hr_picos" value="${esc(r.picos)}"></label>${f("hr_minApert", "Personas en la preparación (antes de abrir)", r.minApert)}${f("hr_minCierre", "Personas en limpieza y cierre", r.minCierre)}${f("hr_horasSemana", "Horas por persona en la semana", r.horasSemana)}${f("hr_limiteOrd", "Horas ordinarias (lo demás es extra)", r.limiteOrd)}${f("hr_minDia", "Personas mínimas por día", r.minDia)}${f("hr_maxCierres", "Máximo de cierres por persona", r.maxCierres)}${f("hr_minCaj", "Con caja por día (mínimo)", r.minCaj)}${f("hr_minBar", "Con barismo por día (mínimo)", r.minBar)}${f("hr_almuerzo", "Tiempo de almuerzo (min)", r.almuerzo)}<label class="pil w2"><input type="checkbox" id="hr_dom" ${r.domTodos ? "checked" : ""}><span>El domingo trabaja todo el equipo (el descanso cae de lunes a sábado)</span></label></div><p style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn" onclick="hwTeamSave()">Guardar</button><button class="btn g" onclick="hwTeamReset()">Volver a los valores iniciales</button></p>`,
  );
}

function hwSyncTm() {
  const rows = [...document.querySelectorAll("#hzt .hz-p")];
  HZ.tm.team = rows.map((el, i) => ({
    id: HZ.tm.team[i].id,
    name: el.querySelector(".hz-n").value.trim(),
    lid: el.querySelector(".hz-l").checked ? 1 : 0,
    sk: [...el.querySelectorAll(".hz-s:checked")].map((x) => x.value),
    tp: [...el.querySelectorAll(".hz-t:checked")].map((x) => x.value),
    nr: [...el.querySelectorAll(".hz-r:checked")].map((x) => +x.value),
  }));
  const g = (id) => $("#hr_" + id).value,
    nv = (id, d) => (isFinite(hwNum(g(id))) ? hwNum(g(id)) : d),
    r = HZ.tm.rules;
  HZ.tm.rules = {
    dias: r.dias.map((D, d) => {
      const o = {};
      ["e", "i", "c", "s"].forEach((k) => {
        const v = hwNum($("#hd_" + k + "_" + d).value);
        o[k] = isFinite(v) ? v : D[k];
      });
      return o;
    }),
    minHora: nv("minHora", r.minHora),
    minPico: nv("minPico", r.minPico),
    picos: g("picos"),
    minApert: nv("minApert", r.minApert),
    minCierre: nv("minCierre", r.minCierre),
    horasSemana: nv("horasSemana", r.horasSemana),
    limiteOrd: nv("limiteOrd", r.limiteOrd),
    almuerzo: nv("almuerzo", r.almuerzo),
    minDia: nv("minDia", r.minDia),
    minCaj: nv("minCaj", r.minCaj),
    minBar: nv("minBar", r.minBar),
    maxCierres: nv("maxCierres", r.maxCierres),
    domTodos: $("#hr_dom").checked ? 1 : 0,
  };
}

function hwAddP() {
  hwSyncTm();
  HZ.tm.team.push({ id: uid(), name: "", lid: 0, sk: ["srv"], tp: ["ap", "ci"], nr: [] });
  hwTeamModal(1);
}

function hwDelP(i) {
  hwSyncTm();
  HZ.tm.team.splice(i, 1);
  hwTeamModal(1);
}

function hwTeamReset() {
  HZ.tm = hwDef();
  hwTeamModal(1);
}

function hwTeamSave() {
  hwSyncTm();
  const t = HZ.tm;
  if (!t.team.length || t.team.some((p) => !p.name)) return toast("Todas las personas necesitan nombre");
  if (t.team.some((p) => !p.tp.length)) return toast("Cada persona necesita al menos un tipo de turno");
  if (t.rules.dias.some((D) => !(D.e < D.i && D.i < D.c && D.c <= D.s && D.s <= 24)))
    return toast("Revisa los horarios: entra < inicia servicio < cierra local ≤ sale");
  put("hor", "cfg", t);
  closeM();
  toast("Equipo y reglas guardados");
}
