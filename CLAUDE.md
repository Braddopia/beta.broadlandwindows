# Broadland Windows CRM

Single-file HTML CRM. Edit `src/` (css, js, assets), then run `npm run build` to write `dist/Broadland-Windows-CRM-<version>.html` and the root `index.html`. Never hand-edit `index.html` or `dist/`. Run `npm run check` (lint, build, behaviour tests) before pushing; `npm run test:visual` compares screenshots with local baselines (`npm run test:visual:update` to create them).

Code layout (ES modules, bundled by esbuild into the one HTML file; imports only point down the layers):
- `src/core/` generic helpers (DOM, escaping, dates, formatting, actions) · `src/config/` fixed lists, company, roles
- `src/data/` app data, saving, photos, migrations, backup · `src/domain/` business rules (no HTML)
- `src/ui/` shell, popups, forms, components · `src/features/<area>/` one folder per part of the app · `src/print/` printed documents
- `src/main.js` registers every exported function as a button action and runs start-up steps in order. Nothing runs at import time: start-up code goes in an exported function called from `main.js`.
- Buttons use `onClick('fn', ...args)` / `onEvent('onchange', 'fn', ...)` / `rowClick('fn', ...)`; never inline `onclick=` (the security policy blocks it).
- To change another module's variable, call a setter it exports (e.g. `setView`, `replaceState`); imports are read-only.

Rules for code in `src/`:
- Every value put into HTML goes through `esc()`, or is passed to a handler with `A()` / `AC()`.
- User input is cleaned with `SAFE.*` before it is stored.
- Save with `store()`; record changes with `audit()`.
- No personal data in the repo: sample names only.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for Braddopia/beta.broadlandwindows, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
