@echo off
echo.
echo  ========================================
echo   Tobaldine Signature - Salvar e Publicar
echo  ========================================
echo.

:: Pede descrição do que mudou
set /p MSG="O que voce alterou? (ex: atualizei fotos): "
if "%MSG%"=="" set MSG="atualizacao"

echo.
echo  Salvando no GitHub...
git add .
git commit -m "%MSG%"
git push

echo.
echo  Publicando no Firebase...
node "%APPDATA%\npm\node_modules\firebase-tools\lib\bin\firebase.js" deploy

echo.
echo  ========================================
echo   Tudo feito!
echo   GitHub: github.com/lerpokegames-png/tobaldine-signature
echo   Site:   https://tobaldine-signature.web.app
echo  ========================================
echo.
pause
