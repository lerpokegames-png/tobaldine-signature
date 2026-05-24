/* ══════════════════════════════════════════════════════
   TOBALDINE SIGNATURE · FIREBASE ADMIN
   Inicializa Firebase se ainda não foi inicializado.
   Adicionado fbSavePedidos para persistência real dos pedidos.
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

if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var db = null;

/* Lazy: pega o db na hora de usar — evita problema de ordem de carregamento */
function _db() {
  if (!db && typeof firebase !== "undefined" && firebase.apps.length) {
    db = firebase.database();
  }
  return db;
}

/* Sincronização inicial — roda após DOMContentLoaded para garantir Firebase pronto */
if(typeof document !== "undefined"){
  document.addEventListener("DOMContentLoaded", function(){
    var database = _db();
    var fbStatus = document.getElementById("fbStatus");

    if (!database) {
      if (fbStatus) {
        fbStatus.textContent = "⚠ Firebase indisponível";
        fbStatus.style.background = "rgba(192,76,76,0.15)";
        fbStatus.style.color = "#c04c4c";
      }
      return;
    }

    /* O admin.html cuida do carregamento completo via loadFromFirebase().
       firebase-admin.js só expõe as funções de salvamento. */
    window.firebaseDB = database;
  });
}

window.fbSaveProdutos    = function(p) { return _db() ? _db().ref("produtos").set(p)    : Promise.reject("Firebase offline"); };
window.fbSaveKits        = function(k) { return _db() ? _db().ref("kits").set(k)        : Promise.reject("Firebase offline"); };
window.fbSaveDepoimentos = function(d) { return _db() ? _db().ref("depoimentos").set(d) : Promise.reject("Firebase offline"); };
window.fbSaveCupons      = function(c) { return _db() ? _db().ref("cupons").set(c)      : Promise.reject("Firebase offline"); };
window.fbSavePedidos     = function(p) { return _db() ? _db().ref("pedidos").set(p)     : Promise.reject("Firebase offline"); };
window.fbSaveHistorico   = function(h) { return _db() ? _db().ref("historico").set(h)   : Promise.reject("Firebase offline"); };
window.firebaseDB        = null; /* exposto no DOMContentLoaded acima */
