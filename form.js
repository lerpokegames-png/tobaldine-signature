/* ══════════════════════════════════════
   form.js — Tobaldine Admin
   Formulário de edição de produto.
   Depende de: utils.js, data.js, sidebar.js
══════════════════════════════════════ */

function renderForm() {
  if (selectedIdx === null) return;
  var p = produtos[selectedIdx];
  if (!p) return;

  var opts = SECOES.map(function(s){
    return '<option value="' + s.id + '"' + (p.secao === s.id ? " selected" : "") + ">" + s.lbl + "</option>";
  }).join("");

  var arrayFotos = Array.isArray(p.fotos)     ? p.fotos     : [];
  var arrayPos   = Array.isArray(p.fotosPos)  ? p.fotosPos  : [];
  var arrayZoom  = Array.isArray(p.fotosZoom) ? p.fotosZoom : [];

  var fotos = arrayFotos.map(function(f, i){
    var pos      = arrayPos[i]  || "50% 50%";
    var zoom     = arrayZoom[i] != null ? arrayZoom[i] : 1;
    var px       = parseFloat(pos.split(" ")[0]) || 50;
    var py       = parseFloat(pos.split(" ")[1]) || 50;
    var zoomPct  = Math.round(zoom * 100);

    var previewHtml = f
      ? '<div class="foto-picker" onclick="setFocalPoint(event,' + i + ',this)" title="Clique para definir o ponto focal"'
        + ' style="position:relative;width:72px;height:96px;flex-shrink:0;border-radius:6px;overflow:hidden;cursor:crosshair;border:1px solid rgba(201,168,76,0.25);background:#0d0b09;">'
        + '<img src="' + esc(f) + '" style="width:100%;height:100%;object-fit:cover;object-position:' + pos + ';display:block;pointer-events:none;transform:scale(' + zoom + ');transform-origin:' + pos + ';" />'
        + '<div class="focal-dot" style="position:absolute;width:12px;height:12px;border-radius:50%;background:#c9a84c;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.8);transform:translate(-50%,-50%);left:' + px + '%;top:' + py + '%;pointer-events:none;"></div>'
        + '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);font-size:8px;color:#c9a84c;text-align:center;padding:2px;pointer-events:none;">Ponto focal</div>'
        + '</div>'
      : '<div style="width:72px;height:96px;flex-shrink:0;border-radius:6px;background:#161412;border:1px dashed rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;font-size:9px;color:#4a4235;">Sem foto</div>';

    return '<div class="prow" style="align-items:flex-start;gap:10px;">'
      + previewHtml
      + '<div style="flex:1;display:flex;flex-direction:column;gap:6px;">'
      +   '<div style="display:flex;gap:6px;align-items:center">'
      +   '<input type="text" value="' + esc(f) + '" placeholder="URL da foto" onchange="setFoto(' + i + ',this.value)" style="flex:1"/>'
      +   (f ? '<button class="btn btn-outline btn-sm" onclick="removerFundo(' + i + ',this)" title="Remover fundo" style="flex-shrink:0;padding:4px 8px;font-size:11px">✂️ Fundo</button>' : '')
      +   '</div>'
      +   '<input type="text" value="' + pos + '" placeholder="Ponto focal (ex: 50% 30%)" title="Clique no preview ou edite aqui" onchange="setFotoPos(' + i + ',this.value)" style="font-size:11px;color:#c9a84c;"/>'
      +   '<div style="display:flex;align-items:center;gap:8px;">'
      +     '<span style="font-size:9px;color:#4a4235;white-space:nowrap;">🔍 Zoom</span>'
      +     '<input type="range" min="0.4" max="1.6" step="0.05" value="' + zoom + '" oninput="setFotoZoom(' + i + ',parseFloat(this.value),this)" style="flex:1;accent-color:#c9a84c;height:3px;cursor:pointer;"/>'
      +     '<span id="zoom-lbl-' + i + '" style="font-size:9px;color:#c9a84c;width:32px;text-align:right;">' + zoomPct + '%</span>'
      +   '</div>'
      + '</div>'
      + '<button class="rmbtn" style="margin-top:2px" onclick="rmFoto(' + i + ')">✕</button>'
      + '</div>';
  }).join("")
    + '<div style="display:flex;gap:8px;margin-top:4px">'
    + '<button class="addrow" style="flex:1" onclick="addFoto()">+ Foto</button>'
    + '<button class="addrow" style="flex:1;border-color:rgba(201,168,76,0.4);color:var(--gold)" onclick="openFotoModal()">🔍 Buscar Foto</button>'
    + '</div>';

  var precos = (p.precos || []).map(function(pr, i){
    var cBruto = pr.custo_bruto || 0;
    var fProp  = pr.frete_prop  || 0;
    var mPct   = pr.margem_pct  || 0;
    return '<div class="prow" style="margin-bottom:10px;background:rgba(255,255,255,0.01);padding:10px;border-radius:8px;border:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">'
      + '<div style="flex:1;min-width:70px;"><label style="font-size:9px;display:block;margin-bottom:3px;">Volumetria</label><input class="volinp" type="text" value="' + esc(pr.vol || "") + '" onchange="setPr(' + i + ',\'vol\',this.value)"/></div>'
      + '<div style="width:90px;"><label style="font-size:9px;display:block;margin-bottom:3px;">Custo Bruto (R$)</label><input type="number" step="0.01" value="' + cBruto + '" oninput="calcularPrecoVenda(' + i + ',\'custo_bruto\',this.value,this)"/></div>'
      + '<div style="width:80px;"><label style="font-size:9px;display:block;margin-bottom:3px;">Frete Rateado (R$)</label><input type="number" step="0.01" value="' + fProp + '" oninput="calcularPrecoVenda(' + i + ',\'frete_prop\',this.value,this)"/></div>'
      + '<div style="width:85px;"><label style="font-size:9px;display:block;margin-bottom:3px;">Margem/Lucro (%)</label><input type="number" value="' + mPct + '" oninput="calcularPrecoVenda(' + i + ',\'margem_pct\',this.value,this)"/></div>'
      + '<div style="width:100px;"><label style="font-size:9px;display:block;margin-bottom:3px;color:var(--gold);">Valor Final</label><input type="text" class="vfinal-inp" style="font-weight:bold;color:var(--gold);" value="' + esc(pr.preco || "") + '" onchange="setPr(' + i + ',\'preco\',this.value)"/></div>'
      + '<button class="rmbtn" onclick="rmPr(' + i + ')" style="height:33px;">✕</button>'
      + '</div>';
  }).join("") + '<button class="addrow" onclick="addPr()">+ Preço</button>';

  /* Destino: painel lateral na grade ou tProdutos na lista */
  var _fc = (_currentView === "grade" && document.getElementById("gradeFormPanel"))
    ? document.getElementById("gradeFormPanel")
    : document.getElementById("tProdutos");
  if (!_fc) { console.warn("container do form não encontrado"); return; }
  _fc.style.display = "";
  _fc.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">'
    + '<button onclick="voltarLista()" style="background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:5px 12px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px">← Voltar</button>'
    + '<span style="font-size:12px;color:var(--text);font-weight:500">' + esc((p.nome || "Produto").trim()) + '</span>'
    + '<button onclick="delProd(event,selectedIdx)" style="margin-left:auto;background:transparent;border:1px solid rgba(192,76,76,0.3);color:var(--red);border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px">✕ Excluir</button>'
    + '</div>'
    + '<div class="fg">'
    + '<div class="st">Dados do Produto</div>'
    + '<div class="field"><label>Seção</label><select onchange="setF(\'secao\',this.value)">' + opts + '</select></div>'
    + '<div class="field"><label>Badge</label><input type="text" value="' + esc(p.badge || "") + '" onchange="setF(\'badge\',this.value)"/></div>'
    + '<div class="field"><label>Subcategoria <span style="font-weight:300;color:var(--muted)">(opcional)</span></label><input type="text" value="' + esc(p.subsecao || "") + '" placeholder="Ex: Inspirados Premium" onchange="setF(\'subsecao\',this.value)"/></div>'
    + '<div class="field"><label>Nome</label><input type="text" value="' + esc((p.nome || "").trim()) + '" onchange="setF(\'nome\',this.value)"/></div>'
    + '<div class="field"><label>Marca</label><input type="text" value="' + esc((p.marca || "").trim()) + '" onchange="setF(\'marca\',this.value)"/></div>'
    + '<div class="field"><label>Família Olfativa / Gênero</label><input type="text" value="' + esc((p.familia || "").trim()) + '" onchange="setF(\'familia\',this.value)"/></div>'
    + '<div class="field"><label>Ranking / Faixa Promo</label><input type="text" value="' + esc((p.ranking || "").trim()) + '" onchange="setF(\'ranking\',this.value)"/></div>'
    + '<div class="field ff"><label>Descrição</label><textarea onchange="setF(\'desc\',this.value)">' + esc((p.desc || "").trim()) + '</textarea></div>'
    + '<div class="st">Notas Olfativas</div>'
    + '<div class="field"><label>Topo</label><input type="text" value="' + esc((p.notas && p.notas.topo || "").trim()) + '" onchange="setNota(\'topo\',this.value)"/></div>'
    + '<div class="field"><label>Corpo</label><input type="text" value="' + esc((p.notas && p.notas.corpo || "").trim()) + '" onchange="setNota(\'corpo\',this.value)"/></div>'
    + '<div class="field"><label>Fundo</label><input type="text" value="' + esc((p.notas && p.notas.fundo || "").trim()) + '" onchange="setNota(\'fundo\',this.value)"/></div>'
    + '<div class="st">Estoque & Status</div>'
    + '<div class="field"><label>Estoque (unidades)</label><input type="number" value="' + (p.estoque || 0) + '" onchange="setF(\'estoque\',parseInt(this.value)||0)"/></div>'
    + '<div class="field"><div class="twrap" style="padding-top:14px"><label class="toggle"><input type="checkbox" ' + (p.ativo !== false ? "checked" : "") + ' onchange="setF(\'ativo\',this.checked)"/><span class="slider"></span></label><span>Ativo</span></div></div>'
    + '<div class="st">Fotos</div><div class="field ff">' + fotos + '</div>'
    + '<div class="st">Preços</div><div class="field ff">' + precos + '</div>'
    + '</div>';
}

