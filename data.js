/* ══════════════════════════════════════
   data.js — Tobaldine Admin
   Estado global + persistência (localStorage e Firebase).
   Depende de: utils.js, firebase-admin.js
══════════════════════════════════════ */

/* ── Seções do catálogo ── */
var SECOES = [
  { id: "decants",    lbl: "Decants"    },
  { id: "originais",  lbl: "Originais"  },
  { id: "similares",  lbl: "Similares"  },
  { id: "cosmeticos", lbl: "Cosméticos" },
  { id: "autorais",   lbl: "Autorais"   }
];
try {
  var _sl = localStorage.getItem("tb_secoes_labels");
  if (_sl) {
    var _slp = JSON.parse(_sl);
    SECOES.forEach(function(s){ if (_slp[s.id]) s.lbl = _slp[s.id]; });
  }
} catch(e) {}

/* ── Estado global ── */
var produtos    = [];
var kits        = [];
var cupons      = [];
var historico   = [];
var selectedIdx = null;
var dragSrc     = null;

/* ── Timer de auto-sync ── */
var _syncTimer = null;

/* ── Carrega do localStorage (cache imediato) ── */
function loadData() {
  try { var _s1 = localStorage.getItem("tb_v3_produtos");    if (_s1) { var _p1 = JSON.parse(_s1); if (_p1 && _p1.length > 0) produtos = _p1; } } catch(e) {}
  try { var _s2 = localStorage.getItem("tb_v3_kits");        if (_s2) kits        = JSON.parse(_s2); } catch(e) {}
  try { var _s3 = localStorage.getItem("tb_v3_dep");         if (_s3) depoimentos = JSON.parse(_s3); } catch(e) {}
  try { var _s4 = localStorage.getItem("tb_v3_cupons");      if (_s4) cupons      = JSON.parse(_s4); } catch(e) {}
  try { var _s5 = localStorage.getItem("tb_v3_hist");        if (_s5) historico   = JSON.parse(_s5); } catch(e) {}

  /* Fallback para produtos.js estático, se localStorage estiver vazio */
  if (!produtos.length && typeof PRODUTOS !== "undefined" && PRODUTOS.length) {
    produtos = JSON.parse(JSON.stringify(PRODUTOS));
    if (typeof KITS        !== "undefined") kits        = JSON.parse(JSON.stringify(KITS));
    if (typeof DEPOIMENTOS !== "undefined") depoimentos = JSON.parse(JSON.stringify(DEPOIMENTOS));
    saveData();
    fbSync();
  }
  renderEmptyProd();
}

/* ── Persiste no localStorage + agenda auto-sync Firebase ── */
function saveData() {
  localStorage.setItem("tb_v3_produtos",  JSON.stringify(produtos));
  localStorage.setItem("tb_v3_kits",      JSON.stringify(kits));
  localStorage.setItem("tb_v3_cupons",    JSON.stringify(cupons));
  localStorage.setItem("tb_v3_hist",      JSON.stringify(historico));
  updateHdr();

  /* Auto-sync para o Firebase 2s após última alteração */
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function(){ _autoSyncFirebase(); }, 2000);
}

/* ── Helper: salva kits no Firebase com fallback direto ── */
function _fbSaveKits() {
  if (typeof fbSaveKits === "function") return fbSaveKits(kits);
  /* Fallback: salva direto via window.firebaseDB (não depende de firebase-admin.js) */
  if (window.firebaseDB) return window.firebaseDB.ref("kits").set(kits);
  return Promise.resolve();
}

function _fbSaveCupons() {
  if (typeof fbSaveCupons === "function") return fbSaveCupons(cupons);
  if (window.firebaseDB) return window.firebaseDB.ref("cupons").set(cupons);
  return Promise.resolve();
}

/* ── Sync silencioso (auto) ── */
function _autoSyncFirebase() {
  if (typeof fbSaveProdutos !== "function" && !window.firebaseDB) return;
  var fbSt = document.getElementById("fbStatus");
  if (fbSt) { fbSt.textContent = "☁ Sincronizando..."; fbSt.style.background = "rgba(201,168,76,0.1)"; fbSt.style.color = "#c9a84c"; }

  var totalFotos = produtos.reduce(function(acc, p){
    return acc + (Array.isArray(p.fotos) ? p.fotos.filter(function(f){ return f && f.trim(); }).length : 0);
  }, 0);

  Promise.all([
    fbSaveProdutos(produtos),
    _fbSaveKits(),
    _fbSaveCupons()
  ]).then(function(){
    if (fbSt) { fbSt.textContent = "✓ Firebase OK · " + totalFotos + " fotos"; fbSt.style.background = "rgba(76,175,121,0.15)"; fbSt.style.color = "#4caf79"; }
    if (typeof fbSaveHistorico === "function") {
      fbSaveHistorico(historico).catch(function(e){ console.warn("Historico Firebase (atualize as regras):", e.message); });
    }
  }).catch(function(err){
    if (fbSt) { fbSt.textContent = "⚠ Erro no sync"; fbSt.style.background = "rgba(192,76,76,0.15)"; fbSt.style.color = "#c04c4c"; }
    console.error("Auto-sync Firebase:", err);
  });
}

