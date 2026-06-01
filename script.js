/* ══════════════════════════════════════════════════════
   TOBALDINE SIGNATURE · MOTOR PRINCIPAL v6.5
   FIXES: duplicata atualizarDoFirebase removida, sortProducts
          implementado, wppRefil implementado, sanitize XSS,
          localStorage corrigido, checkAfiliadoUrl corrigido
══════════════════════════════════════════════════════ */

var TEL = "5511941665146";
var CARRINHO = [];
var NOTA_FILTRO_ATIVA = "";
var CUPOM_ATIVO = null;
var AFILIADO_IDENTIFICADO = "";
var CUPONS_DO_SISTEMA = [];

/* ──────────────────────────────
   PROVA SOCIAL: viewers e estoque
   Números gerados por produto,
   variam a cada visita.
─────────────────────────────── */
try {
  CARRINHO = JSON.parse(localStorage.getItem("tb_carrinho") || "[]");
} catch(e) { CARRINHO = []; }

/* ──────────────────────────────
   UTILITÁRIO: SANITIZAÇÃO XSS
   Protege contra injeção de HTML
   em campos vindos do Firebase.
─────────────────────────────── */
function sanitize(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ──────────────────────────────
   UTILITÁRIO: PARSE DE PREÇO
─────────────────────────────── */
function parsePreco(str) {
  return parseFloat(
    String(str || "0")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  ) || 0;
}

/* ══════════════════════════════
   RENDERIZAÇÃO DO CATÁLOGO
══════════════════════════════ */
function renderCatalogo() {
  if (typeof PRODUTOS === "undefined" || !PRODUTOS) {
    console.error("Erro: O array PRODUTOS não foi encontrado.");
    return;
  }

  /* Esconde o loading ao renderizar */
  var loadingEl = document.getElementById("catalogLoading");
  if (loadingEl) loadingEl.style.display = "none";
  /* Mostra skeleton antes do primeiro render */
  if (PRODUTOS.length === 0 && loadingEl) loadingEl.style.display = "";

  document.querySelectorAll(".dynamic-grid").forEach(function(el) { el.innerHTML = ""; });
  var trackCosmeticos = document.getElementById("cosmeticos-track");

  /* FIX PERFORMANCE: acumula HTML por container e aplica de uma vez,
     evitando reflow do DOM a cada produto */
  var fragmentos = {};
  var fragCosmeticos = [];

  var WPP_ICON = '<svg class="wpp-icon" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458-.112-.612.112-.174.495-.571.693-.819.198-.248.272-.421.421-.719.149-.297.074-.571-.038-.793-.11-.224-.942-2.277-1.292-3.119-.34-.823-.688-.713-.943-.726l-.8-.016c-.272 0-.719.101-1.093.512-.374.412-1.43 1.397-1.43 3.407 0 2.01 1.46 3.949 1.662 4.22.199.273 2.876 4.394 6.967 6.158.974.42 1.733.67 2.327.86 1.054.334 2.011.286 2.766.175.845-.124 2.595-.916 2.962-1.802.367-.887.367-1.648.257-1.802-.11-.153-.42-.248-.718-.398z"/></svg>';

  PRODUTOS.forEach(function(p, index) {
    if (p.ativo === false) return;

    var fotosValidas = (p.fotos || []).filter(function(f) { return f && f.trim() !== ""; });
    if (fotosValidas.length === 0) fotosValidas = [""];

    var slotsHtml = "";
    var dotsHtml = "";

    fotosValidas.forEach(function(srcFoto, fIdx) {
      var pos  = (p.fotosPos  && p.fotosPos[fIdx]  != null) ? p.fotosPos[fIdx]  : "50% 50%";
      var zoom = (p.fotosZoom && p.fotosZoom[fIdx] != null) ? parseFloat(p.fotosZoom[fIdx]) : 1;
      var transformStyle = (zoom !== 1) ? ";transform:scale(" + zoom + ");transform-origin:" + pos : "";
      slotsHtml += '<div class="carousel-slide">'
                 + (srcFoto
                     ? '<img src="' + sanitize(srcFoto) + '" alt="' + sanitize(p.nome) + '" loading="lazy" style="object-position:' + pos + transformStyle + '" />'
                     : '<div class="img-placeholder"><svg viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 7.5-3.5-4.5-2.5 3-1.5-2L7 17h12.5z"/></svg><span>Sem Foto</span></div>')
                 + '</div>';
      dotsHtml += '<span class="dot' + (fIdx === 0 ? ' active' : '') + '" data-index="' + fIdx + '"></span>';
    });

    var setasHtml = (fotosValidas.length > 1)
      ? '<button class="track-arrow arrow-left" onclick="moveTrackManual(this,-1,event)">‹</button><button class="track-arrow arrow-right" onclick="moveTrackManual(this,1,event)">›</button>'
      : '';
    var rankingHtml = p.ranking ? '<p class="promo-banner">' + sanitize(p.ranking) + '</p>' : '';

    /* Estoque — controlado pelo admin Config */
    var estoqueHtml = "";
    if(window._cfgMostrarEstoque && p.estoque > 0 && p.estoque <= 5){
      estoqueHtml = '<div class="stock-badge">⚠ Últimas ' + p.estoque + ' unidades</div>';
    }
    var optHtml = "";
    var primeiroPreco = 0;
    if (p.precos && p.precos.length > 0) {
      p.precos.forEach(function(o, oi) {
        var selClass = (oi === 0) ? "price-opt selected" : "price-opt";
        if (oi === 0) primeiroPreco = parsePreco(o.preco);
        optHtml += '<div class="' + selClass + '" onclick="selectPriceOption(this)" data-vol="' + sanitize(o.vol) + '" data-price="' + sanitize(o.preco) + '">'
                + '<span class="vol">' + sanitize(o.vol) + '</span>'
                + '<span class="price">' + sanitize(o.preco) + '</span>'
                + '</div>';
      });
    }

    var nTopo  = (p.notas && p.notas.topo)  ? p.notas.topo  : "";
    var nCorpo = (p.notas && p.notas.corpo) ? p.notas.corpo : "";
    var nFundo = (p.notas && p.notas.fundo) ? p.notas.fundo : "";
    var notasTexto = (nTopo + " " + nCorpo + " " + nFundo).toLowerCase();

    /* FIX: data-sort-idx adicionado para sortProducts() restaurar ordem original.
       data-price adicionado para ordenação por preço funcionar corretamente. */
    var cardHtml = '<article class="product-card" id="prod-' + index + '" data-secao="' + (p.secao||"") + '"'
      + ' data-name="' + sanitize((p.nome || "").toLowerCase()) + '"'
      + ' data-notas="' + sanitize(notasTexto) + '"'
      + ' data-sort-idx="' + index + '"'
      + ' data-price="' + primeiroPreco + '">'
      + '<div class="product-image" onclick="openLightboxFromCard(' + index + ')">'
      + '<div class="carousel-track">' + slotsHtml + '</div>'
      + '<div class="carousel-dots-container">' + dotsHtml + '</div>'
      + setasHtml
      + (function(){var tops=['asad','yara','khamrah',"bade'e al oud",'fakhar','9pm'];return tops.some(function(n){return (p.nome||'').toLowerCase().indexOf(n)!==-1;})?'<span class="hot-badge">\u2b50 Mais pedido</span>':'';})()
      + (p.badge?'<span class="sub-badge">'+sanitize(p.badge)+'</span>':'')
      + '<button class="zoom-btn">🔍</button>'
      + '</div>'
      + rankingHtml
      + '<div class="product-info">'
      + '<div class="card-top-row">'
      + '<p class="product-brand">' + sanitize(p.marca) + '</p>'
      + (p.secao==='decants'?'<span class="vol-pill">25ml</span>':p.secao==='originais'?'<span class="vol-pill vol-pill-ori">100ml</span>':p.secao==='similares'?'<span class="vol-pill vol-pill-sim">Similar</span>':'')
      + '</div>'
      + '<h3 class="product-name">' + sanitize(p.nome) + '</h3>'
      + '<p class="product-family">' + sanitize(p.familia) + '</p>'
      + '<p class="product-desc">' + sanitize(p.desc) + '</p>'
      + '<div class="notes-wrap">'
      + '<p class="section-label">Pirâmide Olfativa</p>'
      + '<div class="notes-row">'
      + '<div><span class="note-type">Topo</span><span class="note-val">'   + sanitize(nTopo  || "—") + '</span></div>'
      + '<div><span class="note-type">Corpo</span><span class="note-val">'  + sanitize(nCorpo || "—") + '</span></div>'
      + '<div><span class="note-type">Fundo</span><span class="note-val">'  + sanitize(nFundo || "—") + '</span></div>'
      + '</div>'
      + '</div>'
      + '<div class="price-wrap">'
      + '<p class="section-label">Escolha a Volumetria</p>'
      + '<div class="price-options">' + optHtml + '</div>'
      + '<div class="card-actions" style="margin-top:12px;display:flex;gap:6px;">'
      + '<button class="wpp-btn" style="flex:1" onclick="buyDirect(this)">' + WPP_ICON + 'Pedir Agora</button>'
      + '<button class="add-cart-btn" onclick="addToCart(this)">＋</button>'
      + '</div>'
      + estoqueHtml
      + '</div>'
      + '</div>'
      + '</article>';

    var familiaLower = (p.familia || "").toLowerCase();
    var genero = "unissex";
    if (familiaLower.includes("masculino") || familiaLower.includes("homme") || familiaLower.includes("men")) {
      genero = "masculinos";
    } else if (familiaLower.includes("feminino") || familiaLower.includes("femme") || familiaLower.includes("women")) {
      genero = "femininos";
    }

    if (p.secao === "autorais") {
      if (!fragmentos["autorais"]) fragmentos["autorais"] = [];
      fragmentos["autorais"].push({html: cardHtml, subsecao: p.subsecao || ""});
    } else if (p.secao === "cosmeticos") {
      fragCosmeticos.push(cardHtml);
    } else {
      var targetId = genero + "-todos";
      if (!fragmentos[targetId]) fragmentos[targetId] = [];
      fragmentos[targetId].push({html: cardHtml, subsecao: ""});
    }
  });

  /* Aplica todos os fragmentos agrupados por subcategoria */
  function renderFragmentos(el, frags) {
    if(!frags || !frags.length) return;
    /* Verifica se tem subcategorias */
    var temSub = frags.some(function(f){ return f.subsecao && f.subsecao.trim(); });
    if(!temSub){
      el.innerHTML = frags.map(function(f){ return f.html; }).join("");
      return;
    }
    /* Agrupa por subcategoria mantendo ordem de inserção */
    var grupos = [];
    var grupoMap = {};
    frags.forEach(function(f){
      var sub = f.subsecao && f.subsecao.trim() ? f.subsecao.trim() : "—";
      if(!grupoMap[sub]){ grupoMap[sub] = []; grupos.push(sub); }
      grupoMap[sub].push(f.html);
    });
    var html = "";
    grupos.forEach(function(sub){
      if(sub !== "—") html += '<div class="sub-category-title" style="margin-top:24px">✦ '+sub+'</div><div class="cards-track dynamic-grid" style="margin-bottom:24px">';
      html += grupoMap[sub].join("");
      if(sub !== "—") html += '</div>';
    });
    el.innerHTML = html;
  }

  Object.keys(fragmentos).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) renderFragmentos(el, fragmentos[id]);
  });
  if (trackCosmeticos && fragCosmeticos.length) {
    trackCosmeticos.innerHTML = fragCosmeticos.join("");
  }

  /* Autorais */
  var trackAutorais = document.getElementById("autorais-track");
  var secAutorais   = document.getElementById("autorais");
  var navAutorais   = document.getElementById("nav-autorais");
  if(trackAutorais && fragmentos["autorais"] && fragmentos["autorais"].length){
    renderFragmentos(trackAutorais, fragmentos["autorais"]);
    if(secAutorais) secAutorais.style.display = "";
    if(navAutorais) navAutorais.style.display = "";
  }

  /* Oculta subcategorias vazias */
  document.querySelectorAll(".gender-section").forEach(function(section) {
    var subTitles = section.querySelectorAll(".sub-category-title");
    subTitles.forEach(function(title) {
      var nextTrack = title.nextElementSibling;
      if (nextTrack && nextTrack.classList.contains("dynamic-grid")) {
        var vazio = nextTrack.children.length === 0;
        title.style.display    = vazio ? "none" : "";
        nextTrack.style.display = vazio ? "none" : "";
      }
    });
  });

  renderKits();
  renderDestaques();
  renderNotesPills();
  updateCartBadge();
  checkAfiliadoUrl();
  setTimeout(initCarrosselComHint, 100);
}

