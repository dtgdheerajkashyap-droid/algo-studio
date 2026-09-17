/**
 * Snapshot tests for algorithm generators.
 *
 * Event streams are deterministic — the full trace for a fixed input is
 * snapshotted. Any change to a generator's emitted events shows up as a
 * snapshot diff and must be intentionally accepted (recorded example traces
 * and AI-tutor context depend on stream stability).
 */

import { describe, it, expect } from 'vitest';
import { bubbleSort } from '../algorithms/bubble-sort';
import { insertionSort } from '../algorithms/insertion-sort';
import { mergeSort } from '../algorithms/merge-sort';
import { quickSort } from '../algorithms/quick-sort';
import { binarySearch } from '../algorithms/binary-search';
import { bfs } from '../algorithms/bfs';
import { dfs } from '../algorithms/dfs';
import { dijkstra } from '../algorithms/dijkstra';
import { bst } from '../algorithms/bst';
import { kNearestNeighbors } from '../algorithms/k-nearest-neighbors';
import { kMeans } from '../algorithms/k-means';
import { linearRegression } from '../algorithms/linear-regression';
import { perceptron } from '../algorithms/perceptron';
import { runTrace } from '../trace';
import { AlgorithmEventSchema } from '../events';

describe('bubble sort generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(bubbleSort, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('sorts: final mark-sorted covers all indices and done reports sorted order', () => {
    const trace = runTrace(bubbleSort, { kind: 'array', values: [5, 2, 8, 1, 9] });
    const done = trace.events.at(-1);
    expect(done).toMatchObject({ type: 'done', summary: 'Sorted: [1, 2, 5, 8, 9]' });
  });

  it('early-exits on already-sorted input (O(n) best case)', () => {
    const trace = runTrace(bubbleSort, { kind: 'array', values: [1, 2, 3, 4, 5] });
    expect(trace.countersAt.at(-1)!.comparisons).toBe(4); // single pass, n-1 compares
    expect(trace.countersAt.at(-1)!.swaps).toBe(0);
  });

  it('handles duplicates and single element', () => {
    expect(runTrace(bubbleSort, { kind: 'array', values: [2, 2, 2] }).events.at(-1)!.type).toBe('done');
    expect(runTrace(bubbleSort, { kind: 'array', values: [42] }).events.at(-1)!.type).toBe('done');
  });

  it('is deterministic across runs', () => {
    const input = { kind: 'array' as const, values: [3, 1, 4, 1, 5, 9, 2, 6] };
    expect(runTrace(bubbleSort, input).events).toEqual(runTrace(bubbleSort, input).events);
  });

  it('rejects arrays over the size cap', () => {
    const values = Array.from({ length: 101 }, (_, i) => i);
    expect(() => runTrace(bubbleSort, { kind: 'array', values })).toThrow(/too large/i);
  });

  it('never mutates the caller input', () => {
    const values = [3, 1, 2];
    runTrace(bubbleSort, { kind: 'array', values });
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('BFS generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(bfs, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('visits level by level from the start node', () => {
    const trace = runTrace(bfs);
    const visits = trace.events.filter((e) => e.type === 'visit').map((e) => (e as { node: string }).node);
    expect(visits).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('reports unreachable nodes in a disconnected graph', () => {
    const trace = runTrace(bfs, {
      kind: 'graph',
      nodes: ['A', 'B', 'X'],
      edges: [['A', 'B']],
      start: 'A',
    });
    const annotations = trace.events.filter((e) => e.type === 'annotate');
    expect(annotations.some((a) => (a as { text: string }).text.includes('Unreachable'))).toBe(true);
  });

  it('handles a single-node graph', () => {
    const trace = runTrace(bfs, { kind: 'graph', nodes: ['A'], edges: [], start: 'A' });
    const visits = trace.events.filter((e) => e.type === 'visit');
    expect(visits).toHaveLength(1);
  });

  it('does not re-visit nodes in a cycle', () => {
    const trace = runTrace(bfs, {
      kind: 'graph',
      nodes: ['A', 'B', 'C'],
      edges: [['A', 'B'], ['B', 'C'], ['C', 'A']],
      start: 'A',
    });
    const visits = trace.events.filter((e) => e.type === 'visit').map((e) => (e as { node: string }).node);
    expect(new Set(visits).size).toBe(visits.length);
  });

  it('rejects graphs over the node cap', () => {
    const nodes = Array.from({ length: 51 }, (_, i) => `n${i}`);
    expect(() => runTrace(bfs, { kind: 'graph', nodes, edges: [], start: 'n0' })).toThrow(/too large/i);
  });
});

describe('insertion sort generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(insertionSort, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('sorts and reports the sorted order', () => {
    const trace = runTrace(insertionSort, { kind: 'array', values: [5, 2, 8, 1, 9] });
    expect(trace.events.at(-1)).toMatchObject({ type: 'done', summary: 'Sorted: [1, 2, 5, 8, 9]' });
  });

  it('does n-1 comparisons and no shifts on sorted input (O(n) best case)', () => {
    const trace = runTrace(insertionSort, { kind: 'array', values: [1, 2, 3, 4, 5] });
    expect(trace.countersAt.at(-1)!.comparisons).toBe(4);
    // The only writes are each key dropped back into its own slot.
    const shifts = trace.events.filter((e) => e.type === 'write' && e.note?.startsWith('Shift'));
    expect(shifts).toHaveLength(0);
  });

  it('handles duplicates and single element', () => {
    expect(runTrace(insertionSort, { kind: 'array', values: [2, 2, 2] }).events.at(-1)!.type).toBe('done');
    expect(runTrace(insertionSort, { kind: 'array', values: [42] }).events.at(-1)!.type).toBe('done');
  });

  it('never mutates the caller input', () => {
    const values = [3, 1, 2];
    runTrace(insertionSort, { kind: 'array', values });
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('merge sort generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(mergeSort, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('sorts and reports the sorted order', () => {
    const trace = runTrace(mergeSort, { kind: 'array', values: [5, 2, 8, 1, 9] });
    expect(trace.events.at(-1)).toMatchObject({ type: 'done', summary: 'Sorted: [1, 2, 5, 8, 9]' });
  });

  it('does the same comparison count for sorted and reversed input of equal n', () => {
    // Merge sort's recursion shape depends only on n — but comparison counts
    // DO differ (exhausted halves stop comparing); both stay within n log n.
    const n = 16;
    const sorted = runTrace(mergeSort, { kind: 'array', values: Array.from({ length: n }, (_, i) => i) });
    const reversed = runTrace(mergeSort, { kind: 'array', values: Array.from({ length: n }, (_, i) => n - i) });
    const bound = n * Math.log2(n);
    expect(sorted.countersAt.at(-1)!.comparisons).toBeLessThanOrEqual(bound);
    expect(reversed.countersAt.at(-1)!.comparisons).toBeLessThanOrEqual(bound);
  });

  it('handles duplicates, single element, and empty-ish input', () => {
    expect(runTrace(mergeSort, { kind: 'array', values: [2, 2, 2] }).events.at(-1)!.type).toBe('done');
    expect(runTrace(mergeSort, { kind: 'array', values: [42] }).events.at(-1)!.type).toBe('done');
  });

  it('never mutates the caller input', () => {
    const values = [3, 1, 2];
    runTrace(mergeSort, { kind: 'array', values });
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('binary search generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(binarySearch, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('finds the target and reports its index', () => {
    const trace = runTrace(binarySearch, {
      kind: 'array',
      values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
      target: 23,
    });
    const done = trace.events.at(-1) as { type: string; summary?: string };
    expect(done.type).toBe('done');
    expect(done.summary).toContain('index 5');
  });

  it('reports not-found for an absent target', () => {
    const trace = runTrace(binarySearch, { kind: 'array', values: [1, 3, 5], target: 4 });
    const done = trace.events.at(-1) as { type: string; summary?: string };
    expect(done.summary).toContain('not found');
  });

  it('uses at most ceil(log2(n))+1 probes', () => {
    const values = Array.from({ length: 100 }, (_, i) => i * 2);
    const trace = runTrace(binarySearch, { kind: 'array', values, target: 1 }); // absent, worst case
    const probes = trace.events.filter((e) => e.type === 'read');
    expect(probes.length).toBeLessThanOrEqual(Math.ceil(Math.log2(100)) + 1);
  });

  it('warns on unsorted input', () => {
    const trace = runTrace(binarySearch, { kind: 'array', values: [3, 1, 2], target: 1 });
    const annotations = trace.events.filter((e) => e.type === 'annotate');
    expect(annotations.some((a) => (a as { text: string }).text.includes('not sorted'))).toBe(true);
  });

  it('defaults the target to the middle element when omitted', () => {
    const trace = runTrace(binarySearch, { kind: 'array', values: [1, 3, 5, 7, 9] });
    const done = trace.events.at(-1) as { summary?: string };
    expect(done.summary).toContain('Found 5');
  });
});

