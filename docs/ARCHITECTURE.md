# Architecture

The CRM is one HTML file. esbuild bundles the ES modules in `src/` into one inline script, the CSS
files are joined into one `<style>`, and the build adds a content security policy with a hash
for each script. Nothing else is loaded except the optional sign-in and scanner libraries.

## Layers

Imports only point down. ESLint enforces this for every layer below `features/`.

```
start/          start-up data updates (migrations) and the first draw        may import anything
features/       one folder per part of the app: pages, forms, actions
ui/  print/  integrations/   shared screen pieces, printed documents, outside services
domain/         business rules: plain functions, no screen, no storage
data/           state, load, save, sync, photos, audit, repository, sources/
core/  config/  generic helpers and fixed settings
```

- **`ui/shell/`** (router and shell) is the app shell: it lists the pages, so it is the one part of
  `ui/` that imports from `features/`.
- **Plug-in points instead of upward imports.** When a shared piece needs a page, the page plugs in
  at start-up: the record window into popups (`plugInRecordWindow`) and forms (`plugInForms`, to open
  the step a box is on), the scanner and the supplier list into forms. `main.js` calls each
  `plug…In()` once.
- **Lower layers never call the screen.** They `emit()` an event from `core/events.js`
  (`notice`, `data-replaced`, `photos-loaded`) and `ui/shell/data-events.js` decides what to show.
- **Nothing runs when a module is imported.** Start-up work is an exported function that `main.js`
  calls, in a fixed order.

## How a click becomes a change

