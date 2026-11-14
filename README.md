# Broadland Windows CRM v19.4

**To use:** open `dist/Broadland-Windows-CRM-v19.4.html` (a single self-contained file).
It reads the same browser storage as earlier versions, so existing data carries over.

## Editing

Run `npm install` once. Change files in `src/`, then:

| Command | What it does |
|---|---|
| `npm run build` | writes `dist/Broadland-Windows-CRM-v19.4.html` and the root `index.html` |
| `npm run check` | lint, unit tests, build and the browser tests: run before pushing |
| `npm run test:unit` | business-rule tests (no browser) |
| `npm run test:e2e` | browser tests: every page, every account type, phone/tablet/desktop, security |
| `npm run test:visual` | compares screenshots with your local baselines (`npm run test:visual:update` makes them) |
| `npm run format` | tidies code layout |

The build stops with a message if a placeholder is missing, an asset is not a data URI, or any
JavaScript has a syntax error. It also writes the security policy hashes for the app's scripts.

## How the code is organised

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture and how to add a page.

```
src/index.html      page skeleton (placeholders filled by the build)
src/boot-loader.js  reads saved data before the app starts
src/main.js         entry point: registers button actions, runs start-up steps in order
src/core/           generic helpers: DOM, escaping, html`` templates, dates, formatting, events
src/config/         fixed lists, colours, company defaults, roles and permissions
src/data/           the app data in memory, saving, sync between tabs, photos, audit,
                    repository (add/change/remove records), sources/ (where data is stored)
src/domain/         business rules with no screen code (unit-tested)
src/ui/             shared building blocks: shell and router, popups, forms, tables, tags
src/integrations/   Hallmark and Smart Orders
src/print/          printed documents
src/features/       one folder per part of the app (leads, contracts, service, stock...)
src/start/          start-up data updates and the first draw
src/css/            tokens, base, shell, components, page styles, responsive, looks
tests/unit/         node:test business-rule tests
tests/e2e/          Playwright browser tests
tests/visual/       Playwright screenshot tests (baselines stay on your machine)
```

## Security note

Everything runs in the browser. PINs are hashed, actions are re-checked with `can()`, all data
is escaped, scripts are locked down by a strict content security policy and every change is
logged, but anyone with access to the browser can still read or edit its storage. Proper
protection of customer and staff data needs the planned Microsoft 365 backend with real sign-in.

## Hosting

`index.html` at the repo root is the built app, ready to serve as a static page
(for example with GitHub Pages). Serving it over https also enables the camera barcode scanner.
