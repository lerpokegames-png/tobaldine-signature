/* ══════════════════════════════════════
   tabs.js — Tobaldine Admin
   Gerenciamento de abas, Kits, Depoimentos,
   Cupons, Dashboard, Histórico, PDF, Preview
   e inicialização do DOMContentLoaded.
   Carregado por último.
   Depende de: todos os outros módulos
══════════════════════════════════════ */

/* ── Controle de abas ── */
function switchTab(name, btn) {
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.remove("active"); });
  btn.classList.add("active");
  var tabs = {
    produtos: "tProdutos", kits: "tKits", cupons: "tCupons",
    dashboard: "tDash", config: "tConf", historico: "tHist",
    textos: "tTextos"
  };
  Object.values(tabs).forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  var show = tabs[name];
  if (show) {
    document.getElementById(show).style.display = "";
    if (name === "produtos" && selectedIdx === null) renderEmptyProd();
  }
  if (name === "cupons")    renderCupons();
  if (name === "dashboard") renderDash();
  if (name === "config")    renderConf();
  if (name === "historico") renderHist();
  if (name === "kits")      renderKits();
  if (name === "textos")    renderTextos();
}

/* ── Dashboard ── */
function renderDash() {
  var el = document.getElementById("tDash");
  if (!el) return;
  var ativos   = produtos.filter(function(p){ return p.ativo !== false; }).length;
  var semFoto  = produtos.filter(function(p){ return !p.fotos || !p.fotos.filter(function(f){ return f && f.trim(); }).length; }).length;
  var semPreco = produtos.filter(function(p){ return !p.precos || !p.precos.length || !p.precos[0].preco; }).length;

  var statCard = function(label, value, sub, color){
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px;flex:1;min-width:140px">'
      + '<div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">' + label + '</div>'
      + '<div style="font-size:26px;font-weight:600;color:' + (color || "var(--text)") + '">' + value + '</div>'
      + (sub ? '<div style="font-size:10px;color:var(--muted);margin-top:4px">' + sub + '</div>' : '')
      + '</div>';
  };

  el.innerHTML = '<h3 style="font-size:13px;color:var(--gold);margin-bottom:16px">Dashboard</h3>'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px">'
    + statCard("Produtos Ativos", ativos,   produtos.length + " total")
    + statCard("Sem Foto",        semFoto,  "precisam de foto",  semFoto  > 0 ? "#e8a030" : "#4caf79")
    + statCard("Sem Preço",       semPreco, "precisam de preço", semPreco > 0 ? "#e8a030" : "#4caf79")
    + statCard("Kits",            kits.length, "cadastrados", "var(--gold)")
    + '</div>'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap">'
    + '<button class="btn btn-outline" onclick="previewCatalogo()">👁 Ver Catálogo</button>'
    + '</div>';
}

/* ── Kits ── */
function renderKits() {
  var el = document.getElementById("tKits");
  el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="font-size:13px;color:var(--gold)">Kits (' + kits.length + ')</h3><button class="btn btn-gold btn-sm" onclick="addKit()">+ Novo Kit</button></div>'
    + kits.map(function(k, i){
        return '<div class="depf"><div class="dephdr"><span>' + esc(k.nome || "Kit") + '</span><button class="btn btn-red btn-sm" onclick="rmKit(' + i + ')">Remover</button></div>'
          + '<div class="fg" style="gap:12px">'
          + '<div class="field"><label>Nome</label><input type="text" value="' + esc(k.nome || "") + '" onchange="setKit(' + i + ',\'nome\',this.value)"/></div>'
          + '<div class="field"><label>Preço</label><input type="text" value="' + esc(k.preco || "") + '" onchange="setKit(' + i + ',\'preco\',this.value)"/></div>'
          + '<div class="field ff"><label>Descrição</label><textarea onchange="setKit(' + i + ',\'desc\',this.value)">' + esc(k.desc || "") + '</textarea></div>'
          + '<div class="field ff"><label>Foto (URL)</label><input type="text" value="' + esc((k.fotos && k.fotos[0]) || "") + '" onchange="setKit(' + i + ',\'foto\',this.value)"/></div>'
          + '</div></div>';
      }).join("");
}
function addKit() { kits.push({ nome: "Novo Kit", desc: "", preco: "R$ 0,00", produtos: [], fotos: [""], ativo: true }); saveData(); renderKits(); }
function rmKit(i) { kits.splice(i, 1); saveData(); renderKits(); }
function setKit(i, k, v) { if (k === "foto") kits[i].fotos = [v]; else kits[i][k] = v; saveData(); }


