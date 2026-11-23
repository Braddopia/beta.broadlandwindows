# Handover

Read this first, then CLAUDE.md and docs/ARCHITECTURE.md.

## Working with the owner

- Not a coder: ask questions when unsure, and show screenshots or the built page rather than code.
- Every round: build, `npm run check` and `npm run test:visual` (make baselines first with
  `npm run test:visual:update` on a fresh container, before changing anything), commit, push, wait for both GitHub
  workflows (Tests, and the GitHub Pages deploy) to pass, then send the dist HTML file and a plain-English summary.
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
