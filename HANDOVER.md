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
- Panel Optimiser: sizes always width × height (drawn width across, height up); boards have Colour Inside and
  Colour Outside. Cutting Optimiser profiles have Colour Inside and Colour Outside too.
- Settings: company card shows only filled-in details, with Opening hours (default from a public business listing:
  Mon to Fri 9am to 5pm, Sat 10am to 2pm, Sun closed; the owner should confirm).
- Colour contrast: checked with axe-core and a pixel check (text against the real background, glass included),
  every page and the main windows, light and dark. Script idea: hide all text, screenshot, compare each text box's
  colour with the pixels behind it.

## Open questions for the owner

- Mitre re-cut waste in the Cutting Optimiser is not counted yet. Proposal: a "profile depth" (mm) on each
  profile (filled from the product); where two mitred ends meet and the pieces cannot be flipped to share one cut,
  add depth × tan(angle) (a 70mm deep profile at 45° loses about 70mm) plus one more saw blade. Waiting for a yes.
- "Anyone can delete reports" was read as: every account can delete service calls. Confirm.
