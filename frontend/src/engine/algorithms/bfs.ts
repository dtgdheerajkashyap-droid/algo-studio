/**
 * Breadth-First Search — AlgorithmDefinition module.
 *
 * Line maps refer to ./solutions/bfs-solutions.ts — keep in sync.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  GraphInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { BFS_SOLUTIONS } from './solutions/bfs-solutions';

function assertGraph(input: AlgorithmInput): asserts input is GraphInput {
  if (input.kind !== 'graph') throw new Error('bfs expects a graph input');
}

/** Build adjacency list with deterministic neighbor order (input edge order). */
function adjacency(g: GraphInput): Map<string, string[]> {
  const adj = new Map<string, string[]>(g.nodes.map((n) => [n, []]));
  for (const [from, to] of g.edges) {
    adj.get(from)?.push(to);
    if (!g.directed) adj.get(to)?.push(from);
  }
  return adj;
}

function* run(input: AlgorithmInput): Generator<AlgorithmEvent> {
  assertGraph(input);
  const start = input.start ?? input.nodes[0];
  const adj = adjacency(input);

  yield {
    v: 1,
    type: 'annotate',
    text: `BFS from ${start}: explore level by level using a FIFO queue.`,
  };

  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  const order: string[] = [];

  yield {
    v: 1,
    type: 'discover',
    node: start,
    line: { cpp: 9, java: 8, python: 7 },
    note: 'Start node enters the queue',
  };
  yield { v: 1, type: 'frontier', kind: 'queue', items: [...queue], line: { cpp: 10, java: 9, python: 8 } };

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    yield {
      v: 1,
      type: 'visit',
      node,
      line: { cpp: 13, java: 12, python: 11 },
      note: `Dequeue ${node} (visit #${order.length})`,
    };
    yield { v: 1, type: 'frontier', kind: 'queue', items: [...queue] };

    for (const next of adj.get(node) ?? []) {
      yield {
        v: 1,
        type: 'traverse-edge',
        from: node,
        to: next,
        line: { cpp: 16, java: 15, python: 13 },
      };
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
        yield {
          v: 1,
          type: 'discover',
          node: next,
          from: node,
          line: { cpp: 18, java: 17, python: 15 },
          note: `${next} discovered via ${node}`,
        };
        yield { v: 1, type: 'frontier', kind: 'queue', items: [...queue] };
      }
    }
  }

  const unreached = input.nodes.filter((n) => !visited.has(n));
  if (unreached.length > 0) {
    yield {
      v: 1,
      type: 'annotate',
      text: `Unreachable from ${start}: ${unreached.join(', ')} (disconnected component).`,
    };
  }
  yield { v: 1, type: 'done', summary: `Visit order: ${order.join(' → ')}` };
}

const DEFAULT_GRAPH: GraphInput = {
  kind: 'graph',
  nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  edges: [
    ['A', 'B'],
    ['A', 'C'],
    ['B', 'D'],
    ['C', 'E'],
    ['D', 'F'],
    ['E', 'F'],
    ['F', 'G'],
  ],
  start: 'A',
};

