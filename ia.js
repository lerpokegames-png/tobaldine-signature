/* ══════════════════════════════════════
   ia.js — Tobaldine Admin
   Busca de fotos via Gemini, remove.bg,
   e auto-preenchimento de descrições/notas.
   Depende de: utils.js, data.js, form.js, lote.js
══════════════════════════════════════ */

/* ── Busca de fotos ── */
var _fotoTargetIdx = null;

function openFotoModal() {
  _fotoTargetIdx = selectedIdx;
  var nome = (_fotoTargetIdx !== null && produtos[_fotoTargetIdx]) ? produtos[_fotoTargetIdx].nome || "" : "";
  document.getElementById("fotoSearchInput").value = nome ? nome + " perfume" : "";
  document.getElementById("fotoResults").innerHTML = '<div class="foto-status">Digite o nome do produto e clique em Buscar.</div>';
  document.getElementById("fotoModalBg").style.display = "flex";
  if (nome) buscarFotos();
}

function closeFotoModal() {
  document.getElementById("fotoModalBg").style.display = "none";
}

function usarFoto(el) {
  var url = (typeof el === "string") ? el : el.dataset.url;
  if (_fotoTargetIdx === null) return;
  var p = produtos[_fotoTargetIdx];
  if (!Array.isArray(p.fotos))     p.fotos     = [];
  if (!Array.isArray(p.fotosPos))  p.fotosPos  = [];
  if (!Array.isArray(p.fotosZoom)) p.fotosZoom = [];
  p.fotos.push(url);
  p.fotosPos.push("50% 50%");
  p.fotosZoom.push(1);
  saveData();
  renderForm();
  closeFotoModal();
  toast("✓ Foto adicionada ao produto!");
}

async function buscarFotos() {
  var query = document.getElementById("fotoSearchInput").value.trim();
  if (!query) return;
  var el        = document.getElementById("fotoResults");
  var geminiKey = localStorage.getItem("tb_gemini_key") || "";
  if (!geminiKey) {
    el.innerHTML = '<div class="foto-status">⚠ Configure sua chave Gemini na aba <strong>Config</strong> primeiro.</div>';
    return;
  }
  el.innerHTML = '<div class="foto-status"><span class="foto-spinner"></span>Buscando fotos para "' + query + '"...</div>';

  try {
    var response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + geminiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'You are a perfume product image assistant. For the product: "' + query + '", list up to 8 direct image URLs (must end in .jpg, .jpeg, .png, or .webp) from sites like fragrantica.com (fimgs.net), sephora.com.br, belezanaweb.com.br, or brand official sites. Return ONLY a valid JSON array of strings, no explanation, no markdown. Example: ["https://fimgs.net/example.jpg"]' }] }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    var data = await response.json();
    var text = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      text = (data.candidates[0].content.parts || []).map(function(p){ return p.text || ""; }).join("");
    }

    /* URLs dos resultados de grounding */
    var groundingUrls = [];
    try {
      var chunks = (((data.candidates || [])[0] || {}).groundingMetadata || {}).groundingChunks || [];
      chunks.forEach(function(c){ if (c.web && c.web.uri && /\.(jpg|jpeg|png|webp)/i.test(c.web.uri)) groundingUrls.push(c.web.uri); });
    } catch(e) {}

    /* Extrai JSON */
    var match = text.match(/\[[\s\S]*?\]/);
    var urls  = [];
    if (match) {
      try { urls = JSON.parse(match[0]).filter(function(u){ return typeof u === "string" && u.startsWith("http"); }); } catch(e) {}
    }
    /* URLs brutas de imagem no texto */
    var rawUrls = text.match(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"']*)?/gi) || [];
    rawUrls.forEach(function(u){ if (!urls.includes(u)) urls.push(u); });

    if (!urls.length) {
      var googleUrl = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(query + " perfume frasco");
      el.innerHTML = '<div class="foto-status">Nenhuma foto encontrada automaticamente.<br><br>'
        + '<a href="' + googleUrl + '" target="_blank" class="btn btn-gold btn-sm" style="display:inline-block;text-decoration:none">🔍 Buscar no Google Imagens</a>'
        + '<br><br><span style="font-size:10px;color:var(--muted)">No Google: clique com botão direito na imagem → "Copiar endereço da imagem" → cole no campo URL da foto</span>'
        + '</div>';
      return;
    }

    var h = '<div class="foto-grid">';
    urls.forEach(function(url){
      var domain = url.match(/https?:\/\/([^\/]+)/);
      var site   = domain ? domain[1].replace("www.", "") : "";
      h += '<div class="foto-result" onclick="usarFoto(this)" data-url="' + url.replace(/"/g, "&quot;") + '" title="Clique para usar esta foto">'
        + '<img src="' + url + '" loading="lazy" onerror="this.closest(&quot;.foto-result&quot;).style.display=&quot;none&quot;"/>'
        + '<div class="foto-result-url">' + site + '</div>'
        + '</div>';
    });
    h += '</div><p style="font-size:10px;color:var(--muted);margin-top:12px;text-align:center">Clique na foto para adicionar ao produto</p>';
    el.innerHTML = h;

  } catch(err) {
    el.innerHTML = '<div class="foto-status">Erro ao buscar: ' + err.message + '</div>';
  }
}

