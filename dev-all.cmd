@echo off
cd /d "%~dp0"
start "GoldenPath helper" cmd /k npx tsx scripts/scan-serve.ts
start "GoldenPath web"    cmd /k npm run dev
echo Se han abierto dos ventanas: helper y web.
echo Cierralas para apagar los servicios.
