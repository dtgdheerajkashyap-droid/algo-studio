/**
 * VisState — the materialized visual state at a point in a trace.
 *
 * Playback never reverse-executes: rewind/scrub restores the nearest
 * keyframe snapshot (a full VisState) and fast-forwards by re-applying
 * events. So applyEvent must be a pure state transition, and VisState must
 * be cheaply cloneable (plain JSON data only).
 */

import type { AlgorithmEvent, LineMap } from './events';
import type { AlgorithmInput } from './definition';

export type CellState = 'default' | 'comparing' | 'swapping' | 'sorted' | 'current';
export type NodeState = 'default' | 'frontier' | 'current' | 'visited';
export type EdgeState = 'default' | 'active' | 'traversed';

export type PointState =
  | 'default'
  | 'comparing'
  | 'neighbor'
  | 'assigned'
  | 'misclassified'
  | 'correct'
  | 'predicted';

export type CentroidState = 'default' | 'moving' | 'converged';
export type LineState = 'default' | 'updating' | 'final';

export interface TreeNode {
  id: string;
  value: number;
  parent?: string;
  side?: 'left' | 'right';
}

export interface VisState {
  /** Array visualization (sorting/searching). */
  array: {
    values: number[];
    states: CellState[];
    /**
     * Stable per-element identity: ids[i] is the id of the element currently
     * in slot i. Swaps exchange ids, so the visualizer can key bars by id and
     * animate elements physically travelling between slots.
     */
    ids: number[];
    range: { lo: number; hi: number; label?: string } | null;
  } | null;
  /** Graph/tree visualization. */
  graph: {
    nodeStates: Record<string, NodeState>;
    /** Auxiliary label per node (Dijkstra distance, BST key…). */
    nodeValues: Record<string, number | string | null>;
    /** Keyed "from->to" (canonicalized for undirected). */
    edgeStates: Record<string, EdgeState>;
    frontier: { kind: 'queue' | 'stack' | 'priority-queue'; items: string[] } | null;
    /** Nodes structurally inserted during the run (BST). */
    insertedNodes: TreeNode[];
  } | null;
  /** Scatter / ML visualization. */
  scatter: {
    points: Record<
      string,
      {
        x: number;
        y: number;
        label?: string | number | null;
        cluster?: number | string;
        state: PointState;
      }
    >;
    centroids?: Record<
      string,
      {
        x: number;
        y: number;
        cluster: number | string;
        state: CentroidState;
      }
    >;
    query?: { x: number; y: number; predictedLabel?: string | number | null };
    line?: { x1: number; y1: number; x2: number; y2: number; state: LineState };
    lossCurve?: { x: number; y: number }[];
    neighborLines?: string[];
  } | null;
  pointers: Record<string, number | string | null>;
  /** Latest narration text (annotate / note). */
  narration: string;
  /** Source line currently "executing" per language. */
  line: LineMap | null;
  done: boolean;
}

export function edgeKey(from: string, to: string, directed: boolean): string {
  if (directed) return `${from}->${to}`;
  return from < to ? `${from}->${to}` : `${to}->${from}`;
}

export function initialVisState(input: AlgorithmInput): VisState {
  return {
    array:
      input.kind === 'array'
        ? {
            values: [...input.values],
            states: input.values.map(() => 'default' as CellState),
            ids: input.values.map((_, i) => i),
            range: null,
          }
        : null,
    graph:
      input.kind === 'graph' || input.kind === 'tree-ops'
        ? {
            nodeStates:
              input.kind === 'graph'
                ? Object.fromEntries(input.nodes.map((n) => [n, 'default' as NodeState]))
                : {},
            nodeValues: {},
            edgeStates:
              input.kind === 'graph'
                ? Object.fromEntries(
                    input.edges.map(([f, t]) => [edgeKey(f, t, !!input.directed), 'default' as EdgeState]),
                  )
                : {},
            frontier: null,
            insertedNodes: [],
          }
        : null,
    scatter:
      input.kind === 'scatter'
        ? {
            points: Object.fromEntries(
              input.points.map((p) => [
                p.id,
                { x: p.x, y: p.y, label: p.label, state: 'default' as PointState },
              ]),
            ),
            query: input.query ? { x: input.query.x, y: input.query.y } : undefined,
            lossCurve: [],
            neighborLines: [],
          }
        : null,
    pointers: {},
    narration: '',
    line: null,
    done: false,
  };
}

