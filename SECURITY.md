# Security Policy

## Supported versions

The latest version published on `main` is supported.

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Email
**ivanjonasfc@gmail.com** with the details and, if possible, a reproducible case.
You will get an acknowledgement and, after a fix, credit if you want it.

## Notes

- Golden Path Studio is local-first: the catalog, brands and collections live in a
  local SQLite file and are never uploaded.
- The optional `scan-serve` helper listens on **127.0.0.1 only** — it is not reachable
  from outside your machine and returns analysis results rather than uploading code.
- The MCP server is **read-only** over the catalog: it searches and returns code, it
  does not modify your database.
