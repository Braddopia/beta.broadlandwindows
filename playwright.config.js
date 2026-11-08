// Playwright settings for the CRM's browser tests.
// e2e: behaviour checks. visual: screenshot baselines that catch any change in look.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  use: {
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    trace: 'off',
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.003 },
  },
  snapshotPathTemplate: 'tests/visual/baselines/{arg}{ext}',
  projects: [
    { name: 'e2e', testMatch: /e2e\/.*\.spec\.js/ },
    { name: 'visual', testMatch: /visual\/.*\.spec\.js/ },
  ],
});
