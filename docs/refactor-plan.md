# Broadland CRM: Refactor Plan

Status: **proposed, waiting for sign-off**. Nothing in this plan changes what the site does for users. Every phase is behaviour-neutral, tested, and shipped on its own.

---

## 1. Where the code is today

| Area | Today | Problem |
|---|---|---|
| JavaScript | 21 files, about 560 KB, joined into **one shared global scope** by `build.py`. 454 top-level functions and 331 top-level consts/lets. | No module boundaries. Any file can call or overwrite anything. Load order and function hoisting hold it together (for example `coLoad()` in 02 runs before file 20 is parsed). |
| File size | `15-records.js` is 91 KB, `06-operations.js` 63 KB, `11-print-reports.js` 57 KB. Many lines are over 1,000 characters. | Hard to read, review or diff. One "line" often holds a whole feature. |
| Naming | One- and two-letter globals: `S`, `UI`, `RW`, `A`, `AC`, `RC`, `IC`, `CO`, `$`, `$$`. Fields such as `k`, `l`, `t`, `o`, `g`. | You have to know the code already to read it. |
| HTML | Template strings everywhere. Safety relies on remembering `esc()` on every value. | One missed `esc()` is an XSS hole. Reviewers have to check every interpolation. |
| Events | 294 `A()/AC()/RC()` helpers plus 169 raw `onclick="…"` strings. Every handler must be a global function. | Forces global scope. Blocks a strict Content-Security-Policy (needs `'unsafe-inline'`). |
| Forms | **Four** separate field renderers: `form()` (04), `fieldH()` (09), `rfH()` (15) and `fld()` (contacts, 07). Plus a wizard. | The same rules (required star, admin lock, capitalisation, select keeps old value) were each fixed four times, and drift. |
| Data | One big object `S`, saved whole as one JSON string on every change (`store()`). Seed data, migrations, persistence and cross-tab sync all live in `02-state.js`. | Fine for one device. Doesn't scale to years of data, many users or a backend. Records can't be saved one at a time. |
| Business rules | Mixed into rendering code: VAT, deposits, delivery status, holiday allowance, stage rules, numbering, permissions. | Can't be unit-tested. Will have to be rewritten on the server unless pulled out first. |
| CSS | 7 files, about 190 KB. `05-views.css` is 133 KB, with 13 "round N" patch blocks appended over time, 104 `!important`, and selectors defined 3 to 7 times (`.kpi`, `.mb`, `.rb1`…). | The last rule wins, so changing anything is guesswork. Dead rules remain (`.rw2` stage-bar layout, activity panel). |
| Dead code | `actDraw/actToggle/actOpen` (activity panel removed), `ckTabOld`, `.rw2` CSS, `prototype-lead-forms.html` | Noise. |
| Tests | About 20 Playwright scripts, kept **outside the repo** in a temporary folder. No unit tests. | They're lost when the cloud session ends. Nothing guards behaviour in CI. |
| Security | The PIN gate, roles and audit log all run in the browser. CSP allows `'unsafe-inline'` scripts and `cdn.jsdelivr.net`. | Fine as a demo. Not a security boundary. Needs a server for real protection (see section 6). |

What is already good and stays: the single-file deliverable, `SAFE.*` sanitisers, `esc()`, the audit trail, IndexedDB storage with the photo store, CSV-injection guards, SRI on the Microsoft sign-in script, and the build-time checks in `build.py`.

---

## 2. Goals and rules for the refactor

1. **Readable.** One concept per file, files under about 300 lines, descriptive names, short functions, and a comment at the top of each module saying what it owns.
2. **Layered.** `core` ← `data` ← `domain` ← `ui` ← `features`. Imports only point down the layers. Features never import each other directly; they go through registries.
3. **Backend-ready.** All reads and writes go through repositories and a pluggable data source. Swapping IndexedDB for an API must not touch views.
4. **Secure by default.** Escaping is automatic. There are no inline handlers. The CSP is strict. Permission checks live in one place.
5. **Behaviour-neutral.** No visible change. Before/after screenshots and the e2e suite must match at the end of every phase.
6. **Incremental.** Each phase is its own commit (or PR), builds, passes tests, and is pushed with the usual single HTML file.
7. **Same deliverable.** It is still one self-contained `dist/Broadland-Windows-CRM-<version>.html`, plus `index.html` for GitHub Pages.

---

## 3. Target structure

