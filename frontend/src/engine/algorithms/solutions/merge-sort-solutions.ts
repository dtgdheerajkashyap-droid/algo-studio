/**
 * Merge Sort reference solutions.
 *
 * IMPORTANT: the generator in ../merge-sort.ts embeds line maps that point
 * into these exact files. If you edit line positions here, update the maps.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
using std::vector;

// Merge sort (top-down): recursively split [lo, hi] in half, sort
// each half, then merge the two sorted halves through an auxiliary
// buffer. O(n log n) in every case, and stable.
static void merge(vector<int>& a, vector<int>& buf, int lo, int mid, int hi) {
    for (int k = lo; k <= hi; ++k) buf[k] = a[k];   // copy the window
    int i = lo, j = mid + 1;                        // heads of both halves
    for (int k = lo; k <= hi; ++k) {
        if (i > mid)               a[k] = buf[j++]; // left half exhausted
        else if (j > hi)           a[k] = buf[i++]; // right half exhausted
        else if (buf[i] <= buf[j]) a[k] = buf[i++]; // stable: left wins ties
        else                       a[k] = buf[j++]; // right head is smaller
    }
}

static void sort(vector<int>& a, vector<int>& buf, int lo, int hi) {
    if (lo >= hi) return;           // 0 or 1 element: already sorted
    int mid = lo + (hi - lo) / 2;   // split point
    sort(a, buf, lo, mid);          // sort the left half
    sort(a, buf, mid + 1, hi);      // sort the right half
    merge(a, buf, lo, mid, hi);     // merge the sorted halves
}

void mergeSort(vector<int>& a) {
    vector<int> buf(a.size());      // one auxiliary buffer, reused
    sort(a, buf, 0, (int)a.size() - 1);
}
`;

const java = `// Merge sort (top-down): recursively split [lo, hi] in half, sort
// each half, then merge the two sorted halves through an auxiliary
// buffer. O(n log n) in every case, and stable.
class MergeSort {
    static void mergeSort(int[] a) {
        int[] buf = new int[a.length];  // one auxiliary buffer, reused
        sort(a, buf, 0, a.length - 1);
    }

    static void sort(int[] a, int[] buf, int lo, int hi) {
        if (lo >= hi) return;           // 0 or 1 element: already sorted
        int mid = lo + (hi - lo) / 2;   // split point
        sort(a, buf, lo, mid);          // sort the left half
        sort(a, buf, mid + 1, hi);      // sort the right half
        merge(a, buf, lo, mid, hi);     // merge the sorted halves
    }

    static void merge(int[] a, int[] buf, int lo, int mid, int hi) {
        for (int k = lo; k <= hi; k++) buf[k] = a[k];  // copy the window
        int i = lo, j = mid + 1;                       // heads of both halves
        for (int k = lo; k <= hi; k++) {
            if (i > mid)               a[k] = buf[j++]; // left half exhausted
            else if (j > hi)           a[k] = buf[i++]; // right half exhausted
            else if (buf[i] <= buf[j]) a[k] = buf[i++]; // stable: left wins ties
            else                       a[k] = buf[j++]; // right head is smaller
        }
    }
}
`;

const python = `def merge_sort(a: list[int]) -> None:
    """Sort a in place with top-down merge sort.

    Recursively split [lo, hi] in half, sort each half, then merge
    the two sorted halves through an auxiliary buffer. Stable.
    """
    buf = [0] * len(a)                   # one auxiliary buffer, reused

    def merge(lo: int, mid: int, hi: int) -> None:
        buf[lo : hi + 1] = a[lo : hi + 1]   # copy the window
        i, j = lo, mid + 1                  # heads of both halves
        for k in range(lo, hi + 1):
            if i > mid:                     # left half exhausted
                a[k] = buf[j]; j += 1
            elif j > hi:                    # right half exhausted
                a[k] = buf[i]; i += 1
            elif buf[i] <= buf[j]:          # stable: left wins ties
                a[k] = buf[i]; i += 1
            else:                           # right head is smaller
                a[k] = buf[j]; j += 1

    def sort(lo: int, hi: int) -> None:
        if lo >= hi:                        # 0 or 1 element: already sorted
            return
        mid = (lo + hi) // 2                # split point
        sort(lo, mid)                       # sort the left half
        sort(mid + 1, hi)                   # sort the right half
        merge(lo, mid, hi)                  # merge the sorted halves

    sort(0, len(a) - 1)
`;

export const MERGE_SORT_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
