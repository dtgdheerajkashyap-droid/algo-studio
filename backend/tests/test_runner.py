"""Tests for the local subprocess runner (Python path — no toolchain needed)."""

import pytest

from app.algorithms import ALGORITHMS
from app.algorithms import TestCase as TC  # alias: pytest must not collect it
from app.runner import ToolchainMissing, run_submission

ECHO_TESTS = [
    TC("hello", "hello", False, "echo 1"),
    TC("world", "world", True, "echo 2"),
]

ECHO_CODE = "import sys; sys.stdout.write(sys.stdin.read())"


class TestRunnerStatuses:
    def test_accepted(self):
        report = run_submission("python", ECHO_CODE, ECHO_TESTS)
        assert report.status == "accepted"
        assert all(r.passed for r in report.results)

    def test_wrong_answer(self):
        report = run_submission("python", "print('nope')", ECHO_TESTS)
        assert report.status == "wrong-answer"
        assert not any(r.passed for r in report.results)

    def test_runtime_error(self):
        report = run_submission("python", "raise RuntimeError('boom')", ECHO_TESTS)
        assert report.status == "error"

    def test_timeout(self):
        report = run_submission(
            "python",
            "import time; time.sleep(60)",
            [TC("x", "x", False, "hang")],
        )
        assert report.status == "error"
        assert "time limit" in report.results[0].output

    def test_unsupported_language(self):
        with pytest.raises(ValueError):
            run_submission("cobol", "DISPLAY 'HI'.", ECHO_TESTS)


class TestOutputHygiene:
    def test_hidden_test_never_leaks_output_or_expected(self):
        report = run_submission("python", "print('nope')", ECHO_TESTS)
        hidden = [r for r in report.results if r.hidden]
        assert hidden
        for r in hidden:
            assert r.output is None
            assert r.expected is None

    def test_visible_failure_includes_output_and_expected(self):
        report = run_submission("python", "print('nope')", ECHO_TESTS)
        visible = next(r for r in report.results if not r.hidden)
        assert visible.output == "nope"
        assert visible.expected == "hello"

    def test_passing_test_omits_output(self):
        report = run_submission("python", ECHO_CODE, ECHO_TESTS)
        assert all(r.output is None for r in report.results)

    def test_trailing_whitespace_normalized(self):
        code = "import sys; sys.stdout.write(sys.stdin.read() + '  \\n\\n')"
        report = run_submission("python", code, [TC("hi", "hi", False)])
        assert report.status == "accepted"

    def test_huge_output_truncated(self):
        report = run_submission(
            "python", "print('x' * 100_000)", [TC("", "y", False, "big")]
        )
        assert report.results[0].output.endswith("…(truncated)")


