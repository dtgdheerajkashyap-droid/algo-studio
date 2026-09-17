/**
 * Quick Sort — AlgorithmDefinition module (Lomuto partition, pivot = last element).
 *
 * Line maps below refer to the reference solutions in ./solutions/quick-sort-solutions.ts —
 * keep both in sync when editing.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ArrayInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { QUICK_SORT_SOLUTIONS } from './solutions/quick-sort-solutions';

function assertArray(input: AlgorithmInput): asserts input is ArrayInput {
  if (input.kind !== 'array') throw new Error('quick-sort expects an array input');
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertArray(input);
  const a = [...input.values]; // never mutate the caller's input

  yield {
    v: 1,
    type: 'annotate',
    text: `Quick sort: ${a.length} elements. Partition around a pivot, then recurse on each side.`,
  };

  function* partition(lo: number, hi: number): Generator<AlgorithmEvent, number, void> {
    const pivot = a[hi];
    yield {
      v: 1,
      type: 'range-focus',
      lo,
      hi,
      label: `partition [${lo}..${hi}], pivot = ${pivot}`,
      line: { cpp: 11, java: 36, python: 59 },
      note: `Partition [${lo}, ${hi}] with pivot ${pivot} at index ${hi}`,
    };
    yield {
      v: 1,
      type: 'pointer-move',
      pointers: { i: lo - 1, j: lo, pivot: hi },
      line: { cpp: 13, java: 38, python: 62 },
      note: 'i marks end of "< pivot" region; j scans from lo to hi-1',
    };
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      const result = a[j] < pivot ? -1 : a[j] > pivot ? 1 : 0;
      yield {
        v: 1,
        type: 'compare',
        i: j,
        j: hi,
        result,
        line: { cpp: 15, java: 40, python: 64 },
        note: `Compare a[${j}]=${a[j]} with pivot=${pivot}`,
      };
      if (result === -1) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          yield {
            v: 1,
            type: 'swap',
            i,
            j,
            line: { cpp: 17, java: 42, python: 66 },
            note: `Swap ${a[j]} into the "< pivot" region`,
          };
        }
      }
      yield {
        v: 1,
        type: 'pointer-move',
        pointers: { i, j: j + 1 < hi ? j + 1 : null, pivot: hi },
      };
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    yield {
      v: 1,
      type: 'swap',
      i: i + 1,
      j: hi,
      line: { cpp: 20, java: 45, python: 67 },
      note: `Pivot ${pivot} lands in its final slot at index ${i + 1}`,
    };
    yield {
      v: 1,
      type: 'mark-sorted',
      indices: [i + 1],
      note: `Pivot ${pivot} is now in its correct, final position`,
    };
    return i + 1;
  }

  function* sort(lo: number, hi: number): Generator<AlgorithmEvent> {
    if (lo >= hi) return;
    yield {
      v: 1,
      type: 'range-focus',
      lo,
      hi,
      label: `sort [${lo}..${hi}]`,
      line: { cpp: 25, java: 50, python: 70 },
    };
    const p: number = yield* partition(lo, hi);
    yield* sort(lo, p - 1);
    yield* sort(p + 1, hi);
  }

  yield* sort(0, a.length - 1);

  if (a.length > 0) {
    yield { v: 1, type: 'mark-sorted', indices: a.map((_, i) => i) };
  }
  yield { v: 1, type: 'done', summary: `Sorted: [${a.join(', ')}]` };
}

export const quickSort: AlgorithmDefinition = {
  id: 'quick-sort',
  name: 'Quick Sort',
  category: 'sorting',
  difficulty: 'medium',
  bigO: 'O(n log n)',
  summary:
    'Partitions the array around a pivot (last element, Lomuto scheme), placing the pivot in its final slot, then recursively sorts each side — O(n log n) average, fast in practice.',
  realWorldUse:
    'The in-place, cache-friendly workhorse of standard libraries: C++ std::sort, Rust sort_unstable, Go sort.Slice, and historically the original qsort. Usually augmented with median-of-three pivot selection and a small-sort fallback (like insertion sort) for tiny partitions.',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    space: 'O(log n)',
    stable: false,
    intuition:
      'Each partition does O(hi−lo) work and splits the problem into two subproblems. On random or well-shuffled inputs the splits are roughly balanced, building a log₂n-deep recursion tree with O(n) work per level — total O(n log n). The worst case (already-sorted array, worst pivot every time) produces one n−1-sized subproblem per level, giving 1+2+…+n = O(n²); real implementations avoid this with better pivot selection. Recursion stack depth is O(log n) on average. Swaps can move equal elements past each other, so the sort is not stable.',
  },
  defaultInput: { kind: 'array', values: [7, 3, 9, 1, 6, 2, 8, 5, 4] },
  presets: [
    { label: 'Sorted (worst pivot)', input: { kind: 'array', values: [1, 2, 3, 4, 5, 6, 7, 8, 9] } },
    { label: 'Reversed', input: { kind: 'array', values: [9, 8, 7, 6, 5, 4, 3, 2, 1] } },
    { label: 'Few unique', input: { kind: 'array', values: [3, 1, 3, 2, 1, 3, 2, 1, 2] } },
  ],
  run,
  solutions: QUICK_SORT_SOLUTIONS,
  examples: [
    {
      title: 'Pivot lands mid-array, recursion splits cleanly',
      input: { kind: 'array', values: [5, 2, 8, 1, 9] },
      narration: [
        'First partition on [0..4] uses pivot 9 (last). Every element is less than 9, so the "< pivot" region swallows the whole window. Pivot 9 lands at index 4 — it is already the maximum, so only the left subproblem [0..3] recurses.',
        'Partition on [0..3] uses pivot 1. Nothing is smaller, so i stays at −1 and the pivot swaps to index 0 — another one-sided split. This illustrates why an already-sorted input is the Lomuto scheme\'s worst case: O(n²).',
        'On random inputs the pivots land near the middle most of the time, giving the classic O(n log n) balance that makes quicksort fast in practice.',
      ],
      output: '[1, 2, 5, 8, 9]',
    },
    {
      title: 'All equal (many ties)',
      input: { kind: 'array', values: [3, 1, 3, 2, 1, 3, 2, 1, 2] },
      narration: [
        'With Lomuto partitioning, elements equal to the pivot are treated as "not less than" and stay on the right side of the split. The 3s therefore tend to collect as pivots near the right end of each subarray.',
        'Each pivot swap still grows the "< pivot" region one element at a time, so work stays proportional to n log n on average even with many duplicates. (A three-way "Dutch national flag" partition would collapse duplicates into a single middle block and do even better.)',
      ],
      output: '[1, 1, 1, 2, 2, 2, 3, 3, 3]',
    },
  ],
  problem: {
    statement:
      'Implement quick sort with the Lomuto partition scheme (pivot = last element). Read a line of space-separated integers from standard input and print them in non-decreasing order, space-separated, on one line. You must sort with the quick sort algorithm (partition around a pivot, then recurse) — built-in sort functions will be flagged by the AI grader.',
    signatures: {
      cpp: 'void quickSort(std::vector<int>& a)',
      java: 'static void quickSort(int[] a)',
      python: 'def quick_sort(a: list[int]) -> None',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>

void quickSort(std::vector<int>& a) {
    // TODO: implement quick sort (Lomuto partition, pivot = last element)
}

int main() {
    std::vector<int> a;
    int x;
    while (std::cin >> x) a.push_back(x);
    quickSort(a);
    for (size_t i = 0; i < a.size(); i++)
        std::cout << a[i] << (i + 1 < a.size() ? " " : "\\n");
}
`,
      java: `import java.util.*;

public class Main {
    static void quickSort(int[] a) {
        // TODO: implement quick sort (Lomuto partition, pivot = last element)
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        while (sc.hasNextInt()) list.add(sc.nextInt());
        int[] a = list.stream().mapToInt(Integer::intValue).toArray();
        quickSort(a);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < a.length; i++) sb.append(a[i]).append(i + 1 < a.length ? " " : "");
        System.out.println(sb);
    }
}
`,
      python: `import sys

def quick_sort(a: list[int]) -> None:
    # TODO: implement quick sort (Lomuto partition, pivot = last element)
    pass

def main():
    a = [int(x) for x in sys.stdin.read().split()]
    quick_sort(a)
    print(" ".join(map(str, a)))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(n log n)',
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
