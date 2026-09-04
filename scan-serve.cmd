@echo off
cd /d "%~dp0"
title GoldenPath - Helper de analisis (scan-serve)
echo ================================================
echo  Levantando helper de analisis (scan-serve)...
echo  Deja ESTA ventana abierta mientras importas.
echo  Cierrala para apagar el helper.
echo ================================================
npx tsx scripts/scan-serve.ts
echo.
echo El helper se ha detenido.
pause
