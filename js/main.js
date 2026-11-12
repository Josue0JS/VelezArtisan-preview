/* ===== main.js =====
   Arranque: atajos de teclado, carga diferida de Horarios y primer dibujo. */

let HORARIOS_PROMISE = null;
function loadHorarios() {
  if (typeof V.hor === "function") return Promise.resolve();
  if (HORARIOS_PROMISE) return HORARIOS_PROMISE;

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "css/horarios.css";
  const cssReady = new Promise((resolve, reject) => {
    css.onload = resolve;
    css.onerror = () => reject(new Error("No se pudo cargar css/horarios.css"));
  });
  document.head.appendChild(css);

  const script = document.createElement("script");
  script.src = "js/horarios.js";
  script.defer = true;
  const scriptReady = new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar js/horarios.js"));
  });
  document.body.appendChild(script);

  HORARIOS_PROMISE = Promise.all([cssReady, scriptReady]).catch((error) => {
    HORARIOS_PROMISE = null;
    css.remove();
    script.remove();
    throw error;
  });
  return HORARIOS_PROMISE;
}

document.addEventListener("keydown", (e) => {
  if (e.key == "Escape") closeM();
});

draw();
init();
