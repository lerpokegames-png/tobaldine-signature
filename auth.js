/* ══════════════════════════════════════
   auth.js — Tobaldine Admin
   Autenticação via Firebase Auth.
   Depende de: firebase SDK
══════════════════════════════════════ */

var ADMIN_EMAIL  = "admin@tobaldine.com";
var _loginAttempts = 0;
var _loginLocked   = false;
var MAX_ATTEMPTS   = 5;
var LOCKOUT_MS     = 60000;

/* Único ponto de controle de acesso — reage a login/logout */
firebase.auth().onAuthStateChanged(function(user) {
  var loginEl = document.getElementById("loginScreen");
  if (user) {
    if (loginEl) loginEl.style.display = "none";
  } else {
    if (loginEl) loginEl.style.display = "flex";
  }
});

async function recuperarSenha() {
  var email = (document.getElementById("emailInput").value || "").trim();
  var erroEl = document.getElementById("erroSenha");
  if (!email) {
    erroEl.style.color = "#c04c4c";
    erroEl.textContent = "Digite o e-mail acima antes de recuperar.";
    document.getElementById("emailInput").focus();
    return;
  }
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    erroEl.style.color = "#4caf79";
    erroEl.textContent = "✓ E-mail de redefinição enviado! Verifique sua caixa.";
  } catch(e) {
    erroEl.style.color = "#c04c4c";
    erroEl.textContent = "Erro: " + (e.code === "auth/user-not-found" ? "E-mail não cadastrado." : e.message);
  }
}

async function checkSenha() {
  if (_loginLocked) return;
  var email  = (document.getElementById("emailInput").value || "").trim() || ADMIN_EMAIL;
  var senha  = document.getElementById("senhaInput").value;
  var erroEl = document.getElementById("erroSenha");
  var tentEl = document.getElementById("tentativasInfo");
  var btnEl  = document.getElementById("loginBtn");

  if (!email) { erroEl.textContent = "Digite o e-mail."; return; }
  if (!senha) { erroEl.textContent = "Digite a senha."; return; }

  btnEl.disabled    = true;
  btnEl.textContent = "Verificando...";

  try {
    await firebase.auth().signInWithEmailAndPassword(email, senha);
    _loginAttempts = 0;
  } catch(err) {
    btnEl.disabled    = false;
    btnEl.textContent = "Entrar";
    document.getElementById("senhaInput").value = "";
    _loginAttempts++;

    if (_loginAttempts >= MAX_ATTEMPTS) {
      _loginLocked = true;
      erroEl.textContent = "Muitas tentativas incorretas.";
      tentEl.textContent = "Aguarde 60 segundos para tentar novamente.";
      btnEl.disabled = true;
      btnEl.style.opacity = "0.5";
      document.getElementById("senhaInput").disabled = true;
      document.getElementById("emailInput").disabled  = true;
      setTimeout(function(){
        _loginLocked   = false;
        _loginAttempts = 0;
        btnEl.disabled = false;
        btnEl.style.opacity = "1";
        document.getElementById("senhaInput").disabled = false;
        document.getElementById("emailInput").disabled  = false;
        erroEl.textContent = "";
        tentEl.textContent = "";
      }, LOCKOUT_MS);
    } else {
      var restantes = MAX_ATTEMPTS - _loginAttempts;
      var msgErro = {
        "auth/invalid-credential":    "E-mail ou senha incorretos.",
        "auth/wrong-password":        "Senha incorreta.",
        "auth/user-not-found":        "E-mail não cadastrado no Firebase.",
        "auth/invalid-email":         "Formato de e-mail inválido.",
        "auth/user-disabled":         "Conta desativada.",
        "auth/too-many-requests":     "Muitas tentativas. Tente mais tarde.",
        "auth/operation-not-allowed": "⚠ Email/Senha não está ativado no Firebase Console → Authentication → Sign-in method.",
        "auth/network-request-failed":"Sem conexão com a internet."
      }[err.code] || ("Erro (" + err.code + "): " + err.message);
      erroEl.textContent = msgErro;
      tentEl.textContent = restantes + " tentativa(s) restante(s).";
      document.getElementById("senhaInput").focus();
    }
  }
}

/* Alterar senha — Firebase Auth (requer login recente) */
async function alterarSenha() {
  var s1 = document.getElementById("novaSenha1").value;
  var s2 = document.getElementById("novaSenha2").value;
  if (!s1) { toast("Digite a nova senha"); return; }
  if (s1 !== s2) { toast("As senhas não coincidem"); return; }
  if (s1.length < 6) { toast("Senha deve ter ao menos 6 caracteres"); return; }

  var user = firebase.auth().currentUser;
  if (!user) { toast("Não autenticado"); return; }

  try {
    await user.updatePassword(s1);
    toast("✓ Senha alterada com sucesso!");
    document.getElementById("novaSenha1").value = "";
    document.getElementById("novaSenha2").value = "";
  } catch(e) {
    if (e.code === "auth/requires-recent-login") {
      toast("Por segurança, faça logout e login novamente antes de alterar a senha.");
    } else {
      toast("Erro: " + e.message);
    }
  }
}
