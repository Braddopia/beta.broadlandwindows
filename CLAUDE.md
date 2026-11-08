# Broadland Windows CRM

Single-file HTML CRM. Edit `src/` (css, js, assets), then run `npm run build` to write `dist/Broadland-Windows-CRM-<version>.html` and the root `index.html`. Never hand-edit `index.html` or `dist/`. Run `npm run check` (lint, unit tests, build, behaviour tests) before pushing; `npm run test:visual` compares screenshots with local baselines (`npm run test:visual:update` to create them).

Code layout (ES modules, bundled by esbuild into the one HTML file; imports only point down the layers, and `npm run lint` enforces it for core/config/data/domain):
- `src/core/` generic helpers (DOM, escaping, `html```, dates, formatting, actions, `events` on/emit) · `src/config/` fixed lists, colours, roles and permissions
- `src/data/` the in-memory `state`, loading, saving (`store()`), cross-tab `sync`, photos, `audit`, `repository` (add/change/remove records with `_meta` stamps), `sources/` (where data lives: IndexedDB today, `api-source.js` stub for the Microsoft 365 backend)
- `src/domain/` business rules with no DOM or storage (unit-tested in `tests/unit`), including `permissions.js` (`can('money')`, `can('manage')`, `canSee(view)`)
- `src/ui/` shared building blocks: popups, forms (`fieldControl()` draws every box), components. `ui/shell/` is the app shell and the one part of `ui/` allowed to import pages.
- `src/features/<area>/` one folder per part of the app · `src/print/` printed documents · `src/start/` start-up migrations and first draw
- `src/main.js` registers every exported function as a button action and runs start-up steps in order. Nothing runs at import time: start-up code goes in an exported function called from `main.js`.
- Lower layers never call the UI: they `emit('notice', text)`, `emit('data-replaced')` or `emit('photos-loaded')`, and `ui/shell/data-events.js` answers.
- Buttons use `onClick('fn', ...args)` / `onEvent('onchange', 'fn', ...)` / `rowClick('fn', ...)`; never inline `onclick=` (the security policy blocks it).
- To change another module's variable, call a setter it exports (e.g. `setView`, `replaceState`, `setRoleValue`); imports are read-only.

Rules for code in `src/`:
- Every value put into HTML goes through `esc()`, or is passed to a handler with `onClick()` / `onEvent()`. New or rewritten markup uses the `html`` ` tag (`src/core/html.js`), which escapes every `${value}` itself; use `raw()` only for markup the app built. Older templates move to `html`` ` when they are next touched. Form boxes are drawn only by `fieldControl()` (`src/ui/forms/fields.js`).
- User input is cleaned with `SAFE.*` before it is stored.
- Add, change and remove records through `data/repository.js` (`repos.contracts.add(c)`, `repos.contracts.changed(c)`), then save with `store()` and record the change with `audit()`.
- Check permissions with `can()` (or `need()` to also show a message) inside every action, not only when hiding buttons.
- No personal data in the repo: sample names only.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for Braddopia/beta.broadlandwindows, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
