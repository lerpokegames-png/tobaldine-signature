/* ══════════════════════════════════════
   caixa.js — Tobaldine Admin
   Controle financeiro (entradas/saídas).
   Depende de: utils.js, pedidos.js
══════════════════════════════════════ */

var caixaLancamentos = [];
try { var _cx = localStorage.getItem("tb_v3_caixa"); if (_cx) caixaLancamentos = JSON.parse(_cx); } catch(e) {}

function saveCaixa() {
  localStorage.setItem("tb_v3_caixa", JSON.stringify(caixaLancamentos));
}

function renderCaixa() {
  var el = document.getElementById("tCaixa");
  if (!el) return;

  var entradas = caixaLancamentos.filter(function(l){ return l.tipo === "entrada"; }).reduce(function(a, l){ return a + l.valor; }, 0);
  var saidas   = caixaLancamentos.filter(function(l){ return l.tipo === "saida";   }).reduce(function(a, l){ return a + l.valor; }, 0);
  var saldo    = entradas - saidas;

  var pedidosPendentes = pedidos.filter(function(p){ return p.status === "pendente"; });
  var totalPendente    = pedidosPendentes.reduce(function(a, p){ return a + parsePreco(p.total || 0); }, 0);
  var itensPendentes   = pedidosPendentes.reduce(function(a, p){ return a + (p.itens || []).reduce(function(b, i){ return b + (i.qty || 1); }, 0); }, 0);

  var cor = function(v){ return v >= 0 ? "#4caf79" : "#c04c4c"; };
  var fmt = function(v){ return "R$ " + Math.abs(v).toFixed(2).replace(".", ","); };

  var avisoHtml = "";
  if (pedidosPendentes.length > 0 && itensPendentes < 5) {
    avisoHtml = '<div class="caixa-aviso">⏳ Você tem ' + pedidosPendentes.length + ' pedido(s) pendente(s) com ' + itensPendentes + ' produto(s) — faltam ' + (5 - itensPendentes) + ' para atingir o mínimo do fornecedor. Não confirme os pedidos ainda.</div>';
  } else if (pedidosPendentes.length > 0 && itensPendentes >= 5) {
    avisoHtml = '<div class="caixa-aviso" style="border-color:rgba(76,175,121,0.3);background:rgba(76,175,121,0.08);color:#4caf79">🚀 Lote pronto! ' + itensPendentes + ' produtos pendentes · ' + fmt(totalPendente) + ' a receber. Confirme os pedidos, receba os PIX e peça ao fornecedor.</div>';
  }

  var saldoHtml = '<div class="caixa-saldo">'
    + '<div class="caixa-card"><div class="caixa-card-label">Entradas (PIX)</div><div class="caixa-card-value" style="color:#4caf79">' + fmt(entradas) + '</div><div class="caixa-card-sub">recebido de clientes</div></div>'
    + '<div class="caixa-card"><div class="caixa-card-label">Saídas</div><div class="caixa-card-value" style="color:#c04c4c">' + fmt(saidas) + '</div><div class="caixa-card-sub">pago ao fornecedor</div></div>'
    + '<div class="caixa-card" style="border-color:rgba(201,168,76,0.35)"><div class="caixa-card-label">Saldo</div><div class="caixa-card-value" style="color:' + cor(saldo) + '">' + fmt(saldo) + '</div><div class="caixa-card-sub">' + (saldo >= 0 ? "disponível" : "atenção: negativo") + '</div></div>'
    + (totalPendente > 0
        ? '<div class="caixa-card"><div class="caixa-card-label">A Receber</div><div class="caixa-card-value" style="color:#e8a030">' + fmt(totalPendente) + '</div><div class="caixa-card-sub">' + pedidosPendentes.length + ' pedido(s) aguardando PIX</div></div>'
        : '')
    + '</div>';

  var formHtml = '<div class="caixa-form">'
    + '<div class="field"><label>Tipo</label><select id="cxTipo"><option value="entrada">📥 Entrada (PIX do cliente)</option><option value="saida">📤 Saída (fornecedor/outro)</option></select></div>'
    + '<div class="field"><label>Valor (R$)</label><input type="number" id="cxValor" placeholder="0,00" step="0.01" min="0"/></div>'
    + '<div class="field"><label>Descrição</label><input type="text" id="cxDesc" placeholder="Ex: Pedro · Yara Tous"/></div>'
    + '<button class="btn btn-gold" onclick="addLancamento()" style="margin-bottom:1px">+ Lançar</button>'
    + '</div>';

  var listaHtml = caixaLancamentos.length === 0
    ? '<div class="empty" style="height:120px"><p>Nenhum lançamento ainda.</p></div>'
    : '<div class="caixa-list">'
      + caixaLancamentos.slice().reverse().map(function(l, ri){
          var i    = caixaLancamentos.length - 1 - ri;
          var icon = l.tipo === "entrada" ? "💚" : "🔴";
          var sinal = l.tipo === "entrada" ? "+" : "-";
          var cor2  = l.tipo === "entrada" ? "#4caf79" : "#c04c4c";
          return '<div class="caixa-item ' + l.tipo + '">'
            + '<span class="caixa-item-icon">' + icon + '</span>'
            + '<div class="caixa-item-desc"><strong>' + esc(l.desc || l.tipo) + '</strong><span>' + esc(l.data || "") + '</span></div>'
            + '<span class="caixa-item-valor" style="color:' + cor2 + '">' + sinal + ' ' + fmt(l.valor) + '</span>'
            + '<button class="caixa-item-del" onclick="delLancamento(' + i + ')" title="Remover">✕</button>'
            + '</div>';
        }).join("")
      + '</div>';

  el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    + '<h3 style="font-size:13px;color:var(--gold)">💰 Caixa · Controle Financeiro</h3>'
    + '<button class="btn btn-outline btn-sm" onclick="zerarCaixa()">🗑 Zerar</button>'
    + '</div>'
    + avisoHtml + saldoHtml + formHtml + listaHtml;
}

function zerarCaixa() {
  if (confirm("Zerar todos os lançamentos?")) { caixaLancamentos = []; saveCaixa(); renderCaixa(); }
}

function addLancamento() {
  var tipo  = document.getElementById("cxTipo").value;
  var valor = parseFloat(document.getElementById("cxValor").value);
  var desc  = document.getElementById("cxDesc").value.trim();
  if (!valor || valor <= 0) { toast("Informe o valor"); return; }
  var agora = new Date();
  caixaLancamentos.push({
    tipo: tipo, valor: valor,
    desc: desc || (tipo === "entrada" ? "PIX recebido" : "Pagamento fornecedor"),
    data: agora.toLocaleDateString("pt-BR") + " " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  });
  saveCaixa();
  toast("✓ Lançado!");
  renderCaixa();
}

function delLancamento(i) {
  caixaLancamentos.splice(i, 1);
  saveCaixa();
  renderCaixa();
}
