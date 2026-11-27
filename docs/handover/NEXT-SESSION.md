# Next session: start here (written 27 November 2026, after v19.17.8; tasks 1 to 3 done in v19.17.9 to v19.18.2)

> Update: Task 1 (review keys note), Task 2 (brochure New tag) and Task 3 (Lead, Contract and Supplier windows like
> AdminBase) were done in v19.17.9, v19.18.0, v19.18.1 and v19.18.2. See HANDOVER.md for what was built and what is
> still open with the owner (screenshots of Address, Advanced and Documents; the "Coming soon" reports).

This is the hand-over for the next working session on the Broadland Windows CRM. Read it top to bottom, then
`HANDOVER.md` (the version-by-version history), `CLAUDE.md` (the rules for code) and `docs/ARCHITECTURE.md`.

The owner is away from the keyboard while this session runs. Work through the tasks below in order, publish each
finished round, and leave a clear summary (with screenshots) for when they are back.

---

## 1. The owner and how to work with them

- The owner runs Broadland Windows (windows, doors and garden rooms, Norfolk). They are **not a coder**: explain in
  plain English, show screenshots, send the built HTML file. No code in summaries unless asked.
- They want a front-end developer's eye **and** a UI designer's eye. They notice spacing, alignment, colours and
  anything that looks "cheap". They often say "make it like X" with a screenshot.
- **Do not move columns or row buttons unless asked.** When something is unclear, ask (one short question with
  options), unless they are away: then make the sensible choice, say what you chose and why, and make it easy to
  change.
- Standing instruction: **"yes always publish your changes"**. Every finished round goes live.
- They prefer British English, Title Case on buttons and headings ("Restart Now", "Add Another Tag").
- Things they have chosen (keep them):
  - Messages: the WhatsApp layout in the app's own colours (blue bubbles for you, white for others, faint dot grid).
  - Side menu Sales: Contact Book, Leads, Contracts, then Service Calls indented under Contracts.
  - New-version prompt: a centred window, Restart Now, "Remind Me In 10 Minutes" leaving a chip.
  - Windows desktop icon: the plain sun with the bird. Mac: a white rounded tile with the sun inside.
  - Inventory: column order and widths from v19.13 to v19.15.1 (see HANDOVER.md). Do not rearrange.

## 2. The round routine (every time)

1. `npm run build` (writes `dist/Broadland-Windows-CRM-v19.17.html`, `index.html` and the desktop-app files).
2. `npm run check` (lint, unit tests, build, Playwright behaviour tests). All must pass.
3. `npm run test:visual` (screenshot comparisons). On a fresh container run `npm run test:visual:update` **before**
   changing anything, to make local baselines. When a change is intended, look at the diff image in
   `test-results/…/*-diff.png` first, then `npm run test:visual:update`.
4. Bump `package.json` "version" (19.17.x for small rounds), write 2 or 3 short lines in `src/whats-new.json` (they
   show in the app's "A New Version Is Ready" window), add a section to `HANDOVER.md`.
5. Commit, then push to the working branch **and** to `main` (`git push origin HEAD:main`). GitHub Pages deploys from
   `main`. Merge `origin/main` first: a daily bot commits `brochures.json` there.
6. Wait for both GitHub workflows (**Tests** and **pages build and deployment**) to pass. Check them with the GitHub
   MCP `actions_list` tool; never assume.
7. Send the owner the dist HTML file, screenshots (Playwright, deviceScaleFactor 2 for ones they see) and a short
   plain-English summary.

Live site: https://braddopia.github.io/beta.broadlandwindows/ (the cloud container's proxy blocks it, and
broadlandwindows.co.uk, so you cannot open either from the container; test locally with Playwright).

## 3. Things that will trip you up

- **Playwright runs with `reducedMotion: 'reduce'`** (playwright.config.js) and a **fixed clock** (`page.clock.
  setFixedTime`, 2026-11-08 10:00, tests/helpers.js). Under that clock `requestAnimationFrame` never fires and
  `Date.now()` is frozen; `performance.now()` and `setInterval` still run. Code that throttles or animates uses
  `performance.now()`. A test of something moving calls `page.emulateMedia({ reducedMotion: 'no-preference' })`.
- Tours are forced on in tests (`bb_tours_force`), so the first visit to a tab can open a tour overlay (`.ov.open`).
  Pop-ups that wait for other windows (the update window) then wait. Trigger checks another way in tests.
- The Fewer Animations setting (`body.rm`) must never stop the screen saver or the opening intro.
- Security policy: no inline `onclick=`. Use `onClick()`, `onEvent()`, `rowClick()`, or `data-act="fn"`. Every value
  in HTML goes through `esc()` or the `html``…``` tag. Form boxes come only from `fieldControl()`.
