/**
 * Quick sort reference solutions. Line maps in ../quick-sort.ts point here — keep in sync.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
using namespace std;

// Lomuto partition: pivot = last element; returns its final index.
int partition(vector<int>& a, int lo, int hi) {
    int pivot = a[hi];               // pivot: the last element
    int i = lo - 1;                  // end of the "< pivot" region
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) {          // compare against the pivot
            i++;
            swap(a[i], a[j]);        // grow the "< pivot" region
        }
    }
    swap(a[i + 1], a[hi]);           // pivot lands in its final slot
    return i + 1;
}

// Quick sort: partition, then recurse on each side of the pivot.
void quickSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;            // 0 or 1 element: done
    int p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);         // left of pivot
    quickSort(a, p + 1, hi);         // right of pivot
}
`;

const java = `// Quick sort with Lomuto partition (pivot = last element).
class QuickSort {
    // Partition [lo..hi] around a[hi]; returns the pivot's final index.
    static int partition(int[] a, int lo, int hi) {
        int pivot = a[hi];              // pivot: the last element
        int i = lo - 1;                 // end of the "< pivot" region
        for (int j = lo; j < hi; j++) {
            if (a[j] < pivot) {         // compare against the pivot
                i++;
                int t = a[i]; a[i] = a[j]; a[j] = t;   // grow the region
            }
        }
        int t = a[i + 1]; a[i + 1] = a[hi]; a[hi] = t; // pivot to final slot
        return i + 1;
    }

    // Partition, then recurse on each side of the pivot.
    static void quickSort(int[] a, int lo, int hi) {
        if (lo >= hi) return;           // 0 or 1 element: done
        int p = partition(a, lo, hi);
        quickSort(a, lo, p - 1);        // left of pivot
        quickSort(a, p + 1, hi);        // right of pivot
    }
}
`;

const python = `def partition(a: list[int], lo: int, hi: int) -> int:
    """Lomuto partition: pivot = a[hi]; returns its final index."""
    pivot = a[hi]                    # pivot: the last element
    i = lo - 1                       # end of the "< pivot" region
    for j in range(lo, hi):
        if a[j] < pivot:             # compare against the pivot
            i += 1
            a[i], a[j] = a[j], a[i]  # grow the "< pivot" region
    a[i + 1], a[hi] = a[hi], a[i + 1]  # pivot lands in its final slot
    return i + 1

def quick_sort(a: list[int], lo: int, hi: int) -> None:
    """Quick sort: partition, then recurse on each side of the pivot."""
    if lo >= hi:                     # 0 or 1 element: done
        return
    p = partition(a, lo, hi)
    quick_sort(a, lo, p - 1)         # left of pivot
    quick_sort(a, p + 1, hi)         # right of pivot
`;

export const QUICK_SORT_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
