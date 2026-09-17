/**
 * DFS reference solutions. Line maps in ../dfs.ts point here — keep in sync.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
using namespace std;

// DFS: dive deep along one path, backtracking only at dead ends.
// An explicit stack replaces recursion; neighbors are pushed in reverse
// so the smallest neighbor pops first (matches recursive preorder).
vector<int> dfs(int n, const vector<vector<int>>& adj, int start) {
    vector<bool> visited(n, false);
    vector<int> stack{start};            // start seeds the stack
    vector<int> order;
    while (!stack.empty()) {
        int node = stack.back();
        stack.pop_back();                // pop newest discovery first
        if (visited[node]) continue;     // stale entry: already visited
        visited[node] = true;
        order.push_back(node);           // preorder: record on first entry
        // Reverse iteration => smallest neighbor ends up on top.
        for (auto it = adj[node].rbegin(); it != adj[node].rend(); ++it)
            if (!visited[*it])
                stack.push_back(*it);    // deeper exploration resumes here
    }
    return order;
}
`;

const java = `import java.util.*;

// DFS: dive deep along one path, backtracking only at dead ends.
// An explicit stack replaces recursion; neighbors are pushed in reverse
// so the smallest neighbor pops first (matches recursive preorder).
class DFS {
    static List<Integer> dfs(int n, List<List<Integer>> adj, int start) {
        boolean[] visited = new boolean[n];
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(start);                    // start seeds the stack
        List<Integer> order = new ArrayList<>();
        while (!stack.isEmpty()) {
            int node = stack.pop();           // pop newest discovery first
            if (visited[node]) continue;      // stale entry: already visited
            visited[node] = true;
            order.add(node);                  // preorder: record on first entry
            // Reverse iteration => smallest neighbor ends up on top.
            List<Integer> nbs = adj.get(node);
            for (int i = nbs.size() - 1; i >= 0; i--)
                if (!visited[nbs.get(i)])
                    stack.push(nbs.get(i));   // deeper exploration resumes here
        }
        return order;
    }
}
`;

const python = `def dfs(n: int, adj: list[list[int]], start: int) -> list[int]:
    """Depth-first search: dive deep, backtrack at dead ends (explicit stack)."""
    visited = [False] * n
    stack = [start]                  # start seeds the stack
    order = []
    while stack:
        node = stack.pop()           # pop newest discovery first
        if visited[node]:            # stale entry: already visited
            continue
        visited[node] = True
        order.append(node)           # preorder: record on first entry
        # Reversed iteration => smallest neighbor ends up on top.
        for nxt in reversed(adj[node]):
            if not visited[nxt]:
                stack.append(nxt)    # deeper exploration resumes here
    return order
`;

export const DFS_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
