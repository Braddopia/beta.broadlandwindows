# Broadland Windows CRM: brief for a new chat

Paste this whole page into the first message of a new chat. It is self-contained: it says what the CRM is, where the
code lives, how it is built and published, what the owner has chosen, and what is still to do.

---

## 1. What it is

A CRM for **Broadland Windows, Doors & Garden Rooms** (a Norfolk company making and fitting windows, doors and garden
rooms). It is a **single HTML file** web app: no server yet, data kept in the browser (IndexedDB) and synced between
tabs. It installs as a desktop app on Windows and Mac and tells staff when a new version is out.

- **Code**: GitHub repository `Braddopia/beta.broadlandwindows` (branch `main`; recent work also on
  `claude/adminbase-records`).
- **Live site**: https://braddopia.github.io/beta.broadlandwindows/ (GitHub Pages, deployed from `main`).
- **Current version**: 19.18.11 (28 November 2026).
- **Future**: a Microsoft 365 back end (a stub `src/data/sources/api-source.js` is in place).

The new chat needs the repository attached (cloned) to make changes. Its own notes are in the repo:
`CLAUDE.md` (code rules), `HANDOVER.md` (history of every version), `docs/handover/NEXT-SESSION.md` (detailed
hand-over), `docs/ARCHITECTURE.md`, `docs/UX-PRINCIPLES.md` (20 UX and animation rules every change follows).

## 2. The pages

- **Workspace**: Overview (figures, Google/Trustpilot reviews, greeting box) · Messages (WhatsApp-style chat in the
  app's colours) · Calendar (surveys, appointments, fittings, deliveries, service visits, holidays).
- **Sales**: Contact Book (cards, A–Z bar) · Leads · Contracts · Service Calls (indented under Contracts).
- **Operations**: Floor Boards (factory TV boards) · Deliveries (Calendar, List, Board; Hallmark feed on List).
- **Stock**: Inventory (items, stock-take areas, simple / Detailed / "Find It" reports) · Suppliers.
- **Processing**: Panel Optimiser · Cutting Optimiser (aluminium bars) · Job Stock Tags.
- **Admin account only**: Staff · Holiday Planner · Reports · Finance · Admin Console. Everyone: Files (brochures from
  the company website), Settings.

**Record windows** (Lead, Contract, Supplier) were rebuilt to work like the owner's old system, **AdminBase**, but in
the CRM's own look. They open in the page area with the side menu still showing. Each has:
- a toolbar: Save & Close, Save, Address, Reports, Clipboard, Advanced, « ‹ › » record navigation, Search, Full Page
  and Close;
- a title line with the stage path, then the tabs;
- a Details tab: label and value rows in collapsible groups on the left, and a Products grid with Info For FENSA on
  the right.

Contract Reports is a two-pane window: the report list on the left and a live preview on the right.

## 3. How it is built and published (every change)

1. Edit only `src/` (JS modules, CSS, assets). `npm run build` writes `index.html`, `dist/…html` and the desktop-app
   files. Never hand-edit generated files.
2. `npm run check` (lint, unit tests, build, ~225 Playwright behaviour tests): all must pass. `npm run test:visual`
   (screenshot comparisons; on a fresh machine run `npm run test:visual:update` first to make baselines).
3. Bump the version in `package.json` (19.18.x). Then write the What's New notes in `src/whats-new.json` as
   `{ "date": "YYYY-MM-DD", "notes": [{ "t": "Heading", "d": "Plain sentence or two" }] }`. Then add a section to
   `HANDOVER.md`.
4. Commit, merge `origin/main` (a daily bot commits `brochures.json` there), push the working branch **and** `main`.
5. Check both GitHub workflows passed ("Tests" and "pages build and deployment").
6. Send the owner screenshots and a short plain-English summary.

**Code rules**:
- **Layers**: code is layered core/config → data → domain → ui → features, and lint enforces it.
- **Escaping**: every value put into HTML is escaped (`esc()` or the `html`` ` tag).
- **No inline handlers**: no inline `onclick` (the security policy blocks it); buttons use `onClick()` / `data-act`.
- **Form boxes**: form boxes come only from `fieldControl()`.
- **Saving records**: records are saved through `data/repository.js`, then `store()`, then `audit()`.
- **Permissions**: checked with `can()` inside every action.
- **No personal data**: sample names only.

## 4. Working with the owner

- Not a coder: plain English, screenshots, no code in summaries. British English, Title Case on buttons.
- Wants a front-end developer's and UI designer's eye; notices spacing, alignment and anything that looks cheap.
- Standing instruction: **always publish** finished changes.
- Don't move columns or buttons unless asked; when unclear, ask one short question with options.
- **Never copy real names or emails** from the owner's AdminBase screenshots. Never ask for API keys in chat; they go
  in GitHub Secrets.

## 5. Things the owner has chosen (keep them)

- **What's New window**: works like Discord's What's New, with no ticks. It shows the version and date, coloured
  section headings and Restart Now / Remind Me In 10 Minutes.
- **Settings, Version row**: says when a new version is ready, with an Update Now button, or "the latest" with a
  Check Again button. Settings buttons are as wide as their words.
- **Deliveries calendar**: the whole month fits on one screen, runs to the bottom and never scrolls.
- **Contact Book**: the sticky bars fill in as the page scrolls.
- **Floor Boards**: rows shade on hover, with no underline.
- **Stock-Take Areas**: written TEXT-NUMBER (BTSS-01..40, Sobinco, BTDR-01..40, BTWIN-01..40, Red/Grey/Blue/Green
  Container), in a searchable drop-down.
- **Materials**: Aluminium and Timber only. Only aluminium counted in Meters (M) links to the Cutting Optimiser, and
  its bar length comes from the Length box.
- **Colour boxes**: (A) and (B) boxes show a faint hint, "A – Typically Outside" and "B – Typically Inside".
- **Long drop-downs**: have a search box.
- **Speed**: no blur effects on in-page surfaces, and nothing animating on a still page (both were the cause of lag).
- **Messages**: WhatsApp layout in the app's colours.
- **Side menu (Sales)**: Contact Book, Leads, Contracts, then Service Calls.
- **Inventory**: keep the columns as they are.

## 6. Still to do

1. **Match the Contract (and Lead) windows to AdminBase.** The owner will paste AdminBase screenshots of a contract,
   with names blurred: Details, Address, Advanced and Documents. Tighten the spacing and layout to match, keeping the
   CRM's look. The owner found the windows crowded before v19.18.8.
2. **Fill in the "Coming soon" reports** in Contract Reports. Ask what each should contain: 10 and 5 Year
   Completion Documents, Domestic Aluminium Checklist, Quality Plan, Standing Order Letter, Credit Control Letter.
3. **Side menu highlight** (offered, not yet requested): highlight Leads, Contracts or Suppliers while one of their
   records is open.
4. **Admin-only pages**: work through Staff, Holiday Planner, Reports, Finance and Admin Console. Ask the owner
   which to start with.
5. **Before going live**:
   - Turn the tours back on (`TOURS_AUTO = true` in `src/features/tour/tour.js`).
   - Set the review API secrets (`GOOGLE_PLACES_KEY`, `GOOGLE_PLACE_ID`, `TRUSTPILOT_API_KEY`), then run the "Daily
     website figures" workflow.
   - Turn off "Show the welcome tour every time".
   - Change any PINs still set to 1234.
6. **Older questions**: the Units On Shelf card, and an "Other length" option in Inventory.
7. **Check one test run**: the GitHub test run for v19.18.11 was still running at hand-over. Confirm it passed.
