@echo off
echo.
echo  Subindo Tobaldine Signature para o Firebase...
echo.
node "%APPDATA%\npm\node_modules\firebase-tools\lib\bin\firebase.js" deploy
echo.
echo  Feito! Acesse: https://tobaldine-signature.web.app
echo.
pause
