/* ══════════════════════════════════════
   bulk.js — Tobaldine Admin
   Importação em massa híbrida (JSON ou texto simples).
   Depende de: utils.js, data.js, sidebar.js
══════════════════════════════════════ */

function openBulk() {
  document.getElementById("modalBulk").classList.add("open");
  document.getElementById("bulkText").value = "";
  document.getElementById("bulkPreview").style.display = "none";
  document.getElementById("bulkError").style.display = "none";
  var btn = document.getElementById("btnProcessBulk");
  btn.disabled = true;
  btn.style.opacity = "0.5";
}

function closeBulk() {
  document.getElementById("modalBulk").classList.remove("open");
}

/* Parseia o texto — retorna array de itens ou null */
function _parseBulkText() {
  var txt   = (document.getElementById("bulkText").value  || "").trim();
  var vol   = (document.getElementById("bulkVol").value   || "100 ml").trim();
  var preco = (document.getElementById("bulkPreco") ? document.getElementById("bulkPreco").value : "R$ 0,00") || "R$ 0,00";
  var sec   = document.getElementById("bulkSec").value;
  if (!txt) return null;

  var items = [];
  try {
    var parsed = JSON.parse(txt);
    if (!Array.isArray(parsed)) throw new Error("não é array");
    parsed.forEach(function(item){
      if (!item.nome) return;
      items.push({
        nome:    item.nome    || "Novo Produto",
        marca:   item.marca   || "",
        familia: item.familia || "",
        desc:    item.desc    || "",
        preco:   item.preco   || preco,
        notas:   item.notas   || { topo: "", corpo: "", fundo: "" }
      });
    });
  } catch(e) {
    txt.split("\n").forEach(function(line){
      line = line.trim();
      if (!line) return;
      var parts = line.split("|");
      if (parts.length < 1) return;
      items.push({
        nome:    parts[0].trim(),
        marca:   "",
        familia: parts.length >= 3 ? parts[1].trim() : "",
        desc:    "",
        preco:   parts.length >= 3 ? parts[2].trim() : (parts[1] || preco).trim(),
        notas:   { topo: "", corpo: "", fundo: "" }
      });
    });
  }
  return items.length ? items : null;
}

/* Preview — mostra lista do que será adicionado */
function previewBulk() {
  var previewEl = document.getElementById("bulkPreview");
  var listEl    = document.getElementById("bulkPreviewList");
  var titleEl   = document.getElementById("bulkPreviewTitle");
  var errEl     = document.getElementById("bulkError");
  var btn       = document.getElementById("btnProcessBulk");
  var txt       = (document.getElementById("bulkText").value || "").trim();

  if (!txt) {
    previewEl.style.display = "none";
    errEl.style.display = "none";
    btn.disabled = true; btn.style.opacity = "0.5";
    return;
  }

  var items = _parseBulkText();
  if (!items) {
    previewEl.style.display = "none";
    errEl.style.display = "block";
    errEl.textContent = "⚠ Não foi possível interpretar o texto. Use o formato Nome | Gênero | Preço (uma por linha) ou JSON válido.";
    btn.disabled = true; btn.style.opacity = "0.5";
    return;
  }

  errEl.style.display = "none";
  titleEl.textContent = items.length + " produto(s) serão adicionados:";
  listEl.innerHTML = items.map(function(item){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:rgba(201,168,76,0.04);border-radius:4px;border:1px solid var(--border)">'
      + '<span style="font-size:12px;color:var(--text);font-weight:500">' + esc(item.nome) + '</span>'
      + '<span style="font-size:11px;color:var(--muted)">'
        + (item.familia ? esc(item.familia) + ' · ' : '')
        + esc(item.preco)
      + '</span>'
      + '</div>';
  }).join("");
  previewEl.style.display = "block";
  btn.disabled = false; btn.style.opacity = "1";
  btn.textContent = "✓ Adicionar " + items.length + " produto(s)";
}

function processBulk() {
  var items = _parseBulkText();
  if (!items || !items.length) { toast("Nenhum produto para importar"); return; }

  var sec = document.getElementById("bulkSec").value;
  var vol = (document.getElementById("bulkVol").value || "100 ml").trim();

  if (!confirm("Confirmar adição de " + items.length + " produto(s) na seção '" + sec + "'?")) return;

  addHist("Importação em massa: " + items.length + " produtos adicionados à seção " + sec, true);

  var badge = { originais: "Original", decants: "Decant", cosmeticos: "VS" }[sec] || "";

  items.forEach(function(item){
    produtos.push({
      secao: sec, badge: badge,
      nome: item.nome, marca: item.marca, familia: item.familia,
      ranking: "", desc: item.desc, notas: item.notas,
      precos: [{ vol: vol, preco: item.preco, custo_bruto: 0, frete_prop: 0, margem_pct: 0 }],
      fotos: [""], ativo: true, estoque: 5, custo: 0, margem: 55, promo: null
    });
  });

  saveData();
  renderSidebar();
  fbSync();
  closeBulk();
  toast("✅ " + items.length + " produtos adicionados com sucesso!");
}