/* ── Setters de campos ── */
function setF(k, v) {
  if (selectedIdx === null) return;
  produtos[selectedIdx][k] = v;
  saveData();
  renderSidebar();
}

function setNota(k, v) {
  if (selectedIdx === null) return;
  if (!produtos[selectedIdx].notas) produtos[selectedIdx].notas = {};
  produtos[selectedIdx].notas[k] = v;
  saveData();
}

/* ── Fotos ── */
function setFoto(i, v) {
  if (selectedIdx === null) return;
  if (!Array.isArray(produtos[selectedIdx].fotos)) produtos[selectedIdx].fotos = [];
  produtos[selectedIdx].fotos[i] = v;
  saveData();
  renderForm();
}

function setFotoPos(i, v) {
  if (selectedIdx === null) return;
  if (!Array.isArray(produtos[selectedIdx].fotosPos)) produtos[selectedIdx].fotosPos = [];
  produtos[selectedIdx].fotosPos[i] = v;
  saveData();
}

function setFotoZoom(i, val, slider) {
  if (selectedIdx === null) return;
  if (!Array.isArray(produtos[selectedIdx].fotosZoom)) produtos[selectedIdx].fotosZoom = [];
  produtos[selectedIdx].fotosZoom[i] = val;
  saveData();
  /* Atualiza preview sem re-render completo */
  var prow = slider.closest(".prow");
  if (prow) {
    var img = prow.querySelector("img");
    var pos = (produtos[selectedIdx].fotosPos && produtos[selectedIdx].fotosPos[i]) || "50% 50%";
    if (img) { img.style.transform = "scale(" + val + ")"; img.style.transformOrigin = pos; }
    var lbl = document.getElementById("zoom-lbl-" + i);
    if (lbl) lbl.textContent = Math.round(val * 100) + "%";
  }
}