export const bfs: AlgorithmDefinition = {
  id: 'bfs',
  name: 'Breadth-First Search',
  category: 'graph',
  difficulty: 'medium',
  bigO: 'O(V + E)',
  summary:
    'Explores a graph level by level from a start node using a FIFO queue, visiting all neighbors before moving deeper.',
  realWorldUse:
    'Shortest paths in unweighted networks: fewest-hop routing, "degrees of separation" in social networks, web crawlers, and solving puzzles with minimal moves.',
  complexity: {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V)',
    intuition:
      'Every node enters the queue at most once (guarded by the visited set), and every edge is examined at most twice in an undirected graph — once from each endpoint. So the total work is proportional to vertices plus edges: O(V + E). The queue and visited set each hold at most V entries, giving O(V) space. Because nodes are dequeued in the order they were discovered, the first time BFS reaches a node is via a shortest edge-count path.',
  },
  defaultInput: DEFAULT_GRAPH,
  presets: [
    { label: 'Default', input: DEFAULT_GRAPH },
    {
      label: 'Binary tree',
      input: {
        kind: 'graph',
        nodes: ['1', '2', '3', '4', '5', '6', '7'],
        edges: [['1', '2'], ['1', '3'], ['2', '4'], ['2', '5'], ['3', '6'], ['3', '7']],
        start: '1',
      },
    },
    {
      label: 'Disconnected',
      input: {
        kind: 'graph',
        nodes: ['A', 'B', 'C', 'X', 'Y'],
        edges: [['A', 'B'], ['B', 'C'], ['X', 'Y']],
        start: 'A',
      },
    },
    {
      label: 'Cycle',
      input: {
        kind: 'graph',
        nodes: ['A', 'B', 'C', 'D', 'E'],
        edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']],
        start: 'A',
      },
    },
  ],
  run,
  solutions: BFS_SOLUTIONS,
  examples: [
    {
      title: 'Level-order over a small graph',
      input: DEFAULT_GRAPH,
      narration: [
        'A is enqueued and visited first (level 0). Its neighbors B and C are discovered and enqueued — that is level 1.',
        'B is dequeued next: its unvisited neighbor D joins the queue. Then C is dequeued and discovers E. The queue is now [D, E] — level 2.',
        'D discovers F; E finds F already visited (the visited set prevents re-enqueueing). Finally F discovers G. Visit order: A → B → C → D → E → F → G — exactly level by level.',
      ],
      output: 'A B C D E F G',
    },
    {
      title: 'Disconnected graph',
      input: {
        kind: 'graph',
        nodes: ['A', 'B', 'C', 'X', 'Y'],
        edges: [['A', 'B'], ['B', 'C'], ['X', 'Y']],
        start: 'A',
      },
      narration: [
        'BFS from A reaches B, then C, and the queue empties.',
        'X and Y were never discovered — BFS only explores the connected component containing the start node. Reaching every component requires restarting BFS from each unvisited node.',
      ],
      output: 'A B C',
    },
  ],
  problem: {
    statement:
      'Implement breadth-first search. Input: first line has N M S — number of nodes (labeled 0..N-1), number of undirected edges, and the start node. The next M lines each contain an edge "u v". Neighbors must be explored in ascending order. Print the BFS visit order from S, space-separated, on one line.',
    signatures: {
      cpp: 'std::vector<int> bfs(int n, const std::vector<std::vector<int>>& adj, int start)',
      java: 'static List<Integer> bfs(int n, List<List<Integer>> adj, int start)',
      python: 'def bfs(n: int, adj: list[list[int]], start: int) -> list[int]',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> bfs(int n, const vector<vector<int>>& adj, int start) {
    // TODO: implement BFS (visit neighbors in ascending order)
    return {};
}

int main() {
    int n, m, s;
    cin >> n >> m >> s;
    vector<vector<int>> adj(n);
    for (int i = 0; i < m; i++) {
        int u, v; cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    for (auto& nb : adj) sort(nb.begin(), nb.end());
    auto order = bfs(n, adj, s);
    for (size_t i = 0; i < order.size(); i++)
        cout << order[i] << (i + 1 < order.size() ? " " : "\\n");
}
`,
      java: `import java.util.*;

public class Main {
    static List<Integer> bfs(int n, List<List<Integer>> adj, int start) {
        // TODO: implement BFS (visit neighbors in ascending order)
        return new ArrayList<>();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt(), m = sc.nextInt(), s = sc.nextInt();
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            int u = sc.nextInt(), v = sc.nextInt();
            adj.get(u).add(v);
            adj.get(v).add(u);
        }
        for (List<Integer> nb : adj) Collections.sort(nb);
        List<Integer> order = bfs(n, adj, s);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < order.size(); i++)
            sb.append(order.get(i)).append(i + 1 < order.size() ? " " : "");
        System.out.println(sb);
    }
}
`,
      python: `import sys
from collections import deque

def bfs(n: int, adj: list[list[int]], start: int) -> list[int]:
    # TODO: implement BFS (visit neighbors in ascending order)
    return []

def main():
    data = sys.stdin.read().split()
    n, m, s = int(data[0]), int(data[1]), int(data[2])
    adj = [[] for _ in range(n)]
    idx = 3
    for _ in range(m):
        u, v = int(data[idx]), int(data[idx + 1])
        idx += 2
        adj[u].append(v)
        adj[v].append(u)
    for nb in adj:
        nb.sort()
    print(" ".join(map(str, bfs(n, adj, s))))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(V + E)',
    tests: [
      { input: '7 7 0\n0 1\n0 2\n1 3\n2 4\n3 5\n4 5\n5 6', expected: '0 1 2 3 4 5 6', hidden: false, label: 'sample 1' },
      { input: '4 2 0\n0 1\n2 3', expected: '0 1', hidden: false, label: 'sample 2 (disconnected)' },
      { input: '1 0 0', expected: '0', hidden: true, label: 'single node' },
      { input: '2 1 1\n0 1', expected: '1 0', hidden: true, label: 'start not 0' },
      { input: '5 5 0\n0 1\n1 2\n2 3\n3 4\n4 0', expected: '0 1 4 2 3', hidden: true, label: 'cycle' },
      { input: '6 3 3\n0 1\n1 2\n3 4', expected: '3 4', hidden: true, label: 'disconnected, start in small comp' },
      { input: '4 6 0\n0 1\n0 2\n0 3\n1 2\n1 3\n2 3', expected: '0 1 2 3', hidden: true, label: 'complete K4' },
      { input: '7 6 0\n0 1\n0 2\n1 3\n1 4\n2 5\n2 6', expected: '0 1 2 3 4 5 6', hidden: true, label: 'binary tree' },
      { input: '5 4 2\n2 4\n2 0\n4 1\n0 3', expected: '2 0 4 3 1', hidden: true, label: 'ascending-neighbor order check' },
      { input: '3 3 0\n0 1\n0 1\n1 2', expected: '0 1 2', hidden: true, label: 'duplicate edge' },
    ],
  },
};
