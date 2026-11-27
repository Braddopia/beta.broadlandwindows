// Messages "/" commands: reading them, who may use which, and finding the person meant (v19.15.6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, commandsFor, findPerson, splitTimeout } from '../../src/domain/chat-commands.js';

test('reading a command', () => {
  assert.deepEqual(parseCommand('/nickname Boss'), { cmd: 'nickname', rest: 'Boss' });
  assert.deepEqual(parseCommand('  /HELP  '), { cmd: 'help', rest: '' });
  assert.deepEqual(parseCommand('/desc two\nlines'), { cmd: 'desc', rest: 'two\nlines' });
  assert.equal(parseCommand('hello /me'), null);
  assert.equal(parseCommand('/'), null);
});

test('who sees which commands', () => {
  const names = (l) => l.map((c) => c[0]);
  assert.deepEqual(names(commandsFor(false, false)), ['nickname', 'me', 'shrug', 'help']);
  assert.ok(names(commandsFor(true, false)).includes('leave'));
  assert.ok(!names(commandsFor(true, false)).includes('mute'));
  assert.ok(names(commandsFor(true, true)).includes('timeout'));
});

test('finding the person meant: exact, or the only one starting with what was typed', () => {
  const people = ['Fitter A', 'Fitter B', 'Office A', 'Operative 1'];
  assert.equal(findPerson('fitter b', people), 'Fitter B');
  assert.equal(findPerson('@Office', people), 'Office A');
  assert.equal(findPerson('Fitter', people), '');
  assert.equal(findPerson('Nobody', people), '');
});

test('a time out: who and how long', () => {
  assert.deepEqual(splitTimeout('Fitter B 1h'), { who: 'Fitter B', len: '1h' });
  assert.deepEqual(splitTimeout('fitter b 1W'), { who: 'fitter b', len: '1w' });
  assert.deepEqual(splitTimeout('Fitter B'), { who: 'Fitter B', len: '' });
});
