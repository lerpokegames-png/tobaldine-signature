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