function setFocalPoint(e, i, container) {
  var rect = container.getBoundingClientRect();
  var x = Math.round(((e.clientX - rect.left)  / rect.width)  * 100);
  var y = Math.round(((e.clientY - rect.top)   / rect.height) * 100);
  var pos = x + "% " + y + "%";
  var img = container.querySelector("img");
  var dot = container.querySelector(".focal-dot");
  if (img) img.style.objectPosition = pos;
  if (dot) { dot.style.left = x + "%"; dot.style.top = y + "%"; }
  setFotoPos(i, pos);
  var prow = container.closest(".prow");
  if (prow) {
    var inputs = prow.querySelectorAll("input[type=text]");
    if (inputs.length >= 2) inputs[1].value = pos;
  }
}

function addFoto() {
  if (selectedIdx === null) return;
  if (!Array.isArray(produtos[selectedIdx].fotos))     produtos[selectedIdx].fotos    = [];
  if (!Array.isArray(produtos[selectedIdx].fotosPos))  produtos[selectedIdx].fotosPos  = [];
  if (!Array.isArray(produtos[selectedIdx].fotosZoom)) produtos[selectedIdx].fotosZoom = [];
  produtos[selectedIdx].fotos.push("");
  produtos[selectedIdx].fotosPos.push("50% 50%");
  produtos[selectedIdx].fotosZoom.push(1);
  saveData();
  renderForm();
}

