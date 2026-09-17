/**
 * Playback store (Zustand) — drives the visualizer, timeline, counters,
 * synced code highlighting, and the AI tutor context window.
 *
 * Timeline scrubbing produces high-frequency updates; components subscribe
 * to the narrow slices they need.
 */

import { create } from 'zustand';
import { Player } from '../engine/player';
import type { Trace } from '../engine/trace';
import type { AlgorithmEvent } from '../engine/events';
import type { VisState } from '../engine/visstate';
import type { AlgorithmInput } from '../engine/definition';
import type { TraceRequest, TraceResponse } from '../engine/trace.worker';

export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'error';

export interface ContextEvent {
  step: number;
  event: AlgorithmEvent;
}

interface PlaybackState {
  status: PlaybackStatus;
  error: string | null;
  warning: string | null;
  algorithmId: string | null;
  input: AlgorithmInput | null;
  trace: Trace | null;
  step: number; // 0..totalSteps
  totalSteps: number;
  speed: number; // 0.25–4
  visState: VisState | null;
  counters: { comparisons: number; swaps: number; writes: number; accesses: number };

  load: (algorithmId: string, input?: AlgorithmInput) => void;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBack: () => void;
  restart: () => void;
  seek: (step: number) => void;
  setSpeed: (speed: number) => void;
  /** AI tutor context: events around the current step. */
  contextWindow: (n?: number) => ContextEvent[];
}

// Module-level runtime objects — not reactive state, so kept off the store.
let worker: Worker | null = null;
let player: Player | null = null;
let requestSeq = 0;
let rafId: number | null = null;
let lastTick = 0;
let eventBudget = 0;

/** Base playback rate: events per second at 1× speed. */
const BASE_EPS = 12;

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../engine/trace.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (msg: MessageEvent<TraceResponse>) => {
      const res = msg.data;
      if (res.requestId !== requestSeq) return; // stale response
      const store = usePlayback.getState();
      if (!res.ok) {
        usePlayback.setState({ status: 'error', error: res.error });
        return;
      }
      player = new Player(res.trace);
      usePlayback.setState({
        status: 'ready',
        error: null,
        warning: res.trace.warning ?? null,
        trace: res.trace,
        step: 0,
        totalSteps: player.totalSteps,
        visState: player.stateAt(0),
        counters: player.countersAt(0),
        speed: store.speed,
      });
    };
  }
  return worker;
}

function stopLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function tick(now: number): void {
  const store = usePlayback.getState();
  if (store.status !== 'playing' || !player) {
    stopLoop();
    return;
  }
  const dt = Math.min((now - lastTick) / 1000, 0.25); // clamp tab-switch gaps
  lastTick = now;
  eventBudget += dt * BASE_EPS * store.speed;

  if (eventBudget >= 1) {
    const advance = Math.floor(eventBudget);
    eventBudget -= advance;
    const next = Math.min(store.step + advance, store.totalSteps);
    usePlayback.setState({
      step: next,
      visState: player.stateAt(next),
      counters: player.countersAt(next),
      ...(next >= store.totalSteps ? { status: 'ready' as const } : {}),
    });
    if (next >= store.totalSteps) {
      stopLoop();
      return;
    }
  }
  rafId = requestAnimationFrame(tick);
}

export const usePlayback = create<PlaybackState>((set, get) => ({
  status: 'idle',
  error: null,
  warning: null,
  algorithmId: null,
  input: null,
  trace: null,
  step: 0,
  totalSteps: 0,
  speed: 1,
  visState: null,
  counters: { comparisons: 0, swaps: 0, writes: 0, accesses: 0 },

  load: (algorithmId, input) => {
    stopLoop();
    player = null;
    const requestId = ++requestSeq;
    set({ status: 'loading', error: null, warning: null, algorithmId, input: input ?? null, step: 0 });
    const req: TraceRequest = { requestId, algorithmId, input };
    ensureWorker().postMessage(req);
  },

  play: () => {
    const s = get();
    if (!player || (s.status !== 'ready' && s.status !== 'playing')) return;
    // Play at the end restarts from the beginning (video-player convention).
    const step = s.step >= s.totalSteps ? 0 : s.step;
    set({ status: 'playing', step, visState: player.stateAt(step), counters: player.countersAt(step) });
    lastTick = performance.now();
    eventBudget = 0;
    stopLoop();
    rafId = requestAnimationFrame(tick);
  },

  pause: () => {
    stopLoop();
    if (get().status === 'playing') set({ status: 'ready' });
  },

  stepForward: () => {
    const s = get();
    if (!player) return;
    stopLoop();
    const next = Math.min(s.step + 1, s.totalSteps);
    set({ status: 'ready', step: next, visState: player.stateAt(next), counters: player.countersAt(next) });
  },

  stepBack: () => {
    const s = get();
    if (!player) return;
    stopLoop();
    const next = Math.max(s.step - 1, 0);
    set({ status: 'ready', step: next, visState: player.stateAt(next), counters: player.countersAt(next) });
  },

  restart: () => {
    if (!player) return;
    stopLoop();
    usePlayback.setState({ status: 'ready', step: 0, visState: player.stateAt(0), counters: player.countersAt(0) });
  },

  seek: (step) => {
    if (!player) return;
    const clamped = Math.max(0, Math.min(step, get().totalSteps));
    set({ step: clamped, visState: player.stateAt(clamped), counters: player.countersAt(clamped) });
  },

  setSpeed: (speed) => set({ speed: Math.max(0.25, Math.min(4, speed)) }),

  contextWindow: (n = 10) => (player ? player.contextWindow(get().step, n) : []),
}));
