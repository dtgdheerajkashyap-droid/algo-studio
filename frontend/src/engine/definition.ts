/**
 * AlgorithmDefinition — the plugin interface (spec §2).
 *
 * Every algorithm is a self-contained module conforming to this interface.
 * Adding an algorithm = one module + one registry entry; the catalog card,
 * visualizer, solution tab, examples tab, and practice tab all light up
 * automatically.
 */

import type { AlgorithmEvent, LineMap } from './events';

export type Category = 'sorting' | 'searching' | 'graph' | 'data-structure' | 'ml';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'cpp' | 'java' | 'python';

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ArrayInput {
  kind: 'array';
  values: number[];
  /** Search algorithms also take a target. */
  target?: number;
}

export interface GraphInput {
  kind: 'graph';
  nodes: string[];
  /** [from, to, weight?] — weight defaults to 1. Undirected unless noted. */
  edges: [string, string, number?][];
  directed?: boolean;
  start?: string;
  goal?: string;
}

export interface TreeOpsInput {
  kind: 'tree-ops';
  /** Sequence of operations applied to an initially empty BST. */
  ops: { op: 'insert' | 'search'; value: number }[];
}

export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  label?: string | number | null;
}

export interface ScatterInput {
  kind: 'scatter';
  points: ScatterPoint[];
  query?: { x: number; y: number };
  k?: number;
  alpha?: number;
  iterations?: number;
  seed?: number;
}

export type AlgorithmInput = ArrayInput | GraphInput | TreeOpsInput | ScatterInput;

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

export interface ComplexityInfo {
  time: { best: string; average: string; worst: string };
  space: string;
  stable?: boolean;
  /** One-paragraph intuition for the complexity panel. */
  intuition: string;
}

export interface Solution {
  language: Language;
  /** Idiomatic, commented reference implementation. */
  code: string;
}

export interface WorkedExample {
  title: string;
  input: AlgorithmInput;
  /** Narration paragraphs; the event trace itself is generated live. */
  narration: string[];
  output: string;
}

export interface TestCase {
  /** JSON-encoded stdin for Judge0. */
  input: string;
  expected: string;
  hidden: boolean;
  label?: string;
}

export interface ProblemSpec {
  statement: string;
  /** Fixed function signature per language. */
  signatures: Record<Language, string>;
  /** Starter template per language (full runnable file with IO harness). */
  starters: Record<Language, string>;
  expectedBigO: string;
  tests: TestCase[];
}

export interface AlgorithmDefinition {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  /** Big-O one-liner for the catalog card, e.g. "O(n²)". */
  bigO: string;
  summary: string;
  realWorldUse: string;
  complexity: ComplexityInfo;

  /** Which input kind this algorithm consumes + default/preset inputs. */
  defaultInput: AlgorithmInput;
  presets: { label: string; input: AlgorithmInput }[];

  /**
   * The event-stream generator. Must be deterministic for a given input
   * (snapshot-tested) and must never mutate `input`.
   */
  run: (input: AlgorithmInput) => Generator<AlgorithmEvent>;

  solutions: Solution[];
  /** Line maps keyed by pseudo-step id are embedded in events themselves. */
  examples: WorkedExample[];
  problem: ProblemSpec;
}

/** Helper: build a v1 event with less noise in generators. */
export function ev<T extends AlgorithmEvent>(e: Omit<T, 'v'>): T {
  return { v: 1, ...e } as T;
}

export type { AlgorithmEvent, LineMap };
