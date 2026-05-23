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
var _viewersCache = {};

function _getViewers(idx) {
  if (!_viewersCache[idx]) {
    _viewersCache[idx] = Math.floor(Math.random() * 14) + 4; /* 4–17 */
  }
  return _viewersCache[idx];
}

/* Atualiza viewers a cada ~40s para parecer dinâmico */
function _startViewerTick() {
  setInterval(function() {
    Object.keys(_viewersCache).forEach(function(idx) {
      var delta = Math.random() < 0.5 ? 1 : -1;
      var novo = _viewersCache[idx] + delta;
      _viewersCache[idx] = Math.max(2, Math.min(22, novo));
      var el = document.getElementById("viewers-" + idx);
      if (el) el.textContent = _viewersCache[idx] + " pessoas vendo agora";
    });
  }, 38000);
}

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

    /* Contador de pessoas vendo — controlado pela config */
    var _showViewers = (localStorage.getItem("tb_cfg_viewers") !== "0") && (typeof window._tbConfig === 'undefined' || window._tbConfig.viewers !== false);
    var viewersHtml = _showViewers
      ? '<div class="viewers-badge" id="viewers-' + index + '">' + _getViewers(index) + ' pessoas vendo agora</div>'
      : '';
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
    var cardHtml = '<article class="product-card" id="prod-' + index + '"'
      + ' data-name="' + sanitize((p.nome || "").toLowerCase()) + '"'
      + ' data-notas="' + sanitize(notasTexto) + '"'
      + ' data-sort-idx="' + index + '"'
      + ' data-price="' + primeiroPreco + '">'
      + '<div class="product-image" onclick="openLightboxFromCard(' + index + ')">'
      + '<div class="carousel-track">' + slotsHtml + '</div>'
      + '<div class="carousel-dots-container">' + dotsHtml + '</div>'
      + setasHtml
      + '<span class="sub-badge">' + sanitize(p.badge) + '</span>'
      + '<button class="zoom-btn">🔍</button>'
      + '</div>'
      + rankingHtml
      + '<div class="product-info">'
      + '<p class="product-brand">' + sanitize(p.marca) + '</p>'
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
      + viewersHtml
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
      fragmentos["autorais"].push(cardHtml);
    } else if (p.secao === "cosmeticos") {
      fragCosmeticos.push(cardHtml);
    } else {
      var targetId = genero + "-" + p.secao;
      if (!fragmentos[targetId]) fragmentos[targetId] = [];
      fragmentos[targetId].push(cardHtml);
    }
  });

  /* Aplica todos os fragmentos de uma vez no DOM */
  Object.keys(fragmentos).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = fragmentos[id].join("");
  });
  if (trackCosmeticos && fragCosmeticos.length) {
    trackCosmeticos.innerHTML = fragCosmeticos.join("");
  }

  /* Autorais */
  var trackAutorais = document.getElementById("autorais-track");
  var secAutorais   = document.getElementById("autorais");
  var navAutorais   = document.getElementById("nav-autorais");
  if(trackAutorais && fragmentos["autorais"] && fragmentos["autorais"].length){
    trackAutorais.innerHTML = fragmentos["autorais"].join("");
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
  renderDepoimentos();
  renderNotesPills();
  updateCartBadge();
  checkAfiliadoUrl();
  setTimeout(initCarrosselComHint, 100);
  _startViewerTick();
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

    card.style.display = (matchBusca && matchNota) ? "" : "none";
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
  if (AFILIADO_IDENTIFICADO) {
    texto += "*Afiliado Relacionado:* " + AFILIADO_IDENTIFICADO + " (Comissão Ativa)\n";
  }
  var finalTotal = subtotal - desconto;
  texto += "\n*Total Geral:* R$ " + finalTotal.toFixed(2).replace(".", ",");
  texto += "\n\nPode me informar o endereço de entrega com referência? 😊\nAceitamos *PIX* e *cartão* (link ou maquininha). Entrega em Mauá de moto, outras regiões via Uber/99. Prazo confirmado aqui!";
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
  var texto = "Olá! Gostaria de fazer o pedido do seguinte perfume:\n\n• *" + nome + "* (" + brand + ")\n• Volumetria: " + vol + "\n• Valor: " + preco + "\n";
  if (AFILIADO_IDENTIFICADO) { texto += "\n*Indicação Afiliado:* " + AFILIADO_IDENTIFICADO + "\n"; }
  texto += "\nPode me informar o endereço de entrega com referência? 😊\nAceitamos *PIX* e *cartão* (link ou maquininha). Entrega em Mauá de moto, outras regiões via Uber/99. Prazo confirmado aqui!";
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
  if (fbKits       && fbKits.length > 0)        window.KITS            = fbKits;
  if (fbDepoimentos && fbDepoimentos.length > 0) window.DEPOIMENTOS    = fbDepoimentos;
  if (fbCupons     && fbCupons.length > 0)      window.CUPONS_DO_SISTEMA = fbCupons;

  /* Sincroniza a variável local de cupons (usada em applyCoupon e renderCartItems) */
  if (window.CUPONS_DO_SISTEMA) CUPONS_DO_SISTEMA = window.CUPONS_DO_SISTEMA;

  renderCatalogo();

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

  kitsContainer.innerHTML = KITS.filter(function(k) { return k.ativo !== false; }).map(function(k) {
    var src = (k.fotos && k.fotos[0]) ? k.fotos[0] : "";
    return '<article class="product-card kit-card" data-name="' + sanitize(k.nome.toLowerCase()) + '">'
      + '<div class="product-image">'
      + (src
          ? '<img src="' + sanitize(src) + '" />'
          : '<div class="kit-placeholder"><span>🎁</span><p>' + sanitize(k.nome) + '</p></div>')
      + '<span class="sub-badge kit-badge">Kit</span></div>'
      + '<div class="product-info">'
      + '<p class="product-brand">TOBALDINE · COMBO</p>'
      + '<h3 class="product-name">' + sanitize(k.nome) + '</h3>'
      + '<p class="product-family">' + sanitize(k.produtos.join(" + ")) + '</p>'
      + '<p class="product-desc">' + sanitize(k.desc) + '</p>'
      + '<div class="price-wrap">'
      + '<div class="price-options"><div class="price-opt selected" data-vol="Kit" data-price="' + sanitize(k.preco) + '">'
      + '<span class="vol">Kit</span><span class="price">' + sanitize(k.preco) + '</span></div></div>'
      + '<div class="card-actions" style="margin-top:12px;display:flex;gap:6px;">'
      + '<button class="wpp-btn" style="flex:1" onclick="buyDirect(this)">Pedir Kit</button>'
      + '<button class="add-cart-btn" onclick="addToCart(this)">＋</button>'
      + '</div></div></div></article>';
  }).join("");
}

