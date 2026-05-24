/* ══════════════════════════════════════
   lote.js — Tobaldine Admin
   Edição em lote (seleção múltipla na grade).
   Depende de: utils.js, data.js, sidebar.js
══════════════════════════════════════ */

var _loteMode     = false;
var _loteSelected = new Set();

function toggleLoteMode() {
  _loteMode = !_loteMode;
  var btn = document.getElementById("btnLoteMode");
  if (btn) btn.classList.toggle("active-lote", _loteMode);
  if (!_loteMode) { _loteSelected.clear(); updateLoteBar(); }
  if (_currentView === "grade") renderGrade();
  else setView("grade"); /* força grade no lote mode */
}

function toggleLoteCard(idx, e) {
  e.stopPropagation();
  if (_loteSelected.has(idx)) _loteSelected.delete(idx);
  else _loteSelected.add(idx);
  updateLoteBar();

  /* Atualiza visual dos cards sem re-render completo */
  document.querySelectorAll(".g-card[data-idx]").forEach(function(c){
    var i = parseInt(c.dataset.idx);
    c.classList.toggle("lote-selected", _loteSelected.has(i));
    var chk = c.querySelector(".g-card-check");
    if (chk) chk.textContent = _loteSelected.has(i) ? "✓" : "";
  });
}

function updateLoteBar() {
  var bar = document.getElementById("loteBar");
  var cnt = document.getElementById("loteCount");
  var n   = _loteSelected.size;
  if (bar) bar.classList.toggle("visible", n > 0 && _loteMode);
  if (cnt) cnt.textContent = n + " selecionado" + (n !== 1 ? "s" : "");
}

function excluirLote() {
  var n = _loteSelected.size;
  if (!n) { toast("Nenhum produto selecionado"); return; }
  if (!confirm("Excluir " + n + " produto(s) selecionado(s)? Esta ação não pode ser desfeita.")) return;
  addHist("Exclusão em lote: " + n + " produtos removidos", true);
  /* Remove do maior índice para o menor — evita deslocamento de índices */
  var indices = Array.from(_loteSelected).sort(function(a, b){ return b - a; });
  indices.forEach(function(idx){ produtos.splice(idx, 1); });
  selectedIdx = null;
  _loteSelected.clear();
  saveData();
  updateLoteBar();
  renderGrade();
  toast("🗑 " + n + " produto(s) excluído(s)");
}

function limparSelecaoLote() {
  _loteSelected.clear();
  updateLoteBar();
  renderGrade();
}

function aplicarLote() {
  if (!_loteSelected.size) { toast("Nenhum produto selecionado"); return; }
  var badge   = document.getElementById("loteBadge").value.trim();
  var preco   = document.getElementById("lotePreco").value.trim();
  var marca   = document.getElementById("loteMarca").value.trim();
  var secao   = document.getElementById("loteSecao").value;
  var subsecao = (document.getElementById("loteSubsecao") || {}).value || "";
  var n = 0;

  _loteSelected.forEach(function(idx){
    if (badge)  produtos[idx].badge = badge;
    if (preco) {
      var precoFmt = "R$ " + parseFloat(preco).toFixed(2).replace(".", ",");
      if (produtos[idx].precos && produtos[idx].precos.length) {
        produtos[idx].precos[0].preco = precoFmt;
      } else {
        produtos[idx].preco = parseFloat(preco);
      }
    }
    if (marca)          produtos[idx].marca   = marca;
    if (secao)          produtos[idx].secao   = secao;
    if (subsecao.trim()) produtos[idx].subsecao = subsecao.trim();
    n++;
  });

  saveData();
  toast("✓ " + n + " produtos atualizados!");
  limparSelecaoLote();
}
