/* ══════════════════════════════════════
   sidebar.js — Tobaldine Admin
   Sidebar (lista), grade de produtos, troca de view,
   drag-and-drop, busca rápida.
   Depende de: utils.js, data.js, lote.js
══════════════════════════════════════ */

var _currentView = "lista";

/* ── Painel vazio (nenhum produto selecionado) ── */
function renderEmptyProd() {
  document.getElementById("tProdutos").innerHTML =
    '<div class="empty" id="emptyProd">'
    + '<div style="font-size:32px;opacity:.3">✦</div>'
    + '<p>Selecione um produto ou adicione novo</p>'
    + '</div>';
}

/* ── Alterna entre lista e grade ── */
function setView(v) {
  _currentView = v;
  document.getElementById("btnLista").classList.toggle("active", v === "lista");
  document.getElementById("btnGrade").classList.toggle("active", v === "grade");
  document.getElementById("sidebarWrap").style.display = v === "lista" ? "" : "none";

  if (v === "grade") {
    if (!document.getElementById("tProdutos")) _restoreMainTabs();
    document.getElementById("tProdutos").style.display = "";
    renderGrade();
  } else {
    if (!document.getElementById("tProdutos")) _restoreMainTabs();
    renderSidebar();
    if (selectedIdx !== null) renderForm(); else renderEmptyProd();
  }
}

/* ── Reconstrói os painéis do main quando renderGrade() os destruiu ── */
function _restoreMainTabs() {
  var main = document.getElementById("main");
  main.innerHTML =
    '<div class="tabs" id="tabBar">'
    + '<div class="tab active" onclick="switchTab(\'produtos\',this)">Produtos</div>'
    + '<div class="tab" onclick="switchTab(\'kits\',this)">Kits</div>'
    + '<div class="tab" onclick="switchTab(\'cupons\',this)">Cupons &amp; Afiliados</div>'
    + '<div class="tab" onclick="switchTab(\'dashboard\',this)">Dashboard</div>'
    + '<div class="tab" onclick="switchTab(\'config\',this)">Config</div>'
    + '<div class="tab" onclick="switchTab(\'historico\',this)">Histórico (Backlog)</div>'
    + '<div class="tab" onclick="switchTab(\'pedidos\',this)" style="color:#4caf79">📦 Pedidos</div>'
    + '<div class="tab" onclick="switchTab(\'caixa\',this)" style="color:#4caf79">💰 Caixa</div>'
    + '<div class="tab" onclick="switchTab(\'textos\',this)">✏️ Textos</div>'
    + '</div>'
    + '<div id="tProdutos"></div>'
    + '<div id="tPedidos" style="display:none;max-width:900px"></div>'
    + '<div id="tCaixa" style="display:none;max-width:800px"></div>'
    + '<div id="tTextos" style="display:none;max-width:700px"></div>'
    + '<div id="tKits" style="display:none;max-width:800px"></div>'
    + '<div id="tCupons" style="display:none;max-width:800px"></div>'
    + '<div id="tDash" style="display:none"></div>'
    + '<div id="tConf" style="display:none;max-width:600px"></div>'
    + '<div id="tHist" style="display:none;max-width:800px"></div>';
}

