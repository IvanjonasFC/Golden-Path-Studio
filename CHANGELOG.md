# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y [SemVer](https://semver.org/lang/es/).

## [Unreleased]
### Added
- Importación "Proyecto completo" con helper local `scan-serve` (127.0.0.1:4319) y selector de carpeta nativo.
- Registro de escenas extensible (`SCENE_ORDER` como fuente única) + arquetipos `portfolio`, `content`, `commerce`, `settings`.
- Modelo `project.views[]` en `analysis.json` (v2): detección de vistas/rutas con `previewArchetype`, `confidence` y `source`; selector de Vista en el editor. El preview pasa a derivarse del modelo de vistas.

### Changed
- Resolución de tipografías: `var(--font-*)`, `@fontsource`, `next/font` y Google Fonts.
- Clasificación de escenas más precisa (dashboard solo con evidencia real de datos).

## [0.1.0]
- Versión inicial: catálogo local de componentes multi-fuente, editor de marca con tokens, export (CSS/Tailwind/Android/DTCG) y servidor MCP.
