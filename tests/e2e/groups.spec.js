// v19.15 group chats in Messages: anyone starts a group and owns it; the owner and group admins add and remove people,
// mute them, time them out and make admins; open groups can be joined; a muted or timed-out person can only read.
const { test, expect } = require('../helpers');

test('start a group, add people, run it, and delete it', async ({ app }) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.go('messages');
  const me = await app.run(() => USER);
  // + New chat, New group
  await app.call('msgNewChat', '__group');
  await app.page.fill('#f_name', 'Fitting Team');
  await app.page.fill('#f_desc', 'Who is fitting where this week');
  await app.page.click('#saveBtn');
  const g = await app.run(() => state.groups[0]);
  expect([g.name, g.owner, g.members, g.open]).toEqual(['Fitting Team', me, [me], false]);
  await expect(app.page.locator('.msn-h')).toContainText('Fitting Team');
  await expect(app.page.locator('.grp-card')).toContainText('Invite only');
  await expect(app.page.locator('.grp-m', { hasText: me })).toContainText('Owner');
  // add two people from the Add People list
  await app.page.click('.grp-tools button:text-is("Add people")');
  await app.page.locator('.grp-ar', { hasText: 'Fitter A' }).locator('button').click();
  await app.page.locator('.grp-ar', { hasText: 'Fitter B' }).locator('button').click();
  await app.call('closeModal');
  expect(await app.run(() => state.groups[0].members)).toEqual([me, 'Fitter A', 'Fitter B']);
  // the menu beside a person: make admin, mute, time out
  const menu = async (who, item) => {
    await app.page.locator('.grp-m', { hasText: who }).locator('.grp-mb').click();
    await app.page.click(`#fpop .pm-i:text-is("${item}")`);
  };
  await menu('Fitter A', 'Make group admin');
  await menu('Fitter B', 'Mute');
  await expect(app.page.locator('.grp-m', { hasText: 'Fitter A' })).toContainText('Admin');
  await expect(app.page.locator('.grp-m', { hasText: 'Fitter B' })).toContainText('Muted');
  await menu('Fitter B', 'Unmute');
  await menu('Fitter B', 'Time out for 1 hour');
  await expect(app.page.locator('.grp-m', { hasText: 'Fitter B' })).toContainText('Timed out');
  expect(await app.run(() => state.groups[0].timeouts['Fitter B'] - Date.now())).toBeGreaterThan(3590e3);
  // every change shows as a line in the chat
  await expect(app.page.locator('.msn-ev')).toContainText([
    `${me} added Fitter A`,
    'Fitter A is now a group admin',
    `${me} muted Fitter B`,
  ]);
  // send a message to the group
  await app.page.fill('#m_t', 'Van 2 is at the yard');
  await app.page.click('.msn-send');
  await expect(app.page.locator('.bub.me').last()).toContainText('Van 2 is at the yard');
  // remove someone
  await menu('Fitter B', 'Remove from group');
  await app.page.click('#mbox [data-act=askGo]');
  expect(await app.run(() => state.groups[0].members)).toEqual([me, 'Fitter A']);
  // the owner deletes the group and its messages
  await app.page.click('.grp-tools button:text-is("Delete")');
  await app.page.click('#mbox [data-act=askGo]');
  expect(await app.run((id) => [state.groups.length, state.notes.some((n) => n.to == 'g:' + id)], g.id)).toEqual([
    0,
    false,
  ]);
  await expect(app.page.locator('.msn-h')).toContainText('Everyone');
  expect(app.errors).toEqual([]);
});

