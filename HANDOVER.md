# Handover

Read this first, then CLAUDE.md and docs/ARCHITECTURE.md. **Starting a new session? Read docs/handover/NEXT-SESSION.md first**: it has the current state, the tasks in order and the traps.

## Working with the owner

- Not a coder: ask questions when unsure, and show screenshots or the built page rather than code.
- Every round: build, `npm run check` and `npm run test:visual` (make baselines first with
  `npm run test:visual:update` on a fresh container, before changing anything), commit, push, wait for both GitHub
  workflows (Tests, and the GitHub Pages deploy) to pass, then send the dist HTML file and a plain-English summary.
- Always publish: the owner's standing instruction is that every finished round goes live. Push the round to
  `main` (GitHub Pages deploys from `main` only), then wait for the Pages deploy to pass.
- Tours stay switched off until go-live (`TOURS_AUTO = false` in `src/features/tour/tour.js`).

## Where things are (v19.3)

- Save confirmations: one bottom banner for everything (`ui/toast.js`), with Undo where it makes sense
  (holiday booked or cancelled, service call completed or marked awaiting parts).
- Drop-downs: the app's own list for every `<select>` with a mouse (`ui/components/pickers.js`).
- Overview: card headings open their page, each line opens its record; on phones the greeting shows stars only.
- My Details: First Name and Last Name (`state.profile.first`, `.last`; `.name` is both together).
- Book Holiday: site form style; Undo after booking; Cancel request / Cancel holiday (anyone, for their own
  holiday that has not started; administrators any time).
- Service map: 45 miles round NR6 5DR highlighted (`domain/places.js`: `BASE`, `FIT_MILES`, `LAND`).
- Inventory: ID, Item, Colours, Stock, Unit (PCS or the length), Location, Cost, Total Value, Supplier.
  Bar length lives in the product window (6.5M / 7M / 5M / other). Count sheets print in the company style.
- Panel Optimiser: sizes always width × height (drawn width across, height up); boards have Thickness, Colour Inside (B)
  and Colour Outside (A). Cutting Optimiser profiles have Colour Inside (B) and Colour Outside (A) too.
- Job Stock Tags (Stock menu): fill in several tags, Print All gives one A4 landscape page per tag and copy;
  a contract number fills the job name; printed ones are kept to print again.
- Settings: company card shows only filled-in details, with Opening hours (default from a public business listing:
  Mon to Fri 9am to 5pm, Sat 10am to 2pm, Sun closed; the owner should confirm).
- Colour contrast: checked with axe-core and a pixel check (text against the real background, glass included),
  every page and the main windows, light and dark. Script idea: hide all text, screenshot, compare each text box's
  colour with the pixels behind it.

## Added in v19.4

- Digital Fitting Schedule on Floor Boards (linked to contracts; `schedule` permission for Admin and Beta).
- Calendar: week numbers, surveys, appointments, deliveries to site, follow-ups, one person's diary.
- Service calls: next-step button and More menu, short forms for Book Visit, Parts and Complete; map with more
  roads and towns past the 45-mile area.
- Holidays: weekdays only, System message in Messages when approved or turned down, Next ignores pending.
- Inventory: Stock and Location after Item, Status in its own centred column; Stock Take page redone.
- Overview: the greeting no longer replays its animation on every save.

## Added in v19.5 and v19.6

- Panel Optimiser: 5mm blade; boards read width × height (1,200 × 2,400) while pieces keep their Width / Height
  boxes as before; plans tried several ways (fewest boards); printed plan three boards a page with an underlined
  title bar per board.
- Holidays: cancelling an approved holiday is a request (it stays booked until an administrator approves); System
  messages the person on approve, keep, or when an administrator cancels outright. Withdrawing a pending request is
  instant.
- Messages: time sent sits under each bubble. Calendar: narrower week column; layer buttons show a tick (on) or an
  empty circle (off). Fitting Schedule screen: a portrait sheet styled like the Calendar (printout unchanged).
- Files: list headings line up with the rows; Category centred.
- Printouts: Fitting Schedule and Job Stock Tags Print / Close buttons now work (`wirePrintBar`); every printout
  that shows the bar must call it (tests/e2e/print-bar.spec.js).
- The owner's 20 UX and animation principles: `docs/UX-PRINCIPLES.md`, applied in `src/css/08-motion.css`.

## Added in v19.7

- Calendar: hidden layers sit at the start of their own bar, the ones showing on the right, in menu order;
  a clicked button glides to its new place.
