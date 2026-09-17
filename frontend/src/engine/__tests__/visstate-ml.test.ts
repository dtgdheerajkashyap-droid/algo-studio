import { describe, it, expect } from 'vitest';
import type { ScatterInput } from '../definition';
import type { AlgorithmEvent } from '../events';
import { initialVisState, applyEvent, cloneVisState } from '../visstate';

const scatterInput: ScatterInput = {
  kind: 'scatter',
  points: [
    { id: 'p1', x: 1, y: 2, label: 0 },
    { id: 'p2', x: 3, y: 4, label: 1 },
    { id: 'p3', x: 5, y: 6, label: 0 },
  ],
  query: { x: 2.5, y: 3.5 },
  k: 2,
  alpha: 0.01,
  iterations: 10,
  seed: 42,
};

const V = 1 as const;

describe('visstate scatter/ML support', () => {
  it('initialVisState builds scatter branch from ScatterInput', () => {
    const s = initialVisState(scatterInput);
    expect(s.scatter).not.toBeNull();
    expect(Object.keys(s.scatter!.points)).toHaveLength(3);
    expect(s.scatter!.points['p1']).toMatchObject({ x: 1, y: 2, label: 0, state: 'default' });
    expect(s.scatter!.points['p2']).toMatchObject({ x: 3, y: 4, label: 1, state: 'default' });
    expect(s.scatter!.points['p3']).toMatchObject({ x: 5, y: 6, label: 0, state: 'default' });
    expect(s.scatter!.query).toMatchObject({ x: 2.5, y: 3.5 });
    expect(s.scatter!.lossCurve).toEqual([]);
    expect(s.scatter!.neighborLines).toEqual([]);
  });

  it('initialVisState sets scatter=null for non-scatter inputs', () => {
    const arr = initialVisState({ kind: 'array', values: [1, 2, 3] });
    expect(arr.scatter).toBeNull();
    const gr = initialVisState({ kind: 'graph', nodes: ['A'], edges: [] });
    expect(gr.scatter).toBeNull();
    const tr = initialVisState({ kind: 'tree-ops', ops: [{ op: 'insert', value: 1 }] });
    expect(tr.scatter).toBeNull();
  });

  it('applies all 12 ML event types and mutates VisState.scatter correctly', () => {
    const s = initialVisState(scatterInput);

    applyEvent(s, {
      v: V,
      type: 'distance-calc',
      pointId: 'p1',
      x: 1,
      y: 2,
      queryX: 2.5,
      queryY: 3.5,
      distance: Math.sqrt(2 * 2 + 1.5 * 1.5),
    } as AlgorithmEvent);
    expect(s.scatter!.points['p1'].state).toBe('comparing');

    applyEvent(s, {
      v: V,
      type: 'neighbor-select',
      pointIds: ['p1', 'p2'],
      k: 2,
    } as AlgorithmEvent);
    expect(s.scatter!.points['p1'].state).toBe('neighbor');
    expect(s.scatter!.points['p2'].state).toBe('neighbor');
    expect(s.scatter!.neighborLines).toEqual(['p1', 'p2']);

    applyEvent(s, {
      v: V,
      type: 'vote',
      tallies: { 0: 1, 1: 1 } as Record<string | number, number>,
      predicted: 0,
    } as AlgorithmEvent);
    expect(s.scatter!.query!.predictedLabel).toBe(0);

    applyEvent(s, {
      v: V,
      type: 'assign',
      pointId: 'p3',
      clusterId: 1,
      centroidId: 'c1',
    } as AlgorithmEvent);
    expect(s.scatter!.points['p3'].cluster).toBe(1);
    expect(s.scatter!.points['p3'].state).toBe('assigned');

    applyEvent(s, {
      v: V,
      type: 'move-centroid',
      centroidId: 'c1',
      clusterId: 1,
      oldX: 0,
      oldY: 0,
      newX: 5,
      newY: 6,
    } as AlgorithmEvent);
    expect(s.scatter!.centroids).toBeDefined();
    expect(s.scatter!.centroids!['c1']).toMatchObject({
      x: 5,
      y: 6,
      cluster: 1,
      state: 'moving',
    });

    applyEvent(s, {
      v: V,
      type: 'predict',
      pointId: 'p2',
      yPred: 0.8,
      yTrue: 1,
      lineX1: 0,
      lineY1: 0,
      lineX2: 10,
      lineY2: 10,
    } as AlgorithmEvent);
    expect(s.scatter!.points['p2'].state).toBe('predicted');
    expect(s.scatter!.points['p2'].label).toBe(1);
    expect(s.scatter!.line).toMatchObject({
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      state: 'updating',
    });

    applyEvent(s, {
      v: V,
      type: 'calc-loss',
      loss: 0.42,
      epoch: 1,
    } as AlgorithmEvent);
    expect(s.scatter!.lossCurve).toHaveLength(1);
    expect(s.scatter!.lossCurve![0]).toEqual({ x: 1, y: 0.42 });

    applyEvent(s, {
      v: V,
      type: 'calc-gradients',
      gradients: { w: 0.1, b: 0.05 },
      epoch: 1,
    } as AlgorithmEvent);

    applyEvent(s, {
      v: V,
      type: 'update-params',
      params: { w: 0.9, b: 0.01 },
      epoch: 1,
    } as AlgorithmEvent);
    expect(s.scatter!.line!.state).toBe('updating');

    applyEvent(s, {
      v: V,
      type: 'compute-activation',
      pointId: 'p1',
      activation: 0.75,
      predictedSign: 1,
    } as AlgorithmEvent);
    expect(s.scatter!.points['p1'].state).toBe('comparing');

    applyEvent(s, {
      v: V,
      type: 'misclassify-check',
      pointId: 'p2',
      predictedSign: -1,
      trueLabel: 1,
      isWrong: true,
    } as AlgorithmEvent);
    expect(s.scatter!.points['p2'].state).toBe('misclassified');

    applyEvent(s, {
      v: V,
      type: 'misclassify-check',
      pointId: 'p3',
      predictedSign: 1,
      trueLabel: 0,
      isWrong: false,
    } as AlgorithmEvent);
    expect(s.scatter!.points['p3'].state).toBe('correct');

    applyEvent(s, {
      v: V,
      type: 'convergence-check',
      iteration: 9,
      changedCount: 0,
      converged: true,
    } as AlgorithmEvent);
    expect(s.scatter!.centroids!['c1'].state).toBe('converged');
  });

  it('cloneVisState round-trips scatter state deep-equal', () => {
    const s = initialVisState(scatterInput);
    applyEvent(s, {
      v: V,
      type: 'move-centroid',
      centroidId: 'c1',
      clusterId: 1,
      oldX: 0,
      oldY: 0,
      newX: 5,
      newY: 6,
    } as AlgorithmEvent);
    applyEvent(s, {
      v: V,
      type: 'predict',
      pointId: 'p2',
      yPred: 0.8,
      yTrue: 1,
      lineX1: 0,
      lineY1: 0,
      lineX2: 10,
      lineY2: 10,
    } as AlgorithmEvent);
    applyEvent(s, {
      v: V,
      type: 'calc-loss',
      loss: 0.42,
      epoch: 1,
    } as AlgorithmEvent);
    const cloned = cloneVisState(s);
    expect(cloned).not.toBe(s);
    expect(cloned.scatter).not.toBe(s.scatter);
    expect(cloned.scatter!.points).not.toBe(s.scatter!.points);
    expect(cloned).toEqual(s);
  });

  it('resets scatter transient points (comparing/neighbor) at start of applyEvent', () => {
    const s = initialVisState(scatterInput);
    applyEvent(s, {
      v: V,
      type: 'neighbor-select',
      pointIds: ['p1', 'p2'],
      k: 2,
    } as AlgorithmEvent);
    expect(s.scatter!.points['p1'].state).toBe('neighbor');
    expect(s.scatter!.points['p2'].state).toBe('neighbor');
    applyEvent(s, {
      v: V,
      type: 'distance-calc',
      pointId: 'p3',
      x: 5,
      y: 6,
      queryX: 2.5,
      queryY: 3.5,
      distance: 3.5,
    } as AlgorithmEvent);
    expect(s.scatter!.points['p1'].state).toBe('default');
    expect(s.scatter!.points['p2'].state).toBe('default');
    expect(s.scatter!.points['p3'].state).toBe('comparing');
  });
});
