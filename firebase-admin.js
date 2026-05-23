/* ══════════════════════════════════════════════════════
   TOBALDINE SIGNATURE · FIREBASE ADMIN
   FIX: usa firebase.app() já inicializado pelo firebase.js
        evitando duplicação da firebaseConfig.
        Adicionado fbSavePedidos para persistência real dos pedidos.
══════════════════════════════════════════════════════ */

/* Reutiliza o app já inicializado por firebase.js — sem duplicar config */
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  console.warn("firebase-admin.js: Firebase não foi inicializado antes. Verifique a ordem dos scripts.");
}

var db = (typeof firebase !== "undefined" && firebase.apps.length) ? firebase.database() : null;

if (db) {
  var fbStatus = document.getElementById("fbStatus");

  /* Sincroniza Produtos */
  db.ref("produtos").once("value", function(snap) {
    var data = snap.val();
    if (!data) return;
    var fbProdutos = Array.isArray(data) ? data : Object.values(data);
    if (!fbProdutos.length) return;
    localStorage.setItem("tb_v3_produtos", JSON.stringify(fbProdutos));
    if (typeof produtos !== "undefined") {
      produtos = fbProdutos;
      if (typeof renderSidebar === "function") renderSidebar();
    }
    if (fbStatus) {
      fbStatus.textContent = "⚡ Firebase OK";
      fbStatus.style.background = "rgba(76,175,121,0.15)";
      fbStatus.style.color = "#4caf79";
    }
  });

  /* Sincroniza Kits */
  db.ref("kits").once("value", function(snap) {
    var data = snap.val();
    if (!data) return;
    var fbKits = Array.isArray(data) ? data : Object.values(data);
    localStorage.setItem("tb_v3_kits", JSON.stringify(fbKits));
    if (typeof kits !== "undefined") { kits = fbKits; }
  });

  /* Sincroniza Depoimentos */
  db.ref("depoimentos").once("value", function(snap) {
    var data = snap.val();
    if (!data) return;
    var fbDep = Array.isArray(data) ? data : Object.values(data);
    localStorage.setItem("tb_v3_dep", JSON.stringify(fbDep));
    if (typeof depoimentos !== "undefined") { depoimentos = fbDep; }
  });

  /* Sincroniza Cupons */
  db.ref("cupons").once("value", function(snap) {
    var data = snap.val();
    if (!data) return;
    var fbCupons = Array.isArray(data) ? data : Object.values(data);
    localStorage.setItem("tb_v3_cupons", JSON.stringify(fbCupons));
    if (typeof cupons !== "undefined") {
      cupons = fbCupons;
      if (typeof renderCupons === "function") renderCupons();
    }
  });

} else {
  var fbStatus = document.getElementById("fbStatus");
  if (fbStatus) {
    fbStatus.textContent = "⚠ Firebase indisponível";
    fbStatus.style.background = "rgba(192,76,76,0.15)";
    fbStatus.style.color = "#c04c4c";
  }
}

window.fbSaveProdutos    = function(p) { return db ? db.ref("produtos").set(p)    : Promise.reject("Firebase offline"); };
window.fbSaveKits        = function(k) { return db ? db.ref("kits").set(k)        : Promise.reject("Firebase offline"); };
window.fbSaveDepoimentos = function(d) { return db ? db.ref("depoimentos").set(d) : Promise.reject("Firebase offline"); };
window.fbSaveCupons      = function(c) { return db ? db.ref("cupons").set(c)      : Promise.reject("Firebase offline"); };
window.fbSavePedidos     = function(p) { return db ? db.ref("pedidos").set(p)     : Promise.reject("Firebase offline"); }; /* FIX: pedidos agora persistem no servidor */
window.firebaseDB        = db;