/* ── Cupons ── */
function renderCupons() {
  var el = document.getElementById("tCupons");
  el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    + '<h3 style="font-size:13px;color:var(--gold)">Cupons Ativos & Afiliados (' + cupons.length + ')</h3>'
    + '<button class="btn btn-gold btn-sm" onclick="addCupom()">+ Criar Novo Cupom</button></div>'
    + cupons.map(function(c, i){
        return '<div class="depf">'
          + '<div class="dephdr"><span>CÓDIGO: ' + esc((c.codigo || "NOVO").toUpperCase()) + '</span><button class="btn btn-red btn-sm" onclick="rmCupom(' + i + ')">Excluir</button></div>'
          + '<div class="fg" style="gap:12px">'
          + '<div class="field"><label>Código do Cupom</label><input type="text" value="' + esc(c.codigo || "") + '" onchange="setCupom(' + i + ',\'codigo\',this.value.toUpperCase().trim())"/></div>'
          + '<div class="field"><label>Tipo de Desconto</label><select onchange="setCupom(' + i + ',\'tipo\',this.value)"><option value="porcentagem"' + (c.tipo === "porcentagem" ? " selected" : "") + '>Porcentagem (%)</option><option value="fixo"' + (c.tipo === "fixo" ? " selected" : "") + '>Fixo (R$)</option></select></div>'
          + '<div class="field"><label>Valor do Desconto</label><input type="number" value="' + (c.valor || 0) + '" onchange="setCupom(' + i + ',\'valor\',parseFloat(this.value)||0)"/></div>'
          + '<div class="field"><label>Afiliado?</label><select onchange="setCupom(' + i + ',\'afiliado\',this.value===\'true\')"><option value="false"' + (!c.afiliado ? " selected" : "") + '>Não</option><option value="true"' + (c.afiliado ? " selected" : "") + '>Sim</option></select></div>'
          + '</div></div>';
      }).join("")
    + '<button class="btn btn-gold" style="margin-top:12px" onclick="salvarCupons()">✓ Salvar Cupons</button>';
}
function addCupom() { cupons.push({ codigo: "CUPOM10", tipo: "porcentagem", valor: 10, afiliado: false, nome: "" }); saveData(); renderCupons(); }
function rmCupom(i) { if (!confirm("Deletar cupom?")) return; cupons.splice(i, 1); saveData(); renderCupons(); }
function setCupom(i, k, v) { cupons[i][k] = v; saveData(); }
function salvarCupons() { saveData(); _fbSaveCupons(); toast("Cupons gravados!"); }

/* ── Histórico (Time Machine) ── */
function renderHist() {
  var el = document.getElementById("tHist");
  if (historico.length === 0) {
    el.innerHTML = '<p style="color:var(--muted);font-size:12px;text-align:center;padding:40px;">Nenhum histórico disponível ainda.</p>';
    return;
  }
  var html = '<h3 style="font-size:13px;color:var(--gold);margin-bottom:10px">🔙 Linha do Tempo (Backlog)</h3>'
    + '<p style="font-size:11px;color:var(--muted);margin-bottom:20px;max-width:500px;line-height:1.5">Sempre que apagar um produto, usar exclusão em massa ou importar uma nova lista, o sistema tira uma "fotografia" da base de dados segundos antes do ato. Se arrependeu? Clique em Restaurar.</p>'
    + historico.map(function(h, i){
        var canRestore = h.snapshot ? true : false;
        var btn = canRestore
          ? '<button class="btn btn-gold btn-sm" onclick="restoreHist(' + i + ')">Restaurar para este ponto</button>'
          : '<span style="font-size:10px;color:var(--muted)">Sem dados</span>';
        return '<div class="depf" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
          + '<div style="flex:1"><strong style="color:var(--text);font-size:12px">' + esc(h.msg) + '</strong><br>'
          + '<span style="font-size:10px;color:var(--muted);margin-top:4px;display:block">Registrado em: ' + h.ts + '</span></div>'
          + '<div>' + btn + '</div>'
          + '</div>';
      }).join("");
  el.innerHTML = html;
}

