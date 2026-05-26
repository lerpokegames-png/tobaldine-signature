/* ══════════════════════════════════════
   pedidos.js — Tobaldine Admin
   Gestão de pedidos (dropshipping).
   Depende de: utils.js, data.js
══════════════════════════════════════ */

var pedidos = [];
try { var _pedStr = localStorage.getItem("tb_v3_pedidos"); if (_pedStr) pedidos = JSON.parse(_pedStr); } catch(e) {}

function savePedidos() {
  localStorage.setItem("tb_v3_pedidos", JSON.stringify(pedidos));
  if (typeof window.firebaseDB !== "undefined" && window.firebaseDB) {
    window.firebaseDB.ref("pedidos").set(pedidos).catch(function(e){
      console.warn("Erro ao salvar pedidos no Firebase:", e);
    });
  }
}

function renderPedidos() {
  var el = document.getElementById("tPedidos");
  if (!el) return;

  var pendentes    = pedidos.filter(function(p){ return p.status === "pendente"; });
  var totalItens   = pendentes.reduce(function(acc, p){ return acc + (p.itens || []).reduce(function(a, i){ return a + (i.qty || 1); }, 0); }, 0);
  var totalValor   = pendentes.reduce(function(acc, p){ return acc + (p.total || 0); }, 0);
  var minLote      = 5;
  var faltam       = Math.max(0, minLote - totalItens);
  var entregaHoje  = new Date().getHours() < 16;

  /* Alerta do lote */
  var batchHtml = "";
  if (totalItens >= minLote) {
    batchHtml = '<div class="batch-alert">'
      + '<span class="batch-icon">🚀</span>'
      + '<div class="batch-text"><strong>Lote pronto! ' + totalItens + ' produtos · R$ ' + totalValor.toFixed(2).replace(".", ",") + ' em pedidos</strong>'
      + '<span>Você atingiu o mínimo de ' + minLote + '. ' + (entregaHoje ? 'Pedido antes das 16h = entrega hoje!' : 'Pedido agora = entrega amanhã.') + '</span></div>'
      + '<button class="btn btn-gold btn-sm" onclick="gerarMsgFornecedor()">📋 Gerar Pedido</button>'
      + '</div>';
  } else if (totalItens > 0) {
    batchHtml = '<div class="batch-alert batch-alert-warn">'
      + '<span class="batch-icon">⏳</span>'
      + '<div class="batch-text"><strong>' + totalItens + ' de ' + minLote + ' produtos — faltam ' + faltam + ' para atingir o mínimo</strong>'
      + '<span>' + (entregaHoje ? 'Ainda dá tempo de pedir hoje (antes das 16h)' : 'Próxima entrega será amanhã.') + '</span></div>'
      + '</div>';
  }

  /* Form de novo pedido */
  var prodOptions = produtos.filter(function(p){ return p.ativo !== false; }).map(function(p, i){
    var precoNum = parsePreco(
      (p.precos && p.precos[0] && p.precos[0].preco) || p.preco || "0"
    );
    return '<option value="' + i + '">' + esc(p.nome || "?") + (precoNum ? ' · R$' + precoNum.toFixed(2).replace(".", ",") : '') + '</option>';
  }).join("");

  var formHtml = '<div class="novo-pedido-form">'
    + '<h3 style="font-size:12px;color:var(--gold);margin-bottom:12px">+ Registrar Pedido</h3>'
    + '<div class="fg" style="margin-bottom:10px">'
    + '<div class="field"><label>Cliente</label><input type="text" id="npCliente" placeholder="Nome do cliente"/></div>'
    + '<div class="field"><label>WhatsApp</label><input type="text" id="npTel" placeholder="(11) 9xxxx-xxxx"/></div>'
    + '</div>'
    + '<label style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);font-weight:600">Produtos</label>'
    + '<div id="npItens" style="margin:6px 0 10px">'
    + '<div class="pedido-item-row"><select class="np-prod"><option value="">— selecione —</option>' + prodOptions + '</select>'
    + '<input type="number" class="np-qty" value="1" min="1" style="width:60px" placeholder="Qtd"/></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px">'
    + '<button class="btn btn-outline btn-sm" onclick="addItemPedido()">+ Item</button>'
    + '<button class="btn btn-gold" onclick="salvarPedido()">✓ Salvar Pedido</button>'
    + '</div></div>';

  /* Lista de pedidos */
  var listHtml = pedidos.length === 0
    ? '<div class="empty"><p>Nenhum pedido registrado ainda.</p></div>'
    : pedidos.slice().reverse().map(function(p, ri){
        var i          = pedidos.length - 1 - ri;
        var statusCls  = { pendente: "ps-pendente", confirmado: "ps-confirmado", entregue: "ps-entregue", cancelado: "ps-cancelado" }[p.status] || "ps-pendente";
        var itensText  = (p.itens || []).map(function(it){ return it.qty + "x " + it.nome; }).join(", ");
        return '<div class="pedido-card">'
          + '<div class="pedido-hdr"><div><div class="pedido-nome">' + esc(p.cliente) + '</div>'
          + '<div class="pedido-hora">' + esc(p.tel || "") + (p.data ? " · " + p.data : "") + '</div></div>'
          + '<span class="pedido-status ' + statusCls + '">' + p.status.toUpperCase() + '</span></div>'
          + '<div class="pedido-itens">' + esc(itensText) + '</div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center">'
          + '<span class="pedido-total">R$ ' + parsePreco(p.total || 0).toFixed(2).replace(".", ",") + '</span>'
          + '<div style="display:flex;gap:6px">'
          + (p.status === "pendente"   ? '<button class="btn btn-green btn-sm" onclick="setStatusPedido(' + i + ',&quot;confirmado&quot;)">Confirmar</button>' : '')
          + (p.status === "confirmado" ? '<button class="btn btn-gold btn-sm" onclick="setStatusPedido(' + i + ',&quot;entregue&quot;)">Entregue</button>' : '')
          + '<button class="btn btn-outline btn-sm" onclick="setStatusPedido(' + i + ',&quot;cancelado&quot;)" style="color:var(--red)">Cancelar</button>'
          + '<button class="btn btn-outline btn-sm" onclick="abrirWhats(' + i + ')">💬</button>'
          + '</div></div></div>';
      }).join("");

  el.innerHTML = '<h3 style="font-size:13px;color:var(--gold);margin-bottom:14px">📦 Pedidos · ' + pedidos.length + ' total</h3>'
    + batchHtml + formHtml + listHtml;
}