```
src/
  index.html                      page skeleton (placeholders filled by the build)
  boot/
    boot-loader.js                reads saved data before the app starts (unchanged role)
  main.js                         entry point: wires modules, registers views/actions, starts the app

  core/                           no knowledge of the CRM; reusable anywhere
    dom.js                        qs, qsa, on, delegate, focus helpers
    html.js                       html`` tagged template (auto-escapes), raw(), attr()
    sanitize.js                   SAFE.* (text, num, date, email, url, img, code)
    format.js                     money, m0, dates (fd, fdl), titleCase
    dates.js                      iso, addDays, weekRange, working days, bank holidays
    ids.js                        uuid, shortId
    crypto.js                     sha256
    events.js                     tiny pub/sub (emit/on) used to decouple modules
    icons.js                      icon paths + svg()
    haptics.js

  config/
    constants.js                  stages, sources, units, contact types, limits
    company.js                    company defaults (CO) + settings overlay
    roles.js                      role definitions and which views each can see

  data/
    state.js                      the in-memory store (replaces global S): get/replace/subscribe
    schema/                       one schema per entity: fields, types, required, admin-only, groups
      lead.js contract.js customer.js service-call.js delivery.js product.js
      supplier.js contact.js staff.js holiday.js bill.js message.js problem-report.js
    repos/                        the only code allowed to read/write entities
      leads.js contracts.js calls.js deliveries.js stock.js suppliers.js contacts.js
      staff.js holidays.js messages.js finance.js settings.js problems.js audit.js
    sources/                      where data physically lives (pluggable)
      data-source.js              the interface (see section 5)
      indexeddb-source.js         today's storage, unchanged keys
      api-source.js               stub for the future backend
    photos.js                     photo store (ph:<id> references)
    migrations.js                 versioned, ordered migrations (today's load() fixes)
    sync.js                       cross-tab BroadcastChannel sync
    backup.js                     backup / restore / CSV export
    seed.js                       demo data (development builds only)

  domain/                         pure business rules: no DOM, no storage, unit-tested
    money.js                      VAT split, balance, deposit %, invoice numbers
    stages.js                     lead and contract stage machines + "next step" guidance
    deliveries.js                 status from due date, overdue rules
    holidays.js                   allowance, day counts, shutdown, clashes
    numbering.js                  next lead / contract / call numbers
    permissions.js                can(user, action): the single permission check
    service.js                    open/past ticket rules, balance owed
    stock.js                      low/out, reorder quantity
    people.js                     rename-everywhere, forPerson
    search-query.js               plain-English search parser (nlq)

  ui/                             shared building blocks, no feature knowledge
    shell/                        layout, nav, top bar, theme, looks, router (view registry)
    actions.js                    action registry + one delegated click/change/input listener
    modal.js                      modal stack (record stays underneath), confirm box, done tick
    toast.js
    forms/                        ONE field renderer + layouts: plain form, row form, card groups,
      fields.js form.js wizard.js validation.js photo-grid.js
    components/                   kpi, table (sort/pager), tags, chips, empty state, stage path,
                                  progress ring, glass card
    record-window/                the lead/contract window shell: header, rail, steps, cards, footer

  features/                       one folder per area of the app; each owns its views, forms, actions
    home/  live-boards/  messages/  notifications/
    leads/  contracts/  records/  (lead + contract step definitions and tabs)
    service/  deliveries/  calendar/  stock/  scanner/  suppliers/  contacts/
    staff/  holidays/  reports/  files/  finance/  admin/  settings/  search/  sign-in/  tour/
      index.js                    registers the feature's view(s), actions and search providers
      view.js                     page rendering
      forms.js                    the feature's forms (using ui/forms)
      actions.js                  handlers (save, delete, etc.) calling repos + domain
      print.js                    printed documents for this feature (where relevant)
      styles.css                  styles that only this feature uses

  print/                          the shared printed-document engine (printDoc) + base print CSS
  styles/
    tokens.css  base.css  layout.css  utilities.css  themes.css (light/dark/looks)
    components/*.css              buttons, forms, modal, table, kpi, tags, cards, photo-grid…

tests/
  e2e/                            Playwright specs (the ~20 scripts made permanent + new ones)
  unit/                           node:test specs for domain/ and core/
  visual/                         screenshot baselines per view × role × viewport

scripts/build.mjs                 esbuild bundle → one inline <script>, CSS → one <style>, CSP hash
docs/ARCHITECTURE.md              how the layers fit, how to add a feature
docs/adr/                         decision records (bundler, modules, data source, escaping)
```

