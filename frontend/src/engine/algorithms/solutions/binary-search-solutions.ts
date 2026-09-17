/**
 * Binary Search reference solutions.
 *
 * IMPORTANT: the generator in ../binary-search.ts embeds line maps that point
 * into these exact files. If you edit line positions here, update the maps.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
using std::vector;

// Binary search: repeatedly halve a [lo, hi] window over a SORTED
// array. Compare the middle element with the target and discard the
// half that cannot contain it. Returns the index of target, or -1.
int binarySearch(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;   // midpoint (overflow-safe)
        if (a[mid] == target)
            return mid;                 // found it
        if (a[mid] < target)
            lo = mid + 1;               // target is in the right half
        else
            hi = mid - 1;               // target is in the left half
    }
    return -1;                          // window emptied: not present
}
`;

const java = `// Binary search: repeatedly halve a [lo, hi] window over a SORTED
// array. Compare the middle element with the target and discard the
// half that cannot contain it. Returns the index of target, or -1.
class BinarySearch {
    static int binarySearch(int[] a, int target) {
        int lo = 0, hi = a.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;  // midpoint (overflow-safe)
            if (a[mid] == target)
                return mid;                // found it
            if (a[mid] < target)
                lo = mid + 1;              // target is in the right half
            else
                hi = mid - 1;              // target is in the left half
        }
        return -1;                         // window emptied: not present
    }
}
`;

const python = `def binary_search(a: list[int], target: int) -> int:
    """Return the index of target in the sorted list a, or -1.

    Repeatedly halve a [lo, hi] window: compare the middle element
    with the target and discard the half that cannot contain it.
    """
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid                 # found it
        if a[mid] < target:
            lo = mid + 1               # target is in the right half
        else:
            hi = mid - 1               # target is in the left half
    return -1                          # window emptied: not present
`;

export const BINARY_SEARCH_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
