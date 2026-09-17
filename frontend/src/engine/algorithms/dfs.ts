/**
 * Depth-First Search — AlgorithmDefinition module.
 *
 * Line maps refer to ./solutions/dfs-solutions.ts — keep in sync.
 * The generator mirrors the reference solutions exactly: an explicit stack,
 * neighbors pushed in reverse so the first-listed neighbor pops first, and
 * stale stack entries skipped on pop.
 */

import type {
  AlgorithmDefinition,
  AlgorithmInput,
  GraphInput,
} from '../definition';
import type { AlgorithmEvent } from '../events';
import { DFS_SOLUTIONS } from './solutions/dfs-solutions';

function assertGraph(input: AlgorithmInput): asserts input is GraphInput {
  if (input.kind !== 'graph') throw new Error('dfs expects a graph input');
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
    text: `DFS from ${start}: dive deep along one path, backtracking only at dead ends (explicit stack).`,
  };

  const visited = new Set<string>();
  const stack: string[] = [start];
  const order: string[] = [];

  yield {
    v: 1,
    type: 'discover',
    node: start,
    line: { cpp: 9, java: 10, python: 4 },
    note: 'Start node seeds the stack',
  };
  yield { v: 1, type: 'frontier', kind: 'stack', items: [...stack], line: { cpp: 9, java: 10, python: 4 } };

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) {
      yield {
        v: 1,
        type: 'annotate',
        text: `Pop ${node} — already visited (stale stack entry), skip.`,
        line: { cpp: 14, java: 14, python: 8 },
      };
      yield { v: 1, type: 'frontier', kind: 'stack', items: [...stack] };
      continue;
    }
    visited.add(node);
    order.push(node);
    yield {
      v: 1,
      type: 'visit',
      node,
      line: { cpp: 16, java: 16, python: 11 },
      note: `Pop ${node} (visit #${order.length})`,
    };
    yield { v: 1, type: 'frontier', kind: 'stack', items: [...stack] };

    // Reverse push order => the first-listed neighbor is explored first.
    const neighbors = adj.get(node) ?? [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const next = neighbors[i];
      yield {
        v: 1,
        type: 'traverse-edge',
        from: node,
        to: next,
        line: { cpp: 18, java: 19, python: 13 },
      };
      if (!visited.has(next)) {
        stack.push(next);
        yield {
          v: 1,
          type: 'discover',
          node: next,
          from: node,
          line: { cpp: 20, java: 21, python: 15 },
          note: `${next} pushed — exploration will resume here`,
        };
        yield { v: 1, type: 'frontier', kind: 'stack', items: [...stack] };
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

export const dfs: AlgorithmDefinition = {
  id: 'dfs',
  name: 'Depth-First Search',
  category: 'graph',
  difficulty: 'medium',
  bigO: 'O(V + E)',
  summary:
    'Explores a graph by diving as deep as possible along each path before backtracking, using a stack (explicit or the call stack).',
  realWorldUse:
    'Cycle detection, topological sorting of build/task dependencies, maze generation and solving, finding connected components, and as the engine behind backtracking searches (Sudoku, N-queens).',
  complexity: {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V)',
    intuition:
      'Every node is visited at most once (guarded by the visited set) and every edge is examined at most twice in an undirected graph, so total work is O(V + E) — identical to BFS. Only the exploration ORDER differs: a stack pops the newest discovery first, so DFS commits to one path until it dead-ends, then backtracks. The stack can hold O(V) entries in the worst case (a long path), giving O(V) space.',
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
      label: 'Long path',
      input: {
        kind: 'graph',
        nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
        edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'F']],
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
  solutions: DFS_SOLUTIONS,
  examples: [
    {
      title: 'Deep dive vs BFS on the same graph',
      input: DEFAULT_GRAPH,
      narration: [
        'A is popped and visited. Its neighbors C and B are pushed (in reverse order, so B is on top). DFS pops B next — it commits to the B-branch instead of visiting all of A\'s neighbors first.',
        'From B it dives to D, then F, then E and G get discovered from F. The path A → B → D → F runs four levels deep before anything on the C side is touched.',
        'Compare with BFS on the identical graph (A B C D E F G, level by level): DFS visits A B D F E C G — depth first, breadth later. Same O(V + E) work, completely different order.',
      ],
      output: 'A B D F E C G',
    },
    {
      title: 'Stale stack entries',
      input: {
        kind: 'graph',
        nodes: ['A', 'B', 'C'],
        edges: [['A', 'B'], ['A', 'C'], ['B', 'C']],
        start: 'A',
      },
      narration: [
        'A pushes C and B. Popping B pushes C again — the stack now holds C twice. That is fine: the visited check on pop skips duplicates.',
        'C is popped and visited once; the second C entry is popped later, found visited, and skipped. This "lazy deletion" is what makes the explicit-stack DFS simple and still O(V + E).',
      ],
      output: 'A B C',
    },
  ],
  problem: {
    statement:
      'Implement depth-first search. Input: first line has N M S — number of nodes (labeled 0..N-1), number of undirected edges, and the start node. The next M lines each contain an edge "u v". Neighbors must be explored in ascending order (visit the smallest-numbered unvisited neighbor first). Print the DFS preorder visit order from S, space-separated, on one line.',
    signatures: {
      cpp: 'std::vector<int> dfs(int n, const std::vector<std::vector<int>>& adj, int start)',
      java: 'static List<Integer> dfs(int n, List<List<Integer>> adj, int start)',
      python: 'def dfs(n: int, adj: list[list[int]], start: int) -> list[int]',
    },
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> dfs(int n, const vector<vector<int>>& adj, int start) {
    // TODO: implement DFS (explore neighbors in ascending order)
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
    auto order = dfs(n, adj, s);
    for (size_t i = 0; i < order.size(); i++)
        cout << order[i] << (i + 1 < order.size() ? " " : "\\n");
}
`,
      java: `import java.util.*;

public class Main {
    static List<Integer> dfs(int n, List<List<Integer>> adj, int start) {
        // TODO: implement DFS (explore neighbors in ascending order)
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
        List<Integer> order = dfs(n, adj, s);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < order.size(); i++)
            sb.append(order.get(i)).append(i + 1 < order.size() ? " " : "");
        System.out.println(sb);
    }
}
`,
      python: `import sys

def dfs(n: int, adj: list[list[int]], start: int) -> list[int]:
    # TODO: implement DFS (explore neighbors in ascending order)
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
    print(" ".join(map(str, dfs(n, adj, s))))

if __name__ == "__main__":
    main()
`,
    },
    expectedBigO: 'O(V + E)',
    tests: [
      { input: '7 7 0\n0 1\n0 2\n1 3\n2 4\n3 5\n4 5\n5 6', expected: '0 1 3 5 4 2 6', hidden: false, label: 'sample 1' },
      { input: '4 2 0\n0 1\n2 3', expected: '0 1', hidden: false, label: 'sample 2 (disconnected)' },
      { input: '1 0 0', expected: '0', hidden: true, label: 'single node' },
      { input: '2 1 1\n0 1', expected: '1 0', hidden: true, label: 'start not 0' },
      { input: '5 5 0\n0 1\n1 2\n2 3\n3 4\n4 0', expected: '0 1 2 3 4', hidden: true, label: 'cycle' },
      { input: '6 3 3\n0 1\n1 2\n3 4', expected: '3 4', hidden: true, label: 'disconnected, start in small comp' },
      { input: '4 6 0\n0 1\n0 2\n0 3\n1 2\n1 3\n2 3', expected: '0 1 2 3', hidden: true, label: 'complete K4' },
      { input: '7 6 0\n0 1\n0 2\n1 3\n1 4\n2 5\n2 6', expected: '0 1 3 4 2 5 6', hidden: true, label: 'binary tree' },
      { input: '5 4 2\n2 4\n2 0\n4 1\n0 3', expected: '2 0 3 4 1', hidden: true, label: 'ascending-neighbor order check' },
      { input: '3 3 0\n0 1\n0 1\n1 2', expected: '0 1 2', hidden: true, label: 'duplicate edge' },
    ],
  },
};