**How the pieces talk.**
- **Views and search providers** are registered in a registry, so the shell and search don't import every feature.
- **Actions** are registered by name, and markup carries `data-action="contracts.takePayment" data-args='["2402318"]'`. One delegated listener dispatches them.
- **Features** emit events (`contract:saved`, `call:closed`), and other features subscribe. This replaces cross-file calls such as `recReturn()` and `render()` sprinkled through save code.

---

## 4. Key design patterns

1. **ES modules plus a bundler (esbuild).**
   - Real imports and exports replace the shared global scope and the reliance on file order and hoisting.
   - The bundle is still inlined into one HTML file, so the deliverable doesn't change.
   - esbuild is a single dependency with no config sprawl, and builds in milliseconds.
2. **`html` tagged template with automatic escaping.**
   - ``html`<b>${name}</b>` `` escapes by default; trusted markup must be wrapped in `raw()`.
   - This turns "remember to call `esc()`" into "you'd have to opt out on purpose", which removes the commonest XSS bug class.
   - Migration is mechanical and file-by-file.
3. **Action registry and event delegation.**
   - Replaces all 463 inline handlers.
   - Allows a strict CSP with no `'unsafe-inline'` script.
   - Handlers become importable, testable functions.
   - The current `A()` helper is the single choke point, so the switch is low-risk.
4. **Schema-driven forms and validation.**
   - Each entity has one schema: key, label, type, required, adminOnly, group, options.
   - The same schema drives form rendering, the required star, the admin lock, validation, CSV export columns and, later, server-side validation.
   - The four field renderers collapse into one.
5. **Repository plus pluggable data source.**
   - Views never touch storage. They call `contracts.get(id)`, `contracts.save(c)` or `contracts.list({stage, year, page})`.
   - Repositories add audit entries, run domain rules, emit events and write through the data source.
6. **Pure domain modules.**
   - Business rules have no DOM or storage dependency.
   - They are unit-tested, and can later be shared with the server (same JS, or used as the spec).
7. **Modal stack.** Generalises the current "popup over a record returns to it" stash into a proper stack, so nested popups always come back to where you were.
8. **Single permission check.**
   - `can(user, 'contracts.takePayment')` replaces the scattered `ISADM()/ISOWN()/need()`.
   - It maps one-to-one to server-side checks later.
9. **CSS architecture.**
   - Layers: tokens → base → layout → components → features → themes → utilities, using `@layer` so order is explicit instead of "last patch wins".
   - Feature CSS sits next to its feature.
   - No `!important` except utilities.
   - The "round N" blocks are merged into their components.

---

## 5. Making it backend-ready

**Data source interface** (implemented now by IndexedDB; later by an API):

```js
// data/sources/data-source.js
export interface DataSource {
  loadAll(): Promise<Snapshot>                 // first load (today: whole state)
  list(collection, { filter, sort, page, size, since }): Promise<{ rows, total }>
  get(collection, id): Promise<Record|null>
  save(collection, record, { expectedVersion }): Promise<Record>  // returns the server copy
  remove(collection, id): Promise<void>
  putPhoto(blobOrDataUrl): Promise<PhotoRef>
  getPhoto(ref): Promise<string>
  subscribe(onChange): Unsubscribe            // today: BroadcastChannel; later: websocket/poll
}
```

- **Per-record saves.**
  - Repositories write single records; whole-state `JSON.stringify(S)` on every change goes away.
  - IndexedDB moves from one key to one object store per collection, with a migration that keeps old data.
  - This is the biggest scalability win and maps straight onto REST or GraphQL endpoints.
- **Record metadata.** Every record gains `id`, `createdAt`, `updatedAt`, `updatedBy` and `version`. `version` enables optimistic concurrency, so two people editing the same contract get a clear "changed by someone else" message instead of silent overwrites, which is the cross-tab problem we have today.
- **IDs and numbering.** `domain/numbering.js` is the only place numbers are made. With a backend, the server issues contract and call numbers; the client shows "Saving…" until it has one.
- **Async UI.**
  - Repositories return Promises from day one; in-memory caching keeps today's instant feel.
  - Views render from the cache, and saves are optimistic with a rollback on failure.
  - Loading and empty states already exist as components.
- **Lists and search.**
  - Repositories take `{filter, page, size}` now, served from memory.
  - With a backend these become query parameters, so years of contracts are never all loaded at once.
  - The plain-English parser produces a structured filter (`{entity, stage, dateRange, minValue, town…}`), which an API can accept directly.