/* ══════════════════════════════
   AFILIADOS & CUPONS
══════════════════════════════ */
function checkAfiliadoUrl() {
  /* FIX: agora só executa se houver cupons disponíveis */
  if (!CUPONS_DO_SISTEMA || CUPONS_DO_SISTEMA.length === 0) return;

  var urlParams = new URLSearchParams(window.location.search);
  var refCode = urlParams.get("ref");
  if (!refCode) return;

  refCode = refCode.trim().toUpperCase();
  var cFound = CUPONS_DO_SISTEMA.find(function(c) { return c.codigo === refCode; });
  if (cFound) {
    AFILIADO_IDENTIFICADO = refCode;
    CUPOM_ATIVO = { codigo: refCode, regra: cFound };
    var inputEl = document.getElementById("couponInput");
    var msgEl   = document.getElementById("couponMessage");
    if (inputEl) inputEl.value = refCode;
    if (msgEl) {
      msgEl.textContent = "Link de Afiliado ativo: " + (cFound.nome || cFound.codigo) + "!";
      msgEl.style.color = "#4caf79";
    }
    renderCartItems();
  }
}

function selectNoteFilter(nota, btn) {
  var parent = btn.parentElement;
  parent.querySelectorAll(".note-pill").forEach(function(p) { p.classList.remove("active"); });
  btn.classList.add("active");
  NOTA_FILTRO_ATIVA = nota.toLowerCase();
  filterProducts();
}

/* ══════════════════════════════
   BUSCA & FILTROS
══════════════════════════════ */
function filterProducts() {
  var q = document.getElementById("searchInput").value.toLowerCase();
  var clearBtn = document.getElementById("searchClear");
  if (clearBtn) clearBtn.style.display = q ? "block" : "none";

  document.querySelectorAll(".product-card:not(.kit-card)").forEach(function(card) {
    var name  = (card.dataset.name  || "");
    var notas = (card.dataset.notas || "");
    var brand = ((card.querySelector(".product-brand") || {}).textContent || "").toLowerCase();

    var matchBusca = !q || name.includes(q) || brand.includes(q) || notas.includes(q);
    var matchNota  = !NOTA_FILTRO_ATIVA || notas.includes(NOTA_FILTRO_ATIVA);
    var cardPreco  = parseFloat(card.dataset.price||0);
    var matchPreco = cardPreco >= PRECO_MIN && cardPreco <= PRECO_MAX;
    card.style.display = (matchBusca && matchNota && matchPreco) ? "" : "none";
  });

  document.querySelectorAll(".gender-section, #kits-cosmeticos").forEach(function(sec) {
    sec.querySelectorAll(".sub-category-title").forEach(function(title) {
      var nextTrack = title.nextElementSibling;
      if (nextTrack) {
        var visibles = nextTrack.querySelectorAll(".product-card:not([style*='none'])");
        title.style.display    = visibles.length === 0 ? "none" : "";
        nextTrack.style.display = visibles.length === 0 ? "none" : "";
      }
    });
  });
}

function clearSearch() {
  var input = document.getElementById("searchInput");
  if (input) { input.value = ""; filterProducts(); }
}

/* ══════════════════════════════
   ORDENAÇÃO — FIX: implementado
══════════════════════════════ */
function sortProducts() {
  var val = document.getElementById("sortSelect").value;

  document.querySelectorAll(".dynamic-grid").forEach(function(grid) {
    var cards = Array.from(grid.querySelectorAll(".product-card:not(.kit-card)"));
    if (cards.length === 0) return;

    cards.sort(function(a, b) {
      if (!val) {
        /* Restaura ordem original usando data-sort-idx */
        return parseInt(a.dataset.sortIdx || 0) - parseInt(b.dataset.sortIdx || 0);
      }
      if (val === "nome") {
        return (a.dataset.name || "").localeCompare(b.dataset.name || "", "pt-BR");
      }
      /* Ordenação por preço: usa data-price do card */
      var pA = parseFloat(a.dataset.price || 0) || 0;
      var pB = parseFloat(b.dataset.price || 0) || 0;
      return val === "preco-asc" ? pA - pB : pB - pA;
    });

    cards.forEach(function(card) { grid.appendChild(card); });
  });
}

