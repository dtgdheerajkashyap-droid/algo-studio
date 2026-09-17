/**
 * BFS reference solutions. Line maps in ../bfs.ts point here — keep in sync.
 */

import type { Solution } from '../../definition';

const cpp = `#include <vector>
#include <queue>
using namespace std;

// BFS: explore level by level with a FIFO queue.
// Returns nodes in visit order.
vector<int> bfs(int n, const vector<vector<int>>& adj, int start) {
    vector<bool> visited(n, false);
    visited[start] = true;          // mark start discovered
    queue<int> q({start});          // it seeds the queue
    vector<int> order;
    while (!q.empty()) {
        int node = q.front(); q.pop();   // visit oldest discovery first
        order.push_back(node);
        // Every neighbor one edge away belongs to the next level.
        for (int next : adj[node]) {
            if (!visited[next]) {        // visited-set stops re-enqueueing
                visited[next] = true;
                q.push(next);
            }
        }
    }
    return order;
}
`;

const java = `import java.util.*;

// BFS: explore level by level with a FIFO queue.
class BFS {
    static List<Integer> bfs(int n, List<List<Integer>> adj, int start) {
        boolean[] visited = new boolean[n];
        visited[start] = true;                 // mark start discovered
        Deque<Integer> queue = new ArrayDeque<>();
        queue.add(start);                      // it seeds the queue
        List<Integer> order = new ArrayList<>();
        while (!queue.isEmpty()) {
            int node = queue.poll();           // visit oldest discovery first
            order.add(node);
            // Every neighbor one edge away belongs to the next level.
            for (int next : adj.get(node)) {
                if (!visited[next]) {          // visited-set stops re-enqueueing
                    visited[next] = true;
                    queue.add(next);
                }
            }
        }
        return order;
    }
}
`;

const python = `from collections import deque

def bfs(n: int, adj: list[list[int]], start: int) -> list[int]:
    """Breadth-first search: explore level by level with a FIFO queue."""
    visited = [False] * n
    visited[start] = True            # mark start discovered
    queue = deque([start])           # it seeds the queue
    order = []
    while queue:
        node = queue.popleft()       # visit oldest discovery first
        order.append(node)
        # Every neighbor one edge away belongs to the next level.
        for nxt in adj[node]:
            if not visited[nxt]:     # visited-set stops re-enqueueing
                visited[nxt] = True
                queue.append(nxt)
    return order
`;

export const BFS_SOLUTIONS: Solution[] = [
  { language: 'cpp', code: cpp },
  { language: 'java', code: java },
  { language: 'python', code: python },
];
