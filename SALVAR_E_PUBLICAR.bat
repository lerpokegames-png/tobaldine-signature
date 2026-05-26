@echo off
echo.
echo  ========================================
echo   Tobaldine Signature - Salvar e Publicar
echo  ========================================
echo.

:: Gera o firebase.json com rewrites e ignore completo
(echo { "hosting": { "public": ".", "ignore": [".git/**", ".firebase/**", "node_modules/**", "**/*.exe", "**/*.bat", "**/*.msi", "**/*.dll", "firebase.json", ".firebaseignore", ".gitignore", ".firebaserc", "*.log", "hosting_.cache", "_produtos_clean.json"], "rewrites": [{ "source": "/p/**", "destination": "/produto.html" }] } }) > firebase.json

:: Pede descricao do que mudou
set /p MSG="O que voce alterou? (ex: atualizei fotos): "
if "%MSG%"=="" set MSG=atualizacao

:: Tenta salvar no GitHub (opcional — pula sem erro se nao tiver repositorio)
echo.
git rev-parse --git-dir >nul 2>&1
if %errorlevel% == 0 (
  echo  Salvando no GitHub...
  git add .
  git commit -m "%MSG%"
  git push
  echo  GitHub atualizado!
) else (
  echo  Aviso: sem repositorio Git. Pulando GitHub.
)

:: Publica no Firebase
echo.
echo  Publicando no Firebase...
node "%APPDATA%\npm\node_modules\firebase-tools\lib\bin\firebase.js" deploy

echo.
echo  ========================================
echo   Tudo feito!
echo   Site: https://tobaldine-signature.web.app
echo  ========================================
echo.
pause