/* ══════════════════════════════
   CUPONS
══════════════════════════════ */
function applyCoupon() {
  var code  = document.getElementById("couponInput").value.trim().toUpperCase();
  var msgEl = document.getElementById("couponMessage");
  if (!code) {
    CUPOM_ATIVO = null; AFILIADO_IDENTIFICADO = "";
    msgEl.textContent = ""; renderCartItems(); return;
  }
  var cFound = CUPONS_DO_SISTEMA.find(function(c) { return c.codigo === code; });
  if (cFound) {
    CUPOM_ATIVO = { codigo: code, regra: cFound };
    AFILIADO_IDENTIFICADO = cFound.afiliado ? code : "";
    var label = cFound.afiliado ? "Parceiro (" + (cFound.nome || code) + ")" : "Desconto";
    msgEl.textContent = "Cupom de " + label + " validado!";
    msgEl.style.color = "#4caf79";
  } else {
    CUPOM_ATIVO = null; AFILIADO_IDENTIFICADO = "";
    msgEl.textContent = "Cupom inexistente.";
    msgEl.style.color = "#c04c4c";
  }
  renderCartItems();
}

/* ══════════════════════════════
   CARRINHO
══════════════════════════════ */
function renderCartItems() {
  var container = document.getElementById("cartItems");
  if (!container) return;
  if (CARRINHO.length === 0) {
    container.innerHTML = '<p class="cart-empty">Sua sacola está vazia.</p>';
    document.getElementById("cartTotal").textContent = "Subtotal: R$ 0,00";
    document.getElementById("cartDiscount").style.display = "none";
    document.getElementById("cartFinalTotal").textContent = "Total: R$ 0,00";
    return;
  }

  var subtotal = 0;
  container.innerHTML = CARRINHO.map(function(item, idx) {
    var pNum = parsePreco(item.preco);
    subtotal += (pNum * item.qtd);
    return '<div class="cart-item">'
      + '<div class="cart-item-info"><strong>' + sanitize(item.nome) + '</strong><span>' + sanitize(item.vol) + ' • ' + sanitize(item.preco) + '</span></div>'
      + '<div class="cart-item-qty">'
      + '<button onclick="changeQty(' + idx + ',-1)">-</button>'
      + '<span>' + item.qtd + '</span>'
      + '<button onclick="changeQty(' + idx + ',1)">+</button>'
      + '</div>'
      + '</div>';
  }).join("");

  document.getElementById("cartTotal").textContent = "Subtotal: R$ " + subtotal.toFixed(2).replace(".", ",");

  var desconto = 0;
  if (CUPOM_ATIVO) {
    if (CUPOM_ATIVO.regra.tipo === "porcentagem") desconto = subtotal * (CUPOM_ATIVO.regra.valor / 100);
    else if (CUPOM_ATIVO.regra.tipo === "fixo")   desconto = CUPOM_ATIVO.regra.valor;
    desconto = Math.min(subtotal, desconto);
    document.getElementById("cartDiscount").textContent = "Desconto (" + CUPOM_ATIVO.codigo + "): -R$ " + desconto.toFixed(2).replace(".", ",");
    document.getElementById("cartDiscount").style.display = "block";
  } else {
    document.getElementById("cartDiscount").style.display = "none";
  }

  var finalTotal = subtotal - desconto;
  document.getElementById("cartFinalTotal").textContent = "Total: R$ " + finalTotal.toFixed(2).replace(".", ",");
}

function sendCartWpp() {
  if (CARRINHO.length === 0) return;
  var texto = "Olá, Tobaldine Signature! Gostaria de fechar o seguinte pedido:\n\n";
  var subtotal = 0;
  CARRINHO.forEach(function(item) {
    texto += "• *" + item.nome + "* (" + item.vol + ") x" + item.qtd + " — " + item.preco + "\n";
    subtotal += parsePreco(item.preco) * item.qtd;
  });
  var desconto = 0;
  if (CUPOM_ATIVO) {
    if (CUPOM_ATIVO.regra.tipo === "porcentagem") desconto = subtotal * (CUPOM_ATIVO.regra.valor / 100);
    else if (CUPOM_ATIVO.regra.tipo === "fixo")   desconto = CUPOM_ATIVO.regra.valor;
    desconto = Math.min(subtotal, desconto);
    texto += "\n*Cupom Utilizado:* " + CUPOM_ATIVO.codigo + " (-R$ " + desconto.toFixed(2).replace(".", ",") + ")\n";
  }
  var finalTotal = subtotal - desconto;
  texto += "\n*Total:* R$ " + finalTotal.toFixed(2).replace(".", ",");
  texto += "\n\nQuero confirmar esse pedido! 😊";
  window.open("https://api.whatsapp.com/send?phone=" + TEL + "&text=" + encodeURIComponent(texto), "_blank");
}

function buyDirect(btn) {
  var card = btn.closest(".product-card");
  var nome  = card.querySelector(".product-name").textContent;
  var brand = card.querySelector(".product-brand").textContent;
  var selectedOpt = card.querySelector(".price-opt.selected");
  if (!selectedOpt) return;
  var vol   = selectedOpt.dataset.vol;
  var preco = selectedOpt.dataset.price;
  var _pNum = parsePreco(preco);
  var _desc = 0;
  if (CUPOM_ATIVO) {
    if (CUPOM_ATIVO.regra.tipo === "porcentagem") _desc = _pNum * (CUPOM_ATIVO.regra.valor/100);
    else if (CUPOM_ATIVO.regra.tipo === "fixo") _desc = CUPOM_ATIVO.regra.valor;
    _desc = Math.min(_pNum, _desc);
  }
  var _total = _pNum - _desc;
  var texto = "Olá, Tobaldine Signature! Quero fazer o pedido:\n\n";
  texto += "\u2022 *" + nome + "* (" + vol + ") \u2014 " + preco + "\n";
  if (CUPOM_ATIVO && _desc > 0) texto += "Cupom " + CUPOM_ATIVO.codigo + ": -R$ " + _desc.toFixed(2).replace(".",",") + "\n";
  texto += "\n*Total:* R$ " + _total.toFixed(2).replace(".",",");
  texto += "\n\nQuero confirmar esse pedido! \U0001f60a";
  window.open("https://api.whatsapp.com/send?phone=" + TEL + "&text=" + encodeURIComponent(texto), "_blank");
}

/* ══════════════════════════════
   REFIL — FIX: implementado
══════════════════════════════ */
function wppRefil() {
  var texto = "Olá, Tobaldine Signature! Tenho um decant e gostaria de solicitar um *Refil*. Poderia me informar as opções e valores disponíveis?";
  window.open("https://api.whatsapp.com/send?phone=" + TEL + "&text=" + encodeURIComponent(texto), "_blank");
  return false;
}

/* ══════════════════════════════
   CARROSSEL
══════════════════════════════ */
function initCarrosselComHint() {
  document.querySelectorAll(".product-image").forEach(function(wrap) {
    var track = wrap.querySelector(".carousel-track");
    var dots  = wrap.querySelectorAll(".dot");
    if (!track || dots.length <= 1) return;

    wrap._currentIdx   = 0;
    wrap._totalSlides  = dots.length;
    wrap._goToSlide    = function(idx) {
      if (idx < 0 || idx >= wrap._totalSlides) return;
      wrap._currentIdx = idx;
      track.style.transform = "translateX(-" + (idx * 100) + "%)";
      dots.forEach(function(d, dIdx) { d.classList.toggle("active", dIdx === idx); });
    };

    dots.forEach(function(dot) {
      dot.addEventListener("click", function(e) {
        e.stopPropagation();
        wrap._goToSlide(parseInt(this.dataset.index));
      });
    });

    var startX = 0, moved = false;
    track.addEventListener("touchstart", function(e) { startX = e.touches[0].clientX; moved = false; }, {passive: true});
    track.addEventListener("touchmove",  function(e) { if (Math.abs(e.touches[0].clientX - startX) > 10) moved = true; }, {passive: true});
    track.addEventListener("touchend",   function(e) {
      if (!moved) return;
      var diffX = startX - e.changedTouches[0].clientX;
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) wrap._goToSlide(wrap._currentIdx + 1);
        else           wrap._goToSlide(wrap._currentIdx - 1);
      }
    }, {passive: true});

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && !wrap._hintExecutado) {
          wrap._hintExecutado = true;
          observer.disconnect();
          setTimeout(function() {
            track.style.transition = "transform 0.4s cubic-bezier(0.25,1,0.5,1)";
            track.style.transform  = "translateX(-15%)";
            setTimeout(function() {
              track.style.transform = "translateX(0)";
              setTimeout(function() {
                track.style.transition = "transform 0.3s ease-out";
              }, 400);
            }, 500);
          }, 700);
        }
      });
    }, { threshold: 0.4 });
    observer.observe(wrap);
  });
}

