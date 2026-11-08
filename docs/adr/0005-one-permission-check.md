# 5. One permission check: can()

**Status:** accepted (refactor phase 5)

**Context.** Permissions were checked through two look-alike helpers (`ISADM`, `ISOWN`) scattered through the code.

**Decision.**
- `domain/permissions.js` exports `can(permission)` and `canSee(view)`.
- The permission names (`money`, `manage`) and the account types that hold them are listed once, in `config/roles.js`.
- Actions check `can()` (or `need()`) themselves, not only when hiding buttons.

**Consequences.**
- One table to read and change.
- The backend can enforce the same names server-side.
- The browser checks stop accidents, not attackers. Real protection arrives with server-side sign-in.
