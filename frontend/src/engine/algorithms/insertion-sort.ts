/**
 * Insertion Sort — AlgorithmDefinition module.
 *
 * Line maps below refer to the reference solutions in
 * ./solutions/insertion-sort-solutions.ts — keep both in sync when editing.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ArrayInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { INSERTION_SORT_SOLUTIONS } from './solutions/insertion-sort-solutions';

function assertArray(input: AlgorithmInput): asserts input is ArrayInput {
  if (input.kind !== 'array') throw new Error('insertion-sort expects an array input');
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertArray(input);
  const a = [...input.values]; // never mutate the caller's input

  yield {
    v: 1,
    type: 'annotate',
    text: `Insertion sort: ${a.length} elements. Grow a sorted prefix by inserting each new value into its place.`,
  };

  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    yield {
      v: 1,
      type: 'read',
      index: i,
      line: { cpp: 9, java: 7, python: 8 },
      note: `Pick up key a[${i}] = ${key}`,
    };
    yield {
      v: 1,
      type: 'pointer-move',
      pointers: { i, j: i },
      line: { cpp: 10, java: 8, python: 9 },
    };
    let j = i;
    while (j > 0) {
      const result = a[j - 1] > key ? 1 : a[j - 1] < key ? -1 : 0;
      yield {
        v: 1,
        type: 'compare',
        i: j - 1,
        j,
        result,
        line: { cpp: 11, java: 9, python: 10 },
        note: `Is a[${j - 1}] = ${a[j - 1]} greater than key ${key}?`,
      };
      if (result !== 1) break; // prefix value not larger — gap found
      a[j] = a[j - 1];
      yield {
        v: 1,
        type: 'write',
        index: j,
        value: a[j],
        line: { cpp: 12, java: 10, python: 11 },
        note: `Shift ${a[j]} one slot right`,
      };
      j--;
      yield {
        v: 1,
        type: 'pointer-move',
        pointers: { j },
        line: { cpp: 13, java: 11, python: 12 },
      };
    }
    a[j] = key;
    yield {
      v: 1,
      type: 'write',
      index: j,
      value: key,
      line: { cpp: 15, java: 13, python: 13 },
      note: `Drop key ${key} into slot ${j}`,
    };
  }
  if (a.length > 0) {
    yield { v: 1, type: 'mark-sorted', indices: a.map((_, i) => i) };
  }
  yield { v: 1, type: 'done', summary: `Sorted: [${a.join(', ')}]` };
}

export const insertionSort: AlgorithmDefinition = {
  id: 'insertion-sort',
  name: 'Insertion Sort',
  category: 'sorting',
  difficulty: 'easy',
  bigO: 'O(n²)',
  summary:
    'Grows a sorted prefix one element at a time: pick up the next value, shift larger prefix values right, and drop it into the gap.',
  realWorldUse:
    'The fastest choice for tiny or nearly-sorted inputs — real-world hybrid sorts (Timsort, introsort) switch to insertion sort for small subarrays, and it powers online sorting where elements arrive one at a time.',
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    intuition:
      'Each new key is compared against the sorted prefix until a smaller-or-equal value is found. On random input that scan covers half the prefix on average, so total work is about n²/4 — quadratic. On an already-sorted array every scan stops after one comparison, giving the O(n) best case. Shifts move values one slot at a time and equal keys never pass each other, so the sort is stable and in place.',
  },
  defaultInput: { kind: 'array', values: [7, 3, 9, 1, 6, 2, 8, 5, 4] },
  presets: [
    { label: 'Sorted', input: { kind: 'array', values: [1, 2, 3, 4, 5, 6, 7, 8, 9] } },
    { label: 'Reversed', input: { kind: 'array', values: [9, 8, 7, 6, 5, 4, 3, 2, 1] } },
    { label: 'Nearly sorted', input: { kind: 'array', values: [1, 2, 4, 3, 5, 6, 8, 7, 9] } },
  ],
  run,
  solutions: INSERTION_SORT_SOLUTIONS,
  examples: [
    {
      title: 'Small array, shifts in action',
      input: { kind: 'array', values: [3, 1, 2] },
      narration: [
        'i = 1: pick up key 1. Prefix value 3 is larger, so 3 shifts right → [3, 3, 2]. The scan hits the front of the array, so 1 drops into slot 0 → [1, 3, 2].',
        'i = 2: pick up key 2. Prefix value 3 is larger and shifts right → [1, 3, 3]. Next prefix value 1 is not larger, so the scan stops and 2 drops into slot 1 → [1, 2, 3]. Sorted.',
      ],
      output: '[1, 2, 3]',
    },
    {
      title: 'Already sorted (best case)',
      input: { kind: 'array', values: [1, 2, 3, 4] },
      narration: [
        'Each key is immediately not-larger than the value before it, so every inner scan stops after a single comparison and no shifts happen.',
        'Total work: n − 1 comparisons and zero shifts — the O(n) best case that makes insertion sort ideal for nearly-sorted data.',
      ],
      output: '[1, 2, 3, 4]',
    },
  ],
  problem: {
    statement:
      'Implement insertion sort. Read a line of space-separated integers from standard input and print them in non-decreasing order, space-separated, on one line. You must sort with the insertion sort algorithm (grow a sorted prefix, shifting larger values right to insert each key) — built-in sort functions will be flagged by the AI grader.',
    signatures: {
      cpp: 'void insertionSort(std::vector<int>& a)',
      java: 'static void insertionSort(int[] a)',
      python: 'def insertion_sort(a: list[int]) -> None',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>

void insertionSort(std::vector<int>& a) {
    // TODO: implement insertion sort
}

int main() {
    std::vector<int> a;
    int x;
    while (std::cin >> x) a.push_back(x);
    insertionSort(a);
    for (size_t i = 0; i < a.size(); i++)
        std::cout << a[i] << (i + 1 < a.size() ? " " : "\\n");
}
`,
      java: `import java.util.*;

public class Main {
    static void insertionSort(int[] a) {
        // TODO: implement insertion sort
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        while (sc.hasNextInt()) list.add(sc.nextInt());
        int[] a = list.stream().mapToInt(Integer::intValue).toArray();
        insertionSort(a);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < a.length; i++) sb.append(a[i]).append(i + 1 < a.length ? " " : "");
        System.out.println(sb);
    }
}
`,
      python: `import sys

def insertion_sort(a: list[int]) -> None:
    # TODO: implement insertion sort (in place)
    pass

def main():
    a = [int(x) for x in sys.stdin.read().split()]
    insertion_sort(a)
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