describe('DFS generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(dfs, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('dives deep before backtracking (differs from BFS level order)', () => {
    const trace = runTrace(dfs);
    const visits = trace.events.filter((e) => e.type === 'visit').map((e) => (e as { node: string }).node);
    expect(visits).toEqual(['A', 'B', 'D', 'F', 'E', 'C', 'G']);
  });

  it('visits each node exactly once despite stale stack entries', () => {
    const trace = runTrace(dfs, {
      kind: 'graph',
      nodes: ['A', 'B', 'C'],
      edges: [['A', 'B'], ['A', 'C'], ['B', 'C']],
      start: 'A',
    });
    const visits = trace.events.filter((e) => e.type === 'visit').map((e) => (e as { node: string }).node);
    expect(visits).toEqual(['A', 'B', 'C']);
  });

  it('reports unreachable nodes in a disconnected graph', () => {
    const trace = runTrace(dfs, {
      kind: 'graph',
      nodes: ['A', 'B', 'X'],
      edges: [['A', 'B']],
      start: 'A',
    });
    const annotations = trace.events.filter((e) => e.type === 'annotate');
    expect(annotations.some((a) => (a as { text: string }).text.includes('Unreachable'))).toBe(true);
  });

  it('uses a stack frontier', () => {
    const trace = runTrace(dfs);
    const frontiers = trace.events.filter((e) => e.type === 'frontier');
    expect(frontiers.length).toBeGreaterThan(0);
    expect(frontiers.every((f) => (f as { kind: string }).kind === 'stack')).toBe(true);
  });

  it('rejects graphs over the node cap', () => {
    const nodes = Array.from({ length: 51 }, (_, i) => `n${i}`);
    expect(() => runTrace(dfs, { kind: 'graph', nodes, edges: [], start: 'n0' })).toThrow(/too large/i);
  });
});