- Fitting Schedule: Monday to Sunday; always 7 installer columns plus Other Installers (spare ones blank, "+
  Installer" names one); the printout follows.
- Service map: a real OpenStreetMap map (see docs/ARCHITECTURE.md), postcode pins, details on each pin with Open
  Call and Directions, nearest-first list, calls outside the 45-mile area flagged. Service calls have a Postcode
  box. Next: the route planner (several nearby calls in order from a starting point), waiting for the owner.

## Added in v19.7.1, v19.8 and v19.8.1

- Service map: map pictures send the site's address only (`referrerPolicy: 'strict-origin'`); OpenStreetMap refuses
  them without it. A file opened from the computer has no address, so OpenStreetMap still refuses there: the owner
  wants a very detailed drawn map for that case, built from OpenStreetMap data (download.geofabrik.de or
  overpass-api.de are allowed in the environment but were not reachable yet).
- Service map redesign (`src/css/05d-service-map.css`): softened map pictures, floating glass summary / buttons /
  key, pins that drop in, a coloured header on each call's details, list cards that lift their pin. Opens on the
  yard and the calls inside the 45-mile area (never wider than about the county); All Calls shows everything.
- v19.8.1: map narrower (60% map, 40% list); the yard is a window icon (our trade); the key is a small "Key" button
  bottom left that opens a card with each colour and how many calls it has (closed to start, `uiState.svc.key`).

## Added in v19.9 (the top half: Overview, Messages, Calendar, Contact Book, Leads, Contracts)

- Overview: the greeting no longer flickers on coming back (its slide-in only runs while the page enters:
  `.main.enter .hero`). Every tile, panel heading and line leads somewhere; going to another page asks first
  (`goAsk(view)` in `ui/shell/router.js`, used by the Overview and calendar pop-ups). The holiday ring opens the
  holidays pop-up.
- Report A Problem keeps its full size and words while a pop-up is open (it only lifts on narrow screens).
- Buttons: every control answers the pointer (an audit hovered every button on every page; fixes and a low-weight
  safety net are in `src/css/08-motion.css`).
- Messages: people in the open chat on the right (the whole team for Everyone, with "On holiday today"; click to
  message someone), a narrower conversation, a send button that lights up while typing, flies off on sending, and
  "Sent" with a tick under the new bubble (`src/css/05e-messages.css`).
- Drop-down lists and the date calendar grow out of the exact spot that was clicked (`ui/components/pickers.js`).
- Calendar: the Showing bar is shorter and its buttons glide smoothly; a delivery opens a pop-up (Continue To
  Deliveries) instead of leaving the calendar; My Jobs lines open the job; "My Notes" at the bottom is a private
  note pad per person (`state.calNotes[USER]`), saved as you type, cleared with Undo.
- Contact Book: the boxes change with the type (a customer has no company or job title; a supplier picks what it
  supplies and can keep our account number; sub-contractors and trades pick their trade) and customers and
  suppliers must have email and address. Postcodes are checked and tidied.
- Customers: every lead and contract's customer is saved into the Contact Book as a Customer contact
  (`features/contacts/customer-book.js`, matching by name with postcode or phone, `domain/customers.js`, unit
  tested). New Lead, New Contract and the lead/contract windows have a "Customer" drop-down that fills every box
  from someone already there. Leads and contracts now need address line 1, town and a real postcode.
- Success: making anything new (lead, contract, contact, service call, delivery, holiday, staff, bill, supplier) shows
  a tick that draws itself in a ring with what was made (`ui/success.js`, `celebrate(title, sub)`); clicks pass
  through it and it goes on its own.

## Added in v19.10

- "Go to a page?" (`goAsk`) counts down from 5 on its Go button and goes by itself; pointing at the box pauses it,
  Stay Here or Esc stops it (`askIn(..., { count, no, icon })` in `ui/modal.js`).
- One success banner: `celebrate(title, sub, action)` is now the bottom banner with a drawn tick, a second line and
  Undo (no more centre pop-up plus banner). A plain "Saved" straight after it is not shown over it (`ui/toast.js`).
- Messages: the People list uses the same rows as the chat list; a one-to-one chat shows the person's card with Call
  and Email. Deleting a message has Undo; pressing Send with nothing typed shakes the box.
- Calendar: no ticks on the Showing buttons (a solid dot when shown, an empty ring when hidden); My Notes is a tall
  note pad.
- Holidays: half days (morning H1, afternoon H2, `h.half` 'am' / 'pm', 0.5 days; both halves of one day show H); a
  booking cannot cover days already booked or waiting (`holClash`), and a standard user cannot request days in the
  past. The form shows the days and the allowance before and after, with anything stopping it in red. Unpaid leave
  waiting for approval no longer shows on the ring as using the allowance. Asking to cancel an approved paid holiday
  is tested end to end.
- Contact Book: customers already in leads and contracts were added once at start-up (`custBook` migration); Import
  Customers runs the same matching again. Cards show what a supplier supplies or a tradesperson's trade.
- Overview: Reset layout says so ("Default layout restored").

## Added in v19.10.1 and v19.10.2

- The go-to-page Go button only fills (no number). The System chat says there is no one to reply to. The My Notes
  "Saved" tick no longer flips (its pop-in keeps the rotation: `tickIn`).
- Drop-down lists and the date calendar open at the pointer: the list's corner sits by the click and turns the other
  way near the edge of the screen; opened from the keyboard, or a list that follows typing, it sits under its box
  (`place()` in `ui/components/pickers.js`). "+ New Chat" is no longer a choice inside its own list.
- The success banner is solid green with a white circle and a tick that draws itself (option B the owner chose).
- A redesign was mocked up twice (four layouts, then three skins on the real pages); the owner keeps the current
  look.

## Added in v19.11 (from the office's Excel stock sheet, "Broadland Stock Control")

- Inventory, Stock Lists (administrators, `features/stock/stock-lists.js`, rules in `domain/stock-lists.js`):
  locations, product groups and colour codes, kept in `state.stockLists` (set once at start-up by
  `stockListsInit`, keeping any location already in use).
  - Locations: Door Locks, Solar, Window Handles, Tilt & Turn, T/V. The sheet's two locations named after people are
    left for the office to add (no real names in the repo). The product's Location is now a drop-down from this list.
  - Product groups: the sheet's seven. Each product has a Product group; Inventory filters by it, a batch "Set Group",
    and the stock valuation report has "Value By Product Group".
  - Colour codes: the sheet's 47 codes, each with a RAL number and finish (RAL codes link to themselves, KL016 is RAL
    7032 Matt, the rest are for the office to link). A colour box turns a typed code into "KL016 (RAL 7032 Matt)";
    the colour picker shows the linked codes first and finds a code by its RAL number.
- Units: Bulk and Kit added.
- Not taken from the sheet (the owner said the CRM's scanning is fine): the sheet's Barcode Count tab, where each
  scan adds 1 and the totals refresh every 7 seconds.

## Fixed in v19.11.1 (Inventory tested hard: every button clicked as administrator and standard user)

- Deleting a history entry changed stock and could make a product vanish (a product is its newest row). The row
  before now takes over the product's details, or a lone row stays as a hidden starting record (`moveDel`).
- New movements no longer inherit "undone" and approval details from the row before (`moveRow`).
- Batch Add: an existing product kept only some details (description, group, area, QC were lost); now it builds on
  the product. A row pasted from Excel splits on tabs only, so "Bay 2, Shelf A" stays one location. Locations match
  the Stock Lists in any case and a new one is added to the list.
- Batch Remove never takes away more than is in stock, and says how many products were short.
- Stock take: typing a count threw an error (the page redraw swapped the box being left). `morph` now updates form
  boxes in place and `render` never runs inside itself. Starting a stock take shows the green success banner.
- Importing a stock sheet without colour columns doubled up products that share a code. A line now matches the one
  product with its code; lines that could be several products are listed and left out unless ticked.
- Reject a request and Clear an alert now say so, with Undo; deleting an entry has Undo.
- The first Inventory tiles do something (Products shows all, Units On Shelf and Stock Value sort, biggest first).
- Table: QC Check sits under the stock status instead of beside it; long text ends in "..." with the full text on
  hover; on narrower screens the row's Report button goes so the columns keep room. Every page has room at the
  bottom so Report A Problem never covers the last buttons (it covered Finish And Apply Counts).

## Open questions for the owner

- Mitre re-cut waste in the Cutting Optimiser is not counted yet. Proposal: a "profile depth" (mm) on each
  profile (filled from the product); where two mitred ends meet and the pieces cannot be flipped to share one cut,
  add depth × tan(angle) (a 70mm deep profile at 45° loses about 70mm) plus one more saw blade. Waiting for a yes.
- "Anyone can delete reports" was read as: every account can delete service calls. Confirm.
- Per-person permissions (who can change the fitting schedule) wait for Microsoft 365 sign-in; today it is by
  account type.

## Fixed in v19.11.2

- Inventory list: a stray "." showed beside each tick-box (the "cut long text with ..." rule caught the tick-box cell). The first cell is now never cut.
- Inventory columns re-spaced: each column is sized for what it holds (percentages above 1100px, a separate set for 900-1100px where Location, Colours and Value hide), stock counts are centred, ID never cuts off. Rules at the end of `src/css/05c-refinements.css`.

## v19.11.3

- Inventory columns regrouped: tick, ID, Item, Stock (centred), Location, Unit, Colours together on the left; Supplier, Cost, Total Value, Status on the right by the row buttons. Spare width goes to Colours (to Unit at 900-1100px). Row buttons stay where they were (right edge, measured against v19.11.1).
- Inventory sorts by ID, low to high, by default (and the Products tile resets to that).

## v19.11.4

- Inventory: every column's heading and contents are centred (not the tick box or the row buttons), and the spare room is shared across all columns so centring stays even. Row buttons unchanged.
- Pop-ups no longer pull the cursor back to their first box when the person has already clicked into another box
  (`ui/modal.js`, `ui/forms/wizard.js`, `features/records/cards.js`). It made typing land in the wrong box
  ("4" then "10" became "410" in Saw Settings; a phone number typed quickly could go into Name). This was the cause of
  the intermittent Cutting Optimiser and New Lead test failures.

## v19.11.5

- Inventory: column positions put back exactly as v19.11.3 (checked edge-for-edge at 1000/1280/1366/1600/1920, admin and standard user); only the text inside each column is centred. The user does not want column positions or the row buttons moved unless they ask.

## v19.11.6

- Inventory: Item, Location and Supplier read from the left (heading and contents, classes `i-item`, `i-loc`,
  `i-sup`); every other column stays centred. Column positions and row buttons are unchanged: their edges are
  checked against v19.11.5 at 1280 and 1920, administrator and standard user (`tests/e2e/inventory-columns.spec.js`),
  and were compared edge-for-edge at 1000/1280/1366/1600/1920 this round.
- Service calls More button: it carried the `fbtn` class (the square filter-icon button, fixed 1.75rem wide), so
  "More ▾" spilled out of a tiny box beside the next-step button. It is now an ordinary small button the same height
  as the one beside it. The outside-click closer treats any `[aria-haspopup]` button as the pop-over's owner (so
  More still toggles its menu), and the pop-over closes when its button scrolls away or the window resizes
  (`ui/components/popover.js`), so on a phone the menu never floats over other rows.
