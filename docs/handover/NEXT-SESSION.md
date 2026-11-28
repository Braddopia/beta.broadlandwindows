# Next session: start here (written 28 November 2026, after v19.18.11)

This is the hand-over for a **brand-new chat** on the Broadland Windows CRM. Read it top to bottom, then
`CLAUDE.md` (the rules for code), `HANDOVER.md` (version-by-version history; the v19.18.x sections at the end are the
latest work) and `docs/ARCHITECTURE.md`.

## 1. The CRM in one page

A single-file web app (one HTML file, no server yet) for Broadland Windows, Doors & Garden Rooms (Norfolk). Data lives
in the browser (IndexedDB) and syncs between tabs; an `api-source.js` stub is waiting for a Microsoft 365 back end.
It installs as a desktop app (Windows and Mac) and checks `version.json` for updates. Live at
https://braddopia.github.io/beta.broadlandwindows/ (GitHub Pages from `main`).

Pages (side menu groups):
- **Workspace**: Overview (KPIs, reviews, greeting box), Messages (WhatsApp-style chat), Calendar (month/week/agenda
  of surveys, appointments, fittings, deliveries, service visits, holidays).
- **Sales**: Contact Book (cards with A–Z bar), Leads, Contracts, Service Calls (indented under Contracts).
- **Operations**: Floor Boards (factory TV boards, Full Screen), Deliveries (Calendar / List / Board; Hallmark feed
  bar on the List view).
- **Stock**: Inventory (items, stock-take areas, reports incl. Detailed and "Find It" factory-floor report),
  Suppliers.
- **Processing**: Panel Optimiser, Cutting Optimiser (aluminium bars only), Job Stock Tags.
- **People / Insights / Admin** (some only in the Beta / admin account): Staff, Holiday Planner, Reports, Files
  (brochures from the website, "New" badge), Finance, Admin Console, Settings.

Record windows (Lead, Contract, Supplier) were rebuilt in v19.18.0–v19.18.8 to work like the owner's old system,
**AdminBase**, in the CRM's own look: they open in the page area (side menu stays), with a toolbar (Save & Close,
Save, Address, Reports, Clipboard, Advanced, « ‹ › » navigation, Search, Full Page, Close), a title line with the
stage path, tabs, and a Details tab of label/value rows in collapsible groups beside a Products grid with Info For
FENSA. Contract Reports is a two-pane window with a live preview. Code: `src/features/records/` (record-window.js,
ab-list.js, record-tools.js, record-parts.js, record-page.js, products.js, fields.js), `src/features/contracts/`
(contract-record.js, contract-tabs.js, contract-reports.js), `src/features/leads/lead-record.js`,
`src/features/suppliers/supplier-window.js`; styles in `src/css/05h-record-adminbase.css`.

## 2. What to do first in the new chat

1. `npm ci`, then `npm run test:visual:update` (make local screenshot baselines before changing anything), then
   `npm run check` to see everything green.
2. Ask the owner for the **AdminBase contract screenshots** (Details, Address, Advanced, Documents, and anything
   else they want matched). They tried to show it live but this cloud session could not see their screen: ask them
   to paste screenshots with real customer names and emails blurred. **Never copy real names or emails** from them.
   Then tighten the Contract (and Lead) windows' spacing and layout to match, keeping the CRM's look.
3. Carry on with the open list in section 6.

## 3. Things the owner chose recently (keep them)

- **What's New window** (update-card.js, v19.18.10): like Discord's What's New, no ticks. Header with "Version x ·
  date", sections with coloured headings, footer "A New Version Is Ready", Restart Now, Remind Me In 10 Minutes.
  Notes come from `src/whats-new.json`: `{ "date": "YYYY-MM-DD", "notes": [{ "t": "Heading", "d": "One or two
  plain sentences" }] }` (up to five). The build writes `version.json` with `sections`, `date` and plain `notes`
  (for old copies). Write these notes in plain English for staff, every release.