- **Customer as its own entity** (recommended, see question 5).
  - Today the same customer is copied into the lead, contract, contact and service call (`custCompat`).
  - A `customers` collection referenced by `customerId` removes duplication and is what a relational backend will want.
  - It ships as a migration that keeps the old fields readable.

---

## 6. Security plan

**Now (client side):**
- **Escaping:** automatic escaping through `html```. A lint rule bans `innerHTML =` outside `ui/` helpers.
- **Handlers and CSP:**
  - No inline handlers.
  - The CSP drops `'unsafe-inline'` for scripts; the build adds a `sha256-…` hash for the one inline app script.
  - `style-src 'unsafe-inline'` stays only if inline style attributes remain; the plan removes most of them.
- **Third-party scripts:**
  - Vendor or pin them with SRI. ZXing (scanner) is currently loaded from jsdelivr without SRI; it gets SRI like MSAL already has, or is bundled.
  - The CSP allow-list shrinks to exactly what's used.
- **Validation:** `SAFE.*` stays and is called by the schemas, not by hand in each form.
- **Permissions:** `can()` is called inside every action (as `need()` is today), not just used to hide buttons.
- **PINs:** keep salted SHA-256 for the demo, and document that it is **not** a security boundary.
- **Session data:** clear sensitive cached data on sign-out, ready for when a server exists.

**When the backend arrives** (designed for now, built later):
- **Sign-in:** Microsoft 365 (Entra ID) through OIDC, which MSAL already does. The server checks the token; roles come from Entra groups or app roles. The client PIN gate is removed.
- **Server enforces everything:** permissions (same action names as `can()`), validation (same schemas), numbering, and an **append-only audit log**.
- **Data protection:**
  - HTTPS only, HSTS, and secure HttpOnly cookies or short-lived tokens.
  - CSRF protection if cookies are used.
  - Rate limits on sign-in and writes.
- **Photos and files:** stored in object storage behind signed, expiring URLs. Never public buckets.
- **Personal data (GDPR):** retention rules, export and erase per customer. The existing GDPR step becomes enforceable.
- **Backups:** server-side with point-in-time restore. The browser backup becomes "export my data".

---

## 7. Scalability and performance

- **Saving:** per-record writes (section 5), with no whole-state serialisation on every keystroke-save.
- **Lists:** paged and filtered at the repository level. Large tables render only the current page (already true for leads, contracts and calls; extended to every list).
- **Rendering:** keep the current `render(soft)` and `morph` approach, but scope re-renders to the region that changed (events say which collection changed) rather than the whole page.
- **Photos:** already moved out of the main save. Next, thumbnails are generated at upload (small data for lists, full size only when opened or printed).
- **Code size:** when hosted dynamically (not single-file), split rarely used features (reports, print, admin, scanner) into lazy-loaded chunks. The esbuild setup makes this a flag, not a rewrite.
- **Search:** an in-memory index rebuilt when collections change, instead of re-stringifying every record on each keystroke. Later, a server search endpoint.

---

## 8. Phases (each one shippable, tested and behaviour-neutral)

| Phase | What | Risk | How it's checked |
|---|---|---|---|
| **0. Safety net** | Move the ~20 Playwright scripts into `tests/e2e`. Add a smoke suite (every view × 3 roles × 3 viewports, no console errors). Add **screenshot baselines** of every view and main popup. Add `package.json` with `npm test`. | None | Suite passes on the current code. |
| **1. Tooling** | Add esbuild and ESLint (rules: no globals, no unused vars, no `innerHTML` outside ui). `scripts/build.mjs` reproduces today's single-file output byte-for-byte in behaviour (still concatenating at first). `build.py` becomes a thin wrapper or is retired. | Low | Same HTML behaviour; tests pass. |
| **2. Actions** | Swap `A()/AC()/RC()` and the 169 raw `onclick` strings for `data-action` and one delegated listener (still global scope). Tighten the CSP (script hash, no `'unsafe-inline'`). | Low-medium (A() is one choke point) | e2e clicks every button; CSP violations fail the test. |
| **3. Modules** | Split into `core/ config/ data/ domain/ ui/ features/` as ES modules. Mechanical moves only, plus renaming one-letter globals (`S`→`state`, `RW`→`recordWindow`, `CO`→`company`…). Break cycles with the view, action and search registries. | Medium (largest diff) | Tests plus screenshot diff; no behaviour change. |
| **4. Safe templates and forms** | Introduce `html```, migrate file by file. Merge the four field renderers into `ui/forms` driven by entity schemas. | Medium | Visual diff of every form; XSS suite. |
| **5. Domain and repositories** | Pull business rules into `domain/` with unit tests. Route all reads and writes through repositories. Add the DataSource interface, IndexedDB per-collection stores (with migration), record metadata and versions. | Medium-high (data migration) | Unit tests; migration test on a copy of real-shaped data; backup/restore round-trip. |
| **6. CSS** | Split into layers and components, merge the "round N" patches, delete dead rules, remove `!important`, move feature CSS next to features. | Medium (visual) | Screenshot diff must be pixel-identical (or approved). |
| **7. Clean-up and docs** | Delete dead code (activity panel, `ckTabOld`, `.rw2`, prototype file), write `ARCHITECTURE.md` and ADRs, update README and CLAUDE.md with the new rules. | Low | Review. |
| **8. Optional** | Customer entity (section 5); a typed layer through JSDoc + `tsc --checkJs` (no TypeScript rewrite). | Medium | Separate sign-off. |