1. Markup is built with `html``...`` (escapes every value) or `esc()`. Buttons carry
   `onClick('saveThing', id)`, which writes `data-act` / `data-args` attributes; there are no inline
   handlers.
2. `core/actions.js` has one click/change/input listener for the whole page. It looks the name up
   in the action registry. `main.js` registers every exported function.
3. The action checks permission with `can('money')` / `can('manage')` (or `need()`, which also
   explains a refusal), validates input with `SAFE.*`, and changes records through
   `data/repository.js`, which stamps `_meta` (created, updated, by whom, version).
4. It saves with `store()` and records the change with `audit()`. `store()` moves new photos to the
   photo store, then hands the whole copy to the data source.
5. The data source tells other open tabs; `data/sync.js` reloads their copy unless a popup is open,
   then catches up when it closes.

## Data and the future backend

`data/sources/data-source.js` defines the interface every storage place must offer (`readAll`,
`saveAll`, `subscribe`, photo reads and writes, `replaceAll` for restores).

- **Today:** `indexeddb-source.js` keeps the whole app data as one saved copy in this browser,
  using the same database names as earlier versions. The boot loader reads the same database.
- **Later:** `api-source.js` is a documented stub for the Microsoft 365 backend (Entra ID sign-in,
  the same permission names, per-record saves with version checks, paged lists, files behind
  short-lived links). Switching is `setSource(apiSource(...))`; pages do not change.
- Records already carry `_meta.version`, so a server can refuse a save made on an out-of-date copy.

## Inventory and the stock take

- A product line is **code + description + area + length + colours**. One code can live in several areas
  (Stores and Fitters Vans) or name several products (a cylinder size sold single or keyed alike).
- Products are the newest row of each Stock ID in `state.items`, which is also the movement log
  (`add`, `remove`, `request`, and `import` for a line's starting row). `isMove()` means a real in/out.
- The stock take (`features/stock/stock-take.js`, rules in `domain/stock-take.js`) reads and writes the
  office workbook layout through `core/xlsx.js`: one sheet per area with
  Stock Code | Description | Quantity In Stock | Location | Notes (Value and Cost on the valuation file).
  Stock takes are kept in `state.stakes`; area order in `state.stockAreas`.

## Search and exact matches

- `features/search/search.js` builds the top bar list and the Ctrl+K box from `SRCH` (one entry per
  kind of record) and `CMDS` (actions).
- An exact match comes first and is highlighted: a Stock ID, item code or barcode
  (`domain/stock.js` `exactProduct`), or a record's number, name, company, phone, email or postcode
  (`domain/exact.js` `isExact`, ignoring spaces, brackets, dots and dashes).
- On list pages, `features/search/exact-rows.js` moves the exactly matching row to the top, marks it
  and scrolls to it after each draw. Inventory does the same itself.
- Questions get a straight answer first: `features/search/facts.js` (amount outstanding, stock value,
  holiday left, next fitting, VAT...). Words are matched in plain form by `domain/ask.js`, which folds
  words that mean the same ("outstanding", "owing", "balance", "to collect") together.
- "On The Pages": `features/search/site-index.js` draws each page this account can open (with no search
  typed) and indexes its headings, number cards, columns, settings and the boxes in lead, contract and
  service windows. Clicking a match opens the page and lights up the spot. It is kept for a minute.
- Everything runs in the browser. Real AI (sending a question to Claude) is for later, once the
  Microsoft 365 backend can hold the key and keep customer data on the server.

## Service map and Panel Optimiser

- The Service Calls map (`svcMap` in `features/service/service.js`) draws an approximate outline of Norfolk
  and the land round it (`LAND`: the Wash, the Fens, north Suffolk to Felixstowe) and puts a pin per town from
  the list in `domain/places.js`. The area we fit in, `FIT_MILES` (45) round the yard (`BASE`, NR6 5DR), is
  highlighted; land beyond it is dimmed. Nothing is looked up online; a town not in the list is shown under the
  map as "not on the map". Add towns to `TOWNS` (or a spelling to `ALIAS`).
- Each service call row has quick actions (`svcQuick`: Complete / Reopen, Parts / Parts In), each with Undo on
  the banner. Any account may delete a service call (`DEL_RULE.calls` has no permission). A service report asks
  which photos to print (`reportPhotos`): the call's own, then the linked contract's.
- The Panel Optimiser (`features/cutting/cutting.js`) plans board cutting with `domain/cutlist.js`
  (maximal-rectangles placement, saw kerf and edge trim, grain lock per piece). Sizes always read width × height:
  `L` is the width (across the plan), `W` the height (up the plan); the names stay so saved lists open. Each board
  has a thickness (`T`, mm) and a colour inside (B) and outside (A) (`cIn`, `cOut`), shown on the plan and printed. The current list and
  saved lists are kept in `state.cut`.

## Adding a page

1. Make `src/features/<area>/<area>.js` with a `v<Area>()` function that returns the page HTML.
2. Add it to `VIEWS` and the menu groups (`NG`) in `ui/shell/router.js`, and to `ROLES` in
   `config/roles.js` for each account type that may open it.
3. Import the module in `main.js` and add it to the `modules` list, so its actions register.
4. Put business rules in `src/domain/` with a unit test in `tests/unit/`, and add the page to the
   smoke and screenshot tests.

## Styles

`src/css/` files are joined in name order, and later rules win, so order matters:
tokens, base, shell, components, page styles (`05a`), record windows, popups and glass (`05b`),
later refinements (`05c`), responsive, looks.

- Text is Title Case only for headings, labels, buttons, tabs and tags; everything else shows as typed.
- `@layer` is not used yet. The CSS still has about 70 `!important` rules, and inside layers
  `!important` reverses the order, so these must be removed first, one screenshot-checked step
  at a time.

## Tests

- `tests/unit`: business rules and the repository, with no browser.
- `tests/e2e`: every page × 3 account types × 3 screen sizes with no errors, security (permissions,
  PIN lockout, script injection, CSP), records, operations, search, settings, and saving, sync
  and restore.
- `tests/visual`: 40 screenshots. Baselines are made on your machine
  (`npm run test:visual:update`) and must match exactly after any change that should look the same.

## Decisions

See [docs/adr](adr/).

## Cutting Optimiser (bars)

- `features/bars/bars.js` (view `bars`, under Panel Optimiser): profiles with a bar length, and cuts with a
  room or position, a frame reference, a length, how many and the angle at each end. `domain/barcut.js`
  plans the bars (longest first, each into the bar it fits best, saw blade and end trims allowed for) and
  counts bars cut the same way together. It prints as a saw list (`kind: 'Cutting List'`) and can be kept
  on the contract like the panel plan.
- A product's own window (Inventory, Cutting: "Cut from full bars?") marks it as a profile with its bar length
  (6.5M, 7M, 5M or another length; `state.cutProf`, by Stock ID). There is no separate Cutting Data list.
- Defaults (`domain/barcut.js`): saw blade `DEFAULT_KERF` 10mm, end trim 50mm, offcuts kept only from
  `MIN_OFFCUT` (1000mm). Each profile has a colour inside (B) and outside (A) (filled from the product's Colour in / Colour out), printed beside
  the profile in the cut list.
- Not yet allowed for: the extra length lost when a mitre has to be cut twice (see HANDOVER.md).
  A linked profile fills in its bar length in the optimiser and shows how many are in stock.

## Printed documents

- `print/doc-options.js` lists every printed document (`DOCS`) and the parts each one has. Everything is
  shown until it is switched off in Settings, Printed Documents (`features/settings/doc-builder.js`).
- `printDoc` takes the document's key from `o.doc` or `o.kind` and leaves out what is switched off: logo,
  reference and date, key figures, payment bar, timeline, details, each table or section by title, photos,
  signatures, barcode, reviews, thank-you note and footer. The titles a document prints are remembered
  (`state.docSeen`) so the builder can list them. Stock labels have their own parts.

## Messages, drop-downs and confirmations

- `ui/toast.js` shows every confirmation and warning as one small banner at the bottom (a "snackbar"), with an
  optional button: `toast('Holiday booked', { action: { label: 'Undo', run } })`. `doneIn()` closes the window
  and shows the same banner; there is no tick drawn inside windows any more.
- `ui/components/pickers.js` also replaces the browser's grey drop-down list: with a mouse, every `<select>`
  opens the app's own list (the real `<select>` stays, so values and change events are unchanged; keyboard:
  Space/Enter/Alt+Down to open, arrows, type to jump, Enter to pick). Phones keep their own picker. Add
  `data-native` on a parent to opt out.
- Colours meet WCAG AA in light and dark (4.5:1 text, 3:1 large text and form box outlines). Keep `--muted`
  and `--blue` (tokens) as they are; check new colours on the real background, glass included.

## Shared pop-ups, PINs and the page filter

- `ui/components/pickers.js`: an input with `data-combo="<source>"` (or a field with `combo:`) gets an
  app-styled pick list as you type; pages register sources with `plugInCombo` (`contracts`, `jobs`,
  `profiles`). With a mouse, every `input[type=date]` opens the app's own month calendar.
- PINs (`features/auth/pins.js`): each PIN has its own random salt and is hashed `PIN_ROUNDS` times
  (`core/crypto.js` `stretch`). PINs saved the older way still work once and are then re-saved. Wrong-PIN
  lock-outs are kept in localStorage and double each time. The data itself is not encrypted: that waits for
  the Microsoft 365 backend.
- List pages filter through `hit()` in `ui/shell/router.js`. A question the search understands filters the
  list the way it is answered; a question about something else leaves the list alone.
- Cutting Optimiser, Book Into Stock (`features/bars/bars.js`): for profiles linked to Inventory, the full
  bars used are booked out and offcuts over the "keep" length go back in as their own stock lines.
