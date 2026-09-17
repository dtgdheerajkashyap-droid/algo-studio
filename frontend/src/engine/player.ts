/**
 * Playback engine: keyframes + seek.
 *
 * Rewind = replay from keyframe snapshots (never reverse execution).
 * A keyframe (full VisState clone) is stored every KEYFRAME_INTERVAL events;
 * seeking restores the nearest keyframe at-or-before the target step and
 * fast-forwards the remainder. Worst-case seek work is KEYFRAME_INTERVAL-1
 * event applications — constant, independent of trace length.
 */

import type { Trace } from './trace';
import {
  applyEvent,
  cloneVisState,
  initialVisState,
  type VisState,
} from './visstate';

export const KEYFRAME_INTERVAL = 25;

export class Player {
  private trace: Trace;
  /** keyframes[k] = state AFTER applying events[0..k*INTERVAL-1]. */
  private keyframes: VisState[] = [];
  private directed: boolean;

  constructor(trace: Trace) {
    this.trace = trace;
    this.directed = trace.input.kind === 'graph' && !!trace.input.directed;
    this.buildKeyframes();
  }

  get totalSteps(): number {
    return this.trace.events.length;
  }

  private buildKeyframes(): void {
    const state = initialVisState(this.trace.input);
    this.keyframes.push(cloneVisState(state)); // keyframe 0 = pristine state
    this.trace.events.forEach((e, i) => {
      applyEvent(state, e, this.directed);
      if ((i + 1) % KEYFRAME_INTERVAL === 0) this.keyframes.push(cloneVisState(state));
    });
  }

  /**
   * State after applying the first `step` events (0 = initial state,
   * totalSteps = final state). Clamped to valid range.
   */
  stateAt(step: number): VisState {
    const target = Math.max(0, Math.min(step, this.totalSteps));
    const kfIndex = Math.floor(target / KEYFRAME_INTERVAL);
    const state = cloneVisState(this.keyframes[kfIndex]);
    for (let i = kfIndex * KEYFRAME_INTERVAL; i < target; i++) {
      applyEvent(state, this.trace.events[i], this.directed);
    }
    return state;
  }

  countersAt(step: number) {
    if (step <= 0) return { comparisons: 0, swaps: 0, writes: 0, accesses: 0 };
    return this.trace.countersAt[Math.min(step, this.totalSteps) - 1];
  }

  eventAt(step: number) {
    return step > 0 && step <= this.totalSteps ? this.trace.events[step - 1] : null;
  }

  /** Events surrounding a step — context window for the AI tutor (±n). */
  contextWindow(step: number, n = 10) {
    const lo = Math.max(0, step - 1 - n);
    const hi = Math.min(this.totalSteps, step + n);
    return this.trace.events.slice(lo, hi).map((e, i) => ({ step: lo + i + 1, event: e }));
  }
}