/* ── PDF ── */
function gerarPDF() {
  var win = window.open("", "_blank", "width=900,height=700");
  if (!win) { toast("Permita pop-ups para gerar o PDF"); return; }
  var rows = "";
  SECOES.forEach(function(sec){
    var secProd = produtos.filter(function(p){ return p.secao === sec.id && p.ativo !== false; });
    if (!secProd.length) return;
    rows += '<tr style="background:#1a1714"><td colspan="4" style="padding:10px 14px;font-size:13px;color:#c9a84c;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">' + sec.lbl + ' (' + secProd.length + ')</td></tr>';
    secProd.forEach(function(p){
      var preco    = (p.precos && p.precos[0] && p.precos[0].preco) ? p.precos[0].preco : (p.preco ? "R$ " + parseFloat(p.preco).toFixed(2).replace(".", ",") : "—");
      var foto     = (p.fotos && p.fotos[0]) ? p.fotos[0] : "";
      var fotoHtml = foto
        ? '<img src="' + foto + '" style="width:60px;height:80px;object-fit:contain;border-radius:4px;background:#0d0b09"/>'
        : '<div style="width:60px;height:80px;background:#111;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#444;font-size:9px">Sem foto</div>';
      rows += '<tr style="border-bottom:1px solid #2a2520">'
        + '<td style="padding:8px 14px;width:70px">' + fotoHtml + '</td>'
        + '<td style="padding:8px 14px;font-size:12px;color:#f0e8d8;font-weight:500">' + esc(p.nome || "") + '</td>'
        + '<td style="padding:8px 14px;font-size:11px;color:#9a8c78">' + esc(p.badge || "") + '</td>'
        + '<td style="padding:8px 14px;font-size:13px;color:#c9a84c;font-weight:600;text-align:right">' + preco + '</td>'
        + '</tr>';
    });
  });
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Tobaldine Signature · Lista de Produtos</title>'
    + '<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#080706;color:#f0e8d8;font-family:"DM Sans",system-ui,sans-serif;padding:24px}h1{font-family:Georgia,serif;font-weight:300;font-size:24px;color:#c9a84c;margin-bottom:4px}p{font-size:11px;color:#9a8c78;margin-bottom:20px}table{width:100%;border-collapse:collapse;background:#0d0b09;border-radius:8px;overflow:hidden}tr:hover td{background:rgba(255,255,255,0.02)}@media print{body{background:#fff;color:#000}table{border:1px solid #ddd}td{color:#000!important}h1,p{color:#000!important}}</style></head><body>'
    + '<h1>✦ Tobaldine Signature</h1>'
    + '<p>' + produtos.filter(function(p){ return p.ativo !== false; }).length + ' produtos ativos · Gerado em ' + new Date().toLocaleDateString("pt-BR") + '</p>'
    + '<table><tbody>' + rows + '</tbody></table>'
    + '<script>window.onload=function(){window.print();}<\/script>'
    + '</body></html>';
  win.document.write(html);
  win.document.close();
}

/* ── Preview do catálogo ── */
function previewCatalogo() {
  window.open("https://tobaldine-signature.web.app", "_blank");
}

/* ── Versão do build no header ── */
(function(){
  var d   = new Date(document.lastModified);
  var ver = d.getDate().toString().padStart(2, "0") + "/"
    + (d.getMonth() + 1).toString().padStart(2, "0") + " "
    + d.getHours().toString().padStart(2, "0") + ":"
    + d.getMinutes().toString().padStart(2, "0");
  var el = document.getElementById("buildVer");
  if (el) el.textContent = "· v" + ver;
})();

/* ══════════════════════════════════════
   INICIALIZAÇÃO (DOMContentLoaded)
══════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", function(){
  loadData();       /* cache local imediatamente (UI rápida) */
  renderSidebar();  /* renderiza enquanto Firebase carrega */

  /* Aguarda Firebase estar pronto */
  var _fbWait = 0;
  var _fbInterval = setInterval(function(){
    _fbWait++;
    if (typeof window.firebaseDB !== "undefined" && window.firebaseDB) {
      clearInterval(_fbInterval);
      loadFromFirebase(window.firebaseDB);
    } else if (_fbWait > 40) { /* 4s timeout — fica no cache local */
      clearInterval(_fbInterval);
      var fbSt = document.getElementById("fbStatus");
      if (fbSt) { fbSt.textContent = "⚠ Firebase offline · usando cache local"; fbSt.style.background = "rgba(192,76,76,0.15)"; fbSt.style.color = "#c04c4c"; }
    }
  }, 100);
});