describe('quick sort generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(quickSort, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('sorts: final mark-sorted covers all indices and done reports sorted order', () => {
    const trace = runTrace(quickSort, { kind: 'array', values: [5, 2, 8, 1, 9] });
    const done = trace.events.at(-1);
    expect(done).toMatchObject({ type: 'done', summary: 'Sorted: [1, 2, 5, 8, 9]' });
  });

  it('ends with exactly one done event', () => {
    const trace = runTrace(quickSort, { kind: 'array', values: [3, 1, 2] });
    expect(trace.events.filter((e) => e.type === 'done')).toHaveLength(1);
    expect(trace.events.at(-1)!.type).toBe('done');
  });

  it('handles duplicates and single element', () => {
    expect(runTrace(quickSort, { kind: 'array', values: [2, 2, 2] }).events.at(-1)!.type).toBe('done');
    expect(runTrace(quickSort, { kind: 'array', values: [42] }).events.at(-1)!.type).toBe('done');
  });

  it('is deterministic across runs', () => {
    const input = { kind: 'array' as const, values: [3, 1, 4, 1, 5, 9, 2, 6] };
    expect(runTrace(quickSort, input).events).toEqual(runTrace(quickSort, input).events);
  });

  it('rejects arrays over the size cap', () => {
    const values = Array.from({ length: 101 }, (_, i) => i);
    expect(() => runTrace(quickSort, { kind: 'array', values })).toThrow(/too large/i);
  });

  it('never mutates the caller input', () => {
    const values = [3, 1, 2];
    runTrace(quickSort, { kind: 'array', values });
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('BST generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(bst, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('emits insert-node events for each unique value and inorder in done summary', () => {
    const trace = runTrace(bst, {
      kind: 'tree-ops',
      ops: [
        { op: 'insert', value: 5 },
        { op: 'insert', value: 3 },
        { op: 'insert', value: 7 },
      ],
    });
    const inserts = trace.events.filter((e) => e.type === 'insert-node');
    expect(inserts).toHaveLength(3);
    const done = trace.events.at(-1) as { type: string; summary?: string };
    expect(done.type).toBe('done');
    expect(done.summary).toContain('3 5 7');
  });

  it('ignores duplicate inserts (single root)', () => {
    const trace = runTrace(bst, {
      kind: 'tree-ops',
      ops: [
        { op: 'insert', value: 42 },
        { op: 'insert', value: 42 },
        { op: 'insert', value: 42 },
      ],
    });
    const inserts = trace.events.filter((e) => e.type === 'insert-node');
    expect(inserts).toHaveLength(1);
    const annotations = trace.events.filter((e) => e.type === 'annotate');
    expect(annotations.some((a) => (a as { text: string }).text.includes('Duplicate'))).toBe(true);
  });

  it('search miss on empty tree does not crash', () => {
    const trace = runTrace(bst, {
      kind: 'tree-ops',
      ops: [{ op: 'search', value: 5 }],
    });
    expect(trace.events.at(-1)!.type).toBe('done');
    const annotations = trace.events.filter((e) => e.type === 'annotate');
    expect(annotations.some((a) => (a as { text: string }).text.includes('miss'))).toBe(true);
  });

  it('sorted inserts create right-skewed tree with correct inorder', () => {
    const trace = runTrace(bst, {
      kind: 'tree-ops',
      ops: [1, 2, 3, 4, 5].map((v) => ({ op: 'insert' as const, value: v })),
    });
    const done = trace.events.at(-1) as { summary?: string };
    expect(done.summary).toContain('1 2 3 4 5');
  });

  it('never mutates the caller input', () => {
    const ops = [{ op: 'insert' as const, value: 5 }];
    runTrace(bst, { kind: 'tree-ops', ops });
    expect(ops).toEqual([{ op: 'insert', value: 5 }]);
  });
});