- Every exported function in a module imported by `src/main.js` becomes a button action and a test global
  (`app.run(() => fnName())`). A new module must be imported and listed in `main.js`.
- Layers: core/config → data → domain → ui → features. `npm run lint` enforces it. `ui/shell` may import features.
- No personal data in the repo: sample names only ("Sample Customer E", "Fitter A"). The owner's screenshots of their
  old system contain real customer and staff names and an email address: **never** copy those into code, tests or docs.
- Generated files (`index.html`, `dist/`, `sw.js`, `manifest*.webmanifest`, `app-sun-*.png`, `version.json` in the
  root) are written by the build from `src/`. Never edit them by hand.

## 4. Where things stand (v19.17.8)

Everything below is live and passing.

- Messages: WhatsApp-style runs, coloured names, time and ticks in the bubble, groups with admins, commands (`/`).
- Service calls: up to four engineers (`fitter` lead, `fitter2` to `fitter4`; `callTeam(c)` in domain/people.js).
- Files: brochures follow the website via the daily job; Category and Size sit beside the buttons.
- Job Stock Tags: one full-width line per box, capitals in the wording, colour filled in from the contract.
- Update prompt: `ui/shell/update-card.js`; checks `version.json` on every page change, focus, and every 2 minutes.
- Screen saver: rebuilt in `features/app/saver-scene.js` (a 240-second day; sun and moon on arcs; clouds at depths;
  boats sail fully across). Settings has one drop-down for it. Moving the mouse alone does not close it.
- Desktop app: `manifest.webmanifest` (Windows, plain sun) and `manifest-mac.webmanifest` (Mac, white tile), swapped
  by `isMac()` in features/app/desktop-app.js.

### The daily website job (`.github/workflows/reviews.yml`, "Daily website figures", 05:23 UTC)

- `scripts/fetch-brochures.mjs`: reads broadlandwindows.co.uk/brochures/, keeps one of each brochure (`oneEach`),
  drops non-brochures (`NOT_BROCHURE`), tidies file-name titles (`tidyTitle`: HW = Hardwood), records each cover
  picture (`img`), and writes `brochures.json` with `firstSeen` dates. When the page cannot be read it falls back to
  WordPress's file list; fewer than 5 found leaves yesterday's list. The website sometimes answers automated reads
  with a small holding page: that is handled (nothing is changed that day).
- `scripts/fetch-reviews.mjs`: Google and Trustpilot scores. **No keys are set**, so nothing updates. Trustpilot's
  public page answers 403 to automated reads, so the key-less fallback does not work from GitHub.

---

## 5. Tasks for this session, in order

### Task 1: note that the review API keys must be set up later

The owner knows the live review counts need keys and wants it recorded, not done now.

- Add a line to the **"Before going live"** list in `CLAUDE.md`: set the GitHub Actions secrets
  `GOOGLE_PLACES_KEY` and `GOOGLE_PLACE_ID` (Google Cloud, Places API (New)) and `TRUSTPILOT_API_KEY` (Trustpilot
  Business), optionally the variable `TRUSTPILOT_DOMAIN`; then run "Daily website figures" by hand and check
  `reviews.json` appears on `main`.
- Make sure the Admin Console's Reviews card says the same in plain words (it shows "no keys set" status today; check
  the wording reads well).
- Never ask the owner to paste keys into chat. They go in GitHub: Settings, Secrets and variables, Actions.

### Task 2: the "New" tag on brochures in Files

The owner says brochures that are not new show the little yellow "New" badge (some were picked up by the daily check
recently, so the CRM thinks they are new).

What is there now:
- `isNew(d)` in `src/features/files/files.js`: New when `firstSeen` (from brochures.json) is within 30 days **and**
  the file's upload month (from `/uploads/YYYY/MM/` in its address) is within about two months.
- `brochures.json` today: every item has `firstSeen` 2025-11-27 (the job dates the first list a year back so nothing
  is new) except `COVER-HALLMARK-uPVC-Panels-2025-scaled.jpg` (firstSeen 2026-11-27, uploaded 2025/06, so not New by
  the upload-month rule). Items uploaded in 2026/10 and 2026/11 (Alitherm Heritage 60, Hallmark Composite Door
  Brochure 2026) pass the upload-month rule, but their `firstSeen` is a year back, so they are not New either.
- The job re-dates anything whose **address** it has not seen before. When the website re-uploads a file (a "-1"
  copy, or a new month folder) or the job switches between reading the page and the WordPress file list, an old
  brochure gets a new address and so a fresh `firstSeen`, which is the likely cause.

