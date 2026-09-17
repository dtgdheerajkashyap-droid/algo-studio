/**
 * Algorithm registry. Adding an algorithm = one module + one entry here.
 */

import type { AlgorithmDefinition } from './definition';
import { bubbleSort } from './algorithms/bubble-sort';
import { insertionSort } from './algorithms/insertion-sort';
import { mergeSort } from './algorithms/merge-sort';
import { binarySearch } from './algorithms/binary-search';
import { quickSort } from './algorithms/quick-sort';
import { bfs } from './algorithms/bfs';
import { dfs } from './algorithms/dfs';
import { dijkstra } from './algorithms/dijkstra';
import { bst } from './algorithms/bst';
import { kNearestNeighbors } from './algorithms/k-nearest-neighbors';
import { kMeans } from './algorithms/k-means';
import { linearRegression } from './algorithms/linear-regression';
import { perceptron } from './algorithms/perceptron';

export const ALGORITHMS: AlgorithmDefinition[] = [
  bubbleSort,
  insertionSort,
  mergeSort,
  quickSort,
  binarySearch,
  bfs,
  dfs,
  dijkstra,
  bst,
  kNearestNeighbors,
  kMeans,
  linearRegression,
  perceptron,
];

const byId = new Map(ALGORITHMS.map((a) => [a.id, a]));

export function getAlgorithm(id: string): AlgorithmDefinition | undefined {
  return byId.get(id);
}
