# Component Vault — Visión y Arquitectura

> Mi biblioteca **local y offline** de componentes de UI de varias webs, con buscador propio,
> perfiles de marca y acceso para la IA — para construir mis proyectos rápido, con mi identidad
> y sin depender de que esas webs sigan existiendo.

**En una línea:** un catálogo propio que es también un archivo. Guarda el *código real* de cada
componente en una base de datos local y lo sirve a tres sitios: una web para navegar y elegir,
un servidor MCP para la IA, y un exportador a proyecto.

| | |
|---|---|
| Componentes precargados | **4.405** |
| Fuentes conectadas | **8** |
| En local / offline | **100%** |
| Herramientas para la IA (MCP) | **6** |

---

## 1. El problema

**Lo que me pasa hoy:** los recursos buenos están repartidos por muchas webs (Uiverse,
Aceternity, Magic UI, ThreeUI…). Cada proyecto empiezo de cero buscando lo mismo, dependo de que
esas webs sigan online, y cuando dejo que la IA diseñe todo sale con "cara de IA", sin mi identidad.

**Lo que quiero:** un sitio único y mío donde estén todos los recursos, pueda ver y elegir cuáles
usar, agruparlos por marca o stack, y pasárselos a la IA para que construya con *mis* componentes.

---

## 2. La idea

Un **ingestor** trae el código real de cada componente desde su fuente y lo guarda normalizado en
una base de datos local (SQLite). Desde ahí, ese mismo almacén alimenta tres salidas: **web**,
**servidor MCP** y **exportador**. Como el código se guarda entero, funciona aunque la web original
cierre.

> **Decisión de diseño clave:** no se hace *scraping* frágil. Cada fuente ya publica su contenido
> de forma estructurada (repos de GitHub o registros shadcn en JSON), así que se ingiere de ahí —
> más robusto, respeta licencias (MIT) y no se rompe al cambiar una web.

---

## 3. Arquitectura (flujo de punta a punta)

```
   FUENTES (8)                INGESTOR              BASE DE DATOS            CONSUMIDORES
┌──────────────────┐      ┌──────────────┐      ┌──────────────────┐    ┌────────────────────┐
│ Uiverse · HyperUI│─┐    │  adaptadores │      │   SQLite local   │ ┌─▶│ Web (catálogo)     │
│ ThreeUI          │─┼───▶│      +       │─────▶│ components ·     │─┼─▶│ Servidor MCP (IA)  │
│ Magic UI · Acet. │─┤    │  normalizado │guarda│ collections      │ └─▶│ Exportar a proyecto│
│ shadcn·Cult·Koko │─┘    └──────────────┘ código│ código + FTS5   │    └────────────────────┘
└──────────────────┘                            │ 1 fichero portable│
                                                └──────────────────┘
```

Ocho fuentes → un ingestor de adaptadores → una BD SQLite con el código real → tres salidas.
La BD es **un solo fichero portable**: ahí está el archivo offline.

---

## 4. El recorrido (del "necesito un botón" al proyecto montado)

1. **Ingesto** — `npm run ingest` trae el código de las 8 fuentes y lo normaliza en la BD local. Repetible cuando quiera para actualizar.
2. **Navego y elijo** — en la web busco (texto + filtros por fuente, categoría, framework), veo el preview y elijo qué me sirve.
3. **Agrupo en un perfil** — con "＋ Colección" meto componentes en un perfil de **Stack**, **Marca** (con mis colores y fuentes) o **Proyecto**.
4. **Se lo paso a la IA** — "Copiar prompt IA" o las herramientas MCP: la IA construye usando *exactamente* esos componentes y mi marca.
5. **Exporto al proyecto** — un clic vuelca el código, las dependencias, un `AI_PROMPT.md` y los `brand.tokens.json` a una carpeta lista para usar.

---

## 5. El stack