/* ── Sync manual imediato (usado por fbSync e salvarTudo) ── */
function fbSync() {
  if (typeof fbSaveProdutos !== "function" && !window.firebaseDB) return;
  if (typeof fbSaveProdutos === "function") fbSaveProdutos(produtos);
  else if (window.firebaseDB) window.firebaseDB.ref("produtos").set(produtos);
  _fbSaveKits();
  _fbSaveCupons();
}

/* ── Sync completo com confirmação ── */
function syncCompletoFirebase() {
  if (typeof fbSaveProdutos !== "function") { toast("⚠️ Firebase indisponível"); return; }

  var totalFotos = produtos.reduce(function(acc, p){
    return acc + (Array.isArray(p.fotos) ? p.fotos.filter(function(f){ return f && f.trim(); }).length : 0);
  }, 0);

  if (!confirm("Enviar " + produtos.length + " produtos e " + totalFotos + " fotos para o Firebase?\n\nIsso vai sobrescrever os dados atuais no servidor.")) return;

  var btn = document.getElementById("btnSyncForce");
  if (btn) { btn.textContent = "☁ Enviando..."; btn.disabled = true; }

  Promise.all([
    fbSaveProdutos(produtos),
    _fbSaveKits(),
    _fbSaveCupons()
  ]).then(function(){
    if (btn) { btn.textContent = "☁ Sync Completo"; btn.disabled = false; }
    var fbSt = document.getElementById("fbStatus");
    if (fbSt) { fbSt.textContent = "✓ Sync OK"; fbSt.style.background = "rgba(76,175,121,0.15)"; fbSt.style.color = "#4caf79"; }
    toast("✅ Firebase atualizado! " + produtos.length + " produtos · " + totalFotos + " fotos enviadas.");
  }).catch(function(err){
    if (btn) { btn.textContent = "☁ Sync Completo"; btn.disabled = false; }
    toast("❌ Erro no sync: " + err);
  });
}

/* ── Carrega TUDO do Firebase (chamado na abertura) ── */
function loadFromFirebase(db) {
  var fbSt = document.getElementById("fbStatus");
  if (fbSt) { fbSt.textContent = "☁ Carregando..."; fbSt.style.background = "rgba(201,168,76,0.1)"; fbSt.style.color = "#c9a84c"; }

  function toArr(val){ return !val ? null : (Array.isArray(val) ? val : Object.values(val)); }

  Promise.all([
    db.ref("produtos").once("value"),
    db.ref("kits").once("value"),
    db.ref("cupons").once("value"),
  ]).then(function(snaps){
    var fbProd = toArr(snaps[0].val());
    var fbKits = toArr(snaps[1].val());
    var fbCup  = toArr(snaps[2].val());

    /* Proteção: Firebase com menos produtos que o cache local */
    if (fbProd && fbProd.length && produtos.length > 0 && fbProd.length < produtos.length) {
      var msg = "⚠ Firebase tem " + fbProd.length + " produtos mas você tem " + produtos.length
        + " localmente.\n\nUsar os dados do Firebase (menos produtos) vai apagar os dados locais.\n\nUsar Firebase?";
      if (!confirm(msg)) {
        renderSidebar();
        if (fbSt) { fbSt.textContent = "✓ Firebase OK (mantendo dados locais)"; fbSt.style.background = "rgba(76,175,121,0.15)"; fbSt.style.color = "#4caf79"; }
        fbSaveProdutos(produtos).catch(function(e){ console.warn("Proteção sync:", e); });
        return;
      }
    }

    if (fbProd && fbProd.length) { produtos = fbProd; localStorage.setItem("tb_v3_produtos", JSON.stringify(produtos)); }
    if (fbKits && fbKits.length) { kits = fbKits; localStorage.setItem("tb_v3_kits", JSON.stringify(kits)); }
    else if (typeof KITS !== "undefined" && KITS.length && !kits.length) {
      kits = JSON.parse(JSON.stringify(KITS));
      localStorage.setItem("tb_v3_kits", JSON.stringify(kits));
      _fbSaveKits();
    }
    if (fbCup) { cupons = fbCup; localStorage.setItem("tb_v3_cupons", JSON.stringify(cupons)); }

    var totalFotos = produtos.reduce(function(acc, p){
      return acc + (Array.isArray(p.fotos) ? p.fotos.filter(function(f){ return f && f.trim(); }).length : 0);
    }, 0);

    /* Carrega chave Gemini do Firebase */
    db.ref("config/geminiKey").once("value").then(function(snap){
      var k = snap.val();
      if (k) {
        localStorage.setItem("tb_gemini_key", k);
        var inp = document.getElementById("geminiKeyInput");
        if (inp) inp.value = k;
      }
    }).catch(function(){});

    /* Carrega textos do site */
    db.ref("config/textos").once("value").then(function(snap){
      var t = snap.val();
      if (t) { _textosSite = t; localStorage.setItem("tb_v3_textos", JSON.stringify(t)); }
    }).catch(function(){});

    /* Carrega nomes customizados das seções */
    db.ref("config/secoes").once("value", function(snap){
      var sl = snap.val();
      if (sl) {
        SECOES.forEach(function(s){ if (sl[s.id]) s.lbl = sl[s.id]; });
        localStorage.setItem("tb_secoes_labels", JSON.stringify(sl));
      }
    });

    renderSidebar();
    if (fbSt) { fbSt.textContent = "✓ Firebase OK · " + totalFotos + " fotos"; fbSt.style.background = "rgba(76,175,121,0.15)"; fbSt.style.color = "#4caf79"; }

    /* Histórico — falha silenciosa se regras não atualizadas */
    db.ref("historico").once("value").then(function(snap){
      var fbHist = toArr(snap.val());
      if (fbHist && fbHist.length) { historico = fbHist; localStorage.setItem("tb_v3_hist", JSON.stringify(historico)); }
    }).catch(function(e){
      console.warn("Historico Firebase: atualize as regras em database.rules.json →", e.message);
    });

  }).catch(function(err){
    if (fbSt) { fbSt.textContent = "⚠ Firebase offline · usando cache local"; fbSt.style.background = "rgba(192,76,76,0.15)"; fbSt.style.color = "#c04c4c"; }
    console.warn("Falha ao carregar Firebase:", err);
    renderSidebar();
  });
}

