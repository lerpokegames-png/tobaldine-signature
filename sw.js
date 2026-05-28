/* ══════════════════════════════════════════════════════
   TOBALDINE SIGNATURE · SERVICE WORKER
   FIX: versão do cache com timestamp para forçar
        atualização quando arquivos forem modificados.
   INSTRUÇÃO: ao fazer deploy de novos arquivos,
   atualize o valor de CACHE_VERSION abaixo.
   Exemplo: "tobaldine-v5", "tobaldine-v6", etc.
══════════════════════════════════════════════════════ */

var CACHE_VERSION = "tobaldine-v8";
var ASSETS = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./produtos.js",
  "./firebase.js"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  /* Ativa imediatamente sem esperar aba fechar */
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_VERSION; })
          .map(function(key) {
            console.log("[SW] Removendo cache antigo:", key);
            return caches.delete(key);
          })
      );
    })
  );
  /* Assume controle de todas as abas abertas */
  self.clients.claim();
});

self.addEventListener("fetch", function(e) {
  /* Estratégia: Network First para HTML, Cache First para assets estáticos */
  var isHTML = e.request.headers.get("accept") &&
               e.request.headers.get("accept").includes("text/html");

  if (isHTML) {
    /* HTML: tenta rede primeiro, fallback para cache */
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request);
      })
    );
  } else {
    /* Outros assets: cache primeiro, fallback para rede */
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request);
      })
    );
  }
});