| Pieza | Tecnología | Por qué |
|---|---|---|
| Web + API | Next.js 15 · React 19 | Un solo repo para web, API e ingestor. Previsualiza React nativo. |
| Estilo | Tailwind v4 | Rápido y compatible con los componentes (casi todos Tailwind). |
| Base de datos | SQLite · better-sqlite3 | Un fichero local, sin servidor. Portable entre equipos. |
| Consultas | Drizzle + FTS5 | Tipado y búsqueda de texto completo instantánea. |
| Acceso IA | MCP (stdio) | Estándar 2026 para dar herramientas a la IA sin inventar una API. |
| Marca | Space Grotesk · Inter | Las fuentes de mi portfolio, autoalojadas (offline). |

**Modelo de datos:** el corazón es una tabla `components` con `source`, `platform`, `framework`,
`tags`, `dependencies` y — lo importante — `files`: el **código completo** en JSON. Añadir una
fuente nueva (u otro stack, como Flutter o Jetpack Compose) es escribir un "adaptador" y
registrarlo; ni la web ni la IA se tocan.

---

## 6. Fuentes

| Fuente | Aporta | Tipo | Licencia |
|---|---|---|---|
| Uiverse | ~3.802 | CSS/Tailwind | MIT |
| HyperUI | ~560 | Tailwind | MIT |
| ThreeUI | ~43 | Three.js / 3D | MIT |
| Magic UI | ~75 | React / Motion | MIT |
| Aceternity | ~115 | React | MIT (Pro se omite) |
| shadcn/ui | ~47 | primitivos base | MIT |
| Cult UI | ~60 | React animado | MIT |
| Kokonut UI | ~60 | React moderno | MIT |

Precargadas en el zip: **Uiverse + HyperUI + ThreeUI**. Las cinco React se añaden con
`npm run ingest:remote`.

---

## 7. La pieza diferencial: colecciones = perfiles de marca y proyecto

Un perfil agrupa los componentes que yo elijo. Tres tipos:

- **Stack** — mi set habitual de componentes.
- **Marca** — con *design tokens*: fondo, acento, fuentes, radio. Es lo que da coherencia a todos mis proyectos.
- **Proyecto** — para un encargo concreto.

Es lo que envío a la IA: *"usa mi perfil Marca X"*. Así todo lo que genere sale coherente con mi
identidad y reutilizable entre apps y webs, sin volver a explicárselo cada vez.

---

## 8. Cómo lo usa la IA (servidor MCP)

El servidor MCP expone el catálogo como **herramientas** que la IA llama directamente:

- `search_components` — busca por texto y filtros; devuelve metadatos + comando de instalación.
- `get_component` — trae el código completo de un componente, listo para pegar.
- `list_collections` / `get_collection` — lee un perfil entero con todos sus componentes.
- `get_collection_prompt` — genera el prompt de marca listo para construir.
- `list_catalog_facets` — fuentes, categorías y frameworks disponibles.

---

## 9. Cómo arrancarlo

```bash
npm install --include=dev     # (tengo NODE_ENV=production, por eso --include=dev)
npm run ingest:remote         # añade Magic UI, Aceternity, shadcn/ui, Cult UI, Kokonut
npm run dev                   # http://localhost:3000
npm run offline               # (opcional) modo 100% offline: Tailwind + thumbnails locales
```

MCP: plantilla en `claude_mcp_config.example.json` (apunta al `mcp/server.ts` con la ruta de la BD).

---

## 10. Roadmap

**✓ Ya funciona**
- 8 fuentes, 4.405 precargados, buscador FTS5.
- Web con mi marca + colecciones + exportar.
- Servidor MCP con 6 herramientas.
- Modo offline (Tailwind y thumbnails locales).

**↗ Siguiente**
- Adaptadores para app-stacks (Flutter, Jetpack Compose).
- Aplicar la marca de un perfil como tema de la web.
- Reordenar y duplicar perfiles; plantillas de marca.
- Thumbnails generados de los previews CSS.

---

*Component Vault · gestor local de componentes de UI · Next.js + SQLite + MCP · todos los recursos
bajo licencia MIT, con atribución a sus autores.*