- Service calls columns, set out like Inventory (rules at the end of `src/css/05c-refinements.css`): Ref, Customer,
  Problem and Engineer from the left; Priority, Status, Visit and Open For centred in columns sized for them;
  Customer and Problem share the spare room and end in "..." with the full text on hover; Ref is never cut; the
  button column is sized for its two buttons. The page layout is the same.
- Tests: `tests/e2e/service-more.spec.js` (button and menu at 390 to 1920, every menu item clicked, column
  alignment); visual baselines `popup-service-more` and `phone-service-more`.

## v19.12 (site-wide tidy-up)

The owner asked for everything that looked mismatched to be cleaned up. Every page was measured (gaps between blocks,
title position, number-card rows, table alignment) at 1000 and 1440 wide. The shared rules are in
`src/css/09-consistency.css` (loaded last); `tests/e2e/consistency.spec.js` checks them on every page.

- One gap between the blocks of every page (it was 10 to 16px depending on the page). Inline `margin-top` styles on
  Files panels and the Inventory suppliers box were removed so the shared rule applies.
- Page titles sit at the same height on every page (Staff, Admin, Calendar and Holidays were 4 to 6px lower).
- Number cards share their rows evenly: 8 cards go 4 + 4 (Reports was 7 + 1), and 5 or 6 cards go to 3 per row when
  they do not fit on one row (Leads, Service Calls and Deliveries had 5 + 1). On phones an odd last card (and the
  last Leads/Contracts stage card) stretches across. Floor Boards: 3 + 2 below 1100px.
- Header buttons follow one rule: the page's main action is a full button, other tools are small buttons (Reports
  Print/Export, Admin Account PINs, Contact Book Import Customers and Files Copy All Links were big outline buttons;
  Suppliers' Add Supplier was smaller than every other main button).
- Tables: links are blue text without an underline (Staff underlined them); Staff Jobs and Open Calls counts are
  centred; Contracts' ID column is a little wider so "Contract No ▲" is not squashed; left-reading text in Inventory
  and Service Calls starts .7rem in, like every other table.
- Suppliers: the five small boxes stay on one row (Requests used to drop to a second line).
- Settings: website and email addresses take the whole line instead of breaking mid-word.
- Tables 900 to 1100px wide: the button column no longer has its own white block in the heading row (it was pinned
  with a solid background for sideways scrolling, which tables that fit the page never do).
- Pop-over menus (Service Calls More, Inventory filter) close only when their button has really moved (more than
  12px) or the window width changes: a tap that nudges the table, or a phone address bar, no longer shuts them at once.
- Deliveries, Received: the form's Status and Received date are filled the moment it opens (they were filled 40ms
  later, so a slow computer briefly showed "Not yet"; this was an occasional test failure on GitHub).

Left as they are, for the owner to decide: filter buttons sit in a "SHOW" bar on Leads, Contracts, Service Calls and
Contact Book but loose on Deliveries, Staff, Finance, Reports, Files and Inventory; Contracts shows customer names in
capitals under "Cust Name" (Leads says "Customer"); the Holiday Planner's "Week 1" / "Week 6" labels wrap when the
week has only a day or two in the month.

## v19.13 (Inventory page reworked, for use from February)

The owner disliked the Inventory layout (filter button not lined up with anything, "3M" in a Unit column far from the
stock number). Decided with the owner:

- Stock shows its unit beside the number: full bars as "2 × 6.5M" (count of bars × bar length), otherwise "62 PCS",
  "4 Pairs", "12 M" (metres), "3 Kits". Rules in `domain/stock.js` (`barMm`, `stockParts`, `stockText`, unit-tested in
  `tests/unit/stock-units.test.mjs`). A product counts as bars when it has a bar length in its Cutting settings
  (`state.cutProf[pid].bar`) or its Length reads as one (6.5M). Movements show quantities the same way.
- Bar lengths offered for a product: 6M, 6.5M (picked to start with) or 7M; "Other length" stays for anything unusual
  already in stock. The Cutting Optimiser's list matches. Sample data bars are 6.5M.
- Layout: title and the three main buttons (Add Stock, Remove Stock, Request); a bar under it on every Inventory tab
  with Products / Movements / Stock Take on the left and that tab's small tools on the right (`invNav`); the number
  cards; one toolbar row with the search box, "Sort & Filter" (was a small icon in the table's top corner) and the
  quick filters, all the same height; the table.
- Columns: tick, ID, Item (description and size underneath), Stock (with unit; numbers line up down the column),
  Location (area underneath), Colours, Cost, Value (administrators), Status, View / Edit / Report. The Unit and Supplier
  columns are gone (the supplier shows in the product window; the owner asked for that). Text columns read from the
  left, short values are centred, Item gets the most room. 900 to 1100px: Colours and Value step aside and Report moves
  into the product window, as before.
- All Inventory table styles are in `src/css/05f-inventory.css`; the ~50 older layered rules in `05c-refinements.css`
  were removed. Tests: `tests/e2e/inventory-layout.spec.js` (alignment, numbers lining up, toolbar level, buttons fit)
  replaces the old column-position test.
- Pop-over menus drop straight down from their button when there is room (left edges lined up), otherwise they line up
  with the button's right edge (Service Calls More, at the right of the screen).

## v19.13.1

- Inventory columns, the owner's choice: Item, Stock, Location and Colours sit together on the left, read from the
  left and are evenly spaced (Item, Stock and Location the same width); Cost, Value and Status sit right beside the
  View / Edit / Report buttons; the spare room falls between the two groups. Stock numbers still line up down the
  column. `tests/e2e/inventory-layout.spec.js` checks the even spacing and that the right-hand group touches the buttons.
- v19.13.2: stock values start flush with the Stock heading (number then unit), like Item and Location; the numbers
  were right-aligned in a small box, which made "9" and "118" start at different places.

## v19.14

- Review counts update themselves (Google and Trustpilot). `.github/workflows/reviews.yml` runs each morning (05:23 UTC)
  and on demand (Actions, Review figures, Run workflow): `scripts/fetch-reviews.mjs` asks the Google Places API (New)
  and the Trustpilot Business Units API for the score and number of reviews, writes `reviews.json` beside index.html,
  commits it if it changed and asks GitHub Pages to republish. The site reads `reviews.json` on opening and every 3
  hours (`reviewFeed` in `features/home/reviews.js`, rules in `domain/review-feed.js`, unit-tested); the Overview
  banner, the Office floor board and printed documents use the new figures, links typed in Admin Console are kept, and
  the change is in the audit log. Trusted Trader and ReferenceLine have no feed: still typed in Admin Console.
  **Setup still needed (owner):** add three repository secrets (Settings, Secrets and variables, Actions):
  `GOOGLE_PLACES_KEY` (Google Cloud API key with "Places API (New)" switched on), `GOOGLE_PLACE_ID` (the business's
  Place ID) and `TRUSTPILOT_API_KEY` (Trustpilot Business, Integrations, API). Optional variable `TRUSTPILOT_DOMAIN`
  if Trustpilot lists the business under a different web address than broadlandwindows.co.uk. Without keys the job
  does nothing and the typed figures stay.
- Overview: the holiday ring no longer fills blue on hover; Calendar days get a thin outline instead of a blue fill.
- Messages: People is as wide as Chats; Report A Problem sits at the bottom right of the People list (the corner
  button comes back when People is hidden on narrow screens).
- Floor Boards, Fitting Schedule and Inventory, Stock Take use the full page width.
- Inventory: stock is centred under its heading again; each value sits in a same-width box so the numbers still start
  at the same place down the column.
- Side menu: the short-screen rules that shrank it and hid the group names are gone; it keeps its normal size and
  scrolls, with a thin scrollbar.
- Tests: `tests/e2e/round-1914.spec.js`, `tests/unit/review-feed.test.mjs`.

## v19.14.1

- Messages: Report A Problem is centred at the foot of the People list, and its dividing line is level with the line
  above the message box (both footers share one height, `--msn-foot`).
- Inventory: the Stock heading and each row's value are centred in the column (owner's choice).
- Review figures: the job was run by hand and works; its log says "no keys set" for Google and Trustpilot, so nothing
  updates until the owner adds the three Actions secrets (see v19.14).