Every phase ends with the build, the full test suite, a push, and the HTML file sent to you, as now.

---

## 9. Reading the plan back: what I checked and changed

- **Order of phases 2 and 3.** I first had the module split before the action registry. Reversed it: inline `onclick` needs global functions, so splitting into modules first would force a temporary `window.*` bridge for hundreds of functions. Doing actions first (one choke point in `A()`) makes the module split clean.
- **Reassigning state.** Today code does `S = newData` (cross-tab sync, restore). Imported ES-module bindings can't be reassigned, so `data/state.js` exposes `replaceState()` and everything reads through it. This is called out so phase 3 doesn't break sync.
- **Hoisting and start-up order.** Some code runs at load and calls functions defined in later files (`coLoad`, `seedHM`, `migratePhotos`). In modules those become explicit steps in `main.js` (load → migrate → register → render), which is also easier to read.
- **CSS order dependence.** The current look depends on later patches overriding earlier ones, so merging could change appearance. That's why phase 0 adds screenshot baselines and phase 6 uses `@layer` and a pixel diff before anything is deleted.
- **Global title-case rule.** `body *{text-transform:capitalize}` caused several bugs (links, emails, "Https"). The refactor keeps the look but applies it deliberately (headings, labels, buttons, chips) rather than to every element, including inputs. See question 4, since it's your style preference.
- **Async repositories.** Making everything async at once would ripple through every view. Repositories return Promises but serve from an in-memory cache, so views can stay synchronous for reads and only saves become `await`. Lower risk, still backend-ready.
- **Scope creep.** The customer entity and TypeScript-style checking are useful but not needed to reach "readable and maintainable", so they're optional (phase 8) and need their own yes.
- **Deliverable unchanged.** The bundler output is still inlined into one HTML file. `dist/` and `index.html` keep their names, the version stays v19.2 unless you want a bump, and the saved-data keys stay the same so nobody loses data.

---

## 10. Effort and how you'll see progress

This is a large change, roughly the size of everything built so far. It will run across several working sessions. After each phase you get:
- a push to GitHub,
- the updated HTML file,
- a short note of what moved and the test results.

No new features are mixed in during the refactor, so any visible change is a bug to report.

---

## 11. Status: what was done (November 2026)

All phases 0–7 are done. The site behaves the same. The only intended change you can see is that Title Case now applies to headings, labels, buttons, tabs and tags only.

Where the work differs from the plan, and why:

- **html`` templates:** shared pieces use it now (form fields, tags, star ratings). Other templates move over when next touched, so there was no single risky rewrite. See ADR 3.
- **Entity schemas:** the field lists stay in `features/records/fields.js`. One renderer (`fieldControl`) draws every box.
- **Per-collection browser storage:** deferred until the backend work. The data source and repositories are in place, and records carry versions. See ADR 4.
- **Repositories:** they cover adding, changing and removing records. Pages still read from `state` directly. That is fine while all data is in memory; reads move to `repo.page()` with the backend.
- **CSS:** 209 unused rules were deleted, and the page styles were split and named. `@layer` and removing `!important` are left as a careful follow-up, because layers reverse the order of `!important` rules.
- **View registry:** `ui/shell` is the app shell and imports pages directly. A few `ui/` helpers still call the record window.
- **Lint:** the layer rule is enforced for core, config, data and domain.
