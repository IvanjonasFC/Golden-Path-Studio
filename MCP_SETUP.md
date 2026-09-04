# Conectar Golden Path Studio a una IA (MCP)

El catálogo se expone como un **servidor MCP** (Model Context Protocol) por `stdio`.
Cualquier cliente que hable MCP (Claude Desktop, Antigravity, Claude Code, Cursor…)
puede llamar a estas herramientas y construir usando **tus** componentes y **tu** marca,
sin adivinar nada.

## Herramientas que expone

| Tool | Qué hace |
|------|----------|
| `search_components` | Busca por texto y filtros (fuente, categoría, framework). Devuelve metadatos + comando de instalación, **no** el código. |
| `get_component` | Trae el código completo de un componente por `id`, listo para pegar. |
| `list_catalog_facets` | Fuentes, categorías, plataformas y frameworks disponibles con su recuento. |
| `list_collections` | Tus perfiles (Stack / Marca / Proyecto) con id, tipo y nº de componentes. |
| `get_collection` | Un perfil entero con sus tokens de marca y **todos** sus componentes (con código). |
| `get_collection_prompt` | Un prompt en markdown listo para pegar: "construye usando exactamente estos componentes y esta marca". |

## Flujo típico con la IA

1. `list_collections` → elige tu perfil de Marca.
2. `get_collection_prompt` con ese id → obtiene el prompt de marca.
3. La IA usa `search_components` / `get_component` para traer el código exacto.
4. Construye la interfaz con tus componentes, con tu identidad.

---

## 0) Probar el servidor a mano (opcional, recomendado)

Desde la raíz del proyecto:

```bash
npm run mcp
```

Debe imprimir en **stderr**: `[component-vault] servidor MCP listo (stdio).`
Si sale eso y se queda esperando, está bien (habla por stdin/stdout). Ctrl+C para salir.
Si falla, casi siempre es la ruta de `DB_PATH` o que falta `npm install`.

> **Requisito:** el catálogo tiene que estar ingerido (`data/catalog.db` con componentes).
> Si está vacío: `npm run ingest`.

---

## 1) Claude Desktop (Windows)

Fichero de configuración:

```
%APPDATA%\Claude\claude_desktop_config.json
```

(equivale a `C:\Users\IvN\AppData\Roaming\Claude\claude_desktop_config.json`)

Pega esto (ver `claude_mcp_config.example.json`):

```json
{
  "mcpServers": {
    "component-vault": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "tsx",
        "C:\\Users\\IvN\\Desktop\\Componentes\\component-vault\\mcp\\server.ts"
      ],
      "env": {
        "DB_PATH": "C:\\Users\\IvN\\Desktop\\Componentes\\component-vault\\data\\catalog.db"
      }
    }
  }
}
```

Luego **cierra Claude Desktop del todo** (desde la bandeja del sistema) y ábrelo otra vez.
El servidor aparece en el icono 🔌/herramientas del chat.

> **Por qué `cmd /c`:** en Windows, Claude Desktop a veces no encuentra `npx` directamente.
> Envolverlo en `cmd /c` es lo más fiable. Si tu instalación encuentra `npx` sin problema,
> puedes usar `"command": "npx"` y quitar `"cmd", "/c"`.

---

## 2) Antigravity (IDE)

Mismo formato `mcpServers`, distinta ubicación. En Antigravity:

1. En el panel del agente, pulsa **…** → **MCP Servers**.
2. **Manage MCP Servers** → **View raw config**.
3. Edita el fichero (global `~/.gemini/config/mcp_config.json`, o por workspace `.agents/mcp_config.json`).

Pega esto (ver `antigravity_mcp_config.example.json`):

```json
{
  "mcpServers": {
    "component-vault": {
      "command": "npx",
      "args": [
        "tsx",
        "C:\\Users\\IvN\\Desktop\\Componentes\\component-vault\\mcp\\server.ts"
      ],
      "env": {
        "DB_PATH": "C:\\Users\\IvN\\Desktop\\Componentes\\component-vault\\data\\catalog.db"
      },
      "cwd": "C:\\Users\\IvN\\Desktop\\Componentes\\component-vault"
    }
  }
}
```

Guarda y recarga los servidores MCP desde el mismo panel. Si `npx` da problemas,
usa el mismo truco `"command": "cmd", "args": ["/c", "npx", "tsx", "..."]` que en Claude.

---

## 3) Claude Code (CLI)

```bash
claude mcp add component-vault -e DB_PATH="C:\\Users\\IvN\\Desktop\\Componentes\\component-vault\\data\\catalog.db" -- npx tsx "C:\\Users\\IvN\\Desktop\\Componentes\\component-vault\\mcp\\server.ts"
```

---

## Notas

- **`DB_PATH` siempre absoluto** en la config del cliente MCP: el servidor se arranca desde
  una carpeta cualquiera, así que una ruta relativa no encontraría la base.
- El servidor es de **solo lectura** sobre el catálogo (busca y devuelve código); no modifica
  tu base de datos.
- Todo es **local y offline**: la IA lee de tu `catalog.db`, no de internet.