/* ── Backlog / Time Machine ── */
function addHist(msg, snap) {
  var backupObj = snap ? {
    produtos:    JSON.parse(JSON.stringify(produtos)),
    kits:        JSON.parse(JSON.stringify(kits)),
    cupons:      JSON.parse(JSON.stringify(cupons))
  } : null;

  historico.unshift({ msg: msg, ts: new Date().toLocaleString("pt-BR"), snapshot: backupObj });
  if (historico.length > 30) historico = historico.slice(0, 30);
  localStorage.setItem("tb_v3_hist", JSON.stringify(historico));
  if (typeof fbSaveHistorico === "function") {
    fbSaveHistorico(historico).catch(function(e){ console.warn("Backlog Firebase:", e); });
  }
}

function restoreHist(i) {
  if (!confirm("⚠️ MÁQUINA DO TEMPO: Tem certeza que deseja apagar o estado atual e voltar tudo exatamente como estava neste momento?")) return;
  var snap = historico[i].snapshot;
  if (!snap) return;

  produtos    = JSON.parse(JSON.stringify(snap.produtos    || []));
  kits        = JSON.parse(JSON.stringify(snap.kits        || []));
  cupons      = JSON.parse(JSON.stringify(snap.cupons      || []));

  selectedIdx = null;
  saveData();
  renderSidebar();
  fbSync();
  renderEmptyProd();
  renderHist();
  toast("✅ Sistema restaurado para " + historico[i].ts + "!");
}

/* ── Atualiza contadores no header ── */
function updateHdr() {
  var a = produtos.filter(function(p){ return p.ativo !== false; }).length;
  var s = produtos.filter(function(p){ return p.estoque === 0; }).length;
  document.getElementById("hdrInfo").textContent = a + " ativos" + (s ? " · " + s + " sem estoque" : "");
}

/* ── Salvar tudo (botão manual) ── */
function salvarTudo() {
  saveData();
  renderSidebar();
  fbSync();
  toast("✓ Salvo!");
}

/* ── Export produtos.js ── */
function buildJS() {
  return "var PRODUTOS=" + JSON.stringify(produtos, null, 2)
    + ";\n\nvar KITS=" + JSON.stringify(kits, null, 2)
    + ";\n\nvar DEPOIMENTOS=" + JSON.stringify(depoimentos, null, 2) + ";\n";
}
function openModal()  { document.getElementById("modalPre").textContent = buildJS(); document.getElementById("modal").classList.add("open"); }
function closeModal() { document.getElementById("modal").classList.remove("open"); }
function downloadJS() {
  var b = new Blob([buildJS()], { type: "text/javascript" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = "produtos.js";
  a.click();
}
function copyJS() { navigator.clipboard.writeText(buildJS()); toast("Copiado!"); }
