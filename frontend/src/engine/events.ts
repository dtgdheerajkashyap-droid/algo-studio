/**
 * Algorithm Studio — Event Stream Schema (v1)
 *
 * THE central contract of the platform. Every algorithm is a generator that
 * yields these events. The 3D visualizer, playback timeline, live counters,
 * synced code highlighting, and AI tutor context ALL consume this stream.
 *
 * Design rules:
 *  - Events are plain JSON-serializable objects (they cross the Worker
 *    boundary via postMessage and are sent to the AI tutor as context).
 *  - Events are versioned via `v` so recorded traces stay replayable.
 *  - Events describe SEMANTIC operations (compare, swap, visit…), never
 *    rendering concerns. Layout/color decisions live in the visualizer.
 *  - `line` optionally maps the event to source lines per language so the
 *    Solution tab can highlight the currently executing line.
 */

import { z } from 'zod';

export const EVENT_SCHEMA_VERSION = 1 as const;

/** Per-language source line map, e.g. { cpp: 12, java: 15, python: 8 } */
export const LineMapSchema = z
  .object({
    cpp: z.number().int().positive(),
    java: z.number().int().positive(),
    python: z.number().int().positive(),
  })
  .partial();
export type LineMap = z.infer<typeof LineMapSchema>;

const base = {
  v: z.literal(EVENT_SCHEMA_VERSION),
  /** Optional per-language source line this event corresponds to. */
  line: LineMapSchema.optional(),
  /** Optional short human-readable note ("pivot chosen: 7"). */
  note: z.string().optional(),
};

// ---------------------------------------------------------------------------
// Array events (sorting / searching)
// ---------------------------------------------------------------------------