class TestReferenceSolutionsPass:
    """The canonical Python solution for each algorithm must be accepted.

    Guards the frontend↔backend test-list sync: a drifted expected value
    fails here immediately.
    """

    SOLUTIONS = {
        "bubble-sort": (
            "import sys\n"
            "a = [int(x) for x in sys.stdin.read().split()]\n"
            "for p in range(len(a) - 1):\n"
            "    swapped = False\n"
            "    for j in range(len(a) - 1 - p):\n"
            "        if a[j] > a[j + 1]:\n"
            "            a[j], a[j + 1] = a[j + 1], a[j]\n"
            "            swapped = True\n"
            "    if not swapped:\n"
            "        break\n"
            "print(' '.join(map(str, a)))\n"
        ),
        "insertion-sort": (
            "import sys\n"
            "a = [int(x) for x in sys.stdin.read().split()]\n"
            "for i in range(1, len(a)):\n"
            "    key = a[i]; j = i\n"
            "    while j > 0 and a[j - 1] > key:\n"
            "        a[j] = a[j - 1]; j -= 1\n"
            "    a[j] = key\n"
            "print(' '.join(map(str, a)))\n"
        ),
        "merge-sort": (
            "import sys\n"
            "def ms(a):\n"
            "    if len(a) <= 1: return a\n"
            "    m = len(a) // 2\n"
            "    L, R = ms(a[:m]), ms(a[m:])\n"
            "    out, i, j = [], 0, 0\n"
            "    while i < len(L) and j < len(R):\n"
            "        if L[i] <= R[j]: out.append(L[i]); i += 1\n"
            "        else: out.append(R[j]); j += 1\n"
            "    return out + L[i:] + R[j:]\n"
            "a = [int(x) for x in sys.stdin.read().split()]\n"
            "print(' '.join(map(str, ms(a))))\n"
        ),
        "binary-search": (
            "import sys\n"
            "lines = sys.stdin.read().splitlines()\n"
            "a = [int(x) for x in lines[0].split()] if lines and lines[0].strip() else []\n"
            "t = int(lines[1])\n"
            "lo, hi, ans = 0, len(a) - 1, -1\n"
            "while lo <= hi:\n"
            "    mid = (lo + hi) // 2\n"
            "    if a[mid] == t: ans = mid; break\n"
            "    if a[mid] < t: lo = mid + 1\n"
            "    else: hi = mid - 1\n"
            "print(ans)\n"
        ),
        "bfs": (
            "import sys\n"
            "from collections import deque\n"
            "d = sys.stdin.read().split()\n"
            "n, m, s = int(d[0]), int(d[1]), int(d[2])\n"
            "adj = [[] for _ in range(n)]\n"
            "k = 3\n"
            "for _ in range(m):\n"
            "    u, v = int(d[k]), int(d[k + 1]); k += 2\n"
            "    adj[u].append(v); adj[v].append(u)\n"
            "for nb in adj: nb.sort()\n"
            "seen = [False] * n; seen[s] = True\n"
            "q = deque([s]); order = []\n"
            "while q:\n"
            "    node = q.popleft(); order.append(node)\n"
            "    for nxt in adj[node]:\n"
            "        if not seen[nxt]:\n"
            "            seen[nxt] = True; q.append(nxt)\n"
            "print(' '.join(map(str, order)))\n"
        ),
        "dfs": (
            "import sys\n"
            "d = sys.stdin.read().split()\n"
            "n, m, s = int(d[0]), int(d[1]), int(d[2])\n"
            "adj = [[] for _ in range(n)]\n"
            "k = 3\n"
            "for _ in range(m):\n"
            "    u, v = int(d[k]), int(d[k + 1]); k += 2\n"
            "    adj[u].append(v); adj[v].append(u)\n"
            "for nb in adj: nb.sort()\n"
            "seen = [False] * n; stack = [s]; order = []\n"
            "while stack:\n"
            "    node = stack.pop()\n"
            "    if seen[node]: continue\n"
            "    seen[node] = True; order.append(node)\n"
            "    for nxt in reversed(adj[node]):\n"
            "        if not seen[nxt]: stack.append(nxt)\n"
            "print(' '.join(map(str, order)))\n"
        ),
        "quick-sort": (
            "import sys\n"
            "a = [int(x) for x in sys.stdin.read().split()]\n"
            "def partition(a, lo, hi):\n"
            "    pivot = a[hi]; i = lo - 1\n"
            "    for j in range(lo, hi):\n"
            "        if a[j] <= pivot:\n"
            "            i += 1\n"
            "            a[i], a[j] = a[j], a[i]\n"
            "    a[i + 1], a[hi] = a[hi], a[i + 1]\n"
            "    return i + 1\n"
            "def qsort(a, lo, hi):\n"
            "    if lo < hi:\n"
            "        p = partition(a, lo, hi)\n"
            "        qsort(a, lo, p - 1)\n"
            "        qsort(a, p + 1, hi)\n"
            "qsort(a, 0, len(a) - 1)\n"
            "print(' '.join(map(str, a)))\n"
        ),
        "bst": (
            "import sys\n"
            "class Node:\n"
            "    def __init__(self, v): self.value = v; self.left = None; self.right = None\n"
            "def insert(root, v):\n"
            "    if root is None: return Node(v)\n"
            "    cur = root\n"
            "    while True:\n"
            "        if v == cur.value: return root\n"
            "        if v < cur.value:\n"
            "            if cur.left is None: cur.left = Node(v); return root\n"
            "            cur = cur.left\n"
            "        else:\n"
            "            if cur.right is None: cur.right = Node(v); return root\n"
            "            cur = cur.right\n"
            "def inorder(root, out):\n"
            "    if root is None: return\n"
            "    inorder(root.left, out)\n"
            "    out.append(str(root.value))\n"
            "    inorder(root.right, out)\n"
            "data = sys.stdin.read().split()\n"
            "q = int(data[0]); k = 1\n"
            "root = None\n"
            "for _ in range(q):\n"
            "    op = data[k]; k += 1\n"
            "    v = int(data[k]); k += 1\n"
            "    if op == 'insert': root = insert(root, v)\n"
            "    else: pass  # search — no output required\n"
            "out = []\n"
            "inorder(root, out)\n"
            "print(' '.join(out))\n"
        ),
        "dijkstra": (
            "import sys\n"
            "import heapq\n"
            "d = sys.stdin.read().split()\n"
            "n, m, s = int(d[0]), int(d[1]), int(d[2])\n"
            "adj = [[] for _ in range(n)]\n"
            "k = 3\n"
            "for _ in range(m):\n"
            "    u, v, w = int(d[k]), int(d[k + 1]), int(d[k + 2]); k += 3\n"
            "    adj[u].append((v, w))\n"
            "INF = float('inf')\n"
            "dist = [INF] * n; dist[s] = 0\n"
            "pq = [(0, s)]\n"
            "while pq:\n"
            "    d_u, u = heapq.heappop(pq)\n"
            "    if d_u > dist[u]: continue\n"
            "    for v, w in adj[u]:\n"
            "        nd = d_u + w\n"
            "        if nd < dist[v]:\n"
            "            dist[v] = nd\n"
            "            heapq.heappush(pq, (nd, v))\n"
            "def fmt(x): return 'INF' if x == INF else str(x)\n"
            "print(' '.join(fmt(x) for x in dist))\n"
        ),
        "k-nearest-neighbors": (
            "import sys\n"
            "import math\n"
            "def knn_predict(pts, k_val, qx, qy):\n"
            "    scored = []\n"
            "    for i, (px, py, lab) in enumerate(pts):\n"
            "        dx = px - qx; dy = py - qy\n"
            "        dist = math.sqrt(dx * dx + dy * dy)\n"
            "        scored.append((dist, str(i), lab))\n"
            "    scored.sort(key=lambda t: (t[0], t[1]))\n"
            "    top = scored[:k_val]\n"
            "    if not top:\n"
            "        return -1\n"
            "    counts = {}\n"
            "    for _, _, lab in top:\n"
            "        counts[lab] = counts.get(lab, 0) + 1\n"
            "    best_lab = None; best_cnt = -1\n"
            "    for lab in sorted(counts.keys(), key=lambda x: (x, str(x))):\n"
            "        c = counts[lab]\n"
            "        if c > best_cnt:\n"
            "            best_cnt = c; best_lab = lab\n"
            "    return best_lab\n"
            "def main():\n"
            "    data = sys.stdin.read().split()\n"
            "    idx = 0\n"
            "    N = int(data[idx]); idx += 1\n"
            "    k = int(data[idx]); idx += 1\n"
            "    Q = int(data[idx]); idx += 1\n"
            "    pts = []\n"
            "    for _ in range(N):\n"
            "        x = float(data[idx]); idx += 1\n"
            "        y = float(data[idx]); idx += 1\n"
            "        lab = int(data[idx]); idx += 1\n"
            "        pts.append((x, y, lab))\n"
            "    out = []\n"
            "    k_use = max(1, k)\n"
            "    for _ in range(Q):\n"
            "        qx = float(data[idx]); idx += 1\n"
            "        qy = float(data[idx]); idx += 1\n"
            "        out.append(str(knn_predict(pts, k_use, qx, qy)))\n"
            "    print(' '.join(out))\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        ),
        "k-means": (
            "import sys\n"
            "def kmeans_lcg(pts, k, seed, max_iter):\n"
            "    N = len(pts)\n"
            "    if k <= 0 or N == 0:\n"
            "        return [0] * N\n"
            "    if seed == 0:\n"
            "        centroids = [pts[i] for i in range(min(k, N))]\n"
            "    else:\n"
            "        s = seed; chosen = []\n"
            "        used = set()\n"
            "        while len(chosen) < k and len(used) < N:\n"
            "            s = s * 1103515245 + 12345\n"
            "            idx = abs(s >> 16) % N\n"
            "            if idx not in used:\n"
            "                used.add(idx); chosen.append(idx)\n"
            "        centroids = [pts[i] for i in chosen]\n"
            "    assignment = [0] * N\n"
            "    for _it in range(max_iter):\n"
            "        changed = False\n"
            "        for i in range(N):\n"
            "            px, py = pts[i]\n"
            "            best_c = 0; best_d = float('inf')\n"
            "            for c in range(len(centroids)):\n"
            "                cx, cy = centroids[c]\n"
            "                d = (px - cx) ** 2 + (py - cy) ** 2\n"
            "                if d < best_d:\n"
            "                    best_d = d; best_c = c\n"
            "            if assignment[i] != best_c:\n"
            "                assignment[i] = best_c; changed = True\n"
            "        sums = [(0.0, 0.0, 0) for _ in range(len(centroids))]\n"
            "        for i in range(N):\n"
            "            c = assignment[i]; px, py = pts[i]\n"
            "            sx, sy, cnt = sums[c]\n"
            "            sums[c] = (sx + px, sy + py, cnt + 1)\n"
            "        for c in range(len(centroids)):\n"
            "            sx, sy, cnt = sums[c]\n"
            "            if cnt > 0:\n"
            "                centroids[c] = (sx / cnt, sy / cnt)\n"
            "        if not changed:\n"
            "            break\n"
            "    return assignment\n"
            "def main():\n"
            "    data = sys.stdin.read().split()\n"
            "    idx = 0\n"
            "    N = int(data[idx]); idx += 1\n"
            "    k = int(data[idx]); idx += 1\n"
            "    seed = int(data[idx]); idx += 1\n"
            "    max_iter = int(data[idx]); idx += 1\n"
            "    pts = []\n"
            "    for _ in range(N):\n"
            "        x = float(data[idx]); idx += 1\n"
            "        y = float(data[idx]); idx += 1\n"
            "        pts.append((x, y))\n"
            "    res = kmeans_lcg(pts, k, seed, max_iter)\n"
            "    print(','.join(map(str, res)))\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        ),
        "linear-regression": (
            "import sys\n"
            "def linear_reg(data, alpha, iters):\n"
            "    t0 = 0.0; t1 = 0.0\n"
            "    N = len(data)\n"
            "    final_mse = 0.0\n"
            "    for ep in range(iters):\n"
            "        sum_err = 0.0; sum_errx = 0.0; mse = 0.0\n"
            "        for (x, y) in data:\n"
            "            pred = t0 + t1 * x\n"
            "            err = pred - y\n"
            "            sum_err += err\n"
            "            sum_errx += err * x\n"
            "            mse += err * err\n"
            "        mse /= N\n"
            "        if ep == iters - 1:\n"
            "            final_mse = mse\n"
            "        g0 = sum_err / N\n"
            "        g1 = sum_errx / N\n"
            "        t0 -= alpha * g0\n"
            "        t1 -= alpha * g1\n"
            "    return (t0, t1, final_mse)\n"
            "def main():\n"
            "    data_in = sys.stdin.read().split()\n"
            "    idx = 0\n"
            "    N = int(data_in[idx]); idx += 1\n"
            "    alpha = float(data_in[idx]); idx += 1\n"
            "    iters = int(data_in[idx]); idx += 1\n"
            "    data = []\n"
            "    for _ in range(N):\n"
            "        x = float(data_in[idx]); idx += 1\n"
            "        y = float(data_in[idx]); idx += 1\n"
            "        data.append((x, y))\n"
            "    t0, t1, mse = linear_reg(data, alpha, iters)\n"
            "    print(f\"{t0:.6f} {t1:.6f} {mse:.6f}\")\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        ),
        "perceptron": (
            "import sys\n"
            "def perceptron(pts, labels, alpha, max_epoch):\n"
            "    n = len(pts)\n"
            "    unique = sorted(set(map(str, labels)))\n"
            "    first = unique[0]\n"
            "    binlabels = [-1 if str(l) == first else +1 for l in labels]\n"
            "    w0, w1, w2 = 0.0, 0.0, 0.0\n"
            "    converged = -1\n"
            "    if n == 0:\n"
            "        return (0.0, 0.0, 0.0, -1)\n"
            "    for epoch in range(max_epoch):\n"
            "        misses = 0\n"
            "        for i in range(n):\n"
            "            x1, x2 = pts[i]\n"
            "            act = w0 + w1 * x1 + w2 * x2\n"
            "            pred = +1 if act >= 0 else -1\n"
            "            truey = binlabels[i]\n"
            "            if pred != truey:\n"
            "                misses += 1\n"
            "                delta = truey - pred\n"
            "                w0 += alpha * delta * 1.0\n"
            "                w1 += alpha * delta * x1\n"
            "                w2 += alpha * delta * x2\n"
            "        if misses == 0:\n"
            "            converged = epoch + 1\n"
            "            break\n"
            "    return (w0, w1, w2, converged)\n"
            "def main():\n"
            "    data = sys.stdin.read().split()\n"
            "    idx = 0\n"
            "    N = int(data[idx]); idx += 1\n"
            "    alpha = float(data[idx]); idx += 1\n"
            "    max_epoch = int(data[idx]); idx += 1\n"
            "    pts = []; labels = []\n"
            "    for _ in range(N):\n"
            "        x1 = float(data[idx]); idx += 1\n"
            "        x2 = float(data[idx]); idx += 1\n"
            "        lab = int(data[idx]); idx += 1\n"
            "        pts.append((x1, x2)); labels.append(lab)\n"
            "    w0, w1, w2, ep = perceptron(pts, labels, alpha, max_epoch)\n"
            "    print(f\"{w0:.6f} {w1:.6f} {w2:.6f} {ep}\")\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        ),
    }

    def test_every_algorithm_has_a_reference_solution(self):
        assert set(self.SOLUTIONS) == set(ALGORITHMS)

    @pytest.mark.parametrize("algorithm_id", sorted(ALGORITHMS))
    def test_reference_solution_accepted(self, algorithm_id):
        report = run_submission(
            "python", self.SOLUTIONS[algorithm_id], ALGORITHMS[algorithm_id].tests
        )
        failed = [r.label for r in report.results if not r.passed]
        assert report.status == "accepted", f"{algorithm_id} failed: {failed}"


class TestToolchainMissing:
    def test_toolchain_missing_message(self):
        exc = ToolchainMissing("C++", "a C++ compiler (g++ or clang++)")
        assert "C++" in str(exc)