function rmFoto(i) {
  if (selectedIdx === null) return;
  if (Array.isArray(produtos[selectedIdx].fotos))     produtos[selectedIdx].fotos.splice(i, 1);
  if (Array.isArray(produtos[selectedIdx].fotosPos))  produtos[selectedIdx].fotosPos.splice(i, 1);
  if (Array.isArray(produtos[selectedIdx].fotosZoom)) produtos[selectedIdx].fotosZoom.splice(i, 1);
  saveData();
  renderForm();
}

/* ── Preços ── */
function setPr(i, k, v) {
  if (selectedIdx === null) return;
  produtos[selectedIdx].precos[i][k] = v;
  saveData();
}

function calcularPrecoVenda(i, campo, valor, elemento) {
  if (selectedIdx === null) return;
  var pr = produtos[selectedIdx].precos[i];
  pr[campo] = parseFloat(valor) || 0;

  var cBruto   = parseFloat(pr.custo_bruto) || 0;
  var fProp    = parseFloat(pr.frete_prop)  || 0;
  var mPct     = parseFloat(pr.margem_pct)  || 0;
  var resultado = (cBruto + fProp) * (1 + (mPct / 100));
  pr.preco = "R$ " + resultado.toFixed(2).replace(".", ",");
  saveData();

  var prowContainer = elemento.closest(".prow");
  if (prowContainer) {
    var vFinalInput = prowContainer.querySelector(".vfinal-inp");
    if (vFinalInput) vFinalInput.value = pr.preco;
  }
}

function addPr() {
  if (selectedIdx === null) return;
  produtos[selectedIdx].precos.push({ vol: "", preco: "R$ 0,00", custo_bruto: 0, frete_prop: 0, margem_pct: 0 });
  saveData();
  renderForm();
}

function rmPr(i) {
  if (selectedIdx === null) return;
  produtos[selectedIdx].precos.splice(i, 1);
  saveData();
  renderForm();
}
