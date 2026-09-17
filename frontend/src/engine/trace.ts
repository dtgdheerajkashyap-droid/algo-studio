/**
 * Trace runner: drains an algorithm generator into a Trace with safety caps
 * (spec §2 — degrade gracefully with a warning, never freeze).
 *
 * Runs inside the Web Worker in the app; runs directly in tests.
 */

import {
  AlgorithmEventSchema,
  TRACE_LIMITS,
  countersFor,
  type AlgorithmEvent,
} from './events';
import type { AlgorithmDefinition, AlgorithmInput } from './definition';

export interface TraceCounters {
  comparisons: number;
  swaps: number;
  writes: number;
  accesses: number;
}

export interface Trace {
  algorithmId: string;
  input: AlgorithmInput;
  events: AlgorithmEvent[];
  /** Cumulative counters AFTER each event (index-aligned with events). */
  countersAt: TraceCounters[];
  truncated: boolean;
  warning?: string;
}

export function validateInput(input: AlgorithmInput): string | null {
  if (input.kind === 'array' && input.values.length > TRACE_LIMITS.maxArraySize)
    return `Array too large: max ${TRACE_LIMITS.maxArraySize} elements.`;
  if (input.kind === 'graph' && input.nodes.length > TRACE_LIMITS.maxGraphNodes)
    return `Graph too large: max ${TRACE_LIMITS.maxGraphNodes} nodes.`;
  if (input.kind === 'scatter' && input.points.length > TRACE_LIMITS.maxScatterPoints)
    return `Scatter dataset too large: max ${TRACE_LIMITS.maxScatterPoints} points.`;
  return null;
}

export function runTrace(
  def: AlgorithmDefinition,
  input: AlgorithmInput = def.defaultInput,
  { validate = false }: { validate?: boolean } = {},
): Trace {
  const inputError = validateInput(input);
  if (inputError) throw new Error(inputError);

  const events: AlgorithmEvent[] = [];
  const countersAt: TraceCounters[] = [];
  const counters: TraceCounters = { comparisons: 0, swaps: 0, writes: 0, accesses: 0 };
  let truncated = false;
  let doneCount = 0;

  for (const event of def.run(input)) {
    if (doneCount >= 1) break; // invariant: only one done event, at the end

    // Schema validation is O(n) events — opt-in (always on in tests/dev).
    if (validate) AlgorithmEventSchema.parse(event);

    events.push(event);
    const delta = countersFor(event);
    counters.comparisons += delta.comparisons ?? 0;
    counters.swaps += delta.swaps ?? 0;
    counters.writes += delta.writes ?? 0;
    counters.accesses += delta.accesses ?? 0;
    countersAt.push({ ...counters });

    if (event.type === 'done') doneCount++;

    if (events.length >= TRACE_LIMITS.maxEvents) {
      truncated = true;
      if (doneCount === 0) {
        events.push({ v: 1, type: 'done', summary: 'Trace truncated at event cap.' });
        countersAt.push({ ...counters });
      }
      break;
    }
  }

  // Generator invariant: every trace MUST end with exactly one done event.
  // If the generator produced none, append a synthetic one; if it produced
  // zero events at all, emit a done with a concise explanation.
  if (doneCount === 0) {
    const summary =
      events.length === 0
        ? 'Generator produced no events.'
        : 'Generator did not yield a final done event.';
    events.push({ v: 1, type: 'done', summary });
    countersAt.push({ ...counters });
  }

  return {
    algorithmId: def.id,
    input,
    events,
    countersAt,
    truncated,
    warning: truncated
      ? `Event cap (${TRACE_LIMITS.maxEvents.toLocaleString()}) reached — playback shows a partial run.`
      : undefined,
  };
}
