/* ══════════════════════════════════════
   config.js — Tobaldine Admin
   Configurações: WhatsApp, chaves de API,
   nomes de seções, remove.bg, etc.
   Depende de: utils.js, data.js, auth.js
══════════════════════════════════════ */

function renderConf() {
  var telAtual = localStorage.getItem("tb_tel") || "5511941665146";
  document.getElementById("tConf").innerHTML =
    '<h3 style="font-size:13px;color:var(--gold);margin-bottom:16px">Configuração</h3>'

    /* WhatsApp */
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px;max-width:400px;margin-bottom:14px">'
    + '<h4 style="font-size:11px;color:var(--gold);margin-bottom:12px">📱 Número WhatsApp</h4>'
    + '<div style="display:flex;gap:8px">'
    + '<input type="text" id="telInput" placeholder="5511941665146" style="flex:1;font-size:11px;" value="' + telAtual + '" />'
    + '<button class="btn btn-gold btn-sm" onclick="salvarTel()">Salvar</button>'
    + '</div>'
    + '<p style="font-size:10px;color:var(--muted);margin-top:8px">Somente números, com código do país. Ex: 5511941665146</p>'
    + '</div>'

    /* Alterar senha */
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px;max-width:400px">'
    + '<h4 style="font-size:11px;color:var(--gold);margin-bottom:12px">🔑 Alterar Senha do Admin</h4>'
    + '<div style="display:flex;flex-direction:column;gap:10px">'
    + '<div class="field"><label>Nova Senha</label><input type="password" id="novaSenha1" placeholder="Nova senha"/></div>'
    + '<div class="field"><label>Confirmar Senha</label><input type="password" id="novaSenha2" placeholder="Repita a senha"/></div>'
    + '<button class="btn btn-gold" onclick="alterarSenha()">✓ Salvar Nova Senha</button>'
    + '</div>'
    + '<p style="font-size:10px;color:var(--muted);margin-top:10px">A senha é salva no Firebase. Nenhuma senha fica visível no código-fonte.</p>'
    + '</div>'

    /* Gemini */
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px;max-width:400px;margin-top:14px">'
    + '<h4 style="font-size:11px;color:var(--gold);margin-bottom:12px">🔍 Chave API Gemini (busca de fotos)</h4>'
    + '<div style="display:flex;gap:8px">'
    + '<input type="text" id="geminiKeyInput" placeholder="AIza..." style="flex:1;font-size:11px;" value="' + (localStorage.getItem("tb_gemini_key") || "") + '" />'
    + '<button class="btn btn-gold btn-sm" onclick="salvarGeminiKey()">Salvar</button>'
    + '</div>'
    + '<p style="font-size:10px;color:var(--muted);margin-top:8px">Obtenha grátis em <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--gold)">aistudio.google.com</a></p>'
    + '</div>'

    /* Exibição catálogo + Remove.bg */
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px;max-width:400px;margin-top:14px">'
    + '<h4 style="font-size:11px;color:var(--gold);margin-bottom:12px">⚙️ Exibição no Catálogo</h4>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<span style="font-size:12px">Mostrar estoque para cliente</span>'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="toggleEstoque" onchange="salvarConfigExibicao()" ' + ((localStorage.getItem("tb_cfg_estoque") || "0") === "1" ? "checked" : "") + ' style="width:16px;height:16px;accent-color:var(--gold)"/><span style="font-size:11px;color:var(--muted)">ativo</span></label>'
    + '</div>'
    + '<p style="font-size:10px;color:var(--muted)">Quando ativo, exibe "Últimas X unidades" nos produtos com estoque baixo.</p>'
    + '<h4 style="font-size:11px;color:var(--gold);margin-bottom:4px;margin-top:16px">✂️ Remove.bg (remover fundo)</h4>'
    + '<p style="font-size:10px;color:var(--muted);margin-bottom:10px">50 fotos grátis/mês · <a href="https://www.remove.bg/pt-br/dashboard#api-key" target="_blank" style="color:var(--gold)">Obter chave</a></p>'
    + '<div style="display:flex;gap:8px">'
    + '<input type="text" id="removebgKeyInput" placeholder="Chave remove.bg..." style="flex:1;font-size:11px;" value="' + (localStorage.getItem("tb_removebg_key") || "") + '" />'
    + '<button class="btn btn-gold btn-sm" onclick="salvarRemovebgKey()">Salvar</button>'
    + '</div>'
    + '</div>'

    /* Nomes das seções */
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px;max-width:400px;margin-top:14px">'
    + '<h4 style="font-size:11px;color:var(--gold);margin-bottom:12px">🏷️ Nomes das Seções</h4>'
    + SECOES.map(function(s){
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:10px;color:var(--muted);width:80px;flex-shrink:0">' + s.id + '</span><input type="text" data-secao-id="' + s.id + '" value="' + esc(s.lbl) + '" style="flex:1;font-size:12px"/></div>';
      }).join("")
    + '<button class="btn btn-gold btn-sm" onclick="salvarNomesSecoes()" style="margin-top:4px">✓ Salvar</button>'
    + '<p style="font-size:10px;color:var(--muted);margin-top:8px">Altera o nome exibido. Os produtos não mudam de seção.</p>'
    + '</div>';
}

