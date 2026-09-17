/**
 * BST reference solutions. Line maps in ../bst.ts point here — keep in sync.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
using namespace std;

struct Node {
    int val;
    Node *left = nullptr, *right = nullptr;
    Node(int v) : val(v) {}
};

// Insert x; duplicates are ignored. Returns the (possibly new) root.
Node* insert(Node* root, int x) {
    if (!root) return new Node(x);   // empty spot: x lives here
    Node* cur = root;
    while (true) {
        if (x == cur->val) break;    // duplicate: do nothing
        if (x < cur->val) {          // smaller keys go left
            if (!cur->left) { cur->left = new Node(x); break; }
            cur = cur->left;
        } else {                     // larger keys go right
            if (!cur->right) { cur->right = new Node(x); break; }
            cur = cur->right;
        }
    }
    return root;
}

// Walk from the root comparing x against each node.
bool search(Node* root, int x) {
    Node* cur = root;
    while (cur) {
        if (x == cur->val) return true;          // hit
        cur = x < cur->val ? cur->left : cur->right;
    }
    return false;                                // fell off the tree
}

// In-order traversal: left, node, right → sorted order.
void inorder(Node* root, vector<int>& out) {
    if (!root) return;
    inorder(root->left, out);
    out.push_back(root->val);
    inorder(root->right, out);
}
`;

const java = `import java.util.*;

// Binary search tree with insert (duplicates ignored) and search.
class BST {
    static class Node {
        int val;
        Node left, right;
        Node(int v) { val = v; }
    }

    // Insert x; duplicates are ignored. Returns the (possibly new) root.
    static Node insert(Node root, int x) {
        if (root == null) return new Node(x);  // empty spot: x lives here
        Node cur = root;
        while (true) {
            if (x == cur.val) break;           // duplicate: do nothing
            if (x < cur.val) {                 // smaller keys go left
                if (cur.left == null) { cur.left = new Node(x); break; }
                cur = cur.left;
            } else {                           // larger keys go right
                if (cur.right == null) { cur.right = new Node(x); break; }
                cur = cur.right;
            }
        }
        return root;
    }

    // Walk from the root comparing x against each node.
    static boolean search(Node root, int x) {
        Node cur = root;
        while (cur != null) {
            if (x == cur.val) return true;     // hit
            cur = x < cur.val ? cur.left : cur.right;
        }
        return false;                          // fell off the tree
    }

    // In-order traversal: left, node, right → sorted order.
    static void inorder(Node root, List<Integer> out) {
        if (root == null) return;
        inorder(root.left, out);
        out.add(root.val);
        inorder(root.right, out);
    }
}
`;

const python = `class Node:
    def __init__(self, val: int):
        self.val = val
        self.left: "Node | None" = None
        self.right: "Node | None" = None

def insert(root: "Node | None", x: int) -> Node:
    """Insert x; duplicates are ignored. Returns the (possibly new) root."""
    if root is None:
        return Node(x)               # empty spot: x lives here
    cur = root
    while True:
        if x == cur.val:             # duplicate: do nothing
            break
        if x < cur.val:              # smaller keys go left
            if cur.left is None:
                cur.left = Node(x)
                break
            cur = cur.left
        else:                        # larger keys go right
            if cur.right is None:
                cur.right = Node(x)
                break
            cur = cur.right
    return root

def search(root: "Node | None", x: int) -> bool:
    """Walk from the root comparing x against each node."""
    cur = root
    while cur is not None:
        if x == cur.val:             # hit
            return True
        cur = cur.left if x < cur.val else cur.right
    return False                     # fell off the tree

def inorder(root: "Node | None", out: list[int]) -> None:
    """In-order traversal: left, node, right → sorted order."""
    if root is None:
        return
    inorder(root.left, out)
    out.append(root.val)
    inorder(root.right, out)
`;

export const BST_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
