// Group chats in Messages: who runs a group, who may send, owner hand-over (v19.15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  roleIn,
  canManage,
  canActOn,
  sendBlock,
  timedOutUntil,
  joinable,
  myGroups,
  leaveGroup,
  dropMember,
  groupOf,
} from '../../src/domain/groups.js';

const G = () => ({
  id: 'G1',
  name: 'Fitters',
  owner: 'Ann',
  admins: ['Bob'],
  members: ['Ann', 'Bob', 'Cat', 'Dan'],
  open: false,
  muted: ['Dan'],
  timeouts: { Cat: 2000 },
});

test('roles: owner, admin, member, outsider', () => {
  const g = G();
  assert.deepEqual(
    ['Ann', 'Bob', 'Cat', 'Eve'].map((w) => roleIn(g, w)),
    ['owner', 'admin', 'member', '']
  );
  assert.deepEqual(
    ['Ann', 'Bob', 'Cat'].map((w) => canManage(g, w)),
    [true, true, false]
  );
});

test('who may act on whom: never the owner or yourself; only the owner on admins', () => {
  const g = G();
  assert.equal(canActOn(g, 'Ann', 'Bob'), true);
  assert.equal(canActOn(g, 'Bob', 'Cat'), true);
  assert.equal(canActOn(g, 'Bob', 'Ann'), false);
  assert.equal(canActOn(g, 'Ann', 'Ann'), false);
  g.admins.push('Cat');
  assert.equal(canActOn(g, 'Bob', 'Cat'), false);
  assert.equal(canActOn(g, 'Cat', 'Dan'), true);
  assert.equal(canActOn(g, 'Dan', 'Cat'), false);
});

test('sending: members only, not while muted or timed out; a time out ends by itself', () => {
  const g = G();
  assert.equal(sendBlock(g, 'Ann', 1000), '');
  assert.equal(sendBlock(g, 'Eve', 1000), 'out');
  assert.equal(sendBlock(g, 'Dan', 1000), 'muted');
  assert.equal(sendBlock(g, 'Cat', 1000), 'timeout');
  assert.equal(timedOutUntil(g, 'Cat', 1000), 2000);
  assert.equal(sendBlock(g, 'Cat', 2001), '');
});

test('open groups can be joined by people not in them; invite-only ones are not listed', () => {
  const a = G(),
    b = { ...G(), id: 'G2', open: true };
  assert.deepEqual(
    joinable([a, b], 'Eve').map((g) => g.id),
    ['G2']
  );
  assert.deepEqual(joinable([a, b], 'Ann'), []);
  assert.deepEqual(
    myGroups([a, b], 'Cat').map((g) => g.id),
    ['G1', 'G2']
  );
  assert.equal(groupOf([a, b], 'g:G2'), b);
  assert.equal(groupOf([a, b], 'Ann'), undefined);
});

test('removing someone clears their admin role, mute and time out', () => {
  const g = G();
  dropMember(g, 'Dan');
  dropMember(g, 'Cat');
  dropMember(g, 'Bob');
  assert.deepEqual([g.members, g.admins, g.muted, g.timeouts], [['Ann'], [], [], {}]);
});

test('when the owner leaves an admin takes over, else the next person; the last one out ends the group', () => {
  const g = G();
  assert.equal(leaveGroup(g, 'Ann'), true);
  assert.equal(g.owner, 'Bob');
  assert.deepEqual(g.admins, []);
  assert.equal(leaveGroup(g, 'Bob'), true);
  assert.equal(g.owner, 'Cat');
  leaveGroup(g, 'Cat');
  assert.equal(leaveGroup(g, 'Dan'), false);
});