function renderDepoimentos() {
  if (typeof DEPOIMENTOS === "undefined" || !DEPOIMENTOS) return;
  var depContainer = document.getElementById("depoimentosTrack");
  if (!depContainer) return;

  depContainer.innerHTML = DEPOIMENTOS.map(function(d) {
    var estrelasStr = "★".repeat(d.estrelas) + "☆".repeat(5 - d.estrelas);
    var iniciais = (d.nome || "?").trim().split(" ").map(function(w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
    return '<div class="dep-card">'
      + '<div class="dep-header">'
      + '<div class="dep-avatar">' + iniciais + '</div>'
      + '<div>'
      + '<div class="dep-stars" style="color:var(--gold)">' + estrelasStr + '</div>'
      + '<div class="dep-author"><strong>' + sanitize(d.nome) + '</strong> — <span>' + sanitize(d.cidade) + '</span></div>'
      + '</div>'
      + '</div>'
      + '<p class="dep-text">"' + sanitize(d.texto) + '"</p>'
      + '<div class="dep-produto">📦 Adquiriu: ' + sanitize(d.produto) + '</div>'
      + '</div>';
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

function openLightboxFromCard(prodIdx) {
  var p = PRODUTOS[prodIdx];
  if (!p || !p.fotos || p.fotos.length === 0 || p.fotos[0] === "") return;
  LIGHTBOX_FOTOS = p.fotos;
  LIGHTBOX_INDEX = 0;
  document.getElementById("lightbox").classList.add("open");
  updateLightboxView();
}

function updateLightboxView() {
  document.getElementById("lightboxImg").src = LIGHTBOX_FOTOS[LIGHTBOX_INDEX];
  document.getElementById("lightboxDots").innerHTML = LIGHTBOX_FOTOS.map(function(_, idx) {
    var act = (idx === LIGHTBOX_INDEX) ? "background:#c9a84c" : "background:rgba(255,255,255,0.4)";
    return '<span class="dot" style="width:8px;height:8px;border-radius:50%;display:inline-block;margin:0 3px;' + act + '"></span>';
  }).join("");
}

function closeLightbox() { document.getElementById("lightbox").classList.remove("open"); }
function prevLightbox(e) { e.stopPropagation(); LIGHTBOX_INDEX = (LIGHTBOX_INDEX === 0) ? LIGHTBOX_FOTOS.length - 1 : LIGHTBOX_INDEX - 1; updateLightboxView(); }
function nextLightbox(e) { e.stopPropagation(); LIGHTBOX_INDEX = (LIGHTBOX_INDEX === LIGHTBOX_FOTOS.length - 1) ? 0 : LIGHTBOX_INDEX + 1; updateLightboxView(); }

document.addEventListener("DOMContentLoaded", function() {
  renderCatalogo();

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
