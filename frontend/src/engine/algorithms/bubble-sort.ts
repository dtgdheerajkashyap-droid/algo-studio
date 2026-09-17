/**
 * Bubble Sort — AlgorithmDefinition module.
 *
 * Line maps below refer to the reference solutions in ./solutions.ts —
 * keep both in sync when editing.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ArrayInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { BUBBLE_SORT_SOLUTIONS } from './solutions/bubble-sort-solutions';

function assertArray(input: AlgorithmInput): asserts input is ArrayInput {
  if (input.kind !== 'array') throw new Error('bubble-sort expects an array input');
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertArray(input);
  const a = [...input.values]; // never mutate the caller's input

  yield { v: 1, type: 'annotate', text: `Bubble sort: ${a.length} elements. Each pass bubbles the largest remaining value to the end.` };

  for (let pass = 0; pass < a.length - 1; pass++) {
    let swapped = false;
    yield {
      v: 1,
      type: 'pointer-move',
      pointers: { pass, j: 0 },
      line: { cpp: 8, java: 6, python: 6 },
      note: `Pass ${pass + 1}`,
    };
    for (let j = 0; j < a.length - 1 - pass; j++) {
      const result = a[j] < a[j + 1] ? -1 : a[j] > a[j + 1] ? 1 : 0;
      yield {
        v: 1,
        type: 'compare',
        i: j,
        j: j + 1,
        result,
        line: { cpp: 11, java: 9, python: 9 },
      };
      if (result === 1) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        yield {
          v: 1,
          type: 'swap',
          i: j,
          j: j + 1,
          line: { cpp: 12, java: 10, python: 10 },
        };
      }
    }
    // Largest remaining value is now locked in at the end.
    yield {
      v: 1,
      type: 'mark-sorted',
      indices: [a.length - 1 - pass],
      line: { cpp: 8, java: 6, python: 6 },
    };
    if (!swapped) {
      yield {
        v: 1,
        type: 'annotate',
        text: 'No swaps this pass — array is already sorted. Early exit.',
        line: { cpp: 17, java: 16, python: 13 },
      };
      break;
    }
  }
  // Everything not yet marked is sorted too.
  yield {
    v: 1,
    type: 'mark-sorted',
    indices: a.map((_, i) => i),
  };
  yield { v: 1, type: 'done', summary: `Sorted: [${a.join(', ')}]` };
}

export const bubbleSort: AlgorithmDefinition = {
  id: 'bubble-sort',
  name: 'Bubble Sort',
  category: 'sorting',
  difficulty: 'easy',
  bigO: 'O(n²)',
  summary:
    'Repeatedly steps through the list, swapping adjacent elements that are out of order, until no swaps are needed.',
  realWorldUse:
    'Rarely used in production, but its "detect if already sorted in one pass" property makes it a cheap sortedness check, and it is the canonical teaching algorithm for comparison sorting.',
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    intuition:
      'Each pass compares every adjacent pair, so a full run costs about n·(n−1)/2 comparisons — quadratic. The best case is a single pass over an already-sorted array: no swaps happen, the early-exit flag stays false, and we stop after n−1 comparisons. Only adjacent swaps are used, so equal elements never jump over each other — the sort is stable — and everything happens in place.',
  },
  defaultInput: { kind: 'array', values: [7, 3, 9, 1, 6, 2, 8, 5, 4] },
  presets: [
    { label: 'Sorted', input: { kind: 'array', values: [1, 2, 3, 4, 5, 6, 7, 8, 9] } },
    { label: 'Reversed', input: { kind: 'array', values: [9, 8, 7, 6, 5, 4, 3, 2, 1] } },
    { label: 'Few unique', input: { kind: 'array', values: [3, 1, 3, 2, 1, 3, 2, 1, 2] } },
  ],
  run,
  solutions: BUBBLE_SORT_SOLUTIONS,
  examples: [
    {
      title: 'Small array, one early exit',
      input: { kind: 'array', values: [3, 1, 2] },
      narration: [
        'Pass 1: compare 3 and 1 — out of order, swap → [1, 3, 2]. Compare 3 and 2 — swap → [1, 2, 3]. The largest value, 3, has bubbled to the end.',
        'Pass 2: compare 1 and 2 — already in order, no swap. No swaps happened this pass, so the array is sorted and we exit early.',
      ],
      output: '[1, 2, 3]',
    },
    {
      title: 'Already sorted (best case)',
      input: { kind: 'array', values: [1, 2, 3, 4] },
      narration: [
        'Pass 1 compares each adjacent pair: (1,2), (2,3), (3,4) — all in order, zero swaps.',
        'The swapped flag is still false after the pass, so bubble sort stops immediately: O(n) best case.',
      ],
      output: '[1, 2, 3, 4]',
    },
  ],
  problem: {
    statement:
      'Implement bubble sort. Read a line of space-separated integers from standard input and print them in non-decreasing order, space-separated, on one line. You must sort with the bubble sort algorithm (adjacent compare-and-swap passes) — built-in sort functions will be flagged by the AI grader.',
    signatures: {
      cpp: 'void bubbleSort(std::vector<int>& a)',
      java: 'static void bubbleSort(int[] a)',
      python: 'def bubble_sort(a: list[int]) -> None',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>

void bubbleSort(std::vector<int>& a) {
    // TODO: implement bubble sort
}

int main() {
    std::vector<int> a;
    int x;
    while (std::cin >> x) a.push_back(x);
    bubbleSort(a);
    for (size_t i = 0; i < a.size(); i++)
        std::cout << a[i] << (i + 1 < a.size() ? " " : "\\n");
}
`,
      java: `import java.util.*;

public class Main {
    static void bubbleSort(int[] a) {
        // TODO: implement bubble sort
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        while (sc.hasNextInt()) list.add(sc.nextInt());
        int[] a = list.stream().mapToInt(Integer::intValue).toArray();
        bubbleSort(a);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < a.length; i++) sb.append(a[i]).append(i + 1 < a.length ? " " : "");
        System.out.println(sb);
    }
}
`,
      python: `import sys

def bubble_sort(a: list[int]) -> None:
    # TODO: implement bubble sort (in place)
    pass

def main():
    a = [int(x) for x in sys.stdin.read().split()]
    bubble_sort(a)
    print(" ".join(map(str, a)))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(n²)',
    tests: [
      { input: '5 2 8 1 9', expected: '1 2 5 8 9', hidden: false, label: 'sample 1' },
      { input: '3 1 2', expected: '1 2 3', hidden: false, label: 'sample 2' },
      { input: '', expected: '', hidden: true, label: 'empty' },
      { input: '42', expected: '42', hidden: true, label: 'single element' },
      { input: '2 2 2 2', expected: '2 2 2 2', hidden: true, label: 'all duplicates' },
      { input: '1 2 3 4 5 6 7 8 9 10', expected: '1 2 3 4 5 6 7 8 9 10', hidden: true, label: 'already sorted' },
      { input: '10 9 8 7 6 5 4 3 2 1', expected: '1 2 3 4 5 6 7 8 9 10', hidden: true, label: 'reversed' },
      { input: '-5 3 -1 0 2 -8', expected: '-8 -5 -1 0 2 3', hidden: true, label: 'negatives' },
      { input: '3 1 3 2 1 3 2 1 2', expected: '1 1 1 2 2 2 3 3 3', hidden: true, label: 'few unique' },
      {
        input: Array.from({ length: 100 }, (_, i) => ((i * 37) % 100) - 50).join(' '),
        expected: Array.from({ length: 100 }, (_, i) => ((i * 37) % 100) - 50).sort((x, y) => x - y).join(' '),
        hidden: true,
        label: 'n=100 stress',
      },
    ],
  },
};