- **Settings, Version row**: "Version x is ready · you have y" + Update Now when an update is waiting; otherwise
  "This is version y, the latest" + Check Again. Settings buttons fit their words (v19.18.11), same height.
- **Deliveries calendar**: the whole month on one screen, running to the bottom of the screen, never scrolls
  (`delCalFit`, `watchDelCalSize`; v19.18.9 and v19.18.11).
- **Contact Book**: sticky Show and A–Z bars fill in once the page scrolls (`watchPageScroll` puts `.scrolled` on
  `#main`).
- **Floor Boards**: clickable rows shade on hover; no blue line (the owner reads it as an underline).
- **Stock**: Stock-Take Area is a searchable drop-down of `STOCK_AREAS` (TEXT-NUMBER: BTSS-01..40, Sobinco,
  BTDR-01..40, BTWIN-01..40, Red/Grey/Blue/Green Container). Materials are Aluminium and Timber only. Only aluminium
  counted in Meters (M) can be a Cutting Optimiser bar; its bar length is the Length (m) box. Never ask a PCS/Each
  item for metres.
- **Colour boxes** marked (A) or (B) show a faint hint: "A – Typically Outside", "B – Typically Inside".
- **Long drop-downs** (12+ options) have a search box (`ui/components/pickers.js`).
- **Screen saver**: sun and moon fade and sink at the horizon; it must stay smooth.
- **Performance** (v19.18.6, `src/css/10-performance.css`): no `backdrop-filter` blur on page surfaces (it was the
  main cause of lag), no endless animations on a still page. Don't add blur to in-page surfaces again; pop-ups may
  keep theirs. A test checks this.

## 4. Round routine changes since the older notes below

- Version is now 19.18.x (`dist/Broadland-Windows-CRM-v19.18.html`). Bump the patch number every round.
- Run the **whole** `npm run check` before every push (a pushed round once failed CI because only one spec was run).
- After pushing, check both workflows with the GitHub MCP `actions_list`; a `send_later` reminder 5 minutes later
  works well.
- Screenshots: Playwright scripts against `file:///…/index.html` with `window.CRM.go('view')`; owner-facing ones at
  deviceScaleFactor 2.

## 5. Owner and environment notes

- The owner is not a coder; plain English, screenshots, short summaries. British English, Title Case on buttons.
- Standing instruction: **always publish** (push the branch and `main`).
- This project runs in a cloud session: it cannot see the owner's screen or reach broadlandwindows.co.uk or the live
  site from the container. Screenshots from the owner are the way to see AdminBase.
- Never ask for API keys in chat (they go in GitHub Secrets; see CLAUDE.md "Before going live").

## 6. Open items

1. **AdminBase match for Contracts and Leads** (first job, needs the owner's screenshots): spacing and layout of the
   Details, Address, Advanced and Documents tabs. The owner said the windows felt crowded; v19.18.8 gave them more
   room. Wait for screenshots before big moves.
2. **"Coming soon" reports** in Contract Reports: ask the owner what each should contain (10/5 Year Completion
   Documents, Domestic Aluminium Checklist, Quality Plan, Standing Order Letter, Credit Control Letter, etc.).
3. Offered, not yet asked for: highlight Leads / Contracts / Suppliers in the side menu while one of their records is
   open.
4. The pages only in the Beta / admin account (Staff, Holiday Planner, Reports, Finance, Admin Console): the owner
   wants to work through them next; ask which first.
5. Before going live (CLAUDE.md): turn tours back on (`TOURS_AUTO = true`), set the review API secrets and run "Daily
   website figures", turn off "Show the welcome tour every time", change PINs still at 1234.
6. Older open questions in HANDOVER.md ("Open questions for the owner"): the Units On Shelf card and an "Other
   length" option in Inventory.

---

The sections below are kept from the earlier hand-over (how to work with the owner, the round routine, pitfalls).

## A. The owner and how to work with them

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

## B. The round routine (every time; see section 4 for what changed)

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

## C. Things that will trip you up

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
