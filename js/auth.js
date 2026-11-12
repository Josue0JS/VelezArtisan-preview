/* ===== auth.js =====
   Inicio de sesión con Firebase y conexión en vivo con la base de datos. */

let AUTH = null,
  UNSUB = [];

function devId() {
  try {
    let d = localStorage.getItem("dev");
    if (!d) {
      d = uid();
      localStorage.setItem("dev", d);
    }
    return d;
  } catch (e) {
    return uid();
  }
}

function lmsg(m) {
  const e = $("#lm");
  if (e) e.textContent = m;
}

async function init() {
  if (!window.firebase || /PEGA_AQUI|TU-PROYECTO/.test(JSON.stringify(FIREBASE_CONFIG))) {
    $("#lg").className = "on";
    lmsg("Falta configurar Firebase: abre index.html y pega tu configuración (paso 4 de la guía).");
    $("#lb").disabled = true;
    return;
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  AUTH = firebase.auth();
  DB = firebase.firestore();
  UID = devId();
  // IndexedDB cache: keeps recently used Firestore data available offline.
  try {
    await DB.enablePersistence({ synchronizeTabs: true });
  } catch (e) {
    // Persistence may be unavailable (private mode, unsupported browser or old tab).
    console.info("Firestore persistence unavailable; continuing online:", e && e.code);
  }
  AUTH.onAuthStateChanged((u) => {
    UNSUB.forEach((f) => f());
    UNSUB = [];
    if (!u) {
      READY = false;
      for (const k in C) C[k] = {};
      $("#lg").className = "on";
      draw();
      return;
    }
    $("#lg").className = "";
    SYNC = "Conectando…";
    draw();
    ["ing", "prod", "led", "prov", "cfg", "cal", "hor"].forEach((c) =>
      UNSUB.push(
        DB.collection(c).onSnapshot(
          (sn) => {
            // Apply only changed documents instead of rebuilding the collection map
            // from every document on each realtime update.
            sn.docChanges().forEach((change) => {
              const id = change.doc.id;
              if (change.type === "removed") delete C[c][id];
              else C[c][id] = change.doc.data();
            });
            READY = true;
            SYNC = "";
            scheduleRebuild();
          },
          (e) => {
            SYNC = "Sin conexión con la base de datos";
            draw();
          },
        ),
      ),
    );
  });
}

async function login() {
  const e = $("#le").value.trim(),
    p = $("#lp").value;
  if (!e || !p) return lmsg("Escribe tu correo y tu clave");
  $("#lb").disabled = true;
  lmsg("");
  try {
    await AUTH.signInWithEmailAndPassword(e, p);
    $("#lp").value = "";
  } catch (x) {
    const c = (x && x.code) || "";
    lmsg(
      /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)
        ? "Correo o clave incorrectos"
        : /too-many/.test(c)
          ? "Demasiados intentos. Espera unos minutos e intenta de nuevo"
          : /network/.test(c)
            ? "Sin conexión a internet"
            : "No se pudo iniciar sesión",
    );
  }
  $("#lb").disabled = false;
}

function logout() {
  if (AUTH) AUTH.signOut();
}