What to do:
- In `scripts/fetch-brochures.mjs`, match "seen before" by the file key (`fileKey(url)`: the file name, ignoring a
  "-1" re-upload suffix) **and** by tidied title, not only the address; keep the earliest `firstSeen`.
- Treat the list as it stands now as the baseline: nothing in today's brochures.json is New. Only a brochure whose
  file key and title were never seen before gets today's date.
- Keep the upload-month rule in the app as a second check.
- Add unit tests (tests/unit/brochures.test.mjs) for: a re-uploaded file keeps its old date; a new file gets today.
- Check the "New" badge does not show on any current brochure (e2e: tests/e2e/round-1917.spec.js has brochure tests).
- A brochure removed from the website drops out at the next morning check (this already works; keep it working).

### Task 3: rework the Lead and Contract windows like the old system (the big one)

The owner wants the Lead and Contract record windows to work like their old system, **AdminBase**, "but with our
current UI". Their words: "I would like to try Large Centered Window/Full Page but it needs to be like this I guess
as this is what we are used to". They sent 8 screenshots of AdminBase over two messages. They are described below in
words (the screenshots hold real names, so they are not in the repo).

The current window is `src/features/records/record-window.js` (tabs called steps: `RSTEPS`, field lists in
`src/features/records/fields.js`, groups with `g: '…'`, cards in `cards.js`, products in `products.js`, checklist,
survey, photos-docs, notes, stages; contract parts in `src/features/contracts/`, lead parts in `src/features/leads/`).
It is already a full-screen window with tabs and label/value rows. The rework changes its **layout and behaviour**
to match AdminBase's, keeping the app's look (cards, fonts, colours, light/dark, buttons, the 20 UX principles in
docs/UX-PRINCIPLES.md).

#### What AdminBase looks like (from the owner's screenshots)

**Frame**
- Top bar of coloured sections: Home, Leads (green), Contracts (teal), Diaries (red), Stock (amber), then Search All,
  Tools, Settings, Exit. (The CRM already has its own side menu: do not copy this bar.)
- A record toolbar in a teal band: **Save & Close**, **Address**, **Reports**, **Clipboard ▾**, **Advanced ▾**, then
  record navigation **« ‹ › »** (first, previous, next, last), then **Search**.
- A title line: "Browsing Customers [Customer: (customer number and name) Contract No: (contract number)]". Under it a small row:
  an (i) info button, first/previous/next/last arrows, a tick (save) and a cross (cancel), and a red link
  "1 Contract for this Customer" (how many contracts this customer has; it opens them).

**Tabs along the top of the record (contract)**: Details · Checklist · Finance · Deliveries · Fitting · Notes etc ·
3 Documents (the count of documents in the tab name) · Commissions · Job Costings · Service Calls.

**Details tab: two halves side by side**
- Left half: a long label/value list, one row per field, thin lines between rows, collapsible groups with a chevron
  (open ⌃ / closed ⌄). A closed group shows a summary on its row (e.g. Sales Information shows "[salesperson name]").
  In order:
  - Contract No · Contract Date · Week Received (week number)
  - **Office Refs** (group): Office Ref 1 · Office Ref 2
  - **Supply Only** (tick box; a group, closed)
  - Contract Type (e.g. "Domestic Ali") · Installation Manager · Assigned Surveyor
  - **On Hold** (tick box; group, closed) · **Cancelled** (tick box; group, closed)
  - **Sales Information** (group, open; summary "[salesperson]"): Lead Number · Sales Area · Sales Director ·
    Sales Manager · Salesperson · Lead Source · Sub Source · Sub Sub Source
  - **Created By** (group, closed)
  - Contract Approvals
  - Contract Colour (a colour swatch and its code; the colour this contract shows in lists and the diary)
  - Flash Note
- Right half: two sub-tabs, **Products** and **Other Info**.
  - Products: a small toolbar (first/previous/next/last, **+** add line, **−** remove line, tick, cross,
    **Default** (add the default lines), **Create from Deliveries**), then a grid: Line No · Product Code · Product
    Name · Qty · Guarantee · Location · Rate · Net Sales Value. Example lines: labour, trims, sealed units, door,
    windows.
  - Underneath, an **Info for FENSA** box: Window Count, Door Count (number boxes), tick boxes Conservatory,
    Roofline, Exported, Not Required, and a **More >>** link.

**Other tabs (from the first set of screenshots)**
- Checklist: the stages from signed contract to guarantee, ticked with who and when.
- Finance: a summary (value, deposit, paid, balance) and a table of payment lines with its own small toolbar
  (Add, Delete, Default, Select All).
