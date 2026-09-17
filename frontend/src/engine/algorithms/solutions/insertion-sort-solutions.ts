/**
 * Insertion Sort reference solutions.
 *
 * IMPORTANT: the generator in ../insertion-sort.ts embeds line maps that
 * point into these exact files. If you edit line positions here, update
 * the maps.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
using std::vector;

// Insertion sort: grow a sorted prefix one element at a time.
// Pick up the next value (the "key"), shift larger prefix values
// right, and drop the key into the gap that opens up.
void insertionSort(vector<int>& a) {
    for (size_t i = 1; i < a.size(); ++i) {
        int key = a[i];                    // pick up the next value
        size_t j = i;
        while (j > 0 && a[j - 1] > key) {  // prefix value larger than key?
            a[j] = a[j - 1];               // shift it one slot right
            --j;
        }
        a[j] = key;                        // drop the key into the gap
    }
}
`;

const java = `// Insertion sort: grow a sorted prefix one element at a time.
// Pick up the next value (the "key"), shift larger prefix values
// right, and drop the key into the gap that opens up.
class InsertionSort {
    static void insertionSort(int[] a) {
        for (int i = 1; i < a.length; i++) {
            int key = a[i];                    // pick up the next value
            int j = i;
            while (j > 0 && a[j - 1] > key) {  // prefix value larger than key?
                a[j] = a[j - 1];               // shift it one slot right
                j--;
            }
            a[j] = key;                        // drop the key into the gap
        }
    }
}
`;

const python = `def insertion_sort(a: list[int]) -> None:
    """Sort a in place with insertion sort.

    Grow a sorted prefix one element at a time by inserting each
    new value into its place among the values before it.
    """
    for i in range(1, len(a)):
        key = a[i]                       # pick up the next value
        j = i
        while j > 0 and a[j - 1] > key:  # prefix value larger than key?
            a[j] = a[j - 1]              # shift it one slot right
            j -= 1
        a[j] = key                       # drop the key into the gap
`;

export const INSERTION_SORT_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
