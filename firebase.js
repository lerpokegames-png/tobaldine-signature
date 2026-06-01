/* ══════════════════════════════════════════════════════
   TOBALDINE SIGNATURE · FIREBASE SYNC (CATÁLOGO)
   FIX: sincroniza produtos, kits, depoimentos e cupons.
        Usa debounce para evitar múltiplos re-renders.
        atualizarDoFirebase chamado com todos os 4 params.
══════════════════════════════════════════════════════ */

/* firebaseConfig definido em firebase-config.js */

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

    /* Config: mostrar estoque */
    db.ref("config/mostrarEstoque").once("value", function(snap){
      window._cfgMostrarEstoque = snap.val() === true;
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
            var strip = el.closest ? el.closest(".cutoff-strip") : null;
            if(strip){ var sp = strip.querySelector("span:last-child"); if(sp) sp.textContent = val; }
          } else if(id.startsWith("sub_")){
            var cur = el.textContent || "";
            var emojiMatch = cur.match(/^[^\w\s]{1,3}\s*/);
            el.textContent = (emojiMatch ? emojiMatch[0] : "") + val;
          } else {
            el.textContent = val;
          }
        });
      });
    });

    /* Telefone / WhatsApp dinâmico */
    db.ref("config/tel").once("value", function(snap){
      var tel = snap.val();
      if(!tel) return;
      if(typeof TEL !== "undefined") TEL = tel;
      /* Atualiza todos os links de WhatsApp na página */
      document.querySelectorAll("a[href*='whatsapp.com/send']").forEach(function(a){
        a.href = a.href.replace(/phone=\d+/, "phone=" + tel);
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
