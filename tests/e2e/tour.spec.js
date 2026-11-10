// The welcome tour: the first-ever tour can't be skipped and Next waits for a timer bar; replays can be skipped.
const { test, expect } = require('../helpers');

test('first-ever tour: no Skip, Next unlocks when the bar fills; a replay keeps Skip', async ({ app }) => {
  test.setTimeout(30000);
  await app.call('startTour', true);
  const card = app.page.locator('#tour .tcard');
  await expect(card).toContainText('1 of');
  await expect(card.locator('text=Skip Tour')).toHaveCount(0);
  await expect(card.locator('.ttime')).toHaveCount(1);
  const next = card.locator('.tbtn .btn:last-child');
  await expect(next).toBeDisabled();
  // Escape and the arrow key don't jump past it either
  await app.page.keyboard.press('Escape');
  await app.page.keyboard.press('ArrowRight');
  await expect(app.page.locator('#tour')).toHaveClass(/open/);
  await expect(card).toContainText('1 of');
  await expect(next).toBeEnabled({ timeout: 9000 });
  await next.click();
  await expect(card).toContainText('2 of');
  await expect(card.locator('.tbtn .btn:last-child')).toBeDisabled();
  // going back to a step already read doesn't make you wait again
  await card.locator('text=Back').click();
  await expect(card).toContainText('1 of');
  await expect(card.locator('.tbtn .btn:last-child')).toBeEnabled();
  await app.call('endTour');

  // replay from the ? button: Skip is there and Next works at once
  await app.page.click('#helpBtn');
  await expect(card.locator('text=Skip Tour')).toHaveCount(1);
  await expect(card.locator('.ttime')).toHaveCount(0);
  await expect(card.locator('.tbtn .btn:last-child')).toBeEnabled();
  await app.page.keyboard.press('Escape');
  await expect(app.page.locator('#tour')).not.toHaveClass(/open/);
  expect(app.errors).toEqual([]);
});
