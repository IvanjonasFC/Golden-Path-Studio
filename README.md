# Golden Path Studio

![License: MIT](https://img.shields.io/badge/License-MIT-f0a470.svg) ![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-149eca?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript) ![MCP](https://img.shields.io/badge/MCP-server-8a5cf6)

Gestor **local y offline** de componentes UI de múltiples fuentes. Descarga el
**código real** de cada componente a una base SQLite propia, lo muestra en una
web con búsqueda y vista previa, y lo expone a la IA mediante un **servidor MCP**.

> El objetivo: no depender de webs externas. Si mañana cierra Uiverse, Magic UI o
> Aceternity, tú ya tienes todo su código clonado en tu máquina.

Fuentes incluidas de serie:

| Fuente | Qué trae | Plataforma | Licencia |
|---|---|---|---|
| **Uiverse.io** | ~3.800 elementos CSS/Tailwind (botones, cards, loaders...) | web | MIT |
| **HyperUI** | ~560 snippets Tailwind (app, marketing, ecommerce...) | web | MIT |
| **ThreeUI** | ~43 componentes Three.js/React (fondos 3D, shaders, landing 3D) | react | MIT |
| **Magic UI** | ~75 componentes React/Tailwind/Motion | react | MIT |
| **Aceternity UI** | ~115 componentes y bloques React | react | MIT (free) / Pro |
| **shadcn/ui** | ~47 primitivos base React/Tailwind | react | MIT |
| **Cult UI** | ~60 componentes React animados | react | MIT |
| **Kokonut UI** | ~60 componentes React modernos | react | MIT |

La BD precargada del zip trae ya **Uiverse + HyperUI + ThreeUI** (las 3 que se pueden
descargar de GitHub). Las otras cinco (**Magic UI, Aceternity, shadcn/ui, Cult UI,
Kokonut**) se añaden con `npm run ingest:remote` desde tu red.

## Colecciones / perfiles (Stack · Marca · Proyecto)

En **/colecciones** creas perfiles y les añades componentes (botón “＋ Colección” en
cada card del catálogo). Tres tipos: **Stack** (tu set habitual), **Marca** (con design
tokens: fondo, acento, fuentes, radio…) y **Proyecto**. Para cada colección puedes:

- **Copiar prompt IA**: genera un prompt markdown que instruye a la IA a construir usando
  EXCLUSIVAMENTE esos componentes (y tu marca), con dependencias e instrucciones MCP.
- **Exportar a proyecto**: escribe a disco (`./exports/<slug>/`) el código de todos los
  componentes organizado por fuente, más `components.json`, `INSTALL.md`, `AI_PROMPT.md`
  y `brand.tokens.json`.
- La IA también puede leer las colecciones por MCP (`list_collections`, `get_collection`,
  `get_collection_prompt`).

## Modo offline 100%

`npm run offline` descarga los thumbnails remotos (ThreeUI) a `public/thumbnails/`,
vendoriza Tailwind en `public/vendor/tailwind.js` y reescribe la BD a rutas locales, para
que ni los previews ni las imágenes dependan de CDNs externos. (Ejecútalo una vez, con red.)

**Estética:** la web usa la marca de tu portfolio (fondo `#050505`, acento naranja
`#F0A470`, tipografías Space Grotesk + Inter, glass, grano y glow radial) para
mantener coherencia entre tus proyectos.

---

## 1. Requisitos

- **Node.js 20 o superior** (recomendado 22). Comprueba con `node -v`.
- **git** en el PATH (para clonar el repo de Uiverse).
- Windows, macOS o Linux.

## 2. Puesta en marcha (rápida)

```bash
npm install
npm run dev
```

Abre **http://localhost:3000**. La base ya viene precargada con Uiverse
(`data/catalog.db`), así que verás componentes desde el primer momento.

## 3. Poblar / actualizar el catálogo

```bash
npm run ingest            # todas las fuentes
npm run ingest:local      # Uiverse + HyperUI + ThreeUI (desde GitHub)
npm run ingest:remote     # Magic UI + Aceternity (sus dominios)
npm run ingest:threeui    # una sola fuente (ejemplo)
npm run stats             # ver recuentos por fuente/categoría/framework
```

La ingesta es **idempotente**: cada fuente se borra y se reinserta, así que
puedes relanzarla cuando quieras para actualizar. Vuelve a ejecutarla, por
ejemplo, una vez al mes para tener los componentes nuevos.

> **Nota de red:** Magic UI y Aceternity se descargan de `magicui.design` y
> `ui.aceternity.com`. Si tu red bloquea esos dominios, ejecuta `ingest:remote`
> desde una red que los permita. Uiverse se clona de GitHub.

## 4. Conectar la IA (servidor MCP)

El servidor MCP expone tu catálogo a Claude (Desktop, Code o Cowork) con:
`search_components`, `get_component`, `list_catalog_facets`, `list_collections`,
`get_collection` y `get_collection_prompt`.

Añade esto a la configuración MCP de tu cliente (ajusta la ruta absoluta):

```json
{
  "mcpServers": {
    "component-vault": {
      "command": "npx",
      "args": ["tsx", "C:\\Users\\IvN\\Desktop\\Componentes\\component-vault\\mcp\\server.ts"],
      "env": {
        "DB_PATH": "C:\\Users\\IvN\\Desktop\\Componentes\\component-vault\\data\\catalog.db"
      }
    }
  }
}
```

Tienes una plantilla en `claude_mcp_config.example.json`.

Una vez conectado, podrás pedirle a la IA cosas como *"busca en mi vault un botón
neón y un card 3D y úsalos en esta pantalla"*: la IA llamará a `search_components`,
elegirá, y traerá el código con `get_component`.

## 5. Arquitectura

```
src/
  db/         esquema + cliente SQLite (better-sqlite3) + índice FTS5
  lib/        query.ts (búsqueda/filtros reutilizada por web y MCP) + tipos
  ingest/     un adaptador por fuente + orquestador CLI
  app/        Next.js (catálogo, detalle, API REST)
  components/ UI de la web (React client components)
mcp/          servidor MCP (stdio)
data/         catalog.db (la base; portable entre sistemas operativos)
```

**Esquema unificado** (tabla `components`): una fila = un componente, con su
`source`, `platform`, `framework`, `category`, `tags`, `dependencies`,
`installCommand` y — lo importante — `files` (el **código completo** en JSON).
Búsqueda por texto con **FTS5**.

## 6. Añadir una fuente nueva (u otro stack)

El sistema es de **adaptadores enchufables**. Para añadir una web o un stack
(Android/Jetpack Compose, Flutter, React Native...):

1. Crea `src/ingest/mi-fuente.ts` que exporte un `SourceAdapter`
   (ver `src/ingest/util.ts` para el contrato). Devuelve una lista de
   `IngestItem` con `platform` y `framework` correctos.
2. Regístralo en el mapa `ADAPTERS` de `src/ingest/index.ts`.
3. `npm run ingest -- --source mi-fuente`.

No hay que tocar ni la web ni el MCP: leen la misma tabla. Si otra fuente también
usa el **registro shadcn**, reutiliza `makeShadcnAdapter` (como Magic UI y
Aceternity) — es una sola línea de config.

Ideas de fuentes para otros stacks (candidatas a futuros adaptadores):
- **React/Tailwind:** shadcn/ui, HyperUI, Cult UI, Kokonut UI, Skiper UI (todas registros shadcn o repos MIT).
- **Flutter:** pub.dev widgets, FlutterGems.
- **Android (Jetpack Compose):** repos de componentes Compose en GitHub.
- **CSS puro:** CSS-Tricks snippets, animvariados.

## 7. Licencias y atribución

Cada componente guarda su `license` y `author`. Uiverse y Magic UI son MIT;
Aceternity es MIT en sus componentes gratuitos (los "Pro" requieren licencia y su
ingesta se omite automáticamente si el endpoint no responde). Al publicar
proyectos, respeta la atribución que pida cada fuente.

## 8. Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Web en modo desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run ingest[:*]` | Ingesta de fuentes |
| `npm run mcp` | Arranca el servidor MCP (para probarlo a mano) |
| `npm run stats` | Estadísticas de la base |
