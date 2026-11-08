# 4. A pluggable data source, repositories and record versions

**Status:** accepted (refactor phase 5). Per-record storage is deferred.

**Context.** A Microsoft 365 backend will be added at an unknown date. Before the refactor, pages wrote straight into storage.

**Decision.**
- `data/sources/data-source.js` defines where data lives. `indexeddb-source.js` is today's storage, with unchanged database names. `api-source.js` documents the backend shape.
- Records are added, changed and removed through `data/repository.js`, which stamps `_meta` (created, updated, by whom, version).
- Lower layers report to the screen through events, never by calling it.

**Deferred.** Splitting browser storage into one store per collection, with per-record saves, is deferred until the backend work.
- It needs a data migration on every user's device and gives little benefit while the app runs in one browser.
- The interface is shaped so that it can be done then without changing pages.

**Consequences.**
- Switching storage is one `setSource()` call.
- Version numbers already exist for conflict checks.
- Saves still write the whole copy for now.
