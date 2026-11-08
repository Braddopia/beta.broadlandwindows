# 2. Action registry instead of inline handlers, and a strict content security policy

**Status:** accepted (refactor phase 2)

**Context.** Hundreds of inline `onclick` strings meant the security policy had to allow inline script, so any injected markup could run code.

**Decision.**
- Buttons carry `data-act` / `data-args`, written by `onClick()`, `onEvent()` and `rowClick()`.
- One delegated listener calls the named function from a registry.
- The policy allows only the app's own scripts, by SHA-256 hash, plus named sign-in and scanner hosts.

**Consequences.**
- Injected markup cannot run script. The e2e security tests check this.
- Every action is an importable function.
- Every exported function is callable by name from markup. That is safe only because markup is escaped and actions check permissions themselves.
