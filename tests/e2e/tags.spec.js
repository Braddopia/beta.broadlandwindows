// Job Stock Tags: fill in several at once, each prints on its own A4 landscape page.
const { test, expect } = require('../helpers');

test('job stock tags: several at once, one A4 landscape page per tag and copy, then kept to print again', async ({
  app,
}) => {
  await app.role('staff');
  await app.go('tags');
  await expect(app.page.locator('#main h1')).toHaveText('Job Stock Tags');
  // the first tag: a known contract fills in the job name
  await app.page.fill('#tag_0_jobNo', '1023421');
  await expect(app.page.locator('#tag_0_jobName')).toHaveValue('SAMPLE CUSTOMER E');
  await app.page.fill('#tag_0_cIn', 'WP');
  await app.page.fill('#tag_0_cOut', 'WP');
  await expect(app.page.locator('#tagPv_0')).toContainText('In – WP / Out – WP');
  // a second tag, typed by hand, two copies
  await app.page.click('#main >> text=+ Add Another Tag');
  await expect(app.page.locator('#tag_1_jobNo')).toBeFocused();
  await app.page.fill('#tag_1_jobNo', '1023557');
  await app.page.fill('#tag_1_jobName', 'Kings Ely – Kings House');
  await app.page.fill('#tag_1_copies', '2');
  // a third left empty is not printed
  await app.page.click('#main >> text=+ Add Another Tag');
  await expect(app.page.locator('#tagGo')).toHaveText('Print All (3 Pages)');
  const [w] = await Promise.all([app.nextPopup(), app.page.click('#tagGo')]);
  await w.waitForLoadState();
  await expect(w.locator('.jt-sheet')).toHaveCount(3);
  await expect(w.locator('.jt-sheet').nth(0)).toContainText('1023421');
  await expect(w.locator('.jt-sheet').nth(2)).toContainText('Kings Ely – Kings House');
  await expect(w.locator('.jt-sheet').first()).toContainText('Do not damage, stock metal used for a job upcoming!');
  // A4 landscape, and the name stays on one line
  expect(await w.content()).toContain('size:A4 landscape');
  const nameH = await w.evaluate(() => {
    const n = document.querySelectorAll('.jt-name')[1];
    return n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).fontSize);
  });
  expect(nameH).toBeLessThan(1.5);
  await w.close();
  await expect(app.page.locator('.toast')).toContainText('1 tag has no job number');
  // both printed tags are kept to print again, and one goes back into the list
  expect(await app.run(() => tagData().recent.map((r) => r.jobNo))).toEqual(['1023421', '1023557']);
  await app.run(() => {
    tagData().list = [{ jobNo: '', jobName: '', cIn: '', cOut: '', copies: 1 }];
    render(true);
  });
  await app.page.click('#main .jt-recent .row >> nth=1 >> text=Add To List');
  await expect(app.page.locator('#tag_0_jobNo')).toHaveValue('1023557');
  expect(app.errors).toEqual([]);
});

test('job stock tags: very long text gets smaller rather than running off the tag', async ({ app }) => {
  expect(await app.run(() => [fitSize('1023557', 44, 20, 0.58), fitSize('X'.repeat(60), 21, 11, 0.7)])).toEqual([
    44, 11,
  ]);
});
