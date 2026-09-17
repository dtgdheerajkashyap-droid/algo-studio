/**
 * Binary Search Tree — AlgorithmDefinition module.
 *
 * Line maps refer to ./solutions/bst-solutions.ts — keep in sync.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  TreeOpsInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { BST_SOLUTIONS } from './solutions/bst-solutions';

interface BSTNode {
  id: string;
  value: number;
  left: BSTNode | null;
  right: BSTNode | null;
  parent: BSTNode | null;
}

function assertTreeOps(input: AlgorithmInput): asserts input is TreeOpsInput {
  if (input.kind !== 'tree-ops') throw new Error('bst expects a tree-ops input');
}

function inorder(root: BSTNode | null, out: number[]): void {
  if (!root) return;
  inorder(root.left, out);
  out.push(root.value);
  inorder(root.right, out);
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertTreeOps(input);
  const ops = input.ops.map((o) => ({ ...o })); // shallow-copy to not mutate

  let root: BSTNode | null = null;
  let idCounter = 0;
  const mkId = (v: number) => `${v}#${idCounter++}`;

  yield {
    v: 1,
    type: 'annotate',
    text: `Building a BST from ${ops.length} operations. In-order traversal prints values in sorted order.`,
  };

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.op === 'insert') {
      const x = op.value;
      yield {
        v: 1,
        type: 'annotate',
        text: `Op ${k + 1}: insert ${x}`,
      };
      if (!root) {
        const id = mkId(x);
        root = { id, value: x, left: null, right: null, parent: null };
        yield {
          v: 1,
          type: 'insert-node',
          node: id,
          value: x,
          line: { cpp: 18, java: 64, python: 108 },
          note: `Tree is empty — ${x} becomes the root`,
        };
        continue;
      }
      let cur: BSTNode = root;
      let inserted = false;
      while (!inserted) {
        yield {
          v: 1,
          type: 'update-node',
          node: cur.id,
          value: cur.value,
          line: { cpp: 22, java: 68, python: 112 },
          note: `Compare insert key ${x} with node ${cur.value}`,
        };
        if (x === cur.value) {
          yield {
            v: 1,
            type: 'annotate',
            text: `Duplicate value ${x} — ignoring insert.`,
            line: { cpp: 21, java: 67, python: 111 },
          };
          inserted = true;
        } else if (x < cur.value) {
          if (!cur.left) {
            const id = mkId(x);
            cur.left = { id, value: x, left: null, right: null, parent: cur };
            yield {
              v: 1,
              type: 'insert-node',
              node: id,
              value: x,
              parent: cur.id,
              side: 'left',
              line: { cpp: 23, java: 69, python: 114 },
              note: `${x} < ${cur.value}, so it becomes the left child`,
            };
            inserted = true;
          } else {
            cur = cur.left;
            yield {
              v: 1,
              type: 'pointer-move',
              pointers: { cur: cur.value },
              line: { cpp: 24, java: 70, python: 116 },
            };
          }
        } else {
          if (!cur.right) {
            const id = mkId(x);
            cur.right = { id, value: x, left: null, right: null, parent: cur };
            yield {
              v: 1,
              type: 'insert-node',
              node: id,
              value: x,
              parent: cur.id,
              side: 'right',
              line: { cpp: 26, java: 72, python: 119 },
              note: `${x} > ${cur.value}, so it becomes the right child`,
            };
            inserted = true;
          } else {
            cur = cur.right;
            yield {
              v: 1,
              type: 'pointer-move',
              pointers: { cur: cur.value },
              line: { cpp: 27, java: 73, python: 121 },
            };
          }
        }
      }
    } else if (op.op === 'search') {
      const x = op.value;
      yield {
        v: 1,
        type: 'annotate',
        text: `Op ${k + 1}: search for ${x}`,
      };
      let cur: BSTNode | null = root;
      let found = false;
      while (cur && !found) {
        yield {
          v: 1,
          type: 'update-node',
          node: cur.id,
          value: cur.value,
          line: { cpp: 37, java: 82, python: 128 },
          note: `Search: compare target ${x} with node ${cur.value}`,
        };
        if (x === cur.value) {
          found = true;
          yield {
            v: 1,
            type: 'annotate',
            text: `Search hit: ${x} is in the tree.`,
            line: { cpp: 37, java: 83, python: 129 },
          };
        } else {
          const parentValue = cur.value;
          const goLeft = x < parentValue;
          const direction = goLeft ? 'left' : 'right';
          cur = goLeft ? cur.left : cur.right;
          yield {
            v: 1,
            type: 'pointer-move',
            pointers: { cur: cur?.value ?? null },
            line: { cpp: 38, java: 84, python: 131 },
            note: `Go ${direction} (${x} ${goLeft ? '<' : '>'} ${parentValue})`,
          };
        }
      }
      if (!found) {
        yield {
          v: 1,
          type: 'annotate',
          text: `Search miss: ${x} is not in the tree.`,
          line: { cpp: 40, java: 86, python: 132 },
        };
      }
    }
  }

  const order: number[] = [];
  inorder(root, order);
  yield { v: 1, type: 'done', summary: `In-order traversal: ${order.join(' ')}` };
}

const DEFAULT_OPS: TreeOpsInput = {
  kind: 'tree-ops',
  ops: [
    { op: 'insert', value: 5 },
    { op: 'insert', value: 3 },
    { op: 'insert', value: 7 },
    { op: 'insert', value: 1 },
    { op: 'insert', value: 4 },
    { op: 'insert', value: 6 },
    { op: 'insert', value: 9 },
    { op: 'search', value: 4 },
    { op: 'search', value: 8 },
  ],
};

export const bst: AlgorithmDefinition = {
  id: 'bst',
  name: 'Binary Search Tree',
  category: 'data-structure',
  difficulty: 'medium',
  bigO: 'O(h) ≈ O(log n)',
  summary:
    'Insert and search operations on a binary search tree: smaller keys go left, larger keys go right; in-order traversal yields sorted order. Duplicate inserts are ignored.',
  realWorldUse:
    'Core concept underlying TreeMap (Java), std::map (C++ typically red-black), database index structures, symbol tables in compilers, and sorted dictionary ADTs. Real implementations almost always augment BST rules with a rebalancing scheme (AVL, red-black, treap) to guarantee O(log n) even on adversarial inputs.',
  complexity: {
    time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' },
    space: 'O(n)',
    intuition:
      'Every insert/search walks a root-to-leaf path whose length is the tree height h. On random insertion orders the tree stays roughly balanced and h ≈ log₂n — hence O(log n). The worst case is inserting sorted data: the tree degenerates into a linked list with h = n, giving linear-time operations. An in-order traversal touches every node exactly once: O(n) regardless of shape. Space is proportional to the number of nodes.',
  },
  defaultInput: DEFAULT_OPS,
  presets: [
    { label: 'Default', input: DEFAULT_OPS },
    {
      label: 'Build then search',
      input: {
        kind: 'tree-ops',
        ops: [
          { op: 'insert', value: 8 },
          { op: 'insert', value: 3 },
          { op: 'insert', value: 10 },
          { op: 'insert', value: 1 },
          { op: 'insert', value: 6 },
          { op: 'insert', value: 14 },
          { op: 'search', value: 6 },
          { op: 'search', value: 99 },
        ],
      },
    },
    {
      label: 'Sorted (worst)',
      input: {
        kind: 'tree-ops',
        ops: [1, 2, 3, 4, 5, 6, 7].map((v) => ({ op: 'insert' as const, value: v })),
      },
    },
    {
      label: 'Duplicates ignored',
      input: {
        kind: 'tree-ops',
        ops: [
          { op: 'insert', value: 5 },
          { op: 'insert', value: 5 },
          { op: 'insert', value: 3 },
          { op: 'insert', value: 5 },
          { op: 'insert', value: 7 },
          { op: 'search', value: 5 },
        ],
      },
    },
  ],
  run,
  solutions: BST_SOLUTIONS,
  examples: [
    {
      title: 'Default: insert 7 keys then search',
      input: DEFAULT_OPS,
      narration: [
        'Insert 5 as the root. Insert 3 (less than 5 → left child). Insert 7 (greater → right child). Insert 1 (< 5 → < 3 → left of 3). Insert 4 (< 5 → > 3 → right of 3). Insert 6 (> 5 → < 7 → left of 7). Insert 9 (> 5 → > 7 → right of 7). The tree is balanced in this run.',
        'Search for 4 walks: 5 → 3 → right → 4. Hit.',
        'Search for 8 walks: 5 → 7 → right (9). 8 < 9, so it would be the left child of 9 — but that spot is empty. Miss. The in-order traversal reports every node in key order: 1 3 4 5 6 7 9.',
      ],
      output: '1 3 4 5 6 7 9',
    },
    {
      title: 'Sorted insert → linked list shape',
      input: {
        kind: 'tree-ops',
        ops: [1, 2, 3, 4, 5].map((v) => ({ op: 'insert' as const, value: v })),
      },
      narration: [
        '1 becomes root. 2 > 1 so it is the right child. 3 > 1 → > 2 so it is the right child of 2. 4 and 5 keep chaining rightward.',
        'The resulting tree is just a linked list — height equals node count. This is why real BST libraries add rebalancing: without it, sorted insertions give O(n) per operation, not O(log n). The in-order traversal is still correct: 1 2 3 4 5.',
      ],
      output: '1 2 3 4 5',
    },
  ],
  problem: {
    statement:
      'Implement a binary search tree with insert and search operations (duplicate inserts are ignored). Input: the first line contains Q — the number of operations. The next Q lines each contain "insert x" or "search x" where x is an integer. After performing all operations, print the in-order traversal of the final tree as space-separated integers on one line. Neighbors must be explored in ascending order (left subtree before right subtree).',
    signatures: {
      cpp: 'std::vector<int> bst_apply(const std::vector<std::pair<std::string,int>>& ops)',
      java: 'static List<Integer> bstApply(List<String[]> ops)',
      python: 'def bst_apply(ops: list[tuple[str, int]]) -> list[int]',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node *left = nullptr, *right = nullptr;
    Node(int v) : val(v) {}
};

Node* insert(Node* root, int x) {
    // TODO: insert x, ignore duplicates, return root
    return root;
}

bool search(Node* root, int x) {
    // TODO: return true iff x is in the tree
    return false;
}

void inorder(Node* root, vector<int>& out) {
    // TODO: left, node, right
}

int main() {
    int q; cin >> q;
    Node* root = nullptr;
    while (q--) {
        string op; int x; cin >> op >> x;
        if (op == "insert") root = insert(root, x);
        else (void)search(root, x);
    }
    vector<int> out;
    inorder(root, out);
    for (size_t i = 0; i < out.size(); i++)
        cout << out[i] << (i + 1 < out.size() ? " " : "\\n");
}
`,
      java: `import java.util.*;

public class Main {
    static class Node {
        int val; Node left, right;
        Node(int v) { val = v; }
    }
    static Node insert(Node root, int x) {
        // TODO: insert x, ignore duplicates, return root
        return root;
    }
    static boolean search(Node root, int x) {
        // TODO: return true iff x is in the tree
        return false;
    }
    static void inorder(Node root, List<Integer> out) {
        // TODO: left, node, right
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int q = sc.nextInt();
        Node root = null;
        while (q-- > 0) {
            String op = sc.next(); int x = sc.nextInt();
            if (op.equals("insert")) root = insert(root, x);
            else search(root, x);
        }
        List<Integer> out = new ArrayList<>();
        inorder(root, out);
        StringJoiner sj = new StringJoiner(" ");
        for (int v : out) sj.add(String.valueOf(v));
        System.out.println(sj);
    }
}
`,
      python: `import sys

class Node:
    def __init__(self, val: int):
        self.val = val
        self.left = None
        self.right = None

def insert(root: Node | None, x: int) -> Node:
    # TODO: insert x, ignore duplicates, return (possibly new) root
    return root

def search(root: Node | None, x: int) -> bool:
    # TODO: return True iff x is in the tree
    return False

def inorder(root: Node | None, out: list[int]) -> None:
    # TODO: left, node, right
    pass

def main():
    data = sys.stdin.read().split()
    idx = 0
    q = int(data[idx]); idx += 1
    root = None
    for _ in range(q):
        op = data[idx]; idx += 1
        x = int(data[idx]); idx += 1
        if op == "insert":
            root = insert(root, x)
        else:
            _ = search(root, x)
    out: list[int] = []
    inorder(root, out)
    print(" ".join(map(str, out)))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(log n) avg / O(n) worst',
    tests: [
      {
        input: '9\ninsert 5\ninsert 3\ninsert 7\ninsert 1\ninsert 4\ninsert 6\ninsert 9\nsearch 4\nsearch 8',
        expected: '1 3 4 5 6 7 9',
        hidden: false,
        label: 'sample 1',
      },
      {
        input: '4\ninsert 2\ninsert 1\ninsert 3\nsearch 2',
        expected: '1 2 3',
        hidden: false,
        label: 'sample 2',
      },
      {
        input: '0',
        expected: '',
        hidden: true,
        label: 'no ops',
      },
      {
        input: '3\ninsert 42\ninsert 42\nsearch 42',
        expected: '42',
        hidden: true,
        label: 'duplicate insert',
      },
      {
        input: '5\ninsert 1\ninsert 2\ninsert 3\ninsert 4\ninsert 5',
        expected: '1 2 3 4 5',
        hidden: true,
        label: 'sorted worst case',
      },
      {
        input: '7\ninsert 50\ninsert 30\ninsert 70\ninsert 20\ninsert 40\ninsert 60\ninsert 80',
        expected: '20 30 40 50 60 70 80',
        hidden: true,
        label: 'balanced build',
      },
      {
        input: '6\ninsert 10\nsearch 5\nsearch 10\nsearch 15\ninsert 5\ninsert 15',
        expected: '5 10 15',
        hidden: true,
        label: 'search then insert',
      },
      {
        input: '8\ninsert -5\ninsert 0\ninsert 5\ninsert -10\ninsert 10\nsearch 0\nsearch -5\nsearch 7',
        expected: '-10 -5 0 5 10',
        hidden: true,
        label: 'negatives',
      },
      {
        input: '5\nsearch 1\nsearch 2\ninsert 2\nsearch 1\ninsert 1',
        expected: '1 2',
        hidden: true,
        label: 'searches on empty tree',
      },
      {
        input: '14\ninsert 8\ninsert 3\ninsert 10\ninsert 1\ninsert 6\ninsert 14\ninsert 4\ninsert 7\ninsert 13\nsearch 6\nsearch 13\nsearch 99\ninsert 6\nsearch 1',
        expected: '1 3 4 6 7 8 10 13 14',
        hidden: true,
        label: 'comprehensive',
      },
    ],
  },
};