function salvarConfigExibicao() {
  var val = document.getElementById("toggleEstoque").checked ? "1" : "0";
  localStorage.setItem("tb_cfg_estoque", val);
  if (typeof window.firebaseDB !== "undefined" && window.firebaseDB) {
    window.firebaseDB.ref("config/mostrarEstoque").set(val === "1");
  }
  toast("✓ Configuração salva!");
}

function salvarNomesSecoes() {
  var inputs = document.querySelectorAll("[data-secao-id]");
  var labels = {};
  inputs.forEach(function(inp){
    var id  = inp.dataset.secaoId;
    var val = inp.value.trim();
    if (id && val) {
      labels[id] = val;
      SECOES.forEach(function(s){ if (s.id === id) s.lbl = val; });
    }
  });
  localStorage.setItem("tb_secoes_labels", JSON.stringify(labels));
  if (typeof window.firebaseDB !== "undefined" && window.firebaseDB) {
    window.firebaseDB.ref("config/secoes").set(labels).then(function(){
      toast("✓ Nomes salvos e sincronizados!");
    }).catch(function(){ toast("✓ Salvo localmente (Firebase offline)"); });
  } else {
    toast("✓ Nomes das seções atualizados!");
  }
  renderSidebar();
}

function salvarRemovebgKey() {
  var key = (document.getElementById("removebgKeyInput").value || "").trim();
  if (!key) { toast("Digite a chave"); return; }
  localStorage.setItem("tb_removebg_key", key);
  toast("✓ Chave remove.bg salva!");
}

function salvarTel() {
  var tel = (document.getElementById("telInput").value || "").trim().replace(/\D/g, "");
  if (!tel) { toast("Digite o número"); return; }
  localStorage.setItem("tb_tel", tel);
  if (window.firebaseDB) {
    window.firebaseDB.ref("config/tel").set(tel)
      .then(function(){ toast("✓ WhatsApp salvo! (" + tel + ")"); })
      .catch(function(){ toast("✓ Salvo localmente"); });
  } else {
    toast("✓ Número salvo!");
  }
}

function salvarGeminiKey() {
  var key = (document.getElementById("geminiKeyInput").value || "").trim();
  if (!key) { toast("Digite a chave"); return; }
  localStorage.setItem("tb_gemini_key", key);
  if (window.firebaseDB) {
    window.firebaseDB.ref("config/geminiKey").set(key)
      .then(function(){ toast("✓ Chave Gemini salva! (Firebase + local)"); })
      .catch(function(){ toast("✓ Chave salva localmente"); });
  } else {
    toast("✓ Chave Gemini salva!");
  }
}