function addItemPedido() {
  var prodOptions = produtos.filter(function(p){ return p.ativo !== false; }).map(function(p, i){
    return '<option value="' + i + '">' + esc(p.nome || "?") + '</option>';
  }).join("");
  var row = document.createElement("div");
  row.className = "pedido-item-row";
  row.innerHTML = '<select class="np-prod"><option value="">— selecione —</option>' + prodOptions + '</select>'
    + '<input type="number" class="np-qty" value="1" min="1" style="width:60px"/>'
    + '<button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:var(--red);cursor:pointer">✕</button>';
  document.getElementById("npItens").appendChild(row);
}

function salvarPedido() {
  var cliente = (document.getElementById("npCliente").value || "").trim();
  var tel     = (document.getElementById("npTel").value     || "").trim();
  if (!cliente) { toast("Informe o nome do cliente"); return; }

  var rows  = document.querySelectorAll("#npItens .pedido-item-row");
  var itens = [];
  var total = 0;

  rows.forEach(function(row){
    var sel = row.querySelector(".np-prod");
    var qty = parseInt(row.querySelector(".np-qty").value) || 1;
    if (!sel || !sel.value) return;
    var p = produtos[parseInt(sel.value)];
    if (!p) return;
    var preco = parsePreco((p.precos && p.precos[0] && p.precos[0].preco) || p.preco || "0");
    itens.push({ nome: p.nome, preco: preco, qty: qty, idx: parseInt(sel.value) });
    total += preco * qty;
  });

  if (!itens.length) { toast("Adicione ao menos 1 produto"); return; }

  var agora = new Date();
  pedidos.push({
    cliente: cliente, tel: tel, itens: itens, total: total, status: "pendente",
    data: agora.toLocaleDateString("pt-BR") + " " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  });
  savePedidos();
  toast("✓ Pedido salvo!");
  renderPedidos();
}

function setStatusPedido(i, status) {
  pedidos[i].status = status;
  savePedidos();
  renderPedidos();
}

function abrirWhats(i) {
  var p        = pedidos[i];
  var itensText = (p.itens || []).map(function(it){
    return it.qty + "x " + it.nome + " (R$" + parsePreco(it.preco).toFixed(2).replace(".", ",") + ")";
  }).join("%0A");
  var msg = "Olá " + p.cliente + "!%0A%0ASeu pedido:%0A" + itensText + "%0A%0ATotal: R$" + parsePreco(p.total).toFixed(2).replace(".", ",");
  window.open("https://wa.me/55" + (p.tel || "").replace(/\D/g, "") + "?text=" + msg, "_blank");
}

function gerarMsgFornecedor() {
  var pendentes = pedidos.filter(function(p){ return p.status === "pendente"; });
  var contagem  = {};
  pendentes.forEach(function(p){
    (p.itens || []).forEach(function(it){
      contagem[it.nome] = (contagem[it.nome] || 0) + it.qty;
    });
  });
  var linhas = Object.entries(contagem).map(function(e){ return e[1] + "x " + e[0]; }).join("\n");
  var msg    = "Pedido Tobaldine:\n" + linhas + "\n\nTotal: " + Object.values(contagem).reduce(function(a, b){ return a + b; }, 0) + " produtos";
  navigator.clipboard.writeText(msg).then(function(){
    toast("✓ Mensagem copiada! Cole no WhatsApp do fornecedor.");
  }).catch(function(){
    prompt("Copie a mensagem abaixo:", msg);
  });
}