/* ── Remove.bg ── */
async function removerFundo(fotoIdx, btn) {
  var rbKey = localStorage.getItem("tb_removebg_key") || "";
  if (!rbKey) { toast("Configure a chave remove.bg na aba Config"); return; }
  if (selectedIdx === null) return;
  var url = (produtos[selectedIdx].fotos || [])[fotoIdx];
  if (!url) { toast("Sem URL de foto neste slot"); return; }

  var origText  = btn.textContent;
  btn.textContent = "⏳";
  btn.disabled    = true;

  try {
    var formData = new FormData();
    formData.append("image_url", url);
    formData.append("size", "auto");

    var resp = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": rbKey },
      body: formData
    });

    if (!resp.ok) {
      var errData = await resp.json().catch(function(){ return {}; });
      toast("Erro remove.bg: " + (errData.errors || [{ title: resp.status }])[0].title);
      btn.textContent = origText; btn.disabled = false;
      return;
    }

    var blob   = await resp.blob();
    var reader = new FileReader();
    reader.onload = function(){
      var dataUrl = reader.result;
      if (!Array.isArray(produtos[selectedIdx].fotos)) produtos[selectedIdx].fotos = [];
      produtos[selectedIdx].fotos[fotoIdx] = dataUrl;
      saveData();
      renderForm();
      toast("✓ Fundo removido!");
    };
    reader.readAsDataURL(blob);

  } catch(e) {
    toast("Erro: " + e.message);
    btn.textContent = origText; btn.disabled = false;
  }
}

/* ── Auto-preenchimento com IA (Gemini) ── */
var _autoFillScope = "todos";

function abrirAutoFill(scope) {
  _autoFillScope = scope || "todos";
  var info = document.getElementById("afScopeInfo");
  if (info) {
    info.textContent = _autoFillScope === "selecionados"
      ? "Serão preenchidos " + _loteSelected.size + " produto(s) selecionado(s) no Lote."
      : "Serão preenchidos todos os " + produtos.length + " produtos do catálogo.";
  }
  document.getElementById("modalAutoFill").classList.add("open");
}

function confirmarAutoFill() {
  document.getElementById("modalAutoFill").classList.remove("open");
  var campos = {
    desc:    document.getElementById("afDesc").checked,
    topo:    document.getElementById("afTopo").checked,
    corpo:   document.getElementById("afCorpo").checked,
    fundo:   document.getElementById("afFundo").checked,
    ranking: document.getElementById("afRanking").checked,
    familia: !!(document.getElementById("afGenero") && document.getElementById("afGenero").checked)
  };
  var indices = _autoFillScope === "selecionados"
    ? Array.from(_loteSelected)
    : produtos.map(function(_, i){ return i; });
  _runAutoFill(indices, campos);
}

