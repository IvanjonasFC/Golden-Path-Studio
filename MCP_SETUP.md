# Connect Golden Path Studio to an AI (MCP)

The catalog, collections and brands are exposed as an **MCP server** (Model Context
Protocol) over `stdio`. Any MCP client (Claude Desktop, Claude Code, Cowork, Cursor,
Antigravity…) can call these tools and build with **your** components and **your** brand.

## Tools

| Tool | What it does |
|------|--------------|
| `search_components` | Search by text and filters (source, category, framework). Returns metadata + install command, **not** the code. |
| `get_component` | Full code of one component by `id`, ready to paste. |
| `list_catalog_facets` | Available sources, categories, platforms and frameworks with counts. |
| `list_collections` | Your profiles (Stack / Brand / Project) with id, type and component count. |
| `get_collection` | A whole profile with its brand tokens and **every** component (with code). |
| `get_collection_prompt` | A ready-to-paste markdown prompt: "build using exactly these components and this brand". |
| `list_brands` | Your brands (design-token systems). |
| `get_brand` | One brand with its compiled tokens, to build with that identity. |

## Typical flow

1. `list_collections` → pick your Brand profile.
2. `get_collection_prompt` with that id → get the brand prompt.
3. The AI uses `search_components` / `get_component` to bring the exact code.
4. It builds the UI with your components, in your identity.

> **Prerequisite:** the catalog must be ingested (`data/catalog.db` with components).
> If empty, run `npm run ingest`. Always use an **absolute** `DB_PATH` in the client
> config — the server can be launched from any working directory.

In every example below, replace `/absolute/path/to/Golden-Path-Studio` with the real
absolute path to your clone.

## Test the server by hand (optional)

```bash
npm run mcp
```

It should print to **stderr** that the MCP server is ready (stdio) and then wait. That
is correct (it talks over stdin/stdout). Ctrl+C to quit. Failures are almost always a
wrong `DB_PATH` or a missing `npm install`.

## 1) Claude Desktop

Config file: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or
`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS). See
`claude_mcp_config.example.json`.

```json
{
  "mcpServers": {
    "golden-path-studio": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/Golden-Path-Studio/mcp/server.ts"],
      "env": { "DB_PATH": "/absolute/path/to/Golden-Path-Studio/data/catalog.db" }
    }
  }
}
```

On Windows, if the client cannot find `npx`, wrap it in `cmd`:
`"command": "cmd", "args": ["/c", "npx", "tsx", "...\\mcp\\server.ts"]`. Fully quit and
reopen the client afterwards.

## 2) Antigravity (IDE)

Same `mcpServers` format, different location (global `~/.gemini/config/mcp_config.json`
or per-workspace `.agents/mcp_config.json`). See `antigravity_mcp_config.example.json`;
it also sets `cwd` to the project root.

## 3) Claude Code (CLI)

```bash
claude mcp add golden-path-studio \
  -e DB_PATH="/absolute/path/to/Golden-Path-Studio/data/catalog.db" \
  -- npx tsx "/absolute/path/to/Golden-Path-Studio/mcp/server.ts"
```

## Notes

- **`DB_PATH` must be absolute** in the client config.
- The server is **read-only** over the catalog; it never modifies your database.
- Everything is **local and offline**: the AI reads from your `catalog.db`, not the
  internet.
