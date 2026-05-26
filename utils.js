/* ══════════════════════════════════════
   utils.js — Tobaldine Admin
   Funções utilitárias compartilhadas.
   Carregado primeiro — sem dependências.
══════════════════════════════════════ */

function toast(msg) {
  var el = document.getElementById("toastEl");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(function(){ el.classList.remove("show"); }, 2500);
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ── parsePreco: converte "R$ 59,90" ou 59.9 para número float ──
   Compartilhada entre admin (pedidos.js, caixa.js) e catálogo.
   parseFloat("R$ 59,90") retorna NaN — esta função resolve isso. */
function parsePreco(str) {
  return parseFloat(
    String(str || "0")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  ) || 0;
}
