/**
 * Merge Sort — AlgorithmDefinition module.
 *
 * Line maps refer to ./solutions/merge-sort-solutions.ts — keep in sync.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ArrayInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { MERGE_SORT_SOLUTIONS } from './solutions/merge-sort-solutions';

function assertArray(input: AlgorithmInput): asserts input is ArrayInput {
  if (input.kind !== 'array') throw new Error('merge-sort expects an array input');
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertArray(input);
  const a = [...input.values]; // never mutate the caller's input
  const buf = new Array<number>(a.length);

  yield {
    v: 1,
    type: 'annotate',
    text: `Merge sort: ${a.length} elements. Split in half, sort each half, merge the sorted halves.`,
  };

  function* merge(lo: number, mid: number, hi: number): Generator<AlgorithmEvent> {
    yield {
      v: 1,
      type: 'range-focus',
      lo,
      hi,
      label: `merge [${lo}..${mid}] + [${mid + 1}..${hi}]`,
      line: { cpp: 23, java: 15, python: 28 },
      note: `Merge the two sorted halves of [${lo}, ${hi}]`,
    };
    for (let k = lo; k <= hi; k++) buf[k] = a[k]; // copy the window
    let i = lo;
    let j = mid + 1;
    yield {
      v: 1,
      type: 'pointer-move',
      pointers: { i, j, k: lo },
      line: { cpp: 9, java: 20, python: 11 },
      note: 'Read heads at the front of each half',
    };
    for (let k = lo; k <= hi; k++) {
      if (i > mid) {
        a[k] = buf[j++];
        yield {
          v: 1,
          type: 'write',
          index: k,
          value: a[k],
          line: { cpp: 11, java: 22, python: 14 },
          note: `Left half exhausted — take ${a[k]} from the right`,
        };
      } else if (j > hi) {
        a[k] = buf[i++];
        yield {
          v: 1,
          type: 'write',
          index: k,
          value: a[k],
          line: { cpp: 12, java: 23, python: 16 },
          note: `Right half exhausted — take ${a[k]} from the left`,
        };
      } else {
        const result = buf[i] < buf[j] ? -1 : buf[i] > buf[j] ? 1 : 0;
        yield {
          v: 1,
          type: 'compare',
          i,
          j,
          result,
          line: { cpp: 13, java: 24, python: 17 },
          note: `Compare heads: ${buf[i]} vs ${buf[j]}`,
        };
        if (result !== 1) {
          a[k] = buf[i++]; // stable: left wins ties
          yield {
            v: 1,
            type: 'write',
            index: k,
            value: a[k],
            line: { cpp: 13, java: 24, python: 18 },
            note: `${a[k]} from the left half → slot ${k}`,
          };
        } else {
          a[k] = buf[j++];
          yield {
            v: 1,
            type: 'write',
            index: k,
            value: a[k],
            line: { cpp: 14, java: 25, python: 20 },
            note: `${a[k]} from the right half → slot ${k}`,
          };
        }
      }
      yield { v: 1, type: 'pointer-move', pointers: { i: i <= mid ? i : null, j: j <= hi ? j : null, k: k + 1 <= hi ? k + 1 : null } };
    }
  }

  function* sort(lo: number, hi: number): Generator<AlgorithmEvent> {
    if (lo >= hi) return; // 0 or 1 element: already sorted
    const mid = lo + Math.floor((hi - lo) / 2);
    yield {
      v: 1,
      type: 'range-focus',
      lo,
      hi,
      label: `split at ${mid}`,
      line: { cpp: 20, java: 12, python: 25 },
      note: `Split [${lo}, ${hi}] at ${mid}`,
    };
    yield* sort(lo, mid);
    yield* sort(mid + 1, hi);
    yield* merge(lo, mid, hi);
  }

  yield* sort(0, a.length - 1);

  if (a.length > 0) {
    yield { v: 1, type: 'mark-sorted', indices: a.map((_, i) => i) };
  }
  yield { v: 1, type: 'done', summary: `Sorted: [${a.join(', ')}]` };
}

export const mergeSort: AlgorithmDefinition = {
  id: 'merge-sort',
  name: 'Merge Sort',
  category: 'sorting',
  difficulty: 'medium',
  bigO: 'O(n log n)',
  summary:
    'Recursively splits the array in half, sorts each half, then merges the two sorted halves — guaranteed O(n log n) in every case.',
  realWorldUse:
    'The backbone of stable sorting at scale: external sorting of files too big for memory, the merge step of Timsort (Python/Java standard sorts), and merging sorted database runs or log streams.',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    stable: true,
    intuition:
      'Splitting in half repeatedly builds a recursion tree log₂(n) levels deep, and merging every window on one level touches each element exactly once — n work per level. So the total is n · log n regardless of input order, which is why merge sort has no bad case. The price is the auxiliary buffer: merging needs O(n) extra space. Taking from the left half on ties keeps equal elements in their original order — stable.',
  },
  defaultInput: { kind: 'array', values: [7, 3, 9, 1, 6, 2, 8, 5] },
  presets: [
    { label: 'Sorted', input: { kind: 'array', values: [1, 2, 3, 4, 5, 6, 7, 8] } },
    { label: 'Reversed', input: { kind: 'array', values: [8, 7, 6, 5, 4, 3, 2, 1] } },
    { label: 'Two runs', input: { kind: 'array', values: [1, 3, 5, 7, 2, 4, 6, 8] } },
  ],
  run,
  solutions: MERGE_SORT_SOLUTIONS,
  examples: [
    {
      title: 'Merging two sorted halves',
      input: { kind: 'array', values: [1, 3, 5, 7, 2, 4, 6, 8] },
      narration: [
        'The recursion first splits down to single elements and merges the quarters back into two sorted halves: [1, 3, 5, 7] and [2, 4, 6, 8].',
        'The final merge walks both halves with read heads i and j: 1 vs 2 → take 1, then 3 vs 2 → take 2, then 3 vs 4 → take 3… Each comparison moves one head forward and fills one output slot.',
        'When the left head passes 7, the left half is exhausted and the right half\'s remaining values (8) are copied straight across. Every element was touched once per level — n work on each of log n levels.',
      ],
      output: '[1, 2, 3, 4, 5, 6, 7, 8]',
    },
    {
      title: 'Already sorted is NOT faster',
      input: { kind: 'array', values: [1, 2, 3, 4] },
      narration: [
        'Merge sort splits and merges [1, 2] and [3, 4] exactly as it would for any input — the recursion shape depends only on n, never on the values.',
        'That is the trade-off against bubble/insertion sort: no O(n) best case, but also no O(n²) worst case. Every input costs Θ(n log n).',
      ],
      output: '[1, 2, 3, 4]',
    },
  ],
  problem: {
    statement:
      'Implement merge sort. Read a line of space-separated integers from standard input and print them in non-decreasing order, space-separated, on one line. You must sort with the merge sort algorithm (recursive split + merge of sorted halves) — built-in sort functions will be flagged by the AI grader.',
    signatures: {
      cpp: 'void mergeSort(std::vector<int>& a)',
      java: 'static void mergeSort(int[] a)',
      python: 'def merge_sort(a: list[int]) -> None',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>

void mergeSort(std::vector<int>& a) {
    // TODO: implement merge sort (recursive split + merge)
}

int main() {
    std::vector<int> a;
    int x;
    while (std::cin >> x) a.push_back(x);
    mergeSort(a);
    for (size_t i = 0; i < a.size(); i++)
        std::cout << a[i] << (i + 1 < a.size() ? " " : "\\n");
}
`,
      java: `import java.util.*;

public class Main {
    static void mergeSort(int[] a) {
        // TODO: implement merge sort (recursive split + merge)
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> list = new ArrayList<>();
        while (sc.hasNextInt()) list.add(sc.nextInt());
        int[] a = list.stream().mapToInt(Integer::intValue).toArray();
        mergeSort(a);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < a.length; i++) sb.append(a[i]).append(i + 1 < a.length ? " " : "");
        System.out.println(sb);
    }
}
`,
      python: `import sys

def merge_sort(a: list[int]) -> None:
    # TODO: implement merge sort (recursive split + merge)
    pass

def main():
    a = [int(x) for x in sys.stdin.read().split()]
    merge_sort(a)
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
      { input: '1 3 5 7 2 4 6 8', expected: '1 2 3 4 5 6 7 8', hidden: true, label: 'two runs' },
      {
        input: Array.from({ length: 100 }, (_, i) => ((i * 37) % 100) - 50).join(' '),
        expected: Array.from({ length: 100 }, (_, i) => ((i * 37) % 100) - 50).sort((x, y) => x - y).join(' '),
        hidden: true,
        label: 'n=100 stress',
      },
    ],
  },
};