## v19.15

- Messages, group chats (`features/messages/groups.js`, rules in `domain/groups.js`, unit-tested in
  `tests/unit/groups.test.mjs`, browser tests in `tests/e2e/groups.spec.js`). "+ New chat", "+ New group": anyone can
  start one and owns it (name, description, Invite only or Open). The owner and group admins add people, remove them,
  mute them (read only until unmuted) and time them out (15 minutes, 1 hour, 1 day, 1 week; ends by itself); the owner
  makes and unmakes group admins and deletes the group (with its messages). Admins cannot act on the owner or other
  admins. Anyone can leave; an owner leaving hands the group to an admin, else the next person. Open groups are listed
  under "Groups You Can Join". Every change is a small line in the chat (notes with `ev: 1`, never unread) and in the
  audit log. Groups are `state.groups` (repository `groups`); their messages are notes with `to: 'g:' + id`. Each
  action checks the group rules itself, not only the buttons. Note: until Microsoft 365 sign-in, "who you are" is the
  name in My Details, so these controls are only as strong as that.
- Send button: on hover the paper plane flies out at the top right and pops back in from the bottom left (no more
  tilt while typing); off with Fewer Animations.
- Overview: pointing at the holiday ring lifts the whole My Holiday card (no blue fill).
- Inventory: the Stock column is narrower (7.4rem) so its centred values sit close to Item.
- Admin Console, Reviews: says whether Google and Trustpilot update by themselves ("not set up yet" while the GitHub
  keys are missing; "opened from a file" for a downloaded copy).

## v19.15.1

- Inventory columns: every column is as wide as what it holds with the same gap between each; all the spare room is
  one empty column (`th.i-gap`) between the left group (ID, Item, Stock, Location, Colours) and the right group (Cost,
  Value, Status, buttons). Long item, location and colour text stops at 16rem with "..." (11rem at 900-1100px). The
  table uses automatic layout on a computer (`05f-inventory.css`); `inventory-layout.spec.js` checks the gaps are equal.