test('a muted person only reads, has no group tools, and cannot send', async ({ app }) => {
  await app.go('messages');
  const me = await app.run(() => USER);
  await app.run((m) => {
    state.groups = [
      {
        id: 'G9',
        name: 'Office',
        desc: '',
        owner: 'Office A',
        admins: [],
        members: ['Office A', m],
        open: false,
        muted: [m],
        timeouts: {},
      },
    ];
    setUI('msg.to', 'g:G9');
  }, me);
  await expect(app.page.locator('.msn-in.msn-sys')).toContainText('You are muted in this group');
  await expect(app.page.locator('#m_t')).toHaveCount(0);
  await expect(app.page.locator('.grp-mb')).toHaveCount(0);
  await expect(app.page.locator('.grp-tools button')).toHaveText(['Leave']);
  // the actions refuse too, not only the buttons
  const n = await app.run(() => state.notes.length);
  await app.run(() => grpDo('G9', 'Office A', 'remove'));
  expect(await app.run(() => state.groups[0].members.length)).toBe(2);
  expect(await app.run(() => state.notes.length)).toBe(n);
});

test('an open group is listed for others to join; an invite-only one is not', async ({ app }) => {
  await app.go('messages');
  await app.run(() => {
    state.groups = [
      {
        id: 'G1',
        name: 'Factory Banter',
        desc: 'Anything goes',
        owner: 'Operative 1',
        admins: [],
        members: ['Operative 1'],
        open: true,
        muted: [],
        timeouts: {},
      },
      {
        id: 'G2',
        name: 'Directors',
        desc: '',
        owner: 'Sales A',
        admins: [],
        members: ['Sales A'],
        open: false,
        muted: [],
        timeouts: {},
      },
    ];
    render();
  });
  const join = app.page.locator('.grp-j');
  await expect(join).toHaveCount(1);
  await expect(join).toContainText('Factory Banter');
  await join.locator('button').click();
  await expect(app.page.locator('.msn-h')).toContainText('Factory Banter');
  expect(await app.run(() => state.groups[0].members.includes(USER))).toBe(true);
  await expect(app.page.locator('.msn-ev').last()).toContainText('joined');
});

test('chat commands: typing / lists them; /nickname, /me, /shrug, and group commands with the same permissions', async ({
  app,
}) => {
  await app.page.setViewportSize({ width: 1440, height: 900 });
  await app.go('messages');
  const me = await app.run(() => USER);
  await app.run((m) => {
    state.groups = [
      {
        id: 'G5',
        name: 'Yard',
        desc: '',
        owner: m,
        admins: [],
        members: [m, 'Fitter A', 'Fitter B'],
        open: false,
        muted: [],
        timeouts: {},
      },
    ];
    setUI('msg.to', 'g:G5');
  }, me);
  const box = app.page.locator('#m_t');
  const send = async (t) => {
    await box.fill(t);
    await box.press('Enter');
  };
  // typing "/" shows the commands; "/ti" narrows to /timeout; picking fills it in
  await box.pressSequentially('/ti');
  await expect(app.page.locator('#msnCmds .msn-cmd')).toHaveText([/\/timeout/]);
  await app.page.click('#msnCmds .msn-cmd');
  await expect(box).toHaveValue('/timeout ');
  // nickname in this group, shown on the group's lines
  await send('/nickname Gaffer');
  expect(await app.run(() => state.groups[0].nicks[USER])).toBe('Gaffer');
  await expect(app.page.locator('.msn-ev').last()).toContainText('is now known as Gaffer');
  // /me and /shrug send messages
  await send('/me is loading van 2');
  await expect(app.page.locator('.msn-me').last()).toContainText('* Gaffer is loading van 2');
  await send('/shrug no idea');
  await expect(app.page.locator('.bub.me').last()).toContainText('no idea ¯\\_(ツ)_/¯');
  // group commands: a short name is enough when only one person matches
  await send('/timeout fitter b 1h');
  expect(await app.run(() => state.groups[0].timeouts['Fitter B'] > Date.now())).toBe(true);
  await send('/mute Fitter A');
  expect(await app.run(() => state.groups[0].muted)).toEqual(['Fitter A']);
  await send('/rename Yard Crew');
  await expect(app.page.locator('.msn-h')).toContainText('Yard Crew');
  // a name that matches two people is refused and says why
  await send('/admin Fitter');
  await expect(app.page.locator('#toast')).toContainText('Nobody (or more than one person) matches');
  // /help lists what this person can use
  await send('/help');
  await expect(app.page.locator('#mbox .msn-help')).toContainText('/timeout');
  await app.call('closeModal');
  // a member who does not run the group cannot use the group commands
  await app.run(() => {
    state.groups[0].owner = 'Fitter B';
    state.groups[0].admins = [];
    render();
  });
  await send('/mute Fitter A');
  await expect(app.page.locator('#toast')).toContainText('only works in a group you run');
  expect(app.errors).toEqual([]);
});

