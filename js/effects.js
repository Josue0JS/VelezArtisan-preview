/* ===== effects.js =====
   Efectos visuales: contadores animados, entrada en cascada y brillo que sigue el cursor. */

function countUp(el) {
  const m = /^([+\-]?\$?)(\d[\d.]*)(%?)$/.exec(el.textContent.trim());
  if (!m) return;
  const n = parseInt(m[2].replace(/\./g, ""), 10),
    f = (v) => (m[1].includes("$") ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : String(v));
  if (!n) return;
  const t0 = performance.now();
  (function st(t) {
    const p = Math.min(1, (t - t0) / 900),
      e = 1 - Math.pow(1 - p, 3);
    el.textContent = m[1] + f(Math.round(n * e)) + m[3];
    if (p < 1) requestAnimationFrame(st);
  })(t0);
}

function enterFx() {
  const m = $("#m");
  if (!m) return;
  m.classList.add("enter");
  m.querySelectorAll(".hd,.qa,.kp>*,.cd,.tl,.pc,.fl>div,.dt2,.tb2,.chips,.bn,.empty,.pg>*").forEach(
    (e, i) => {
      e.style.setProperty("--i", Math.min(i, 14));
      e.classList.add("rv");
    },
  );
  if (!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches))
    m.querySelectorAll(".k b").forEach(countUp);
}

document.addEventListener("pointermove", (e) => {
  const t = e.target.closest && e.target.closest(".cd,.tl,.k,.pc");
  if (t) {
    const r = t.getBoundingClientRect();
    t.style.setProperty("--mx", e.clientX - r.left + "px");
    t.style.setProperty("--my", e.clientY - r.top + "px");
  }
});
