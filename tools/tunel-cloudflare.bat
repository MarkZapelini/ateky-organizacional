@echo off
REM Publica o Ateky local (http://127.0.0.1:8080) num endereco https://....trycloudflare.com
REM Antes: deixe o servidor rodando com "npm run local".
REM Qualquer pessoa com o link acessa. Feche esta janela (ou Ctrl+C) para desligar.
echo.
echo Procure abaixo a linha com https://....trycloudflare.com  -- esse e o endereco publico.
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --no-autoupdate --url http://127.0.0.1:8080
pause