/* ── Grade de produtos ── */
function renderGrade() {
  var tProd = document.getElementById("tProdutos");
  if (!tProd) return;

  var gradeHtml = '<div id="gradeContainer" style="padding:0">';
  gradeHtml += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  gradeHtml += '<span style="font-size:12px;color:var(--muted)">' + produtos.filter(function(p){ return p.ativo !== false; }).length + ' ativos · ' + produtos.length + ' total</span>';
  gradeHtml += '</div>';
  gradeHtml += '<div class="grade-wrap" id="gradeWrap"></div></div>';

  if (selectedIdx !== null) {
    tProd.innerHTML =
      '<div style="display:flex;gap:20px;height:100%">'
      + '<div style="flex:1;overflow-y:auto">' + gradeHtml + '</div>'
      + '<div style="width:420px;flex-shrink:0;overflow-y:auto;border-left:1px solid var(--border);padding-left:20px;position:sticky;top:0;align-self:flex-start;max-height:calc(100vh - 80px)" id="gradeEdit">'
      + '<div style="display:flex;justify-content:flex-end;margin-bottom:8px">'
      + '<button onclick="selectedIdx=null;renderGrade()" style="background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px">✕ Fechar</button>'
      + '</div>'
      + '<div id="gradeFormPanel"></div>'
      + '</div>'
      + '</div>';
  } else {
    tProd.innerHTML = gradeHtml;
  }

  /* Botão + Novo flutuante (sidebar está oculta na grade) */
  var container = document.getElementById("gradeContainer");
  if (container) {
    var btnNovo = document.createElement("button");
    btnNovo.className = "btn btn-gold btn-sm";
    btnNovo.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:100;border-radius:50px;padding:10px 20px;box-shadow:0 4px 16px rgba(0,0,0,0.4)";
    btnNovo.textContent = "+ Novo Produto";
    btnNovo.onclick = function(){ addProd(); setView("lista"); };
    container.appendChild(btnNovo);
  }

  var wrap = document.getElementById("gradeWrap");
  if (!wrap) return;
  var h = "";

  SECOES.forEach(function(sec){
    var secProd = produtos.filter(function(p){ return (p.secao || "").toLowerCase() === sec.id.toLowerCase(); });
    if (!secProd.length) return;
    h += '<div class="grade-sec">' + sec.lbl + ' (' + secProd.length + ')</div>';

    produtos.forEach(function(p, i){
      if ((p.secao || "").toLowerCase() !== sec.id.toLowerCase()) return;
      var foto  = (Array.isArray(p.fotos) && p.fotos[0]) ? p.fotos[0] : null;
      var pos   = (p.fotosPos && p.fotosPos[0]) ? p.fotosPos[0] : "50% 50%";
      var zoom  = (p.fotosZoom && p.fotosZoom[0]) ? parseFloat(p.fotosZoom[0]) : 1;
      var imgStyle = "object-position:" + pos + ";transform:scale(" + zoom + ");transform-origin:" + pos;
      var preco = "";
      if (p.precos && p.precos.length && p.precos[0].preco) preco = p.precos[0].preco;
      else if (p.preco) preco = "R$ " + parseFloat(p.preco).toFixed(2).replace(".", ",");

      var isActive     = selectedIdx === i;
      var loteSelClass = (_loteMode && _loteSelected.has(i)) ? " lote-selected" : "";
      var cardClick    = _loteMode ? "toggleLoteCard(" + i + ",event)" : "selProdGrade(" + i + ")";

      h += '<div class="g-card' + (isActive && !_loteMode ? " active" : "") + loteSelClass + '" data-idx="' + i + '" onclick="' + cardClick + '">'
        + (_loteMode ? '<div class="g-card-check">' + (_loteSelected.has(i) ? "✓" : "") + '</div>' : '')
        + (foto
            ? '<img class="g-card-img" src="' + foto + '" style="' + imgStyle + '" loading="lazy"/>'
            : '<div class="g-card-img-empty">Sem foto</div>')
        + '<div class="g-card-badges">'
        + (p.ativo === false ? '<span class="sbadge boff">off</span>' : '<span class="sbadge bon">on</span>')
        + (p.estoque === 0 ? '<span class="sbadge blow">vazio</span>' : '')
        + '</div>'
        + '<button class="g-card-del" onclick="delProd(event,' + i + ')" title="Excluir">✕</button>'
        + '<div class="g-card-body">'
        + '<div class="g-card-name" title="' + esc(p.nome || "") + '">' + esc((p.nome || "Sem nome").trim()) + '</div>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:4px;margin-top:3px">'
        + (preco ? '<div class="g-card-price">' + preco + '</div>' : '<div style="font-size:9px;color:rgba(192,76,76,0.7)">sem preço</div>')
        + (p.badge
            ? '<div style="font-size:9px;color:var(--muted);background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.15);border-radius:3px;padding:1px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px">' + esc(p.badge) + '</div>'
            : '<div style="font-size:9px;color:rgba(192,76,76,0.6)">sem badge</div>')
        + '</div>'
        + '</div></div>';
    });
  });

  wrap.innerHTML = h;
  if (selectedIdx !== null) {
    var panel = document.getElementById("gradeFormPanel");
    if (panel) renderForm();
  }
}

function selProdGrade(idx) {
  selectedIdx = idx;
  renderGrade();
}