- Desktop app (installable web app, `features/app/desktop-app.js`, files in `src/app/`): Edge or Chrome install it
  (Settings, Desktop App, Install, or the browser's install icon). It opens in its own window, always loads the live
  website (so it updates with every publish) and shares the website's saved data on that computer. The build copies
  `manifest.webmanifest`, `sw.js` (network first, keeps a copy for when the internet drops), the `app-*.png` icons
  (the crane emblem on navy) beside index.html and writes `version.json`; an open app or tab checks it every 15
  minutes and on coming back into view, and offers Reload when a newer version is live. Not for a downloaded file.
  Test: `tests/e2e/desktop-app.spec.js` (serves the site from https://crm.test/).
- Removed an `undefined/` folder of test screenshots that had been committed by mistake.
- v19.15.2: the desktop app icon is the same emblem as the browser tab (the sun with the crane), on a see-through
  background with nothing added (the navy tile and the "maskable" icon were removed, at the owner's request).
- v19.15.3: the icon files were renamed (`app-sun-*.png`) so installed apps notice the new icon: browsers keep an
  installed app's icon until the file name in the manifest changes. Windows may still need the app opened once (Edge
  and Chrome then ask to update the icon) or unpinning and pinning it again on the taskbar.
- v19.15.4: My Holiday no longer lifts with a shadow on hover (it did not match the cards beside it); only the ring grows
  a little (3%).
- v19.15.5: Inventory stock always reads count × unit (the owner's choice): "62 × PCS", "4 × Pairs", "12 × M",
  "2 × 6.5M" for full bars. A unit word typed in a product's Length or Size box (EA, Each, PCS, Pair, M, Kit, Set, Box,
  Pack, Roll, Bulk) is treated as its unit ("9 × EA") instead of showing under the item name (`lengthUnit` in
  `domain/stock.js`, unit-tested). Movements use the same wording.

## v19.16

- Sample data saved by older versions is brought up to date once (`sampleRefresh` in `start/migrations.js`): the sample
  profile bars (VG920 KL010, KL005, VG920) go from 3M to 6.5M and a Cutting length of 3000 to 6500; the Trustpilot
  count shown by default goes from 21 to 26 (the owner's figure). Only exact sample values change; a figure typed later
  is never touched. New installs start with 26.
- Messages: each person's picture has their own colour (ten colours, chosen from the name: `avColour`); group pictures
  are rounded squares. The group buttons are a 2 × 2 grid of equal buttons (Add People, Edit Group, Leave, Delete).
- Chat commands (rules `domain/chat-commands.js`, unit-tested; carried out by `features/messages/commands.js`): typing
  "/" lists the commands this person can use in this chat. Everyone: /nickname (per group in a group, else team-wide),
  /me (action line), /shrug, /help. Anyone in a group: /leave. Group owner and admins: /add, /remove, /mute, /unmute,
  /timeout Name 15m|1h|1d|1w, /admin, /unadmin (owner only), /rename, /desc. Group commands use the same actions as
  the buttons, so the same permission checks apply; a name can be shortened when only one person matches.
- Review counts: still need the Google and Trustpilot keys in GitHub (see v19.14); without them nothing can fetch the
  live figures.

## v19.16.1

- Sample Inventory rewritten as a working example to show the CRM (`src/data/sample-stock.js`): 22 products a window
  and door company holds (KL005/KL010/KL240 profiles and a KL150 cill in 6M / 6.5M / 7M bars, gasket by the metre,
  espag handles, tilt and turn hinge sets, friction hinges in pairs, restrictors, a multipoint lock, euro cylinders,
  lever/lever handles, flag hinges, trickle vents, packers, silicone, frame screws), with descriptions, product groups,
  colours, locations, a Warehouse and a Van Stock area, reorder levels (3 low, 1 out), and a morning of movements
  with 4 requests to approve and 3 alerts. A browser still holding only the very first sample (ACET848, VG920...)
  gets the new sample once (`sampleStockRefresh`); any real stock is never touched. The Product Groups list gains
  "Profiles".
- Batch Add: a pasted line with no area now adds to the one product with the same code, size and colours in any area
  (it used to make a duplicate line once products had areas).
- Movements: the Length column shows only a real size (4MM), not the unit or bar length already in the quantity.
- Messages: the "/" list works from the keyboard (Up/Down move, Enter or Tab fill in, Esc closes; Enter on a command
  typed in full runs it). The owner and group admins set or clear other people's nicknames in the group: "Set
  nickname" in the menu beside a person, or `/setnick Name Nickname` (same permission checks; nobody else can change
  the owner's).
- Settings: Company Details (VAT number, emails, phone...) shows for every account to refer to; only administrators
  see Edit and the Money And Invoices card.

## v19.16.2

- Screen saver (`features/app/screen-saver.js`, `src/css/05g-screen-saver.css`): after a while with no mouse, keyboard
  or touch, the opening animation plays on a 10-second loop (the crane draws itself in light, fills, floats, fades,
  starts again) with a large clock and the date. Any movement or key closes it; the click or touch that wakes it does
  not press anything beneath. Settings, My Settings, Screen Saver: Off, 2, 5 (to start with) or 10 minutes, per
  computer (localStorage `bb_saver`), with Preview. Never over the Floor Boards TV display or sign-in; still (no
  movement) with Fewer Animations. Idle time is counted in seconds while the page is visible. Test:
  `tests/e2e/screen-saver.spec.js`.
- v19.16.3: the screen saver is a living scene instead of the bird fading in and out: the sky turns from day blue to a
  gold sunset to a starry night and back (60s), clouds drift, hills along the bottom, the crane glides across with
  wing beats at a different height each pass (72s for three passes), and a small flock crosses far off every 36s.
  The crane is one SVG symbol taken from the opening screen's outline. The "move the mouse" line is gone. Fewer
  Animations shows it still.
- v19.16.4: screen saver: the crane is now drawn in parts (far wing, body with beak, red crown and trailing legs, near
  wing) and beats its wings about the shoulder, the body lifting on each down-stroke; the flock uses the same crane.
  The bottom half is a Norfolk Broads scene: two tree lines of rounded copses (seeded, `treeLine`), a drainage mill
  with lattice sails turning, water with scattered drifting ripple strokes (`ripples`), a mist line, a gold glint
  under the setting sun, a sailing boat crossing every 110s, swaying reeds with seed heads, and a moon after dark.
- v19.16.5: screen saver, at the owner's request: no birds; a detailed Norfolk Broads scene. Puffy domed clouds
  (`cloud()`, shaded underneath, lit on top, coloured by the sky: white, peach at sunset, slate at night) kept above
  the clock; a round-tower church and a distant mill on the far tree line; the near mill's reflection wavering in the
  water; the sun's glint is now a column of broken gold strokes exactly under the sun (both at 74% across); evening
  mist over the water; a black-sailed wherry heading left and a white yacht heading right.

## v19.17 (round 1 of the owner's big list)

- Fewer Animations calms everyday movement only; the opening intro and the screen saver always play (`body.rm` rules
  in `05c-refinements.css` skip `#splash` and `#saver`). The computer's own reduce-motion setting still stills them.
- Screen saver: a proper round-tower church (flint tower, nave, chancel, porch; windows lit at night); the distant
  mill stands up out of the trees; each cloud starts at a random point of its journey in its own height band.
- Settings: Company Details note reworded; every button in a settings row is one size (6.8rem x 2.3rem); the Screen
  Saver row is "Starts when this computer is left idle" with its choices on their own line.
- Menu: a Processing group (Panel Optimiser, Cutting Optimiser, Job Stock Tags) under Stock (`NG` in router.js).
- Files lists (manuals, forms, other content, brand assets) use one shared grid with the heading inside the list
  (subgrid): columns as wide as their contents, equal gaps, Category and Size centred, buttons on the right.
- Inventory: Description has its own column after Colours (hidden below 1360px; still in the product window and the
  code's hover), so Item only needs to fit the code.
- Service Calls set out like Inventory: content-sized columns with equal gaps; Ref, Customer, Problem on the left;
  Priority, Status, Visit, Engineer, Open For by the buttons; spare room between (`s-gap`).
- Messages: brighter picture colours; nicknames show in the people list, chat list, chat header and group panel.
- Brochures follow the website: `scripts/fetch-brochures.mjs` (unit-tested) reads broadlandwindows.co.uk/brochures
  each morning in the daily job (`reviews.yml`, now "Daily website figures") and writes `brochures.json`; the site
  reads it (`brochureFeed`), shows new ones (marked New for 30 days) and drops removed ones, and only accepts links on
  broadlandwindows.co.uk. Until the first run, the built-in list shows.
- The Overview redraws itself every minute and on coming back to the window. Sample data stays current: untouched
  sample records (no `_meta`) roll forward to today each day (`sampleRoll`, `state.sampleDay`); real records never move.
- Review counts still need the Google and Trustpilot keys (see v19.14).

## v19.17.1 (round 2)

- Deliveries open on a month calendar (`delCal`, `uiState.del.v = 'cal'`, `del.m` month offset): Monday to Sunday,
  each delivery a chip on its due day coloured by where it stands (overdue red, due today amber, in transit blue, due
  slate, received green, with the supplier's colour dot); a chip opens the delivery, an empty part of a day starts a
  new delivery due that day (`editDel(id, sup, con, due)`); deliveries with no date listed underneath. List and Board
  are still there.
- Job Stock Tags is a studio: a tab per tag (with its job number) and "+ Add Another Tag"; one card in two halves of
  the same height, the chosen tag's boxes with the wording every tag carries underneath, and the tag as it prints on
  a patterned stage; Printed Recently is a lined-up list. Fixed "Invalid Date" in Printed Recently.
- The brochure check reads the page and, when it lists no brochure files (the first run found none: the page probably
  builds its links with scripts), falls back to WordPress's file list (`/wp-json/wp/v2/media?mime_type=application/pdf`);
  the log prints what the page holds.
- Tour steps updated for the Deliveries calendar and the tag studio.

## v19.17.2 (round 3)

- Messages look like WhatsApp: the chat sits on a soft patterned wallpaper (dark green-grey in dark mode); my
  messages are green bubbles on the right, everyone else's white on the left, each with a small tail on the first of a
  run. Messages from one person within 5 minutes and on the same day form a run: in shared chats (Everyone, groups)
  the coloured name sits on the first bubble and the picture beside the last. The time sits inside the bubble with
  ticks on my own messages (grey sent, blue once someone else has read it). Delete shows on hover. The group header
  lists who is in it (with nicknames). Unread counts are green, the composer is a white pill with a green send button.
  Markup in `messages.js` (`.bw first|cont last grp`, `.bub`, `.bub-n nX`, `.bub-m`, `.bub-k rd`), styles at the end
  of `05e-messages.css`. Test: `tests/e2e/messages-bubbles.spec.js`.
- The brochure check now reads links written as `/wp-content/...` (no domain). The first daily runs found 0 on the page
  because of that and took 27 from the website's file list instead; from now on the page's own list (with its section
  headings) is used, and the file list stays the fallback.

## v19.17.3 (round 3, the owner's follow-ups)

- Screen saver: the round-tower church and the second mill now stand on the near bank, down to the water like the big
  mill (in front of the near tree line, base at 68vh). The water's dusk and night colours are plain layers (`.sv-wd`,
  `.sv-wn`) instead of `::before`/`::after`, which started out of step with the sky and flashed pink.
- Files lists: the name takes the spare room on the left; Category, Size and the buttons sit together on the right
  (grid `minmax(8rem,1fr) max-content max-content max-content`, the old spacer `<i>` removed from `fhead`).
- Service calls: up to four engineers. `fitter` stays the lead (everything that read it still works); `fitter2` to
  `fitter4` are extra. Forms show Lead and Second engineer; Third and Fourth appear once the box before is filled
  (`ENGF`, `engReveal`, `engTidy` in service.js). `callTeam(c)` (domain/people.js) lists them and is used by My Calls,
  `callsOf`, the reports, the map pop-up and the Engineer Day Sheet (a visit is on each engineer's sheet). The
  Engineer column is centred: two names one under the other and "+1 more".
- Update Ready pop-up (`ui/shell/update-card.js`): desktop-app.js now checks version.json on every page change
  (`emit('view-changed')` in router.go), on coming back to the window, on focus, when the internet comes back and
  every 2 minutes (at most every 3 seconds, timed with `performance.now()` so a frozen test clock does not stop it).
  The card shows the version and up to three lines from `src/whats-new.json` (the build copies them into
  version.json: update that file each release), Restart Now and Later (10 minutes). It waits while a pop-up window,
  a tour or the screen saver is open.
- Mac app icon: `app-sun-180.png` (Safari's Add to Dock) has a white background now, and the manifest adds white
  `maskable` icons (`app-sun-mask-192/512.png`) that Chrome on a Mac uses for its rounded icon; Windows keeps the
  see-through "any" icons.
- Job Stock Tags: job number, job name and both colours each have a full-width line. Warning and Small Print are
  labelled without "(in red)" and kept in capitals as they are typed (old saved wording is turned to capitals). A
  contract number fills in the job name and now its colour too (`jobColour(c)`: the colour most of its openings have).
- Inventory colours: a colour box shows the saved colour when a product is opened again (`fieldControl` takes
  `{ rec }`, the whole record, so `colourField` can read `cIn` for `cInName`), and a colour typed rather than picked
  gets its colour (`nameHex`: preset names, our colour codes, RAL numbers and names) both on screen and when saved.
- Tests: `tests/e2e/round-1917-3.spec.js`; desktop-app.spec.js now checks the Update Ready card.

## v19.17.4

- Messages keep the WhatsApp layout but use the app's colours (the owner disliked the beige wallpaper): the chat area
  is `--card2` with a faint blue dot grid, others' bubbles are cards, mine are Broadland blue (#034ea2, dark #1d5fbf)
  with white text, read ticks turn yellow, unread counts and the send button are the app's blue.
- Side menu: Sales is now Leads, Contact Book, Contracts and Service Calls; Service Calls is always shown a step in
  under Contracts (`NAV_SUB` in router.js, `.nav.sub` in 09-consistency.css), since a call is nearly always for a job
  we fitted. Operations is Floor Boards and Deliveries.
- Reviews on the Overview read "4.5/5" (ReferenceLine stays "/10").
- Brochure covers: the daily job now records each brochure's cover picture in brochures.json (`img`): the picture
  shown with the link on the brochure page (inside the link or the last one before it, lazy-load `data-src`/`srcset`
  understood), or WordPress's own picture of the PDF's first page from the file list (`media_details.sizes`). The
  Files page uses it first (`coverUrl`), then the old guesses, then the drawn cover. Only pictures under
  broadlandwindows.co.uk/wp-content/uploads are accepted.

## v19.17.5

- The new-version prompt is a window in the middle of a dimmed, blurred screen (`#updWin`, ui/shell/update-card.js):
  the app's sun, "Version x", "A New Version Is Ready", What's New (from src/whats-new.json), Restart Now (focused)
  and "Remind Me In 10 Minutes" (or Esc). Put away, a small chip stays at the bottom ("Version x is ready · Restart")
  and the window comes back at the first check after 10 minutes.
- Side menu Sales: Contact Book, Leads, Contracts, Service Calls (indented).
- Reviews: Trustpilot no longer needs a key. Without `TRUSTPILOT_API_KEY` the daily job reads the public review page
  (uk.trustpilot.com/review/broadlandwindows.co.uk, `parseTrustpilot`: the page's trustScore/numberOfReviews or its
  AggregateRating). Google still needs `GOOGLE_PLACES_KEY` and `GOOGLE_PLACE_ID`. fetch-reviews.mjs now only runs when
  called directly (it can be imported by tests).
- Brochures: the website's file list gave file-name titles ("HW_Door_Merge"), duplicates (re-uploads) and a non-brochure
  ("why broadland"), and the range was guessed from the whole address (which always says "windows"). Now: titles are
  tidied (`tidyTitle`: "HW" = Hardwood), the range is guessed from the title and file name only (HW files are
  Hardwood), one of each file is kept (`oneEach`, newest first; "-1.pdf" re-uploads count once), and PDFs that are not
  brochures are left out (`NOT_BROCHURE`). The app also uses its own checked name and range for any brochure it
  already knows, and drops duplicates itself. brochures.json was cleaned to 22.

## v19.17.6

- Screen saver: the windmill sails are a straight cross through the hub (the left and right arms were drawn a few
  pixels above and below the centre line), and the second mill's lattice frames are outlines again (a stronger rule
  filled them in). The second mill stands behind the near tree line; the church is redrawn as a Norfolk round-tower
  church on the bank (flint tower with battlements and flint courses, thatched nave, lower chancel, porch, arched
  windows lit after dark, a yew beside it), a shade lighter than the trees so it reads.
- Moving the mouse no longer closes the screen saver; a click, tap, key or the wheel does. Movement still counts as
  activity, so it never starts while the mouse is being used.
- Settings, Screen Saver: one drop-down (`#saverSel`, drawn by fieldControl, `saverPick`) the size of the other
  buttons, with Preview as a link after the description, so the row is no taller than the others.
- Files: "New" needs the file to have been uploaded to the website in the last two months as well as first seen in
  the last 30 days (`isNew`, using the uploads/YYYY/MM in its address), so an old file the check only noticed today is
  not marked New. A file taken off the website still drops out at the next morning check.
- Mac app icon: the sun is back at its full size; only the see-through corners are white (app-sun-180 and the
  maskable icons).

## v19.17.7

- Mac app icon, done properly: Macs get their own app description, `manifest-mac.webmanifest` (startDesktopApp swaps
  the manifest link when `isMac()`), whose icons `app-sun-mac-192/512.png` are drawn to Apple's icon grid: a white
  rounded tile (824 of 1024, corner 185) with a soft shadow and the sun inside at 78% of the tile, so it sits in the
  Dock like Chrome, Steam and Settings. Windows keeps the plain sun (`manifest.webmanifest`). Safari's Add to Dock
  (`app-sun-180.png`) and the maskable icons are a white square with the sun at about 75%, since those are rounded by
  the system. An app already installed on a Mac keeps its old icon until it is removed and installed again.

## v19.17.8: screen saver rebuilt

- Why: the owner found it "cheap": the clouds bunched in the middle, the sun only slid down, clouds and boats vanished
  half way across. Cause: the clouds and boats had no left position, so they sat in the middle of the flex container
  and their animations started and ended relative to the middle of the screen.
- Now `src/features/app/saver-scene.js` runs the scene with one requestAnimationFrame loop (plus a 50ms back-up beat
  in case frames stop, as under Playwright's fake clock):
  - a day of 240 seconds (`CYCLE`) with keyframes (`KEYS`: dawn, morning, midday, golden hour, sunset, dusk, night,
    late night). `lookAt(p)` blends them and sets CSS variables on #saver: `--sky1..3`, `--land`, `--far`, `--w1/--w2`
    (water), `--cloud`, `--cshade`, `--stars`, `--lights` (church windows), `--fog`, `--sx/--sy/--halo` (sun glow),
    `--glintc`. Every colour in 05g-screen-saver.css comes from them (land and buildings use color-mix);
  - the sun rises left, arcs and sets right (`arc()`); the moon at night; the glint column slides under whichever is up;
  - 7 clouds at random depths (far = smaller, lower, slower, fainter), spread across the sky at the start, drifting
    right; one that leaves comes back on the left with a new shape, size and height;
  - two boats: sail fully across, rest 12 to 40 seconds out of sight, come back from either side, bob and tilt, with a
    reflection (`-webkit-box-reflect`);
  - starts at a random time of the morning (`p0`). `sceneAt(p)` jumps to a moment (used by tests).
- The computer's reduce-motion setting shows one still daytime picture. Note: Playwright runs with reducedMotion
  'reduce' (playwright.config.js), so a test of the moving scene calls `page.emulateMedia({ reducedMotion:
  'no-preference' })` (tests/e2e/screen-saver.spec.js).

## v19.17.9: review keys noted, brochure New tag fixed

- Review keys: "Before going live" in CLAUDE.md lists the GitHub secrets (`GOOGLE_PLACES_KEY`, `GOOGLE_PLACE_ID`,
  `TRUSTPILOT_API_KEY`, optional variable `TRUSTPILOT_DOMAIN`) and the check afterwards. The Admin Console Reviews card
  (`reviewFeedLine` in features/home/reviews.js) says the same in plain words; its button is "Update Scores".
- Brochure "New": the daily job (`dateBrochures` in scripts/fetch-brochures.mjs) now matches "seen before" by the file
  (`fileKey`: the file name, ignoring the month folder and a "-1" re-upload) and by the tidied title (`titleKey`), not
  only the full address, and keeps the earliest date. brochures.json has a `known` map of every file and title ever
  seen, so a brochure taken off and put back is not new. Today's list is the baseline (the one item dated today was
  set back). In the app, a brochure the built-in list (`DL`) already has is never New (`known`), and the upload-month
  rule stays as a second check. Tests: tests/unit/brochures.test.mjs, tests/e2e/round-1917.spec.js (v19.17.9).

## v19.18.0: Lead and Contract windows like AdminBase (round 1 of the rework)

The owner asked for the record windows to work like their old system, AdminBase, in the app's own look.

- Frame (`features/records/record-window.js`): a large centred window (`openModal(..., 'full ab')`, CSS in
  `src/css/05h-record-adminbase.css`, about 94vw × 92dvh) with a Full Page button (`recFull`, remembered in
  localStorage `bb_rw_full`). The step rail, progress, "still to fill in" boxes and Next/Back footer are gone.
- Toolbar: Save & Close, Save, Address, Reports, Clipboard ▾, Advanced ▾, « ‹ n of N › » (`recNav`), Search
  (`recSearch`, number / name / town / postcode within the list it was opened from), Full Page, Close. Ctrl+S saves,
  Page Up / Page Down move between records (`recKeys`). On narrow screens Address, Reports, Clipboard and Advanced fold
  into More (`recMore`). Toolbar actions live in `features/records/record-tools.js`; each record kind gives
  `reports(W)`, `advanced(W)` (menu rows) and `run` (what they do) in contract-record.js / lead-record.js.
- Title line: "Contract · 5 of 5", the job title, town, phone, email and a red "1 Contract For This Customer" link
  (`custRecs`: same Contact Book entry, or same name and postcode) that lists them.
- Tabs (contract): Details, Survey, Checklist, Finance, Deliveries, Fitting, Notes etc, Documents (count first, like
  "3 Documents"), Service Calls ("2 Service Calls"). Lead: Details, Appointments, Survey, Checklist, Notes etc,
  Documents. The old Customer and GDPR steps are the Address window (`customer` step, `recTab('customer')`), which
  opens over the tabs; Done goes back (`recAddrDone`). Survey is kept (the CRM has it; AdminBase did not show it).
- Details: two halves (`detailsTab` in `features/records/record-parts.js`). Left: label / value rows with groups that
  fold (`features/records/ab-list.js`: `abList`, `abGroup`; open or closed is remembered per person in localStorage
  `bb_abg_<user>`; a folded group shows its `sum` fields). Right (contracts): Products / Other Info. Products is the
  grid (`linesGrid` in products.js) with first / previous / next / last line, + and − (with Undo), Default
  (`DEFAULT_LINES`) and Create From Deliveries, then Info For FENSA (`FENSAF`) with More » to the FENSA boxes on Fitting.
- New contract boxes (fields.js `CDETF`): Week Received (worked out from the contract date), Supply Only / On Hold /
  Cancelled as tick boxes on their group headings (with notes, dates and reasons), Sales Director, Sales Manager, Sub
  Sub Source, Created On, Contract Colour (`ccol`, `CCOLS`: shown as a bar on the contracts list and the calendar,
  `ccolStyle`), FENSA certificate number and date. Tick boxes are a new field type (`t: 'tick'`, saved as Yes / No).
- Tests: tests/e2e/adminbase-records.spec.js. Visual baselines for the three record windows were updated.
- Still to come (next rounds): the two-pane Contract Reports window, Commissions and Job Costings tabs, the Contract
  Schedule on Fitting, Deliveries and Finance tables with their own toolbars, more Advanced actions, then Suppliers.
  Ask the owner for the Address, Advanced and Documents screenshots they offered.

## v19.18.1: Contract Reports window, Commissions, Job Costings (round 2 of the rework)

- Contract Reports (`features/contracts/contract-reports.js`, Reports on the contract toolbar, `crOpen`): opens over
  the contract like the old system: a blue toolbar (Back, Email, Print, Sign, Preview, Customise, Edit List), the
  "Report Name" list on the left and a live preview on the right (an iframe filled by `captureDoc()` in
  print/print.js, which makes `printDoc` hand back the page instead of opening a window; `capturing()` stops a preview
  counting as printed). `CONTRACT_REPORTS` lists AdminBase's 14 reports in its order plus the CRM's own (Contract
  Sheet, Fitting Job Sheet, Customer Details). New printouts in the CRM's style: Invoice Reminder, Contract Statement,
  Receipt, Order Checklist. The guarantee (10 and 5 year) opens its own form. Not built yet ("Coming soon"):
  Completion Documents Conservatory, Domestic Aluminium Checklist, Quality Plan, Order Acknowledgement Letter,
  Standing Order Letter, Credit Control Letter 14 Days, and Sign (on-screen signing). Print prints the preview;
  Preview opens it full size; Email starts an email to the customer (attach the PDF); Customise opens the Document
  Builder for that report; Edit List (administrators) hides reports for everyone (`state.rptHide`). Esc goes back.
- Commissions and Job Costings tabs (`features/contracts/contract-tabs.js`, only for `can('money')`): commission
  lines (who, role, rate % of the value before VAT or a fixed amount, paid on, note; Default adds the salesperson,
  manager and director from Details) saved as `c.comm`; Job Costings has a cost per product line (`lines[i].cost`)
  and other costs (`c.costs`), with sales, costs, profit and margin; its total is saved as the Job Cost (`c.cost`).
- Fitting shows the Contract Schedule (the days booked for this job on the Fitting Schedule); Deliveries is a table
  with + New Delivery (rows open the delivery).
- Advanced (contract): New Service Call, New Delivery, Change Customer (opens the Address window at Customer),
  Duplicate This Contract (`ctrDuplicate`: same customer, products and details; no payments, ticks, photos, dates or
  invoices), Delete. Esc closes the Reports or Address window before the record.
- Tests: tests/e2e/adminbase-records.spec.js (round 2 section).

## v19.18.2: Supplier window in the same family (round 3 of the rework)

- `features/suppliers/supplier-window.js` (`supWin`; `supOpen` now calls it): the same frame as the lead and contract
  windows (`'full ab'`, Full Page shared with them). Toolbar: Edit Supplier (the existing supplier form), New
  Delivery, Request Low Items (n), Website, Sync Feed (live feeds), Clipboard (name, phone, email, orders email,
  account number, address), « ‹ n of N › » through the suppliers A to Z (`supNav`, Page Up / Page Down), Search
  (`supFind`), Full Page, Close. Title line: what they supply, phone, email, and a red "n Late Deliveries" link.
  Tabs: Details (two halves of read-only rows with folding groups: contacts on the left with Stock And Deliveries
  under them; Account, Company And Quality, Address And Web on the right), Stock Lines, Deliveries Due (with imported
  orders), Requests, Notes. Read-only rows can be links (`t: 'calc'` with `href` in ab-list.js).
- Tests: tests/e2e/adminbase-records.spec.js (supplier window).

### Open with the owner after this session
- Ask for the Address, Advanced and Documents screenshots from AdminBase they offered; the Address window, Advanced
  menu and Documents tab here are sensible versions until then.
- Reports still "Coming soon": Completion Documents Conservatory, Domestic Aluminium Checklist, Quality Plan, Order
  Acknowledgement Letter, Standing Order Letter, Credit Control Letter 14 Days, and on-screen Sign. Ask what each
  should say (or for a copy of the old one with names removed).
- Choices made while they were away (easy to change): Survey kept as a contract tab after Details; the stage path and
  Next Step stay under the title line; Commissions and Job Costings only for accounts that see money; Default product
  lines are Labour, Trims and Removal (`DEFAULT_LINES` in features/records/products.js); contract colours are a
  short list of nine (`CCOLS` in features/records/fields.js); Edit List hides reports for everyone.

## v19.18.3: the New Version window shows again

- Cause: `showUpdate` (ui/shell/update-card.js) waited while `#saver` existed, but the screen saver's scene stays on
  the page (hidden) once it has run, so after the first screen saver the window never showed again. It now waits only
  while the saver is on (`#saver.on`), a pop-up window or a tour is open, and tries again by itself every 15 seconds.
  Test: tests/e2e/desktop-app.spec.js (v19.18.3).

## v19.18.4: the owner's follow-ups

- Records in the page area (`features/records/record-page.js`, CSS at the end of 05h-record-adminbase.css): the owner
  found the floating window "weird, not like the site". Leads, contracts and suppliers still open in the same window
  code, but it is placed over the page area (#main, `abPlace()`), with no dimmed page or blue band: a page heading,
  ordinary buttons (Save & Close in the site's blue), white panels and tabs. The side menu and top bar stay; using the
  side menu closes the record (asking first if a lead or contract has changes). Full Page still covers everything.
- Supplier cards: even columns on wide screens; two even rows at laptop widths (Open on the first row).
- Screen saver (`saver-scene.js`): the sun and moon carry on below the horizon (behind the trees and water) and fade
  instead of vanishing; sunrise the same way (the day's wrap-round was the cause). Sky colours and the sun's glow
  update ten times a second instead of every frame (each change repainted the whole sky).
- Job Stock Tags: the wording on every tag shows faded and locked until Change; colour boxes use the app's own pick
  list (`combo: 'colours'`, `plugTagsIn`) instead of the browser's.
- Stock: Stock-Take Area is a drop-down (`STOCK_AREAS` in domain/stock-lists.js: BTSS-01 to BTSS-40, Sobinco, BTDR-01
  to BTDR-40, BTWIN-01 to BTWIN-40, Red, Grey, Blue and Green Container, plus any area already in use). Cutting (step
  7): a Material box (`MATERIALS`, kept in `state.prodMat`); "Cut from full bars?" only for Aluminium; the bar length
  comes from the Length box (which reads "Full bar length", e.g. 6.5M), no separate bar-length boxes.
- Inventory reports: lists show Location, Area, Item, Description, Length, Colours and Qty; supplier, reorder level
  and money only when "Detailed" is ticked. New "Find It On The Factory Floor" report (item A to Z, where, how many).
- Deliveries: the Hallmark Feed bar shows on the List view only; the calendar's weeks share the screen height
  (`delCalFit`, the page's `after` step) so the month fits on one screen.
- Tests: tests/e2e/round-1918.spec.js, plus updates in screen-saver, stock-take, cutting-map and round-1917-3 specs.

## v19.18.5: colour (A)/(B) notes, searchable drop-downs

- Every colour box marked (A) or (B) has a faint note under it: "B – Typically Inside", "A – Typically Outside"
  (`SIDE` in config/colours.js): the product window, Job Stock Tags, Panel Optimiser boards and Cutting Optimiser
  profiles. The Panel and Cutting Optimiser colour boxes now use the app's own colour pick list too.
- Drop-downs (ui/components/pickers.js): a list with more than 12 choices (`SEARCH_FROM`) opens with a search box at
  the top, ready to type; only the choices containing the typed words show; arrows and Enter pick; Esc goes back to
  the box. Short lists are unchanged. Phones keep their own picker.
- Tests: tests/e2e/round-1918.spec.js (v19.18.5), cutting-map.spec.js.

## v19.18.6: performance pass, Cutting step corrected

Measured with Playwright scripts (frame times while scrolling with effects switched on and off, style work on a still
page, page build times and a CPU profile). Findings and fixes:
- Frosted-glass blur (`backdrop-filter`) on every panel, card, table and both bars was the main cost (scrolling
  Inventory about 66ms a frame; 18ms without). Behind them is only the still colour wash, so the blur showed almost
  nothing. `src/css/10-performance.css` (loaded last) removes it from in-page surfaces; pop-up windows and menus keep
  theirs. Side menu and top bar get a slightly less see-through background to read the same.
- The search box's rainbow glow animated a blurred gradient every frame (about 50 style updates a second on a still
  page). It now moves only while the box is pointed at or in use (`animation-play-state: paused` otherwise).
- The screen saver listened to wheel, touch, scroll and mouse movement with non-passive listeners, which makes the
  browser wait for script before scrolling. They are passive now (only clicks and keys can still be stopped).
- Search: the "On The Pages" index (drawing every page) was rebuilt on a keystroke once a minute (about 0.2s here).
  It is built when the computer is idle (`warmSiteIndex`, `requestIdleCallback`) and a search uses the last copy.
- Dates: `fd`, `fdl`, `isWk` (core/dates.js) use one shared `Intl.DateTimeFormat` each and remember each date's text;
  a new formatter per date was most of the time spent drawing Holiday Planner (73ms to 26ms).
- Test: tests/e2e/round-1918.spec.js (v19.18.6 performance): no endless animations on a still page, no blur on page
  surfaces, dates read the same.
- Cutting step (item-window.js): Material is Aluminium or Timber only (`MATERIALS`; an older saved value stays as a
  choice). "Cut from full bars?" shows only for Aluminium counted in Meters (M) (`BAR_UNIT`); the bar length is the
  Length (m) box, which is never relabelled (a PCS item keeps "Pieces per pack"). Aluminium in another unit shows a
  note to set Meters (M); a link it already had is kept.

## v19.18.7: Version and Check For Updates in Settings

- Settings, Version row (every account): "This is version x" (`appVersion()`, the build's `APP_BUILD`) and Check For
  Updates (`updCheck` in features/app/desktop-app.js). `checkVersion()` now returns 'new', 'latest' or 'error'; a
  check someone asked for shows the New Version window even after "Remind Me In 10 Minutes" (`force` in the
  update-ready payload, ui/shell/update-card.js). From a file on the computer it explains that the website has the
  newest version. Test: tests/e2e/desktop-app.spec.js (v19.18.7).
- (v19.18.7 follow-up) Settings buttons are all 9.2rem wide (were 6.8rem) so Check For Updates fits and every button in
  My Settings stays the same size (tests/e2e/round-1917.spec.js checks this; a first fix that widened only the one
  button failed it on GitHub).
