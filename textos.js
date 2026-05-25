/* ══════════════════════════════════════
   textos.js — Tobaldine Admin
   Editor de textos publicados no catálogo.
   Depende de: utils.js
══════════════════════════════════════ */

var _textosSite = {};
try { var _tx = localStorage.getItem("tb_v3_textos"); if (_tx) _textosSite = JSON.parse(_tx); } catch(e) {}

var _TEXTOS_CONFIG = [
  /* Hero */
  { id: "hero_tagline",      label: "Hero · Frase principal",         tipo: "text",     def: "O perfume certo não é detalhe — é a primeira impressão que você deixa." },
  { id: "hero_sub",          label: "Hero · Subtítulo",               tipo: "textarea", def: "Cada fragrância selecionada para fazer você se sentir única(o), poderosa(o) e inesquecível onde quer que vá." },
  /* Faixas */
  { id: "strip_frase",       label: "Faixa dourada · Frase",          tipo: "text",     def: "Ninguém esquece quem cheira bem. Ninguém." },
  { id: "entrega_faixa",     label: "Faixa de entrega",               tipo: "text",     def: "Entrega em Mauá e região · Até 24h após confirmação · PIX ou cartão" },
  /* Seções de gênero */
  { id: "masculinos_titulo", label: "Masculinos · Título",            tipo: "text",     def: "Fragrâncias Masculinas" },
  { id: "masculinos_desc",   label: "Masculinos · Descrição",         tipo: "textarea", def: "Seleção exclusiva de perfumes imponentes, marcantes e sedutores. Encontre sua assinatura de poder." },
  { id: "femininos_titulo",  label: "Femininos · Título",             tipo: "text",     def: "Fragrâncias Femininas" },
  { id: "femininos_desc",    label: "Femininos · Descrição",          tipo: "textarea", def: "Fragrâncias envolventes, cremosas e inesquecíveis. A expressão máxima da sofisticação e magnetismo femininos." },
  { id: "unissex_titulo",    label: "Unissex · Título",               tipo: "text",     def: "Fragrâncias Unissex" },
  { id: "unissex_desc",      label: "Unissex · Descrição",            tipo: "textarea", def: "Alta perfumaria compartilhável. Aromas conceituais e sofisticados que transcendem gêneros e se adaptam à pele de forma única." },
  { id: "kits_titulo",       label: "Kits & Cosméticos · Título",     tipo: "text",     def: "Kits & Cosméticos" },
  { id: "kits_desc",         label: "Kits & Cosméticos · Descrição",  tipo: "textarea", def: "Body Splashes altamente desejados da Victoria's Secret e combos montados com descontos especiais para presentear ou se mimar." },
  /* Subcategorias */
  { id: "sub_decants",       label: "Subcategoria · Decants",         tipo: "text",     def: "Decants de Bolso / Miniaturas" },
  { id: "sub_originais",     label: "Subcategoria · Originais",       tipo: "text",     def: "Frascos Originais Lacrados" },
  { id: "sub_similares",     label: "Subcategoria · Similares",       tipo: "text",     def: "Inspirados Premium (Contratipos)" },
  { id: "sub_kits",         label: "Subcategoria · Kits (título)",   tipo: "text",     def: "Kits & Combos" },
  { id: "sub_cosmeticos",   label: "Subcategoria · Cosméticos",     tipo: "text",     def: "Body Splashes & Hidratantes VS" },
  /* Autorais */
  { id: "autorais_titulo",   label: "Autorais · Título",              tipo: "text",     def: "Fragrâncias Autorais" },
  { id: "autorais_desc",     label: "Autorais · Descrição",           tipo: "textarea", def: "Criações exclusivas desenvolvidas pela Tobaldine Signature — fragrâncias únicas que você não encontra em nenhum outro lugar." },
  /* Depoimentos */
  { id: "dep_titulo",        label: "Depoimentos · Título",           tipo: "text",     def: "Quem Experimentou, Amou" },
  { id: "dep_desc",          label: "Depoimentos · Descrição",        tipo: "textarea", def: "Veja o depoimento de clientes que transformaram sua presença com as fragrâncias da Tobaldine Signature." },
  /* Sobre */
  { id: "sobre_titulo",      label: "Sobre · Título",                 tipo: "text",     def: "Tobaldine Signature" },
  { id: "sobre_desc1",       label: "Sobre · Parágrafo 1",            tipo: "textarea", def: "A Tobaldine Signature nasceu da crença de que alta perfumaria não precisa ser inacessível." },
  { id: "sobre_desc2",       label: "Sobre · Parágrafo 2",            tipo: "textarea", def: "Atendemos de forma próxima e personalizada, direto pelo WhatsApp, com entrega em Mauá e região." },
  /* Rodapé */
  { id: "footer_copy",       label: "Rodapé · Copyright",             tipo: "text",     def: "© 2025 Tobaldine Signature · Mauá, SP · Todos os direitos reservados" }
];

function renderTextos() {
  var el = document.getElementById("tTextos");
  if (!el) return;
  /* Recarrega do Firebase antes de renderizar */
  if (window.firebaseDB) {
    window.firebaseDB.ref("config/textos").once("value").then(function(snap){
      var t = snap.val();
      if (t) _textosSite = t;
      _renderTextosForm(el);
    }).catch(function(){ _renderTextosForm(el); });
  } else {
    _renderTextosForm(el);
  }
}

function _renderTextosForm(el) {
  var campos = _TEXTOS_CONFIG.map(function(t){
    var val   = _textosSite[t.id] !== undefined ? _textosSite[t.id] : t.def;
    var input = t.tipo === "textarea"
      ? '<textarea id="tx_' + t.id + '" style="min-height:70px">' + esc(val) + '</textarea>'
      : '<input type="text" id="tx_' + t.id + '" value="' + esc(val) + '"/>';
    return '<div class="field" style="margin-bottom:14px"><label>' + t.label + '</label>' + input + '</div>';
  }).join("");

  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    + '<h3 style="font-size:13px;color:var(--gold)">✏️ Textos do Site</h3>'
    + '<button class="btn btn-gold" onclick="salvarTextos()">☁ Salvar e Publicar</button>'
    + '</div>'
    + '<p style="font-size:11px;color:var(--muted);margin-bottom:20px">Edite os textos abaixo e clique em Salvar. As alterações aparecem no catálogo para todos os visitantes.</p>'
    + '<div style="max-width:600px">' + campos + '</div>';
}

function salvarTextos() {
  var dados = {};
  _TEXTOS_CONFIG.forEach(function(t){
    var el = document.getElementById("tx_" + t.id);
    if (el) dados[t.id] = el.value.trim();
  });
  _textosSite = dados;
  localStorage.setItem("tb_v3_textos", JSON.stringify(dados));
  if (typeof window.firebaseDB !== "undefined" && window.firebaseDB) {
    window.firebaseDB.ref("config/textos").set(dados).then(function(){
      toast("✓ Textos salvos e publicados!");
    }).catch(function(){ toast("✓ Salvo localmente (Firebase offline)"); });
  } else {
    toast("✓ Textos salvos!");
  }
}