/* ── Sidebar (lista) ── */
function renderSidebar() {
  var h = "";
  SECOES.forEach(function(sec){
    h += '<div class="sec-lbl">' + sec.lbl + '</div>';
    produtos.forEach(function(p, i){
      if (p.secao !== sec.id) return;
      var ab = p.ativo === false ? '<span class="sbadge boff">off</span>' : '<span class="sbadge bon">on</span>';
      var sb = p.estoque === 0 ? '<span class="sbadge blow">vazio</span>' : '';
      h += '<div class="p-item' + (selectedIdx === i ? ' active' : '') + '" onclick="selProd(' + i + ')" draggable="true"'
        + ' ondragstart="dsStart(event,' + i + ')" ondragover="dsOver(event)" ondrop="dsDrop(event,' + i + ')" ondragend="dsEnd()">'
        + '<span class="drag-hdl">⋮</span>'
        + '<div style="flex:1"><div class="pname">' + esc((p.nome || '?').trim()) + '</div>'
        + '<div class="pmeta">' + esc((p.familia || '').trim().substring(0, 30)) + '</div></div>'
        + '<span>' + ab + sb + '</span>'
        + '<button class="del-btn" onclick="delProd(event,' + i + ')">✕</button></div>';
    });
    h += '<button class="add-btn" onclick="addProd(\'' + sec.id + '\')">+ Novo</button>';
  });
  document.getElementById("sidebar").innerHTML = h;
  updateHdr();
  if (_currentView === "grade") renderGrade();
}

/* ── Drag-and-drop para reordenar ── */
function dsStart(e, i) { dragSrc = i; e.currentTarget.classList.add("dragging"); }
function dsOver(e) { e.preventDefault(); }
function dsEnd() { document.querySelectorAll(".p-item").forEach(function(el){ el.classList.remove("dragging"); }); }
function dsDrop(e, to) {
  e.preventDefault();
  if (dragSrc === null || dragSrc === to) return;
  var item = produtos.splice(dragSrc, 1)[0];
  produtos.splice(to, 0, item);
  if (selectedIdx === dragSrc) selectedIdx = to;
  dragSrc = null;
  saveData();
  renderSidebar();
}

/* ── Seleção e CRUD de produtos ── */
function selProd(idx) { selectedIdx = idx; renderSidebar(); renderForm(); }

function addProd(sec) {
  var badge      = sec === "originais" ? "Original" : (sec === "cosmeticos" ? "VS" : "Decant");
  var volDefault = sec === "originais" ? "100 ml" : "10 ml";
  produtos.push({
    secao: sec, badge: badge, nome: "Novo Produto", marca: "", familia: "", ranking: "", desc: "",
    notas: { topo: "", corpo: "", fundo: "" },
    precos: [{ vol: volDefault, preco: "R$ 0,00", custo_bruto: 0, frete_prop: 0, margem_pct: 0 }],
    fotos: [""], ativo: true, estoque: 5, custo: 0, margem: 55, promo: null
  });
  saveData();
  selProd(produtos.length - 1);
}

function delProd(e, idx) {
  e.stopPropagation();
  if (!confirm('Remover "' + produtos[idx].nome + '"?')) return;
  addHist("Exclusão Manual: " + produtos[idx].nome, true);
  produtos.splice(idx, 1);
  saveData();
  if (selectedIdx >= produtos.length) selectedIdx = null;
  renderSidebar();
  renderEmptyProd();
}

/* ── Voltar da edição para a lista/grade ── */
function voltarLista() {
  selectedIdx = null;
  if (_currentView === "grade") {
    var gradeEdit = document.getElementById("gradeEdit");
    if (gradeEdit) gradeEdit.innerHTML = "";
    renderGrade();
  } else {
    renderSidebar();
    renderEmptyProd();
  }
}

/* ── Busca rápida na sidebar ── */
function filterSidebar(q) {
  q = q.toLowerCase().trim();
  document.querySelectorAll(".p-item").forEach(function(el){
    var name = (el.querySelector(".pname") || {}).textContent || "";
    var meta = (el.querySelector(".pmeta") || {}).textContent || "";
    el.style.display = (!q || name.toLowerCase().includes(q) || meta.toLowerCase().includes(q)) ? "" : "none";
  });
  document.querySelectorAll(".sec-lbl").forEach(function(el){
    el.style.display = q ? "none" : "";
  });
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  filterSidebar("");
}