/* ══════════════════════════════
   CALLBACK DO FIREBASE — FIX:
   versão única e correta.
   Atualiza todos os dados e
   re-renderiza o catálogo.
   Chama checkAfiliadoUrl após
   cupons serem carregados.
══════════════════════════════ */
window.atualizarDoFirebase = function(fbProdutos, fbKits, fbDepoimentos, fbCupons) {
  if (fbProdutos   && fbProdutos.length > 0)   window.PRODUTOS        = fbProdutos;
  /* Sempre atualiza KITS — null/vazio do Firebase significa intencionalmente sem kits */
  window.KITS = (fbKits && fbKits.length > 0) ? fbKits : [];
  if (fbDepoimentos && fbDepoimentos.length > 0) window.DEPOIMENTOS    = fbDepoimentos;
  if (fbCupons     && fbCupons.length > 0)      window.CUPONS_DO_SISTEMA = fbCupons;

  /* Sincroniza a variável local de cupons (usada em applyCoupon e renderCartItems) */
  if (window.CUPONS_DO_SISTEMA) CUPONS_DO_SISTEMA = window.CUPONS_DO_SISTEMA;

  renderCatalogo();
  renderKits();
  renderDestaques();
  renderNotasPills();
  /* Inicia nav observer após produtos renderizados */
  setTimeout(initNavObserver, 300);

  /* FIX: chama aqui após cupons serem carregados do Firebase,
     resolvendo a falha silenciosa do primeiro render. */
  checkAfiliadoUrl();
};

/* ══════════════════════════════
   FILTRO DE NOTAS — DINÂMICO
   Gerado automaticamente a partir
   das notas reais dos produtos.
   Nunca fica desatualizado.
══════════════════════════════ */
function renderNotesPills() {
  var container = document.getElementById("notesPills");
  if (!container || typeof PRODUTOS === "undefined" || !PRODUTOS.length) return;

  /* Mapa de palavras-chave → emoji */
  var EM = {
    "baunilha":    "🍦",
    "café":        "☕",
    "âmbar":       "💎",
    "pimenta":     "🌶️",
    "rosa":        "🌹",
    "coco":        "🥥",
    "oud":         "🪵",
    "mel":         "🍯",
    "chocolate":   "🍫",
    "cacau":       "🍫",
    "lavanda":     "💜",
    "bergamota":   "🍋",
    "jasmim":      "🌸",
    "sândalo":     "🌿",
    "almíscar":    "✨",
    "couro":       "🤎",
    "especiarias": "🫙",
    "patchouli":   "🍂",
    "frutas":      "🍑",
    "flores":      "🌺",
    "madeira":     "🪵",
    "tabaco":      "🍃",
    "vetiver":     "🌾",
    "abacaxi":     "🍍",
    "limão":       "🍋",
    "toranja":     "🍊"
  };

  /* Conta frequência de cada nota (separadas por vírgula) */
  var freq = {};
  PRODUTOS.forEach(function(p) {
    if (p.ativo === false) return;
    var todas = [
      (p.notas && p.notas.topo)  || "",
      (p.notas && p.notas.corpo) || "",
      (p.notas && p.notas.fundo) || ""
    ].join(", ");
    todas.split(",").forEach(function(n) {
      var k = n.trim().toLowerCase();
      if (k.length < 3) return;
      freq[k] = (freq[k] || 0) + 1;
    });
  });

  /* Top 10 mais frequentes com ao menos 2 ocorrências */
  var top = Object.keys(freq)
    .filter(function(k) { return freq[k] >= 2; })
    .sort(function(a, b) { return freq[b] - freq[a]; })
    .slice(0, 10);

  var pills = '<button class="note-pill active" data-nota="" onclick="selectNoteFilter(this.dataset.nota, this)">Todas</button>';

  top.forEach(function(nota) {
    /* Escolhe emoji: match exato, depois prefixo */
    var emoji = EM[nota] || "";
    if (!emoji) {
      Object.keys(EM).forEach(function(key) {
        if (!emoji && nota.indexOf(key) === 0) emoji = EM[key];
      });
    }
    emoji = emoji || "✦";
    var label = nota.charAt(0).toUpperCase() + nota.slice(1);
    pills += '<button class="note-pill" data-nota="' + nota + '" onclick="selectNoteFilter(this.dataset.nota, this)">'
           + emoji + " " + label + "</button>";
  });

  container.innerHTML = pills;
}


/* ══════════════════════════════
   HELPERS DO CATÁLOGO
══════════════════════════════ */
function selectPriceOption(el) {
  var parent = el.parentElement;
  parent.querySelectorAll(".price-opt").forEach(function(opt) { opt.classList.remove("selected"); });
  el.classList.add("selected");
}

function moveTrackManual(btn, direcao, event) {
  event.stopPropagation();
  var wrap = btn.closest(".product-image");
  if (wrap && typeof wrap._goToSlide === "function") wrap._goToSlide(wrap._currentIdx + direcao);
}

