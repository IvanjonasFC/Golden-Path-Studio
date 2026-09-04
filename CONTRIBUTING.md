# Contribuir a Golden Path Studio

Gracias por tu interés. Este proyecto es una herramienta local-first para
catalogar componentes UI y reconstruir sistemas de diseño desde proyectos reales.

## Requisitos
- Node.js 20+ (recomendado 22)
- git en el PATH

## Puesta en marcha
```bash
npm install
cp .env.example .env
npm run dev
```

## Flujo de trabajo
1. Crea una rama desde `main`: `git checkout -b feat/mi-cambio`.
2. Mantén el estilo del repo. Antes de abrir PR:
   ```bash
   npm run lint
   npm run build
   ```
3. Commits con mensajes claros (se recomienda Conventional Commits: `feat:`, `fix:`, `docs:`…).
4. Abre un Pull Request describiendo el cambio y su motivación.

## Principios de arquitectura
- **Determinista y trazable primero**: cada dato inferido viaja con su confianza y su fuente.
- **Un solo motor**: sin pipelines paralelos; el CLI, el helper `scan-serve` y el navegador comparten `extractIdentity` / `inferBlueprint`.
- **Evolución incremental**: nada de rewrites "big-bang".

## Reportar problemas
Usa las plantillas de issue (bug / feature) en `.github/ISSUE_TEMPLATE`.
