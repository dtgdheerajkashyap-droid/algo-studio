/**
 * Bubble Sort reference solutions.
 *
 * IMPORTANT: the generator in ../bubble-sort.ts embeds line maps that point
 * into these exact files. If you edit line positions here, update the maps.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
using std::vector;

// Bubble sort: repeatedly sweep the array, swapping adjacent
// out-of-order pairs. After pass k, the k largest values are
// locked in at the end.
void bubbleSort(vector<int>& a) {
    for (size_t pass = 0; pass + 1 < a.size(); ++pass) {
        bool swapped = false;
        for (size_t j = 0; j + 1 < a.size() - pass; ++j) {
            if (a[j] > a[j + 1]) {          // adjacent pair out of order?
                std::swap(a[j], a[j + 1]);  // fix it
                swapped = true;
            }
        }
        // A full pass with no swaps means the array is sorted.
        if (!swapped) break;
    }
}
`;

const java = `// Bubble sort: repeatedly sweep the array, swapping adjacent
// out-of-order pairs. After pass k, the k largest values are
// locked in at the end.
class BubbleSort {
    static void bubbleSort(int[] a) {
        for (int pass = 0; pass < a.length - 1; pass++) {
            boolean swapped = false;
            for (int j = 0; j < a.length - 1 - pass; j++) {
                if (a[j] > a[j + 1]) {       // adjacent pair out of order?
                    int tmp = a[j];          // fix it with a 3-line swap
                    a[j] = a[j + 1];
                    a[j + 1] = tmp;
                    swapped = true;
                }
            }
            // A full pass with no swaps means the array is sorted.
            if (!swapped) break;
        }
    }
}
`;

const python = `def bubble_sort(a: list[int]) -> None:
    """Sort a in place with bubble sort.

    Each pass bubbles the largest remaining value to the end.
    """
    for pass_ in range(len(a) - 1):
        swapped = False
        for j in range(len(a) - 1 - pass_):
            if a[j] > a[j + 1]:              # adjacent pair out of order?
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        # A full pass with no swaps means the array is sorted.
        if not swapped:
            break
`;

export const BUBBLE_SORT_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
