/* ══════════════════════════════════════════════════════
   TOBALDINE SIGNATURE · FIREBASE ADMIN
══════════════════════════════════════════════════════ */

var firebaseConfig = {
  apiKey:            "AIzaSyDeUg_04Rf4iaVrtG2BStWIaogAThowm8Q",
  authDomain:        "tobaldine-signature.firebaseapp.com",
  databaseURL:       "https://tobaldine-signature-default-rtdb.firebaseio.com",
  projectId:         "tobaldine-signature",
  storageBucket:     "tobaldine-signature.firebasestorage.app",
  messagingSenderId: "977486037825",
  appId:             "1:977486037825:web:b21ab195b35bf3377cd7c0"
};

/* Inicializa Firebase imediatamente */
try {
  if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.firebaseDB = firebase.database();
} catch(e) {
  console.warn("firebase-admin.js: erro ao inicializar:", e.message);
  window.firebaseDB = null;
}

/* Funções de salvamento — usam firebaseDB diretamente */
function _ref(path){ return window.firebaseDB ? window.firebaseDB.ref(path) : null; }
function _save(path, data){
  var r = _ref(path);
  return r ? r.set(data) : Promise.reject("Firebase offline");
}

window.fbSaveProdutos    = function(p) { return _save("produtos", p);    };
window.fbSaveKits        = function(k) { return _save("kits", k);        };
window.fbSaveDepoimentos = function(d) { return _save("depoimentos", d); };
window.fbSaveCupons      = function(c) { return _save("cupons", c);      };
window.fbSavePedidos     = function(p) { return _save("pedidos", p);     };
window.fbSaveHistorico   = function(h) { return _save("historico", h);   };
