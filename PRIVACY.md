# Privacy

Golden Path Studio is **local-first**. It runs on your machine and keeps your data
on your machine.

## What is stored, and where

- **Catalog, brands and collections** live in a local SQLite database (`data/catalog.db`
  by default; configurable via `DB_PATH`). This file never leaves your computer.
- **Exports** are written to `./exports/` on your disk, only when you ask for them.

## What leaves your machine

- **Only during ingest.** `npm run ingest` fetches component code from public sources
  (GitHub repositories and shadcn registries). This is a normal outbound HTTP fetch of
  public content; nothing about you is sent.
- **Nothing else.** The web UI and the MCP server read from your local database. Your
  brands, collections and any code you keep are not uploaded anywhere.

## Telemetry

There is **no analytics and no telemetry**. The editor keeps an in-app event log for
observability, but it stays in the browser session and is never transmitted.

## AI clients (MCP)

When you connect an MCP client (Claude, Cursor, …), that client reads from your local
catalog through the MCP server. What the client itself does with that data is governed
by that client's own privacy policy, not this project's.

## Optional local helper

The `scan-serve` helper (used to import an existing project) listens on **127.0.0.1
only** — it is not reachable from outside your machine, and it returns analysis results
rather than uploading your code.
