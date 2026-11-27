// v19.17.2 Messages look like WhatsApp: messages from one person close together form a run (the name on the first,
// the picture on the last), the time and ticks sit inside each bubble, and the ticks turn blue once someone reads it.
const { test, expect } = require('../helpers');

test('team chat bubbles: runs, names, pictures, times and read ticks', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.go('messages');
  const me = await app.run(() => USER);
  await app.run((me) => {
    const t = Date.now() - 30 * 6e4;
    state.notes = state.notes.filter((n) => n.to != 'Everyone');
    state.notes.push(
      { id: 'b1', to: 'Everyone', by: 'Fitter A', t: 'Morning all', at: t, readBy: [] },
      { id: 'b2', to: 'Everyone', by: 'Fitter A', t: 'Van 1 is loaded', at: t + 6e4, readBy: [] },
      { id: 'b3', to: 'Everyone', by: me, t: 'Thanks', at: t + 2 * 6e4, readBy: ['Fitter A'] },
      { id: 'b4', to: 'Everyone', by: me, t: 'On my way', at: t + 3 * 6e4, readBy: [] }
    );
    setUI('msg.to', 'Everyone');
  }, me);
  const rows = app.page.locator('.msn-t .bw');
  await expect(rows).toHaveCount(4);
  // Fitter A's two messages are one run: the name on the first, the picture on the last
  await expect(rows.nth(0)).toHaveClass(/first/);
  await expect(rows.nth(1)).toHaveClass(/cont/);
  await expect(rows.nth(0).locator('.bub-n')).toHaveText('Fitter A');
  await expect(rows.nth(1).locator('.bub-n')).toHaveCount(0);
  await expect(rows.nth(0).locator('.mav')).toHaveCount(0);
  await expect(rows.nth(1).locator('.mav')).toHaveCount(1);
  // my own messages: no name or picture, the time inside, blue ticks once someone else has read it
  await expect(rows.nth(2)).toHaveClass(/me/);
  await expect(rows.nth(2).locator('.bub-n, .mav')).toHaveCount(0);
  await expect(rows.nth(2).locator('.bub-m')).toContainText(/\d\d:\d\d/);
  await expect(rows.nth(2).locator('.bub-k')).toHaveClass(/rd/);
  await expect(rows.nth(3).locator('.bub-k')).not.toHaveClass(/rd/);
  // my bubbles are Broadland blue (v19.17.4), the others white
  const bg = (i) =>
    rows
      .nth(i)
      .locator('.bub')
      .evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(await bg(2)).toBe('rgb(3, 78, 162)');
  expect(await bg(0)).toBe('rgb(255, 255, 255)');
  expect(app.errors).toEqual([]);
});
