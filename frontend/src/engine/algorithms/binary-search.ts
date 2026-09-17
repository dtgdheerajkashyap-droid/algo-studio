/**
 * Binary Search — AlgorithmDefinition module.
 *
 * Line maps refer to ./solutions/binary-search-solutions.ts — keep in sync.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  ArrayInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { BINARY_SEARCH_SOLUTIONS } from './solutions/binary-search-solutions';

function assertArray(input: AlgorithmInput): asserts input is ArrayInput {
  if (input.kind !== 'array') throw new Error('binary-search expects an array input');
}

function isSorted(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
  return true;
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertArray(input);
  const a = [...input.values]; // never mutate the caller's input
  // Randomize/custom input may omit a target — default to the middle element
  // so the trace always demonstrates a successful search.
  const target = input.target ?? a[Math.floor(a.length / 2)];

  if (!isSorted(a)) {
    yield {
      v: 1,
      type: 'annotate',
      text: 'Warning: input is not sorted. Binary search requires a sorted array — the result below may be wrong.',
    };
  }
  yield {
    v: 1,
    type: 'annotate',
    text: `Binary search for ${target}: repeatedly halve a [lo, hi] window and discard the half that cannot contain the target.`,
  };

  let lo = 0;
  let hi = a.length - 1;
  yield {
    v: 1,
    type: 'pointer-move',
    pointers: { lo, hi },
    line: { cpp: 8, java: 6, python: 7 },
    note: `Window starts as the whole array: [${lo}, ${hi}]`,
  };
  if (a.length > 0) {
    yield { v: 1, type: 'range-focus', lo, hi, label: 'search window' };
  }

  let steps = 0;
  while (lo <= hi) {
    steps++;
    const mid = lo + Math.floor((hi - lo) / 2);
    yield {
      v: 1,
      type: 'pointer-move',
      pointers: { mid },
      line: { cpp: 10, java: 8, python: 9 },
      note: `Step ${steps}: mid = ${mid}`,
    };
    yield {
      v: 1,
      type: 'read',
      index: mid,
      line: { cpp: 11, java: 9, python: 10 },
      note: `a[${mid}] = ${a[mid]} vs target ${target}`,
    };
    if (a[mid] === target) {
      yield {
        v: 1,
        type: 'mark-sorted',
        indices: [mid],
        line: { cpp: 12, java: 10, python: 11 },
        note: `Found ${target} at index ${mid}`,
      };
      yield {
        v: 1,
        type: 'done',
        summary: `Found ${target} at index ${mid} in ${steps} step${steps === 1 ? '' : 's'} (window halved each time).`,
      };
      return;
    }
    if (a[mid] < target) {
      lo = mid + 1;
      yield {
        v: 1,
        type: 'pointer-move',
        pointers: { lo, mid: null },
        line: { cpp: 14, java: 12, python: 13 },
        note: `${a[mid]} < ${target}: discard the left half, lo = ${lo}`,
      };
    } else {
      hi = mid - 1;
      yield {
        v: 1,
        type: 'pointer-move',
        pointers: { hi, mid: null },
        line: { cpp: 16, java: 14, python: 15 },
        note: `${a[mid]} > ${target}: discard the right half, hi = ${hi}`,
      };
    }
    if (lo <= hi) {
      yield { v: 1, type: 'range-focus', lo, hi, label: 'search window' };
    }
  }

  yield {
    v: 1,
    type: 'annotate',
    text: `Window emptied (lo ${lo} > hi ${hi}) — ${target} is not in the array.`,
    line: { cpp: 18, java: 16, python: 16 },
  };
  yield {
    v: 1,
    type: 'done',
    summary: `${target} not found: returned -1 after ${steps} step${steps === 1 ? '' : 's'}.`,
  };
}

export const binarySearch: AlgorithmDefinition = {
  id: 'binary-search',
  name: 'Binary Search',
  category: 'searching',
  difficulty: 'easy',
  bigO: 'O(log n)',
  summary:
    'Finds a target in a sorted array by repeatedly halving a search window: compare the middle element and discard the half that cannot contain the target.',
  realWorldUse:
    'Everywhere sorted data lives: database index lookups, std::lower_bound / bisect, git bisect for finding the commit that broke a build, and "guess the number" style problems over any monotonic condition.',
  complexity: {
    time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(1)',
    intuition:
      'Each comparison discards half of the remaining window, so the window shrinks n → n/2 → n/4 → … and empties after about log₂(n) steps: searching a million elements takes at most ~20 comparisons. The best case is the target sitting exactly at the first midpoint. Only three index variables are ever stored, so space is O(1). The catch: the array must already be sorted.',
  },
  defaultInput: { kind: 'array', values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
  presets: [
    {
      label: 'Found (first probe)',
      input: { kind: 'array', values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 16 },
    },
    {
      label: 'Not found',
      input: { kind: 'array', values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 40 },
    },
    {
      label: 'Edges',
      input: { kind: 'array', values: [1, 3, 5, 7, 9, 11, 13], target: 1 },
    },
  ],
  run,
  solutions: BINARY_SEARCH_SOLUTIONS,
  examples: [
    {
      title: 'Target found in three probes',
      input: { kind: 'array', values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
      narration: [
        'Window [0, 9]: mid = 4, a[4] = 16 < 23 — the target must be right of index 4, so lo becomes 5.',
        'Window [5, 9]: mid = 7, a[7] = 56 > 23 — the target must be left of index 7, so hi becomes 6.',
        'Window [5, 6]: mid = 5, a[5] = 23 — found! Ten elements needed only three probes; each one halved the window.',
      ],
      output: 'index 5',
    },
    {
      title: 'Target absent: the window empties',
      input: { kind: 'array', values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 40 },
      narration: [
        'Probes at 16, 56, 23, then 38 successively squeeze the window: [0,9] → [5,9] → [5,6] → [6,6].',
        'After a[6] = 38 < 40, lo becomes 7 while hi is still 6 — lo > hi means the window is empty. No slot can hold 40, so the answer is -1.',
      ],
      output: '-1',
    },
  ],
  problem: {
    statement:
      'Implement binary search. Input: the first line contains a sorted list of space-separated integers; the second line contains the target. Print the index of the target (0-based), or -1 if it is not present. Your solution must run in O(log n) — a linear scan will be flagged by the AI grader.',
    signatures: {
      cpp: 'int binarySearch(const std::vector<int>& a, int target)',
      java: 'static int binarySearch(int[] a, int target)',
      python: 'def binary_search(a: list[int], target: int) -> int',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>

int binarySearch(const std::vector<int>& a, int target) {
    // TODO: implement binary search
    return -1;
}

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::istringstream in(line);
    std::vector<int> a;
    int x;
    while (in >> x) a.push_back(x);
    int target;
    std::cin >> target;
    std::cout << binarySearch(a, target) << "\\n";
}
`,
      java: `import java.util.*;

public class Main {
    static int binarySearch(int[] a, int target) {
        // TODO: implement binary search
        return -1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] a = parts[0].isEmpty() ? new int[0] : Arrays.stream(parts).mapToInt(Integer::parseInt).toArray();
        int target = Integer.parseInt(sc.nextLine().trim());
        System.out.println(binarySearch(a, target));
    }
}
`,
      python: `import sys

def binary_search(a: list[int], target: int) -> int:
    # TODO: implement binary search
    return -1

def main():
    lines = sys.stdin.read().splitlines()
    a = [int(x) for x in lines[0].split()] if lines and lines[0].strip() else []
    target = int(lines[1])
    print(binary_search(a, target))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(log n)',
    tests: [
      { input: '2 5 8 12 16 23 38 56 72 91\n23', expected: '5', hidden: false, label: 'sample 1' },
      { input: '2 5 8 12 16 23 38 56 72 91\n40', expected: '-1', hidden: false, label: 'sample 2 (absent)' },
      { input: '7\n7', expected: '0', hidden: true, label: 'single element hit' },
      { input: '7\n3', expected: '-1', hidden: true, label: 'single element miss' },
      { input: '1 3 5 7 9\n1', expected: '0', hidden: true, label: 'first element' },
      { input: '1 3 5 7 9\n9', expected: '4', hidden: true, label: 'last element' },
      { input: '1 3 5 7 9\n0', expected: '-1', hidden: true, label: 'below range' },
      { input: '1 3 5 7 9\n10', expected: '-1', hidden: true, label: 'above range' },
      { input: '-10 -5 0 5 10\n-5', expected: '1', hidden: true, label: 'negatives' },
      {
        input: `${Array.from({ length: 100 }, (_, i) => i * 3).join(' ')}\n297`,
        expected: '99',
        hidden: true,
        label: 'n=100, last index',
      },
      {
        input: `${Array.from({ length: 100 }, (_, i) => i * 3).join(' ')}\n100`,
        expected: '-1',
        hidden: true,
        label: 'n=100, between elements',
      },
    ],
  },
};
