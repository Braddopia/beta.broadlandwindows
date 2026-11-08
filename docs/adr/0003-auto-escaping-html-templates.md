# 3. Auto-escaping html`` templates, adopted gradually

**Status:** accepted (refactor phase 4)

**Context.** Every value had to be passed through `esc()` by hand. Forgetting once is a cross-site scripting hole.

**Decision.**
- `core/html.js` provides `html```, which escapes every interpolated value unless it is wrapped in `raw()`.
- New and rewritten markup uses it. Shared pieces moved first: form fields (`fieldControl`), tags and star ratings.
- Older templates move to `html``` when they are next touched, instead of in one risky rewrite.

**Consequences.**
- Two styles live side by side for a while.
- The script-injection tests and the strict content security policy guard both styles.
