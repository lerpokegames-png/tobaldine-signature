/* ══════════════════════════════════════════════════════
   TOBALDINE SIGNATURE · FIREBASE SYNC (CATÁLOGO)
   FIX: sincroniza produtos, kits, depoimentos e cupons.
        Usa debounce para evitar múltiplos re-renders.
        atualizarDoFirebase chamado com todos os 4 params.
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

(function() {
  try {
    if (typeof firebase === "undefined") {
      console.warn("Firebase SDK não encontrado. Verifique se os scripts foram carregados.");
      return;
    }

    /* Inicializa apenas uma vez */
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    var db = firebase.database();

    /* ── Dados acumulados de cada listener ── */
    var _cache = { produtos: null, kits: null, depoimentos: null, cupons: null };
    var _renderTimer = null;

    /* Dispara atualizarDoFirebase com debounce de 80ms para
       agrupar os 4 listeners numa única renderização */
    function _scheduleRender() {
      if (!_cache.produtos) return; /* produtos são obrigatórios */
      if (_renderTimer) clearTimeout(_renderTimer);
      _renderTimer = setTimeout(function() {
        if (typeof atualizarDoFirebase === "function") {
          atualizarDoFirebase(
            _cache.produtos,
            _cache.kits,
            _cache.depoimentos,
            _cache.cupons
          );
        }
      }, 80);
    }

    function _toArray(data) {
      if (!data) return null;
      return Array.isArray(data) ? data : Object.values(data);
    }

    /* Listener em tempo real para produtos */
    db.ref("produtos").on("value", function(snap) {
      var arr = _toArray(snap.val());
      if (arr && arr.length) {
        _cache.produtos = arr;
        _scheduleRender();
      }
    });

    /* One-time loaders para os demais dados */
    db.ref("kits").once("value", function(snap) {
      var arr = _toArray(snap.val());
      if (arr) _cache.kits = arr;
      _scheduleRender();
    });

    db.ref("depoimentos").once("value", function(snap) {
      var arr = _toArray(snap.val());
      if (arr) _cache.depoimentos = arr;
      _scheduleRender();
    });

    db.ref("cupons").once("value", function(snap) {
      var arr = _toArray(snap.val());
      if (arr) _cache.cupons = arr;
      _scheduleRender();
    });

    /* Textos do site */
    db.ref("config/textos").once("value", function(snap) {
      var textos = snap.val();
      if(!textos) return;
      Object.keys(textos).forEach(function(id){
        var val = textos[id];
        if(!val) return;
        document.querySelectorAll("[data-texto='"+id+"']").forEach(function(el){
          if(id === "strip_frase"){
            el.innerHTML = "· "+val+" ·";
          } else if(id === "entrega_faixa"){
            /* update cutoff strip text */
            var strip = el.closest ? el.closest(".cutoff-strip") : null;
            if(strip){ var sp = strip.querySelector("span:last-child"); if(sp) sp.textContent = val; }
          } else {
            el.textContent = val;
          }
        });
      });
    });

    /* Nomes de seções personalizados */
    db.ref("config/secoes").once("value", function(snap) {
      var labels = snap.val();
      if(!labels) return;
      document.querySelectorAll("[data-secao]").forEach(function(el){
        var id = el.dataset.secao;
        if(labels[id]){
          /* Preserva emoji do início */
          var texto = el.textContent;
          var emoji = texto.match(/^[\u{1F000}-\u{1FFFF}✨📦⚜️🧴🎁][^\w]*/u);
          el.textContent = (emoji ? emoji[0] : "") + labels[id];
        }
      });
    });

  } catch(e) {
    console.warn("Firebase indisponível. Catálogo carregado via produtos.js local.", e);
  }
})();