/** Structured-clone-free deep copy (VisState is plain JSON data). */
export function cloneVisState(s: VisState): VisState {
  return JSON.parse(JSON.stringify(s));
}

/**
 * Apply one event, mutating `s` in place (callers clone when snapshotting).
 * Transient highlights (comparing/swapping/current-edge) are cleared at the
 * start of each application so they only ever reflect the latest event.
 */
export function applyEvent(s: VisState, e: AlgorithmEvent, directed = false): void {
  // -- clear transient highlights ------------------------------------------
  if (s.array) {
    s.array.states = s.array.states.map((st) =>
      st === 'comparing' || st === 'swapping' || st === 'current' ? 'default' : st,
    );
  }
  if (s.graph) {
    for (const k of Object.keys(s.graph.edgeStates)) {
      if (s.graph.edgeStates[k] === 'active') s.graph.edgeStates[k] = 'traversed';
    }
    for (const k of Object.keys(s.graph.nodeStates)) {
      if (s.graph.nodeStates[k] === 'current') s.graph.nodeStates[k] = 'visited';
    }
  }
  if (s.scatter) {
    for (const k of Object.keys(s.scatter.points)) {
      const p = s.scatter.points[k];
      if (p.state === 'comparing' || p.state === 'neighbor') p.state = 'default';
    }
  }

  if (e.line) s.line = e.line;
  if (e.note) s.narration = e.note;

  switch (e.type) {
    // -- array ---------------------------------------------------------------
    case 'compare':
      if (s.array) {
        if (s.array.states[e.i] !== 'sorted') s.array.states[e.i] = 'comparing';
        if (s.array.states[e.j] !== 'sorted') s.array.states[e.j] = 'comparing';
      }
      break;
    case 'swap':
      if (s.array) {
        [s.array.values[e.i], s.array.values[e.j]] = [s.array.values[e.j], s.array.values[e.i]];
        [s.array.ids[e.i], s.array.ids[e.j]] = [s.array.ids[e.j], s.array.ids[e.i]];
        if (s.array.states[e.i] !== 'sorted') s.array.states[e.i] = 'swapping';
        if (s.array.states[e.j] !== 'sorted') s.array.states[e.j] = 'swapping';
      }
      break;
    case 'write':
      if (s.array) {
        s.array.values[e.index] = e.value;
        if (s.array.states[e.index] !== 'sorted') s.array.states[e.index] = 'swapping';
      }
      break;
    case 'read':
      if (s.array && s.array.states[e.index] !== 'sorted') s.array.states[e.index] = 'current';
      break;
    case 'mark-sorted':
      if (s.array) for (const i of e.indices) s.array.states[i] = 'sorted';
      break;
    case 'range-focus':
      if (s.array) s.array.range = { lo: e.lo, hi: e.hi, label: e.label };
      break;

    // -- graph/tree ------------------------------------------------------------
    case 'visit':
      if (s.graph) s.graph.nodeStates[e.node] = 'current';
      break;
    case 'discover':
      if (s.graph && s.graph.nodeStates[e.node] !== 'visited' && s.graph.nodeStates[e.node] !== 'current')
        s.graph.nodeStates[e.node] = 'frontier';
      if (s.graph && e.from) s.graph.edgeStates[edgeKey(e.from, e.node, directed)] = 'traversed';
      break;
    case 'traverse-edge':
      if (s.graph) s.graph.edgeStates[edgeKey(e.from, e.to, directed)] = 'active';
      break;
    case 'update-node':
      if (s.graph) s.graph.nodeValues[e.node] = e.value;
      break;
    case 'insert-node':
      if (s.graph) {
        s.graph.insertedNodes.push({ id: e.node, value: e.value, parent: e.parent, side: e.side });
        s.graph.nodeStates[e.node] = 'current';
        if (e.parent) s.graph.edgeStates[edgeKey(e.parent, e.node, true)] = 'traversed';
      }
      break;
    case 'frontier':
      if (s.graph) s.graph.frontier = { kind: e.kind, items: e.items };
      break;

    // -- scatter / ML ----------------------------------------------------------
    case 'distance-calc':
      if (s.scatter && s.scatter.points[e.pointId]) {
        s.scatter.points[e.pointId].state = 'comparing';
      }
      break;
    case 'neighbor-select':
      if (s.scatter) {
        for (const id of e.pointIds) {
          if (s.scatter.points[id]) s.scatter.points[id].state = 'neighbor';
        }
        s.scatter.neighborLines = [...e.pointIds];
      }
      break;
    case 'vote':
      if (s.scatter && s.scatter.query) {
        s.scatter.query.predictedLabel = e.predicted;
      }
      break;
    case 'assign':
      if (s.scatter && s.scatter.points[e.pointId]) {
        s.scatter.points[e.pointId].cluster = e.clusterId;
        s.scatter.points[e.pointId].state = 'assigned';
      }
      break;
    case 'move-centroid':
      if (s.scatter) {
        if (!s.scatter.centroids) s.scatter.centroids = {};
        if (!s.scatter.centroids[e.centroidId]) {
          s.scatter.centroids[e.centroidId] = {
            x: e.newX,
            y: e.newY,
            cluster: e.clusterId,
            state: 'moving',
          };
        } else {
          s.scatter.centroids[e.centroidId].x = e.newX;
          s.scatter.centroids[e.centroidId].y = e.newY;
          s.scatter.centroids[e.centroidId].state = 'moving';
        }
      }
      break;
    case 'predict':
      if (s.scatter) {
        if (s.scatter.points[e.pointId]) {
          s.scatter.points[e.pointId].state = 'predicted';
          if (e.yTrue !== undefined) {
            s.scatter.points[e.pointId].label = e.yTrue;
          }
        }
        s.scatter.line = {
          x1: e.lineX1,
          y1: e.lineY1,
          x2: e.lineX2,
          y2: e.lineY2,
          state: 'updating',
        };
      }
      break;
    case 'calc-loss':
      if (s.scatter) {
        if (!s.scatter.lossCurve) s.scatter.lossCurve = [];
        s.scatter.lossCurve.push({ x: e.epoch, y: e.loss });
      }
      break;
    case 'calc-gradients':
      break;
    case 'update-params':
      if (s.scatter && s.scatter.line) {
        s.scatter.line.state = 'updating';
      }
      break;
    case 'compute-activation':
      if (s.scatter && s.scatter.points[e.pointId]) {
        s.scatter.points[e.pointId].state = 'comparing';
      }
      break;
    case 'misclassify-check':
      if (s.scatter && s.scatter.points[e.pointId]) {
        s.scatter.points[e.pointId].state = e.isWrong ? 'misclassified' : 'correct';
      }
      break;
    case 'convergence-check':
      if (s.scatter && e.converged && s.scatter.centroids) {
        for (const k of Object.keys(s.scatter.centroids)) {
          s.scatter.centroids[k].state = 'converged';
        }
      }
      break;

    // -- generic ----------------------------------------------------------------
    case 'pointer-move':
      s.pointers = { ...s.pointers, ...e.pointers };
      break;
    case 'annotate':
      s.narration = e.text;
      break;
    case 'highlight-line':
      break; // line already handled above
    case 'done':
      s.done = true;
      if (e.summary) s.narration = e.summary;
      break;
  }
}