export const CompareEventSchema = z.object({
  ...base,
  type: z.literal('compare'),
  /** Indices being compared. */
  i: z.number().int().nonnegative(),
  j: z.number().int().nonnegative(),
  /** -1 if a[i] < a[j], 0 if equal, 1 if a[i] > a[j]. */
  result: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

export const SwapEventSchema = z.object({
  ...base,
  type: z.literal('swap'),
  i: z.number().int().nonnegative(),
  j: z.number().int().nonnegative(),
});

/** A write of a value into an index (merge sort, insertion shifts, …). */
export const WriteEventSchema = z.object({
  ...base,
  type: z.literal('write'),
  index: z.number().int().nonnegative(),
  value: z.number(),
});

/** An index read that should count as an array access (binary search mid). */
export const ReadEventSchema = z.object({
  ...base,
  type: z.literal('read'),
  index: z.number().int().nonnegative(),
});

/** Mark index/indices as finalized (sorted into place, or search hit). */
export const MarkSortedEventSchema = z.object({
  ...base,
  type: z.literal('mark-sorted'),
  indices: z.array(z.number().int().nonnegative()).min(1),
});

/** Highlight a subrange as the active working window (merge/quick/binary). */
export const RangeFocusEventSchema = z.object({
  ...base,
  type: z.literal('range-focus'),
  lo: z.number().int().nonnegative(),
  hi: z.number().int().nonnegative(),
  label: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Graph / tree events
// ---------------------------------------------------------------------------

export const VisitEventSchema = z.object({
  ...base,
  type: z.literal('visit'),
  node: z.string(),
});

export const DiscoverEventSchema = z.object({
  ...base,
  type: z.literal('discover'),
  node: z.string(),
  /** Edge used to discover it, if any. */
  from: z.string().optional(),
});

export const TraverseEdgeEventSchema = z.object({
  ...base,
  type: z.literal('traverse-edge'),
  from: z.string(),
  to: z.string(),
});

/** Dijkstra distance relaxation / BST key comparison outcome on a node. */
export const UpdateNodeEventSchema = z.object({
  ...base,
  type: z.literal('update-node'),
  node: z.string(),
  /** New auxiliary value shown as node label (distance, key…). */
  value: z.union([z.number(), z.string(), z.null()]),
});

/** Structural insertion (BST insert). */
export const InsertNodeEventSchema = z.object({
  ...base,
  type: z.literal('insert-node'),
  node: z.string(),
  value: z.number(),
  parent: z.string().optional(),
  side: z.enum(['left', 'right']).optional(),
});

/** Frontier contents (BFS queue / DFS stack / Dijkstra PQ) after a change. */
export const FrontierEventSchema = z.object({
  ...base,
  type: z.literal('frontier'),
  kind: z.enum(['queue', 'stack', 'priority-queue']),
  items: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// ML / scatter events
// ---------------------------------------------------------------------------

export const DistanceCalcEventSchema = z.object({
  ...base,
  type: z.literal('distance-calc'),
  pointId: z.string(),
  x: z.number(),
  y: z.number(),
  queryX: z.number(),
  queryY: z.number(),
  distance: z.number(),
});

export const NeighborSelectEventSchema = z.object({
  ...base,
  type: z.literal('neighbor-select'),
  pointIds: z.array(z.string()),
  k: z.number().int().nonnegative(),
});

export const VoteEventSchema = z.object({
  ...base,
  type: z.literal('vote'),
  tallies: z.record(z.union([z.string(), z.number()]), z.number()),
  predicted: z.union([z.string(), z.number()]),
});

export const AssignEventSchema = z.object({
  ...base,
  type: z.literal('assign'),
  pointId: z.string(),
  clusterId: z.union([z.number(), z.string()]),
  centroidId: z.string(),
});

export const MoveCentroidEventSchema = z.object({
  ...base,
  type: z.literal('move-centroid'),
  centroidId: z.string(),
  clusterId: z.union([z.number(), z.string()]),
  oldX: z.number(),
  oldY: z.number(),
  newX: z.number(),
  newY: z.number(),
});

export const PredictEventSchema = z.object({
  ...base,
  type: z.literal('predict'),
  pointId: z.string(),
  yPred: z.number(),
  yTrue: z.number().optional(),
  lineX1: z.number(),
  lineY1: z.number(),
  lineX2: z.number(),
  lineY2: z.number(),
});

export const CalcLossEventSchema = z.object({
  ...base,
  type: z.literal('calc-loss'),
  loss: z.number(),
  epoch: z.number().int().nonnegative(),
});

export const CalcGradientsEventSchema = z.object({
  ...base,
  type: z.literal('calc-gradients'),
  gradients: z.record(z.string(), z.number()),
  epoch: z.number().int().nonnegative(),
});

export const UpdateParamsEventSchema = z.object({
  ...base,
  type: z.literal('update-params'),
  params: z.record(z.string(), z.number()),
  epoch: z.number().int().nonnegative().optional(),
});

export const ComputeActivationEventSchema = z.object({
  ...base,
  type: z.literal('compute-activation'),
  pointId: z.string(),
  activation: z.number(),
  predictedSign: z.number(),
});

export const MisclassifyCheckEventSchema = z.object({
  ...base,
  type: z.literal('misclassify-check'),
  pointId: z.string(),
  predictedSign: z.number(),
  trueLabel: z.union([z.string(), z.number()]),
  isWrong: z.boolean(),
});

export const ConvergenceCheckEventSchema = z.object({
  ...base,
  type: z.literal('convergence-check'),
  iteration: z.number().int().nonnegative(),
  changedCount: z.number().int().nonnegative(),
  converged: z.boolean(),
});

// ---------------------------------------------------------------------------
// Generic events
// ---------------------------------------------------------------------------

/** Point one or more named pointers at indices/nodes (i, j, lo, hi, cur…). */
export const PointerMoveEventSchema = z.object({
  ...base,
  type: z.literal('pointer-move'),
  pointers: z.record(
    z.string(),
    z.union([z.number().int(), z.string(), z.null()]),
  ),
});

/** Free-form annotation shown in the narration strip. */
export const AnnotateEventSchema = z.object({
  ...base,
  type: z.literal('annotate'),
  text: z.string(),
});

/** Pure code-sync event when no semantic op maps to the executing line. */
export const HighlightLineEventSchema = z.object({
  ...base,
  type: z.literal('highlight-line'),
  line: LineMapSchema, // required here
});

/** Terminal event; every trace ends with exactly one. */
export const DoneEventSchema = z.object({
  ...base,
  type: z.literal('done'),
  summary: z.string().optional(),
});

// ---------------------------------------------------------------------------

export const AlgorithmEventSchema = z.discriminatedUnion('type', [
  CompareEventSchema,
  SwapEventSchema,
  WriteEventSchema,
  ReadEventSchema,
  MarkSortedEventSchema,
  RangeFocusEventSchema,
  VisitEventSchema,
  DiscoverEventSchema,
  TraverseEdgeEventSchema,
  UpdateNodeEventSchema,
  InsertNodeEventSchema,
  FrontierEventSchema,
  DistanceCalcEventSchema,
  NeighborSelectEventSchema,
  VoteEventSchema,
  AssignEventSchema,
  MoveCentroidEventSchema,
  PredictEventSchema,
  CalcLossEventSchema,
  CalcGradientsEventSchema,
  UpdateParamsEventSchema,
  ComputeActivationEventSchema,
  MisclassifyCheckEventSchema,
  ConvergenceCheckEventSchema,
  PointerMoveEventSchema,
  AnnotateEventSchema,
  HighlightLineEventSchema,
  DoneEventSchema,
]);

export type AlgorithmEvent = z.infer<typeof AlgorithmEventSchema>;
export type AlgorithmEventType = AlgorithmEvent['type'];

// ---------------------------------------------------------------------------
// Trace safety caps (spec §2): degrade gracefully, never freeze.
// ---------------------------------------------------------------------------

export const TRACE_LIMITS = {
  maxArraySize: 100,
  maxGraphNodes: 50,
  maxEvents: 50_000,
  maxScatterPoints: 200,
} as const;

/** Which counters an event increments (single source of truth for stats). */
export function countersFor(
  e: AlgorithmEvent,
): Partial<Record<'comparisons' | 'swaps' | 'writes' | 'accesses', number>> {
  switch (e.type) {
    case 'compare':
      return { comparisons: 1, accesses: 2 };
    case 'swap':
      return { swaps: 1, writes: 2, accesses: 2 };
    case 'write':
      return { writes: 1, accesses: 1 };
    case 'read':
      return { accesses: 1 };
    case 'distance-calc':
    case 'predict':
    case 'compute-activation':
      return { accesses: 1 };
    case 'move-centroid':
    case 'update-params':
      return { writes: 1 };
    default:
      return {};
  }
}
