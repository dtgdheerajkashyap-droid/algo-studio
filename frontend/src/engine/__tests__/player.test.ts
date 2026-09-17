/**
 * Playback engine tests: keyframe/seek correctness.
 *
 * The invariant that matters: stateAt(k) via keyframe restore + fast-forward
 * must equal the state produced by applying all k events from scratch.
 */

import { describe, it, expect } from 'vitest';
import { bubbleSort } from '../algorithms/bubble-sort';
import { bfs } from '../algorithms/bfs';
import { runTrace } from '../trace';
import { Player, KEYFRAME_INTERVAL } from '../player';
import { applyEvent, initialVisState } from '../visstate';

function bruteForceStateAt(trace: ReturnType<typeof runTrace>, step: number) {
  const directed = trace.input.kind === 'graph' && !!trace.input.directed;
  const s = initialVisState(trace.input);
  for (let i = 0; i < step; i++) applyEvent(s, trace.events[i], directed);
  return s;
}

describe('Player keyframe seek', () => {
  for (const def of [bubbleSort, bfs]) {
    it(`${def.id}: stateAt(k) matches brute-force replay at every step`, () => {
      const trace = runTrace(def);
      const player = new Player(trace);
      // Check every step, including keyframe boundaries and the ends.
      for (let k = 0; k <= player.totalSteps; k++) {
        expect(player.stateAt(k)).toEqual(bruteForceStateAt(trace, k));
      }
    });
  }

  it('seeking is idempotent and order-independent (scrub simulation)', () => {
    const trace = runTrace(bubbleSort);
    const player = new Player(trace);
    const n = player.totalSteps;
    // jump around like a user scrubbing
    const scrubs = [n, 3, Math.floor(n / 2), 0, n - 1, KEYFRAME_INTERVAL, KEYFRAME_INTERVAL + 1, 7];
    for (const k of scrubs) {
      expect(player.stateAt(k)).toEqual(bruteForceStateAt(trace, k));
    }
  });

  it('clamps out-of-range steps', () => {
    const trace = runTrace(bubbleSort);
    const player = new Player(trace);
    expect(player.stateAt(-5)).toEqual(player.stateAt(0));
    expect(player.stateAt(player.totalSteps + 100)).toEqual(player.stateAt(player.totalSteps));
  });

  it('countersAt is cumulative and monotonic', () => {
    const trace = runTrace(bubbleSort);
    const player = new Player(trace);
    let prev = player.countersAt(0);
    for (let k = 1; k <= player.totalSteps; k++) {
      const cur = player.countersAt(k);
      expect(cur.comparisons).toBeGreaterThanOrEqual(prev.comparisons);
      expect(cur.accesses).toBeGreaterThanOrEqual(prev.accesses);
      prev = cur;
    }
  });

  it('contextWindow returns ±n events with correct step numbers', () => {
    const trace = runTrace(bubbleSort);
    const player = new Player(trace);
    const win = player.contextWindow(20, 10);
    expect(win.length).toBeLessThanOrEqual(21); // 10 before + current + 10 after
    expect(win[0].step).toBe(10);
    expect(win.at(-1)!.event).toBe(trace.events[win.at(-1)!.step - 1]);
  });

  it('final state of bubble sort shows a fully sorted array', () => {
    const trace = runTrace(bubbleSort, { kind: 'array', values: [5, 3, 1, 4, 2] });
    const player = new Player(trace);
    const final = player.stateAt(player.totalSteps);
    expect(final.array!.values).toEqual([1, 2, 3, 4, 5]);
    expect(final.array!.states.every((s) => s === 'sorted')).toBe(true);
    expect(final.done).toBe(true);
  });

  it('final state of BFS shows all reachable nodes visited', () => {
    const trace = runTrace(bfs);
    const player = new Player(trace);
    const final = player.stateAt(player.totalSteps);
    const states = Object.values(final.graph!.nodeStates);
    expect(states.every((s) => s === 'visited' || s === 'current')).toBe(true);
  });
});
