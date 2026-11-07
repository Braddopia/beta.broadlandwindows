# Broadland Windows CRM

Single-file HTML CRM. Edit `src/` (css, js, assets), then run `python3 build.py` to write `dist/Broadland-Windows-CRM-<version>.html` and the root `index.html`. Never hand-edit `index.html` or `dist/`.

Rules for code in `src/js`:
- Every value put into HTML goes through `esc()`, or is passed to a handler with `A()` / `AC()`.
- User input is cleaned with `SAFE.*` before it is stored.
- Save with `store()`; record changes with `audit()`.
- No personal data in the repo: sample names only.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for Braddopia/beta.broadlandwindows, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
