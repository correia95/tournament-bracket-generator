import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPowerOfTwo, computeBracket, champion, encodeState, decodeState } from './bracket.ts';

test('nextPowerOfTwo returns the smallest power of two at least as large as n', () => {
  assert.equal(nextPowerOfTwo(1), 1);
  assert.equal(nextPowerOfTwo(3), 4);
  assert.equal(nextPowerOfTwo(4), 4);
  assert.equal(nextPowerOfTwo(5), 8);
  assert.equal(nextPowerOfTwo(8), 8);
  assert.equal(nextPowerOfTwo(9), 16);
});

test('computeBracket with fewer than 2 names returns no rounds', () => {
  assert.deepEqual(computeBracket([], {}), []);
  assert.deepEqual(computeBracket(['Alice'], {}), []);
});

test('computeBracket with 4 names (no byes) seeds opposite-ends pairs in round 1', () => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave'];
  const rounds = computeBracket(names, {});
  assert.equal(rounds.length, 2);
  assert.deepEqual(rounds[0].map((m) => [m.player1, m.player2]), [
    ['Alice', 'Dave'],
    ['Bob', 'Carol'],
  ]);
  assert.equal(rounds[0][0].winner, null);
  assert.equal(rounds[0][1].winner, null);
  assert.equal(rounds[1].length, 1);
  assert.deepEqual(rounds[1][0], { id: 'r1-m0', player1: null, player2: null, winner: null });
});

test('computeBracket auto-advances a bye when the field is not a power of two', () => {
  const names = ['Alice', 'Bob', 'Carol'];
  const rounds = computeBracket(names, {});
  assert.deepEqual(rounds[0].map((m) => [m.player1, m.player2, m.winner]), [
    ['Alice', null, 'Alice'],
    ['Bob', 'Carol', null],
  ]);
});

test('computeBracket feeds picks through to later rounds once both slots are decided', () => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave'];
  const picks = { 'r0-m0': 'Alice', 'r0-m1': 'Carol' };
  const rounds = computeBracket(names, picks);
  assert.equal(rounds[0][0].winner, 'Alice');
  assert.equal(rounds[0][1].winner, 'Carol');
  assert.deepEqual(rounds[1][0], { id: 'r1-m0', player1: 'Alice', player2: 'Carol', winner: null });

  const finalPicks = { ...picks, 'r1-m0': 'Alice' };
  const finalRounds = computeBracket(names, finalPicks);
  assert.equal(finalRounds[1][0].winner, 'Alice');
  assert.equal(champion(finalRounds), 'Alice');
});

test('champion is null until the final match has a decided winner', () => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave'];
  assert.equal(champion(computeBracket(names, {})), null);
  assert.equal(champion(computeBracket(names, { 'r0-m0': 'Alice', 'r0-m1': 'Carol' })), null);
});

test('a bye winner never needs a pick to advance further', () => {
  const names = ['Alice', 'Bob', 'Carol'];
  const picks = { 'r0-m1': 'Carol', 'r1-m0': 'Alice' };
  const rounds = computeBracket(names, picks);
  assert.equal(rounds.length, 2);
  assert.equal(champion(rounds), 'Alice');
});

test('an 8-name bracket has 3 rounds with correctly shrinking match counts', () => {
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rounds = computeBracket(names, {});
  assert.deepEqual(rounds.map((r) => r.length), [4, 2, 1]);
});

test('encodeState / decodeState round-trips a full scenario', () => {
  const state = { names: ['Alice', 'Bob', 'Carol', 'Dave'], picks: { 'r0-m0': 'Alice' }, title: 'Office Ping Pong' };
  const params = encodeState(state);
  const fallback = { names: [], picks: {}, title: '' };
  const decoded = decodeState(params, fallback);
  assert.deepEqual(decoded, state);
});

test('decodeState falls back safely on missing or corrupted data', () => {
  const fallback = { names: ['X'], picks: {}, title: 'Fallback' };
  assert.deepEqual(decodeState(new URLSearchParams(), fallback), fallback);
  assert.deepEqual(decodeState(new URLSearchParams('d=not-valid-base64url!!!'), fallback), fallback);
});
