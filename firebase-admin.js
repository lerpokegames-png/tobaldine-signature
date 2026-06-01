/* ══════════════════════════════════════════════════════
   TOBALDINE SIGNATURE · FIREBASE ADMIN
   v2 — sanitize embutido: nunca envia undefined ao Firebase
══════════════════════════════════════════════════════ */

/* firebaseConfig definido em firebase-config.js */

try {
  if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.firebaseDB = firebase.database();
} catch(e) {
  console.warn("firebase-admin.js: erro ao inicializar:", e.message);
  window.firebaseDB = null;
}

/* ── Remove undefined/NaN recursivamente antes de qualquer .set() ──
   Firebase rejeita undefined com erro síncrono que trava tudo.     */
function _sanitizeFA(obj) {
  if (obj === undefined || (typeof obj === "number" && isNaN(obj))) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(_sanitizeFA);
  var out = {};
  Object.keys(obj).forEach(function(k) {
    var v = _sanitizeFA(obj[k]);
    if (v !== undefined) out[k] = v;
  });
  return out;
}

function _ref(path)       { return window.firebaseDB ? window.firebaseDB.ref(path) : null; }
function _save(path, data) {
  var r = _ref(path);
  if (!r) return Promise.reject("Firebase offline");
  try {
    return r.set(_sanitizeFA(data));
  } catch(e) {
    console.error("_save(" + path + ") erro:", e.message);
    return Promise.reject(e);
  }
}

window.fbSaveProdutos    = function(p) { return _save("produtos",    p); };
window.fbSaveKits        = function(k) { return _save("kits",        k); };
window.fbSaveDepoimentos = function(d) { return _save("depoimentos", d); };
window.fbSaveCupons      = function(c) { return _save("cupons",      c); };
window.fbSavePedidos     = function(p) { return _save("pedidos",     p); };
window.fbSaveHistorico   = function(h) { return _save("historico",   h); };