describe('Dijkstra generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(dijkstra, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('finalizes source first and relaxes edges updating node distances', () => {
    const trace = runTrace(dijkstra);
    const visits = trace.events.filter((e) => e.type === 'visit').map((e) => (e as { node: string }).node);
    expect(visits[0]).toBe('A');
    const updates = trace.events.filter((e) => e.type === 'update-node');
    expect(updates.length).toBeGreaterThan(0);
  });

  it('uses a priority-queue frontier', () => {
    const trace = runTrace(dijkstra);
    const frontiers = trace.events.filter((e) => e.type === 'frontier');
    expect(frontiers.length).toBeGreaterThan(0);
    expect(frontiers.every((f) => (f as { kind: string }).kind === 'priority-queue')).toBe(true);
  });

  it('reports unreachable nodes when graph is disconnected', () => {
    const trace = runTrace(dijkstra, {
      kind: 'graph',
      directed: true,
      nodes: ['S', 'A', 'X', 'Y'],
      edges: [
        ['S', 'A', 1],
        ['X', 'Y', 1],
      ],
      start: 'S',
    });
    const annotations = trace.events.filter((e) => e.type === 'annotate');
    expect(annotations.some((a) => (a as { text: string }).text.includes('Unreachable'))).toBe(true);
  });

  it('distance summary in done event includes source at 0', () => {
    const trace = runTrace(dijkstra, {
      kind: 'graph',
      directed: true,
      nodes: ['S', 'A', 'T'],
      edges: [
        ['S', 'A', 1],
        ['A', 'T', 1],
        ['S', 'T', 5],
      ],
      start: 'S',
    });
    const done = trace.events.at(-1) as { summary?: string };
    expect(done.summary).toContain('S=0');
    expect(done.summary).toContain('A=1');
    expect(done.summary).toContain('T=2');
  });

  it('rejects graphs over the node cap', () => {
    const nodes = Array.from({ length: 51 }, (_, i) => `n${i}`);
    expect(() => runTrace(dijkstra, { kind: 'graph', directed: true, nodes, edges: [], start: 'n0' })).toThrow(/too large/i);
  });

  it('never mutates the caller input', () => {
    const nodes = ['S', 'A'];
    const edges: [string, string, number][] = [['S', 'A', 3]];
    runTrace(dijkstra, { kind: 'graph', directed: true, nodes, edges, start: 'S' });
    expect(nodes).toEqual(['S', 'A']);
    expect(edges).toEqual([['S', 'A', 3]]);
  });
});