- Deliveries: the supplier deliveries for this job in a table with a toolbar.
- Fitting: dates and team, and a **Contract Schedule** table (the fitting days).
- Notes etc: notes and a log.
- Documents: the job's documents (the tab shows the count, e.g. "3 Documents").
- Commissions: the salespeople's commission lines.
- Job Costings: Products and Info for FENSA (as above) with costs.
- Service Calls: the calls raised on this job.

**Reports (the toolbar's Reports button)**
- Opens "Contract Reports": a teal header with a toolbar **Back · Email · Print · Sign · Preview · Customise ·
  Edit List**.
- Left: a list "Report Name": Customer Contract Record · Invoice Reminder · 10 Year Completion Documents · 5 Year
  Completion Documents · 10 Year Completion Documents Conservatory · Domestic Aluminium Checklist · Quality Plan ·
  Contract Statement · Order Acknowledgement Letter · Order Checklist · Receipt · Sales Invoice · Standing Order
  Letter · Credit Control Letter 14 Days. One is highlighted when picked.
- Right: a large preview of the picked report.
- A footer line saying who to ask for changes to the reports (do not copy the name or email; use the company's
  general wording, e.g. "Need a change to a report? Ask an administrator").

**Not sent yet**: the Address window, the Advanced menu and the Documents tab. The owner offered them ("max 5
images"). Build a sensible version (Address: the customer's home, site and invoice addresses in one window; Advanced:
less-used actions like Duplicate, Merge, Change Customer, Delete), then ask for those screenshots when they are back.

#### How to build it (recommended)

- **Shape**: a large centred window (about 94vw × 92vh, rounded, over a dimmed page) that can go full page with one
  button. Inside: the record toolbar, the title line, the tab row, then the tab's content. The CRM's styling
  (cards, `fieldControl()` boxes, buttons), not AdminBase's grey Windows look.
- **Toolbar**: Save & Close (primary), Save, Address, Reports, Clipboard ▾ (copy customer details, address, job
  number), Advanced ▾, record navigation « ‹ › » through the list the window was opened from, and Search (find
  another record without closing). Keyboard: Ctrl+S save, Esc close (asks to save if anything changed),
  PageUp/PageDown previous/next.
- **Title line**: "Contract 1023421 · Sample Customer E · Aylsham" with the stage tag, and "1 Contract For This
  Customer" (or "3 Contracts …") that opens a small list.
- **Tabs**: the AdminBase set, in that order, for contracts. For leads the same frame with the lead's tabs (Details,
  Appointments, Survey, Checklist, Notes etc, Documents). Counts in tab names where AdminBase has them
  ("3 Documents", "2 Service Calls").
- **Details**: a two-column grid; left the label/value list with collapsible groups (remember open or closed per
  person in localStorage); right Products / Other Info with the products grid and Info for FENSA underneath. Rows are
  edited in place (click a value to edit). Keep every field the CRM has today: group them into AdminBase's groups
  and add the ones AdminBase has that the CRM lacks (Week Received, Office Ref 1 and 2, Supply Only, On Hold,
  Cancelled, Contract Approvals, Contract Colour, Sub Source, Sub Sub Source) through `fields.js`, cleaned with
  `SAFE.*`, saved with `repos.contracts.changed()`, `store()` and `audit()`.
- **Reports**: a two-pane window as described, wired to the CRM's existing printouts (`src/print/`, the contract
  documents in `features/contracts/documents.js`). Reports the CRM does not have yet can be listed greyed out with
  "Coming soon", or built from the existing print style if quick.
- **Keep** the current behaviours that tests cover (`tests/e2e/records.spec.js`, `smoke.spec.js` "lead and contract
  windows open on every step without errors", etc.). Update tests where the layout deliberately changes; add new
  tests for the toolbar, navigation, collapsible groups, products grid and reports.
- **Phones**: the tabs scroll sideways, the two halves stack, the toolbar collapses into a "More" menu.
- **Suppliers**: the owner also asked for the Supplier window to be redesigned in the same family. Do it after
  Leads and Contracts, in the same frame.
- Work in rounds (e.g. 1: frame, toolbar, tabs, Details; 2: Finance, Fitting, Deliveries, Products grid; 3: Reports,
  Clipboard, Advanced; 4: Suppliers), publishing each.

## 6. After these

The owner's next list: "the other pages hidden in admin/beta account" (Staff, Holiday Planner, Reports, Finance,
Admin Console are only in the Beta account's menu). Ask them what to start with.

Still open with the owner: the review API keys (Task 1), the Units On Shelf card and an "Other length" option in
Inventory (older questions in HANDOVER.md, "Open questions for the owner").
