# Broadland Windows CRM v19.2

**To use:** open `dist/Broadland-Windows-CRM-v19.2.html` (a single self-contained file, just like v18).
It reads the same browser storage as v18, so existing data carries over.

## Editing
Change files in `src/`, then run `python3 build.py` to rebuild `dist/Broadland-Windows-CRM-v19.2.html`.

```
src/index.html        page skeleton (sidebar, top bar, dialogs)
src/assets/           logos (base64)
src/css/01-06         tokens, base, shell, components, pages, responsive breakpoints
src/js/01-core        helpers, escaping/validation, icons, SHA-256
src/js/02-state       seed data, load + migrate, save, audit trail
src/js/03-auth        accounts, PINs, idle sign-out, My Details
src/js/04-shell       render loop, navigation, forms, pagination, theme
src/js/05-home        Overview
src/js/06-operations  Factory floor, deliveries, suppliers, Hallmark, Smart Orders
src/js/07-sales       Leads, contracts, service calls, contacts
src/js/08-people      Calendar, holiday planner, staff
src/js/09-inventory   Inventory (products, movements, requests, item editor)
src/js/10-scanner     Barcode scanner
src/js/11-print-reports  Report template, stock reports, customer documents, Reports page
src/js/12-files       Files page
src/js/13-finance-admin  Finance, Admin console (PINs, audit log, backups)
src/js/14-notify      Notification centre
src/js/99-boot        Start-up
```

## Security note
Everything runs in the browser. PINs are hashed, actions are re-checked, all data is
escaped and every change is logged, but anyone with access to the browser can still read
or edit its storage. Proper protection of customer/staff data needs a server with real logins.

## Hosting
`index.html` at the repo root is the built app, ready to serve as a static page
(for example with GitHub Pages). Serving it over https also enables the camera barcode scanner.