describe('k-nearest-neighbors generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(kNearestNeighbors, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('emits distance-calc and neighbor-select and vote events', () => {
    const trace = runTrace(kNearestNeighbors);
    const types = new Set(trace.events.map((e) => e.type));
    expect(types.has('distance-calc')).toBe(true);
    expect(types.has('neighbor-select')).toBe(true);
    expect(types.has('vote')).toBe(true);
  });

  it('terminates with exactly one done event', () => {
    const trace = runTrace(kNearestNeighbors);
    expect(trace.events.filter((e) => e.type === 'done')).toHaveLength(1);
    expect(trace.events.at(-1)!.type).toBe('done');
  });

  it('is deterministic across runs', () => {
    expect(runTrace(kNearestNeighbors).events).toEqual(runTrace(kNearestNeighbors).events);
  });

  it('never mutates the caller input', () => {
    const input = {
      kind: 'scatter' as const,
      points: [{ id: 'p0', x: 0, y: 0, label: 0 }],
      k: 1,
      queryX: 0,
      queryY: 0,
    };
    runTrace(kNearestNeighbors, input);
    expect(input.points).toEqual([{ id: 'p0', x: 0, y: 0, label: 0 }]);
  });
});

describe('k-means generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(kMeans, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('emits assign and move-centroid and convergence-check events', () => {
    const trace = runTrace(kMeans);
    const types = new Set(trace.events.map((e) => e.type));
    expect(types.has('assign')).toBe(true);
    expect(types.has('move-centroid')).toBe(true);
    expect(types.has('convergence-check')).toBe(true);
  });

  it('terminates with exactly one done event', () => {
    const trace = runTrace(kMeans);
    expect(trace.events.filter((e) => e.type === 'done')).toHaveLength(1);
    expect(trace.events.at(-1)!.type).toBe('done');
  });

  it('is deterministic across runs', () => {
    expect(runTrace(kMeans).events).toEqual(runTrace(kMeans).events);
  });
});

describe('linear-regression generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(linearRegression, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('emits predict, calc-loss, calc-gradients and update-params events', () => {
    const trace = runTrace(linearRegression);
    const types = new Set(trace.events.map((e) => e.type));
    expect(types.has('predict')).toBe(true);
    expect(types.has('calc-loss')).toBe(true);
    expect(types.has('calc-gradients')).toBe(true);
    expect(types.has('update-params')).toBe(true);
  });

  it('terminates with exactly one done event', () => {
    const trace = runTrace(linearRegression);
    expect(trace.events.filter((e) => e.type === 'done')).toHaveLength(1);
    expect(trace.events.at(-1)!.type).toBe('done');
  });

  it('is deterministic across runs', () => {
    expect(runTrace(linearRegression).events).toEqual(runTrace(linearRegression).events);
  });
});

describe('perceptron generator', () => {
  it('emits a deterministic, schema-valid event stream (default input)', () => {
    const trace = runTrace(perceptron, undefined, { validate: true });
    expect(trace.events).toMatchSnapshot();
  });

  it('emits compute-activation, misclassify-check and update-params events', () => {
    const trace = runTrace(perceptron);
    const types = new Set(trace.events.map((e) => e.type));
    expect(types.has('compute-activation')).toBe(true);
    expect(types.has('misclassify-check')).toBe(true);
    expect(types.has('update-params')).toBe(true);
  });

  it('terminates with exactly one done event', () => {
    const trace = runTrace(perceptron);
    expect(trace.events.filter((e) => e.type === 'done')).toHaveLength(1);
    expect(trace.events.at(-1)!.type).toBe('done');
  });

  it('is deterministic across runs', () => {
    expect(runTrace(perceptron).events).toEqual(runTrace(perceptron).events);
  });
});

describe('event schema', () => {
  it('every event in every registered algorithm default trace validates', () => {
    for (const def of [bubbleSort, insertionSort, mergeSort, quickSort, binarySearch, bfs, dfs, dijkstra, bst, kNearestNeighbors, kMeans, linearRegression, perceptron]) {
      const trace = runTrace(def, undefined, { validate: false });
      for (const e of trace.events) {
        expect(() => AlgorithmEventSchema.parse(e), `${def.id}: ${JSON.stringify(e)}`).not.toThrow();
      }
      // Exactly one terminal event, at the end.
      expect(trace.events.filter((e) => e.type === 'done')).toHaveLength(1);
      expect(trace.events.at(-1)!.type).toBe('done');
    }
  });
});
