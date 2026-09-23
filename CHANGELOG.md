# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Golden-path project templates (Starter / Guided / Expert) with senior architecture,
  folder trees, library policy and agent rule packs; whole, by-parts or Guided application.
- Adaptive scene builder: every scene renders as real HTML driven by the resolved config
  (navigation, search vs command palette, filters, pagination, cards vs table, wizard,
  auth, motion, density).
- Dynamic slots: assignable zones that appear only when a capability is enabled
  (stepper, command palette, filters inline/drawer), with preserved "pending" state when
  the capability is turned off.
- Brand versions: snapshot, diff and atomic restore, with live propagation of a restore
  into the editor.

### Changed
- Unified all scenes (including Brand) onto the single resolved rendering engine.
- Coverage surface deduplicated: full detail lives only in the audit drawer; the main view
  shows compact signals.

## [0.1.0]

- Initial release: local multi-source component catalog with FTS5 search, collections /
  profiles, brand editor with design tokens, exports (CSS / Tailwind / Android / DTCG),
  shadcn registry endpoint, and an MCP server.