function renderKits() {
  if (typeof KITS === "undefined" || !KITS) return;
  var kitsContainer = document.getElementById("kitsTrack");
  if (!kitsContainer) return;
  kitsContainer.innerHTML = KITS.filter(function(k){ return k.ativo !== false; }).map(function(k){
    var fotos = Array.isArray(k.fotos) ? k.fotos : Object.values(k.fotos || {});
    var fv = fotos.filter(function(f){ return f && f.trim() && f.indexOf("data:") === -1; });
    var temFoto = fv.length > 0;
    var itens = temFoto ? fv : [""];
    var slotsHtml = ""; var dotsHtml = "";
    itens.forEach(function(f, fIdx){
      slotsHtml += '<div class="carousel-slide">'
        + (f ? '<img src="' + sanitize(f) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;"/>'
             : '<div class="kit-placeholder"><span>&#127873;</span><p>' + sanitize(k.nome) + '</p></div>')
        + '</div>';
      dotsHtml += '<span class="dot' + (fIdx===0?' active':'') + '" data-index="' + fIdx + '"></span>';
    });
    var setasHtml = (temFoto && fv.length > 1)
      ? '<button class="track-arrow arrow-left" onclick="moveTrackManual(this,-1,event)">&#8249;</button>'
        + '<button class="track-arrow arrow-right" onclick="moveTrackManual(this,1,event)">&#8250;</button>'
      : "";
    var produtosArr = Array.isArray(k.produtos) ? k.produtos : Object.values(k.produtos || {});
    var fj = temFoto ? JSON.stringify(fv).replace(/"/g, '&quot;') : "[]";
    var nomeEsc = (k.nome||"").replace(/'/g, "\'");
    return '<article class="product-card kit-card" data-secao="kits" data-name="' + sanitize((k.nome||"").toLowerCase()) + '">'
      + '<div class="product-image" ' + (temFoto ? 'onclick="openLightboxComFotos(' + fj + ')" style="cursor:pointer;"' : 'style="cursor:default;"') + '>'
      + '<div class="carousel-track">' + slotsHtml + '</div>'
      + (temFoto && fv.length > 1 ? '<div class="carousel-dots-container">' + dotsHtml + '</div>' : "")
      + setasHtml + '<span class="sub-badge kit-badge">Kit</span>'
      + (temFoto ? '<button class="zoom-btn">&#128269;</button>' : "")
      + '</div><div class="product-info">'
      + '<div class="card-top-row"><p class="product-brand">TOBALDINE &#183; COMBO</p></div>'
      + '<h3 class="product-name">' + sanitize(k.nome||"Kit") + '</h3>'
      + '<p class="product-family">' + sanitize(produtosArr.join(" + ")) + '</p>'
      + '<p class="product-desc">' + sanitize(k.desc) + '</p>'
      + '<div class="price-wrap"><div class="price-options"><div class="price-opt selected" data-vol="Kit" data-price="' + sanitize(k.preco) + '">'
      + '<span class="vol">Kit</span><span class="price">' + sanitize(k.preco) + '</span></div></div>'
      + '<div class="card-actions" style="margin-top:12px;display:flex;gap:6px;">'
      + '<button class="wpp-btn" style="flex:1" onclick="buyDirect(this)">Pedir Kit</button>'
      + '<button class="add-cart-btn" onclick="addToCart(this)">&#65291;</button>'
      + '<button title="Copiar link" onclick="compartilharProduto(\'' + nomeEsc + '\',event)" style="width:36px;height:36px;border:1px solid rgba(212,168,76,0.2);background:transparent;border-radius:6px;cursor:pointer;font-size:15px;flex-shrink:0">&#128279;</button>'
      + '</div></div></div></article>';
  }).join("");
}

function clearCart() {
  CARRINHO = [];
  localStorage.removeItem("tb_carrinho");
  updateCartBadge();
  renderCartItems();
}

function changeQty(idx, val) {
  CARRINHO[idx].qtd += val;
  if (CARRINHO[idx].qtd <= 0) CARRINHO.splice(idx, 1);
  localStorage.setItem("tb_carrinho", JSON.stringify(CARRINHO));
  updateCartBadge();
  renderCartItems();
}

function updateCartBadge() {
  var totalItems = CARRINHO.reduce(function(acc, item) { return acc + item.qtd; }, 0);
  document.getElementById("cartCount").textContent = totalItems;
}

function addToCart(btn) {
  var card = btn.closest(".product-card");
  var nome = card.querySelector(".product-name").textContent;
  var selectedOpt = card.querySelector(".price-opt.selected");
  if (!selectedOpt) return;
  var vol   = selectedOpt.dataset.vol;
  var preco = selectedOpt.dataset.price;
  var itemExistente = CARRINHO.find(function(i) { return i.nome === nome && i.vol === vol; });
  if (itemExistente) {
    itemExistente.qtd++;
  } else {
    CARRINHO.push({ nome: nome, vol: vol, preco: preco, qtd: 1 });
  }
  localStorage.setItem("tb_carrinho", JSON.stringify(CARRINHO));
  updateCartBadge();
  var fab = document.querySelector(".cart-fab");
  fab.classList.add("cart-bounce");
  setTimeout(function() { fab.classList.remove("cart-bounce"); }, 400);
}

function toggleCart() {
  var panel   = document.getElementById("cartPanel");
  var overlay = document.getElementById("cartOverlay");
  var isOpen  = panel.classList.toggle("open");
  overlay.style.display = isOpen ? "block" : "none";
  if (isOpen) renderCartItems();
}

/* ══════════════════════════════
   LIGHTBOX
══════════════════════════════ */
var LIGHTBOX_INDEX = 0;
var LIGHTBOX_FOTOS = [];
var LIGHTBOX_PRODUTO = null;

function openLightboxFromCard(prodIdx) {
  var p = PRODUTOS[prodIdx];
  if (!p) return;
  var fotosRaw = Array.isArray(p.fotos) ? p.fotos : Object.values(p.fotos || {});
  var fotos = fotosRaw.filter(function(f){ return f && f.trim() && f.indexOf("data:image/svg") === -1; });
  if (fotos.length === 0) return;
  LIGHTBOX_FOTOS = fotos;
  LIGHTBOX_PRODUTO = p;
  LIGHTBOX_INDEX = 0;
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(updateLightboxView, 10);
}

function updateLightboxView() {
  var imgEl = document.getElementById("lightboxImg");
  if (imgEl) imgEl.src = LIGHTBOX_FOTOS[LIGHTBOX_INDEX] || "";
  var dotsEl = document.getElementById("lightboxDots");
  if (dotsEl) dotsEl.innerHTML = LIGHTBOX_FOTOS.map(function(_, idx) {
    var act = (idx === LIGHTBOX_INDEX) ? "background:#d4a84c" : "background:rgba(255,255,255,0.35)";
    return '<span style="width:8px;height:8px;border-radius:50%;display:inline-block;margin:0 3px;cursor:pointer;' + act + '" onclick="LIGHTBOX_INDEX=' + idx + ';updateLightboxView()"></span>';
  }).join("");
  var infoEl = document.getElementById("lightboxInfo");
  if (!infoEl) return;
  var p = LIGHTBOX_PRODUTO;
  if (!p) { infoEl.innerHTML = ""; return; }
  var nT = (p.notas && p.notas.topo)  ? p.notas.topo  : "\u2014";
  var nC = (p.notas && p.notas.corpo) ? p.notas.corpo : "\u2014";
  var nF = (p.notas && p.notas.fundo) ? p.notas.fundo : "\u2014";
  var precos = (p.precos || [{}]);
  infoEl.innerHTML =
    '<p class="lb-brand">' + sanitize(p.marca||"") + (p.familia ? " \u00b7 " + sanitize(p.familia) : "") + '</p>'
    + '<h2 class="lb-name">' + sanitize(p.nome||"") + '</h2>'
    + '<p class="lb-desc">' + sanitize((p.desc||"").substring(0,200)) + '</p>'
    + '<div class="lb-notes">'
    + '<div class="lb-note-row"><span class="lb-note-lbl">Topo</span><span class="lb-note-val">' + sanitize(nT) + '</span></div>'
    + '<div class="lb-note-row"><span class="lb-note-lbl">Corpo</span><span class="lb-note-val">' + sanitize(nC) + '</span></div>'
    + '<div class="lb-note-row"><span class="lb-note-lbl">Fundo</span><span class="lb-note-val">' + sanitize(nF) + '</span></div>'
    + '</div>'
    + '<div class="lb-price-row">'
    + precos.map(function(o,i){
        return '<div class="lb-price-opt' + (i===0?' selected':'') + '" data-price="' + sanitize(o.preco||"") + '" data-vol="' + sanitize(o.vol||"") + '" onclick="var s=this.parentNode.querySelectorAll(\'.lb-price-opt\');s.forEach(function(x){x.classList.remove(\'selected\')});this.classList.add(\'selected\')">'
          + '<span>' + sanitize(o.vol||"") + '</span><strong>' + sanitize(o.preco||"") + '</strong></div>';
      }).join("")
    + '</div>'
    + '<button class="lb-buy-btn" onclick="buyFromLightbox()">\ud83d\udcac Pedir no WhatsApp</button>'
    + '<button class="lb-share-btn" onclick="compartilharProduto(\'' + (p.nome||"").replace(/'/g,"\\'") + '\',event)">\ud83d\udd17 Copiar link</button>';
}

function buyFromLightbox() {
  if (!LIGHTBOX_PRODUTO) return;
  var p = LIGHTBOX_PRODUTO;
  var infoEl = document.getElementById("lightboxInfo");
  var selOpt = infoEl ? infoEl.querySelector(".lb-price-opt.selected") : null;
  var vol   = selOpt ? selOpt.dataset.vol   : ((p.precos||[{}])[0].vol||"");
  var preco = selOpt ? selOpt.dataset.price : ((p.precos||[{}])[0].preco||"");
  var precoNum = parsePreco(preco);
  var desc = 0;
  if (CUPOM_ATIVO) {
    if (CUPOM_ATIVO.regra.tipo === "porcentagem") desc = precoNum * (CUPOM_ATIVO.regra.valor/100);
    else if (CUPOM_ATIVO.regra.tipo === "fixo") desc = CUPOM_ATIVO.regra.valor;
    desc = Math.min(precoNum, desc);
  }
  var total = precoNum - desc;
  var texto = "Ol\u00e1, Tobaldine Signature! Gostaria de fazer o pedido:\n\n";
  texto += "\u2022 *" + p.nome + "* (" + vol + ") \u2014 " + preco + "\n";
  if (CUPOM_ATIVO && desc > 0) texto += "Cupom " + CUPOM_ATIVO.codigo + ": -R$ " + desc.toFixed(2).replace(".",",") + "\n";
  texto += "\n*Total:* R$ " + total.toFixed(2).replace(".",",");
  texto += "\n\nQuero confirmar esse pedido! \ud83d\ude0a";
  closeLightbox();
  window.open("https://api.whatsapp.com/send?phone=" + TEL + "&text=" + encodeURIComponent(texto), "_blank");
}

function closeLightbox() { document.getElementById("lightbox").classList.remove("open"); document.body.style.overflow = ""; }
function prevLightbox(e) { e.stopPropagation(); LIGHTBOX_INDEX = (LIGHTBOX_INDEX === 0) ? LIGHTBOX_FOTOS.length - 1 : LIGHTBOX_INDEX - 1; updateLightboxView(); }
function nextLightbox(e) { e.stopPropagation(); LIGHTBOX_INDEX = (LIGHTBOX_INDEX === LIGHTBOX_FOTOS.length - 1) ? 0 : LIGHTBOX_INDEX + 1; updateLightboxView(); }



function toSlug(str) {
  return (str || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function compartilharProduto(nome, e) {
  if (e) e.stopPropagation();
  var url = window.location.origin + "/p/" + toSlug(nome);
  var btn = e && e.currentTarget;
  if (navigator.share) { navigator.share({ title: nome + " \u00b7 Tobaldine Signature", url: url }); return; }
  navigator.clipboard.writeText(url).then(function(){
    if (btn) { var orig = btn.textContent; btn.textContent = "\u2713"; setTimeout(function(){ btn.textContent = orig; }, 1800); }
    var t = document.getElementById("toastEl");
    if (t) { t.textContent = "Link copiado!"; t.classList.add("show"); setTimeout(function(){ t.classList.remove("show"); }, 2200); }
  }).catch(function(){ alert("Link: " + url); });
}

function openLightboxComFotos(fotos, startIdx) {
  if (!fotos || !fotos.length) return;
  LIGHTBOX_FOTOS = fotos;
  LIGHTBOX_PRODUTO = null;
  LIGHTBOX_INDEX = startIdx || 0;
  var lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(updateLightboxView, 10);
}

var PRECO_MIN = 0, PRECO_MAX = 9999;
function filterByPrice(min, max, btn) {
  PRECO_MIN = min; PRECO_MAX = max;
  if (btn) {
    btn.closest(".notes-pills-scroll").querySelectorAll(".note-pill").forEach(function(p){ p.classList.remove("active"); });
    btn.classList.add("active");
  }
  filterProducts();
}

function filterByVolume(tipo, btn) {
  document.querySelectorAll(".note-pill").forEach(function(p){
    var oc = p.getAttribute("onclick") || "";
    if (["todos","decants","originais","similares","kits"].some(function(t){ return oc.indexOf("'"+t+"'") !== -1; }))
      p.classList.remove("active");
  });
  if (btn) btn.classList.add("active");
  var tipos = ["decants","originais","similares"];
  tipos.forEach(function(t){
    var mostrar = (tipo === "todos" || tipo === t);
    document.querySelectorAll("[id$='-"+t+"']").forEach(function(g){ g.style.display = mostrar ? "" : "none"; });
    document.querySelectorAll(".sub-category-title[data-secao='"+t+"']").forEach(function(el){ el.style.display = mostrar ? "" : "none"; });
  });
  document.querySelectorAll(".gender-section").forEach(function(sec){
    if (tipo === "todos") { sec.style.display = ""; return; }
    if (tipo === "kits") { sec.style.display = "none"; return; }
    var ok = Array.from(sec.querySelectorAll(".dynamic-grid")).some(function(g){ return g.style.display !== "none" && g.children.length > 0; });
    sec.style.display = ok ? "" : "none";
  });
  if (tipo === "kits") { var kSec = document.getElementById("kits-cosmeticos"); if (kSec) kSec.scrollIntoView({behavior:"smooth"}); }
}

function catFilter(tipo, btn) {
  document.querySelectorAll(".cat-pill, .cat-card").forEach(function(c){ c.classList.remove("active"); });
  if (btn) btn.classList.add("active");
  var destSec = document.getElementById("destaquesSection");
  if (tipo === "todos") {
    /* Mostra todos os cards do gênero atual sem filtro de tipo */
    document.querySelectorAll(".product-card").forEach(function(c){ c.style.display = ""; });
    /* Reseta ml-pills */
    document.querySelectorAll(".ml-pill").forEach(function(p){ p.classList.remove("active"); });
    var ml0 = document.querySelector(".ml-pill");
    if (ml0) ml0.classList.add("active");
    /* Mostra seções de gênero respeitando a rota — kits só aparece se rota = kits */
    var generoRoutes = ["masculinos","femininos","unissex"];
    generoRoutes.forEach(function(g){
      var el = document.getElementById(g);
      if (!el) return;
      if (!CURRENT_ROUTE || CURRENT_ROUTE === "") {
        el.style.display = "";
      } else {
        el.style.display = (g === CURRENT_ROUTE) ? "" : "none";
      }
    });
    var kSec = document.getElementById("kits-cosmeticos");
    if (kSec) kSec.style.display = (CURRENT_ROUTE === "kits") ? "" : "none";
    /* Scroll para o topo do catálogo */
    var catalogHeader = document.getElementById("catalogPageHeader");
    if (catalogHeader) catalogHeader.scrollIntoView({behavior:"smooth", block:"start"});
    return;
  }
  /* kits, decants, originais, similares — tudo filtra em lugar */
  if (tipo === "kits" || tipo === "decants" || tipo === "originais" || tipo === "similares") {
    document.querySelectorAll(".product-card").forEach(function(c){
      c.style.display = ((c.dataset.secao||"") === tipo) ? "" : "none";
    });
    /* Re-aplica rota para não mostrar seções erradas */
    if (CURRENT_ROUTE && CURRENT_ROUTE !== "") {
      var secs = ['masculinos','femininos','unissex'];
      secs.forEach(function(g){
        var el = document.getElementById(g);
        if (el) el.style.display = (g === CURRENT_ROUTE || CURRENT_ROUTE === 'kits') ? '' : 'none';
      });
      var k = document.getElementById('kits-cosmeticos');
      if (k) k.style.display = '';
    }
    return;
  }
  document.querySelectorAll(".gender-section").forEach(function(s){ s.style.display = ""; });
  document.querySelectorAll(".product-card").forEach(function(c){
    c.style.display = ((c.dataset.secao || "") === tipo) ? "" : "none";
  });
  var kSec2 = document.getElementById("kits-cosmeticos");
  if (kSec2) kSec2.style.display = "none";
  if (destSec) destSec.style.display = "none";
  document.querySelectorAll(".gender-section").forEach(function(sec){
    var temVisivel = Array.from(sec.querySelectorAll(".product-card")).some(function(c){ return c.style.display !== "none"; });
    sec.style.display = temVisivel ? "" : "none";
  });
  /* Re-aplica rota para não mostrar seções fora da rota atual */
  if (CURRENT_ROUTE && CURRENT_ROUTE !== "") {
    showCatalogSection(CURRENT_ROUTE);
  }
}

function toggleMobileMenu() {
  var menu = document.getElementById("mobileMenu");
  var overlay = document.getElementById("mobileMenuOverlay");
  if (!menu) return;
  var open = menu.classList.toggle("open");
  if (overlay) overlay.classList.toggle("open", open);
  document.body.style.overflow = open ? "hidden" : "";
}

var PRODUTOS_DESTAQUE = ["Asad","Yara","Khamrah","Bade'e Al Oud Sublime","Kits"];
function renderDestaques() {
  var grid = document.getElementById("destaquesGrid");
  var sec  = document.getElementById("destaquesSection");
  if (!grid || typeof PRODUTOS === "undefined" || !PRODUTOS.length) return;

  var nomes = ["Asad","Yara","Khamrah","Bade","Fakhar","9PM","Arabic","Lattafa"];
  var encontrados = [];
  /* Tenta por nome primeiro */
  nomes.forEach(function(n){
    var p = PRODUTOS.find(function(x){ return x.nome && x.nome.toLowerCase().indexOf(n.toLowerCase()) !== -1; });
    if (p && encontrados.indexOf(p) === -1 && encontrados.length < 5) encontrados.push(p);
  });
  /* Fallback: pega os primeiros 5 com foto */
  if (encontrados.length < 3) {
    PRODUTOS.forEach(function(p){
      if (encontrados.indexOf(p) !== -1) return;
      var f = Array.isArray(p.fotos) ? p.fotos : Object.values(p.fotos||{});
      var temFoto = f.some(function(x){ return x && x.trim() && x.indexOf("data:image/svg")===-1; });
      if (temFoto && encontrados.length < 5) encontrados.push(p);
    });
  }
  if (encontrados.length === 0) return;

  var destaque = encontrados[0];
  var mini = encontrados.slice(1);

  function foto(p) {
    var f = Array.isArray(p.fotos) ? p.fotos : Object.values(p.fotos||{});
    return f.filter(function(x){ return x && x.trim() && x.indexOf("data:image/svg")===-1; })[0] || "";
  }
  function pr(p) { return (p.precos||[{}])[0]; }

  var f0 = foto(destaque), pr0 = pr(destaque), idx0 = PRODUTOS.indexOf(destaque);
  var label = destaque.secao==="decants"?"Miniatura 25ml":destaque.secao==="originais"?"Original 100ml":"Perfume";

  var html = '<div class="dest-editorial">';
  html += '<div class="dest-main" onclick="openLightboxFromCard('+idx0+')">';
  html += '<div class="dest-main-img">'+(f0?'<img src="'+sanitize(f0)+'" alt="'+sanitize(destaque.nome)+'"/>':'<span style="font-size:48px;opacity:.2">&#127869;</span>')+'</div>';
  html += '<div class="dest-main-info">';
  html += '<p class="dest-main-eyebrow">'+sanitize(label)+(destaque.familia?' &middot; '+sanitize(destaque.familia):'')+'</p>';
  html += '<h2 class="dest-main-name">'+sanitize(destaque.nome)+'</h2>';
  html += '<p class="dest-main-desc">'+sanitize((destaque.desc||"").substring(0,160))+'</p>';
  html += '<div class="dest-main-footer"><span class="dest-main-price">'+sanitize(pr0.preco||"")+'</span>';
  html += '<button class="dest-main-btn" onclick="event.stopPropagation();buyDirect(this)" data-name="'+sanitize(destaque.nome)+'" data-brand="'+sanitize(destaque.marca||"")+'" data-vol="'+sanitize(pr0.vol||"")+'" data-price="'+sanitize(pr0.preco||"")+'">Pedir agora</button>';
  html += '</div></div></div>';

  if (mini.length > 0) {
    html += '<div class="dest-mini-grid">';
    mini.forEach(function(p){
      var f1=foto(p), pr1=pr(p), idx1=PRODUTOS.indexOf(p);
      html += '<div class="dest-mini" onclick="openLightboxFromCard('+idx1+')">';
      html += '<div class="dest-mini-img">'+(f1?'<img src="'+sanitize(f1)+'" alt="'+sanitize(p.nome)+'"/>':'')+'</div>';
      html += '<div><p class="dest-mini-brand">'+sanitize(p.marca||"")+'</p>';
      html += '<p class="dest-mini-name">'+sanitize(p.nome)+'</p>';
      html += '<p class="dest-mini-price">'+sanitize(pr1.preco||"")+'</p></div></div>';
    });
    html += '</div>';
  }
  html += '</div>';
  grid.innerHTML = html;
  if (sec) sec.style.display = "";
}

window.addEventListener("scroll", function() {
  var btn = document.getElementById("backToTop");
  if (btn) btn.classList.toggle("visible", window.scrollY > 400);
});


/* ══ TABS DE GÊNERO ══ */
var GENERO_ATIVO = null;

function filtrarGenero(genero, linkEl) {
  var catalog = document.getElementById("masculinos") || document.querySelector(".gender-section");
  if (!catalog) return;

  /* Se clicar no mesmo → volta para "todos" */
  if (GENERO_ATIVO === genero) {
    GENERO_ATIVO = null;
    document.querySelectorAll(".nav-link[data-genero]").forEach(function(l){ l.classList.remove("genero-ativo"); });
    document.querySelectorAll(".gender-section").forEach(function(s){ s.style.display = ""; s.style.opacity = "1"; });
    var destSec = document.getElementById("destaquesSection");
    if (destSec) destSec.style.display = "";
    return;
  }

  GENERO_ATIVO = genero;

  /* Marca tab ativo */
  document.querySelectorAll(".nav-link[data-genero]").forEach(function(l){
    l.classList.toggle("genero-ativo", l.dataset.genero === genero);
  });

  /* Mostra só o gênero selecionado */
  document.querySelectorAll(".gender-section").forEach(function(s){
    var mostrar = s.id === genero;
    s.style.display = mostrar ? "" : "none";
    s.style.opacity = mostrar ? "1" : "0";
  });

  /* Rola suavemente para a seção */
  var sec = document.getElementById(genero);
  if (sec) {
    var navH = document.querySelector(".sticky-nav");
    var offset = navH ? navH.offsetHeight + 12 : 60;
    var top = sec.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  /* Oculta destaques quando em view de gênero */
  var destSec2 = document.getElementById("destaquesSection");
  if (destSec2) destSec2.style.display = "none";
}


/* ══════════════════════════════════════════════════════
   ROUTER — hash-based SPA navigation
══════════════════════════════════════════════════════ */
var CURRENT_ROUTE = '';

var CATALOG_TITLES = {
  masculinos: 'Masculino',
  femininos: 'Feminino',
  unissex: 'Unissex',
  kits: 'Kits & Cosméticos'
};

function navigate(route) {
  CURRENT_ROUTE = route || '';
  /* Previne erros de analytics durante pushState */
  try {
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', route ? '/#' + route : '/');
    }
  } catch(e) {}
  renderRoute(CURRENT_ROUTE);
}

function renderRoute(route) {
  var isLanding = !route || route === 'home';
  var landingEl = document.getElementById('view-landing');
  var catalogEl = document.getElementById('view-catalog');
  if (!landingEl || !catalogEl) return;

  landingEl.style.display = isLanding ? '' : 'none';
  catalogEl.style.display = isLanding ? 'none' : '';

  /* Atualiza nav ativo */
  document.querySelectorAll('.nav-link[data-route]').forEach(function(l) {
    l.classList.toggle('active', l.dataset.route === route);
  });

  if (!isLanding) {
    showCatalogSection(route);
    window.scrollTo(0, 0);
  }
}

function showCatalogSection(genero) {
  /* Caso especial: sobre */
  if (genero === 'sobre') {
    ['masculinos','femininos','unissex'].forEach(function(g){
      var el = document.getElementById(g); if(el) el.style.display='none';
    });
    var k = document.getElementById('kits-cosmeticos'); if(k) k.style.display='none';
    var s = document.getElementById('sobre'); if(s) s.style.display='';
    var h = document.getElementById('how-it-works'); if(h) h.style.display='';
    var titleEl = document.getElementById('catalogPageTitle');
    if(titleEl) titleEl.textContent = 'Sobre';
    return;
  }
  /* Mostra só a seção do gênero solicitado */
  var secs = ['masculinos','femininos','unissex'];
  secs.forEach(function(g) {
    var el = document.getElementById(g);
    if (el) el.style.display = (g === genero) ? '' : 'none';
  });
  var kitsSec = document.getElementById('kits-cosmeticos');
  /* Kits aparecem em todas as páginas — filtro acontece por data-secao */
  if (kitsSec) kitsSec.style.display = (genero === 'sobre') ? 'none' : '';
  /* Oculta seções que não pertencem ao catálogo de produto */
  ['sobre','autorais','how-it-works'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  /* Atualiza título */
  var titleEl = document.getElementById('catalogPageTitle');
  if (titleEl) titleEl.textContent = CATALOG_TITLES[genero] || genero;

  /* Mostra/oculta pills de tipo conforme o gênero */
  var typePills = document.querySelectorAll('.type-filter-pill');
  if (genero === 'kits') {
    typePills.forEach(function(p){ p.style.display = 'none'; });
  } else {
    typePills.forEach(function(p){ p.style.display = ''; });
  }

  /* Reseta filtros */
  PRECO_MIN = 0; PRECO_MAX = 9999;
  /* Só mexe no pill se for rota de kits — nas outras o filtro de tipo persiste */
  if (genero === 'kits') {
    document.querySelectorAll('.cat-pill').forEach(function(p) {
      var oc = p.getAttribute('onclick') || '';
      p.classList.toggle('active', oc.indexOf("'kits'") !== -1);
    });
  } else if (genero === 'sobre') {
    /* Sobre: nenhum pill de tipo ativo */
    document.querySelectorAll('.cat-pill').forEach(function(p){ p.classList.remove('active'); });
  }
  /* ml-pill: reseta apenas ao trocar de rota para evitar confusão */
  document.querySelectorAll('.ml-pill').forEach(function(p){ p.classList.remove('active'); });
  var mlTodos = document.querySelector('.ml-pill');
  if (mlTodos) mlTodos.classList.add('active');
  document.querySelectorAll('.product-card').forEach(function(c) { c.style.display = ''; });
}

/* Inicialização e navegação do browser */
window.addEventListener('popstate', function() {
  var hash = window.location.hash.replace(/^#\//, '').replace(/^#/, '');
  renderRoute(hash);
});

/* catFilter 'kits' → navega para rota */
var _catFilterOriginal = catFilter;
catFilter = function(tipo, btn) {
  _catFilterOriginal(tipo, btn);
};


/* ══ FILTRO POR VOLUME/TIPO ══ */
function filterByML(tipo, btn) {
  /* Atualiza pill ativo */
  document.querySelectorAll(".ml-pill").forEach(function(p){ p.classList.remove("active"); });
  if (btn) btn.classList.add("active");

  /* Filtra cards pelo data-secao */
  document.querySelectorAll(".product-card").forEach(function(c){
    if (tipo === "todos") { c.style.display = ""; return; }
    var secao = c.dataset.secao || "";
    c.style.display = (secao === tipo) ? "" : "none";
  });

  /* Garante seções visíveis sem resetar os cards filtrados */
  if (CURRENT_ROUTE && CURRENT_ROUTE !== "") {
    var generoRoutes = ["masculinos","femininos","unissex"];
    generoRoutes.forEach(function(g){
      var el = document.getElementById(g);
      if (el) el.style.display = (g === CURRENT_ROUTE) ? "" : "none";
    });
    var kSec = document.getElementById("kits-cosmeticos");
    if (kSec) kSec.style.display = (CURRENT_ROUTE === "kits" || tipo === "kits") ? "" : "none";
  }
}


/* ══ FILTRO DE NOTAS DINÂMICO ══ */
var NOTA_EMOJIS = {
  "bergamota":"🍋","limão":"🍋","cítrico":"🍊","laranja":"🍊","toranja":"🍊",
  "almíscar":"🌫️","musk":"🌫️","musgo":"🌿","madeira":"🪵","amadeirado":"🪵","cedro":"🌲","sândalo":"🌲",
  "baunilha":"🍦","pralinê":"🍫","doce":"🍬","caramelo":"🍮","mel":"🍯",
  "rosa":"🌹","floral":"🌸","jasmim":"🌸","íris":"💜","peônia":"🌸","violeta":"💜",
  "âmbar":"✨","oud":"🔥","incenso":"🔥","defumado":"🔥","oriental":"🔮",
  "patchouli":"🌿","vetiver":"🌱","musgo de carvalho":"🍄",
  "pimenta":"🌶️","especiarias":"🌶️","cardamomo":"🫚","gengibre":"🫚",
  "frutado":"🍑","frutas":"🍑","pêssego":"🍑","maçã":"🍎","morango":"🍓",
  "aquático":"💧","marinho":"💧","fresco":"💨","ozônico":"💨",
  "café":"☕","tabaco":"🪵","couro":"🤎","benjoim":"✨","tonka":"✨",
  "fava tonka":"✨","coco":"🥥","ylang":"🌺","neroli":"🌸","bergamota":"🍋"
};

function getNotaEmoji(nota) {
  var n = nota.toLowerCase().trim();
  for (var key in NOTA_EMOJIS) {
    if (n.indexOf(key) !== -1) return NOTA_EMOJIS[key];
  }
  return "✦";
}

function renderNotasPills() {
  var container = document.getElementById("notesPills");
  if (!container || typeof PRODUTOS === "undefined" || !PRODUTOS.length) return;

  /* Coleta todas as notas únicas */
  var notasSet = {};
  PRODUTOS.forEach(function(p) {
    if (!p.notas) return;
    ["topo","corpo","fundo"].forEach(function(camada) {
      var val = p.notas[camada] || "";
      val.split(/[,;·]+/).forEach(function(n) {
        n = n.trim();
        if (n && n.length > 1 && n !== "—") {
          /* Normaliza para lowercase como chave */
          var key = n.toLowerCase();
          if (!notasSet[key]) notasSet[key] = n;
        }
      });
    });
  });

  /* Ordena alfabeticamente */
  var notas = Object.values(notasSet).sort(function(a,b){
    return a.toLowerCase().localeCompare(b.toLowerCase(), 'pt');
  });

  /* Gera pills */
  var pills = '<button class="note-pill active" data-nota="" onclick="selectNoteFilter(this.dataset.nota, this)">Todas</button>';
  notas.forEach(function(nota) {
    var emoji = getNotaEmoji(nota);
    pills += '<button class="note-pill" data-nota="' + nota.toLowerCase() + '" onclick="selectNoteFilter(this.dataset.nota, this)">'
      + emoji + ' ' + nota + '</button>';
  });

  container.innerHTML = pills;
  console.log("Notas geradas:", notas.length);
}


function atualizarBadgeNota() {
  var badge = document.getElementById("badgeNota");
  if (!badge) return;
  if (NOTA_FILTRO_ATIVA) {
    badge.textContent = "· " + NOTA_FILTRO_ATIVA;
    badge.style.display = "";
  } else {
    badge.style.display = "none";
  }
}

/* Tratamento especial para autorais no catFilter */
var _catFilterBase = catFilter;
catFilter = function(tipo, btn) {
  if (tipo === "autorais") {
    document.querySelectorAll(".cat-pill, .cat-card").forEach(function(c){ c.classList.remove("active"); });
    if (btn) btn.classList.add("active");
    var autoSection = document.getElementById("autorais");
    document.querySelectorAll(".gender-section").forEach(function(s){ s.style.display = "none"; });
    document.getElementById("kits-cosmeticos") && (document.getElementById("kits-cosmeticos").style.display = "none");
    if (autoSection) { autoSection.style.display = ""; }
    document.querySelectorAll(".product-card").forEach(function(c){ c.style.display = ""; });
    return;
  }
  _catFilterBase(tipo, btn);
};

/* Nudge sacola vazia */
function verificarNudgeSacola() {
  var cartCount = document.querySelector(".cart-count");
  var nudge = document.getElementById("cartNudge");
  if (!nudge) return;
  var empty = !cartCount || cartCount.textContent === "0" || cartCount.style.display === "none";
  nudge.style.display = empty ? "" : "none";
}

document.addEventListener("DOMContentLoaded", function() {
  var _h = window.location.hash.replace(/^#\//, "").replace(/^#/, "");
  renderRoute(_h || "");
  renderCatalogo();
  /* Retry renderDestaques após Firebase carregar */
  setTimeout(function(){ if(typeof PRODUTOS!=="undefined"&&PRODUTOS.length){ renderDestaques(); renderNotasPills(); } }, 1200);
  setTimeout(function(){ if(typeof PRODUTOS!=="undefined"&&PRODUTOS.length) renderDestaques(); }, 3000);

  /* LGPD: mostra banner se não aceito ainda */
  if (!localStorage.getItem("tb_lgpd_aceito")) {
    var banner = document.getElementById("lgpdBanner");
    if (banner) setTimeout(function() { banner.classList.add("show"); }, 1200);
  }
});

function aceitarLGPD() {
  localStorage.setItem("tb_lgpd_aceito", "1");
  var banner = document.getElementById("lgpdBanner");
  if (banner) { banner.classList.remove("show"); }
}


/* ══════════════════════════════════════
   NAV ATIVO AO ROLAR
══════════════════════════════════════ */
function initNavObserver(){
  var navLinks = document.querySelectorAll(".nav-link");
  if(!navLinks.length) return;

  var linkMap = {};
  navLinks.forEach(function(a){
    var href = a.getAttribute("href");
    if(href && href.startsWith("#")) linkMap[href.slice(1)] = a;
  });

  var setActive = function(id){
    navLinks.forEach(function(a){ a.classList.remove("nav-active"); });
    if(linkMap[id]) linkMap[id].classList.add("nav-active");
  };

  if("IntersectionObserver" in window){
    var observer = new IntersectionObserver(function(entries){
      /* Pega a entrada mais visível */
      var best = null;
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          if(!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
        }
      });
      if(best) setActive(best.target.id);
    }, { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.1, 0.5] });

    ["masculinos","femininos","unissex","kits-cosmeticos","autorais","sobre"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) observer.observe(el);
    });
  } else {
    /* Fallback: scroll event */
    window.addEventListener("scroll", function(){
      var ids = ["masculinos","femininos","unissex","kits-cosmeticos","autorais","sobre"];
      var cur = "";
      ids.forEach(function(id){
        var el = document.getElementById(id);
        if(el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = id;
      });
      if(cur){
        navLinks.forEach(function(a){ a.classList.remove("nav-active"); });
        if(linkMap[cur]) linkMap[cur].classList.add("nav-active");
      }
    }, {passive: true});
  }
}
/* Aguarda o catálogo carregar para iniciar o observer */
/* initNavObserver chamado após renderCatalogo via atualizarDoFirebase */