test('each person has their own picture colour, the same every time', async ({ app }) => {
  await app.go('messages');
  const c = await app.run(() =>
    [...document.querySelectorAll('.msn-p .mav')].map((e) => [...e.classList].find((x) => /^c\d$/.test(x)))
  );
  expect(c.every(Boolean)).toBe(true);
  expect(new Set(c).size).toBeGreaterThan(3);
  // the colour comes from the name: the same person always gets the same one
  expect(await app.run(() => avColour('Fitter A') == avColour('Fitter A') && /^c\d$/.test(avColour('Fitter A')))).toBe(
    true
  );
});

test("the command list works from the keyboard; the owner and admins set other people's nicknames", async ({ app }) => {
  await app.go('messages');
  const me = await app.run(() => USER);
  await app.run((m) => {
    state.groups = [
      {
        id: 'G7',
        name: 'Yard',
        desc: '',
        owner: m,
        admins: ['Fitter A'],
        members: [m, 'Fitter A', 'Fitter B'],
        open: false,
        muted: [],
        timeouts: {},
      },
    ];
    setUI('msg.to', 'g:G7');
  }, me);
  const box = app.page.locator('#m_t');
  // "/" lists the commands, the first highlighted; Down moves on, Up wraps round to the last; Enter picks
  await box.pressSequentially('/');
  const on = app.page.locator('#msnCmds .msn-cmd.on');
  await expect(on).toContainText('/nickname');
  await box.press('ArrowDown');
  await expect(on).toContainText('/me');
  await box.press('ArrowUp');
  await box.press('ArrowUp');
  await expect(on).toContainText('/desc');
  await box.press('ArrowDown');
  await box.press('Enter');
  await expect(box).toHaveValue('/nickname ');
  // Esc closes the list without sending anything
  await box.fill('');
  await box.pressSequentially('/se');
  await expect(app.page.locator('#msnCmds')).toBeVisible();
  await box.press('Escape');
  await expect(app.page.locator('#msnCmds')).toBeHidden();
  // /setnick: a name (as short as is clear), then the nickname
  await box.fill('/setnick fitter b Big Al');
  await box.press('Enter');
  expect(await app.run(() => state.groups[0].nicks['Fitter B'])).toBe('Big Al');
  await expect(app.page.locator('.msn-ev').last()).toContainText("set Fitter B's nickname to Big Al");
  // the menu beside a person has Set nickname too
  await app.page.locator('.grp-m', { hasText: 'Fitter A' }).locator('.grp-mb').click();
  await app.page.click('#fpop .pm-i:text-is("Set nickname")');
  await app.page.fill('#f_nick', 'Al Senior');
  await app.page.click('#saveBtn');
  expect(await app.run(() => state.groups[0].nicks['Fitter A'])).toBe('Al Senior');
  // an admin cannot set the owner's nickname
  const n = await app.run(() => Object.keys(state.groups[0].nicks).length);
  await app.run((m) => grpSetNick('G7', m, 'Boss'), me);
  await app.run(() => {
    state.groups[0].owner = 'Fitter A';
    state.groups[0].admins = [USER];
  });
  await app.run(() => grpSetNick('G7', 'Fitter A', 'Nope'));
  expect(await app.run(() => state.groups[0].nicks['Fitter A'])).toBe('Al Senior');
  expect(n).toBe(2);
  expect(app.errors).toEqual([]);
});
