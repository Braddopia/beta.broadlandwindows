# 1. ES modules bundled by esbuild into one HTML file

**Status:** accepted (refactor phase 1 and 3)

**Context.** The app was about 20 script files sharing one global scope, and it relied on file order and hoisting. Any name could be changed from anywhere.

**Decision.**
- Use real ES modules with imports and exports, in layers that only import downwards.
- esbuild bundles them into the one inline script, so the deliverable is still a single HTML file.
- Other modules' variables are changed only through setters.
- Nothing runs at import time. Start-up steps run in order from `main.js`.

**Consequences.**
- The dependencies of each file are visible.
- Unused code is reported by lint.
- Rarely used areas can later become lazy-loaded chunks once the app is hosted.
- Contributors need Node for building and testing.