async function _runAutoFill(indices, campos) {
  var geminiKey = (localStorage.getItem("tb_gemini_key") || "").trim();
  if (!geminiKey) { toast("⚠ Configure a chave Gemini na aba Config primeiro"); return; }
  if (!indices.length) { toast("Nenhum produto para preencher"); return; }

  var btn   = document.getElementById("btnAutoPreench");
  var fbSt  = document.getElementById("fbStatus");
  var total = indices.length;
  var okCnt = 0, errCnt = 0;

  btn.disabled    = true;
  btn.textContent = "🤖 Processando...";

  var camposJson = [];
  if (campos.desc)    camposJson.push('"desc":"descrição do perfume em português (2 frases)"');
  if (campos.topo)    camposJson.push('"topo":"notas de topo separadas por vírgula"');
  if (campos.corpo)   camposJson.push('"corpo":"notas de coração separadas por vírgula"');
  if (campos.fundo)   camposJson.push('"fundo":"notas de fundo separadas por vírgula"');
  if (campos.ranking) camposJson.push('"ranking":"✦ frase criativa e única sobre o perfume ✦"');
  if (campos.familia) camposJson.push('"familia":"gênero e família olfativa no formato: Masculino · Amadeirado Oriental (ou Feminino, Unissex)"');

  if (!camposJson.length) { btn.disabled = false; btn.textContent = "🤖 Auto-preencher"; toast("Selecione pelo menos um campo"); return; }

  for (var t = 0; t < indices.length; t++) {
    var i = indices[t];
    var p = produtos[i];

    if (fbSt) {
      fbSt.textContent      = "🤖 " + (t + 1) + "/" + total + " — " + (p.nome || "?");
      fbSt.style.background = "rgba(127,119,221,0.12)";
      fbSt.style.color      = "#7f77dd";
    }

    var rankingInstrucao = campos.ranking && (p.badge || "").toLowerCase().includes("25ml")
      ? '\nPara o campo "ranking", use o formato: ✦ Original 25ml · [frase única sobre este perfume específico] ✦'
      : campos.ranking
        ? '\nPara o campo "ranking", crie uma frase curta e única como: ✦ [adjetivo + ocasião ou inspiração] ✦'
        : "";

    var prompt = 'Perfume: "' + (p.nome || "") + '"'
      + (p.marca   ? '. Marca: '    + p.marca   : '')
      + (p.familia ? '. Família: '  + p.familia : '')
      + '.\nResponda SOMENTE com JSON (sem markdown):\n{'
      + camposJson.join(",")
      + '}' + rankingInstrucao;

    var tentativas = 0, sucesso = false;
    while (tentativas < 3 && !sucesso) {
      tentativas++;
      try {
        var resp = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 1024 } }) }
        );
        if (resp.status === 429) { await new Promise(function(r){ setTimeout(r, 15000); }); continue; }
        var data = await resp.json();
        if (data.error) throw new Error("API: " + data.error.message);
        var candidates = data.candidates || [];
        if (!candidates.length) throw new Error("Bloqueado");
        var txt     = ((candidates[0].content || {}).parts || []).map(function(pt){ return pt.text || ""; }).join("").trim();
        var jsonStr = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
        var objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) jsonStr = objMatch[0];
        var res = JSON.parse(jsonStr);
        if (campos.desc    && res.desc)    produtos[i].desc = res.desc;
        if (campos.ranking && res.ranking) produtos[i].ranking = res.ranking;
        if (campos.familia && res.familia) produtos[i].familia = res.familia;
        if (campos.topo || campos.corpo || campos.fundo) {
          if (!produtos[i].notas) produtos[i].notas = { topo: "", corpo: "", fundo: "" };
          if (campos.topo  && res.topo)  produtos[i].notas.topo  = res.topo;
          if (campos.corpo && res.corpo) produtos[i].notas.corpo = res.corpo;
          if (campos.fundo && res.fundo) produtos[i].notas.fundo = res.fundo;
        }
        if (selectedIdx === i) renderForm();
        okCnt++; sucesso = true;
      } catch(e) {
        console.warn("[Auto-fill] tentativa " + tentativas + " — " + (p.nome || "?") + ":", e.message);
        if (tentativas < 3) await new Promise(function(r){ setTimeout(r, 3000); });
      }
    }
    if (!sucesso) errCnt++;
    if ((t + 1) % 10 === 0) saveData();
    await new Promise(function(r){ setTimeout(r, 4100); });
  }

  saveData(); fbSync();
  btn.disabled    = false;
  btn.textContent = "🤖 Auto-preencher";
  if (fbSt) { fbSt.textContent = "✓ Firebase OK"; fbSt.style.background = "rgba(76,175,121,0.15)"; fbSt.style.color = "#4caf79"; }
  toast("✅ " + okCnt + " preenchidos" + (errCnt ? " · ⚠ " + errCnt + " com erro (ver F12)" : " · tudo certo!"));
}

function autoPreencherTodos()       { abrirAutoFill("todos"); }
function autoPreencherSelecionados() {
  if (!_loteSelected.size) { toast("Selecione produtos no modo Lote primeiro"); return; }
  abrirAutoFill("selecionados");
}
