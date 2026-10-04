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
            'import sys\n'
            'import math\n'
            '\n'
            'def knn_classify(pts, k, qx, qy):\n'
            '    n = len(pts)\n'
            '    dists = []\n'
            '    for i in range(n):\n'
            '        x, y, label = pts[i]\n'
            '        dx = x - qx\n'
            '        dy = y - qy\n'
            '        d = math.sqrt(dx * dx + dy * dy)\n'
            '        dists.append((d, i, label))\n'
            '    dists.sort()\n'
            '    cnt = {}\n'
            '    for i in range(min(k, len(dists))):\n'
            '        label = dists[i][2]\n'
            '        cnt[label] = cnt.get(label, 0) + 1\n'
            '    best_label, best_cnt = -1, -1\n'
            '    for label, count in sorted(cnt.items()):  # ascending: vote ties -> smaller label\n'
            '        if count > best_cnt:\n'
            '            best_cnt = count\n'
            '            best_label = label\n'
            '    return best_label\n'
            '\n'
            'def main():\n'
            '    data = sys.stdin.read().split()\n'
            '    idx = 0\n'
            '    N, k, Q = int(data[idx]), int(data[idx+1]), int(data[idx+2])\n'
            '    idx += 3\n'
            '    pts = []\n'
            '    for _ in range(N):\n'
            '        x = int(data[idx]); y = int(data[idx+1]); label = int(data[idx+2])\n'
            '        idx += 3\n'
            '        pts.append((x, y, label))\n'
            '    out = []\n'
            '    for _ in range(Q):\n'
            '        qx = int(data[idx]); qy = int(data[idx+1])\n'
            '        idx += 2\n'
            '        out.append(str(knn_classify(pts, k, qx, qy)))\n'
            '    print(" ".join(out))\n'
            '\n'
            'if __name__ == "__main__":\n'
            '    main()\n'
        ),
        "k-means": (
            'import math\n'
            'import sys\n'
            '\n'
            'def kmeans(pts, k, seed, max_iter=20):\n'
            '    n = len(pts)\n'
            '    centroids = [(0.0, 0.0)] * k\n'
            '    if seed == 0:\n'
            '        for i in range(k):\n'
            '            centroids[i] = (float(pts[i % n][0]), float(pts[i % n][1]))\n'
            '    else:\n'
            '        s = seed\n'
            '        for i in range(k):\n'
            '            src = pts[(i + s) % n]\n'
            '            centroids[i] = (float(src[0]), float(src[1]))\n'
            '            s = (s * 7 + 13) % max(n, 1)\n'
            '    assign = [0] * n\n'
            '    for _it in range(max_iter):\n'
            '        for i in range(n):\n'
            '            best = 1e18\n'
            '            bc = -1\n'
            '            for c in range(k):\n'
            '                dx = pts[i][0] - centroids[c][0]\n'
            '                dy = pts[i][1] - centroids[c][1]\n'
            '                d2 = dx*dx + dy*dy\n'
            '                if d2 < best:\n'
            '                    best = d2\n'
            '                    bc = c\n'
            '            assign[i] = bc\n'
            '        sum_x = [0.0] * k\n'
            '        sum_y = [0.0] * k\n'
            '        cnt = [0] * k\n'
            '        for i in range(n):\n'
            '            sum_x[assign[i]] += pts[i][0]\n'
            '            sum_y[assign[i]] += pts[i][1]\n'
            '            cnt[assign[i]] += 1\n'
            '        changed = 0\n'
            '        for c in range(k):\n'
            '            if cnt[c] > 0:\n'
            '                nx = sum_x[c] / cnt[c]\n'
            '                ny = sum_y[c] / cnt[c]\n'
            '            else:\n'
            '                nx, ny = centroids[c]\n'
            '            if abs(nx - centroids[c][0]) > 1e-12 or abs(ny - centroids[c][1]) > 1e-12:\n'
            '                changed += 1\n'
            '            centroids[c] = (nx, ny)\n'
            '        if changed == 0:\n'
            '            break\n'
            '    return assign\n'
            '\n'
            'def main():\n'
            '    data = sys.stdin.read().split()\n'
            '    idx = 0\n'
            '    N = int(data[idx]); idx += 1\n'
            '    k = int(data[idx]); idx += 1\n'
            '    seed = int(data[idx]); idx += 1\n'
            '    max_iter = int(data[idx]); idx += 1\n'
            '    pts = []\n'
            '    for _ in range(N):\n'
            '        x = float(data[idx]); idx += 1\n'
            '        y = float(data[idx]); idx += 1\n'
            '        pts.append((x, y))\n'
            '    res = kmeans(pts, k, seed, max_iter)\n'
            '    print(",".join(map(str, res)))\n'
            '\n'
            'if __name__ == "__main__":\n'
            '    main()\n'
        ),
        "linear-regression": (
            'import sys\n'
            '\n'
            'def linear_reg(data, alpha, iters):\n'
            '    n = len(data)\n'
            '    t0, t1 = 0.0, 0.0\n'
            '    for _ in range(iters):\n'
            '        g0, g1 = 0.0, 0.0\n'
            '        for i in range(n):\n'
            '            x, y = data[i]\n'
            '            pred = t0 + t1 * x\n'
            '            err = pred - y\n'
            '            g0 += 2.0 * err / n\n'
            '            g1 += 2.0 * err * x / n\n'
            '        t0 -= alpha * g0\n'
            '        t1 -= alpha * g1\n'
            '    final_mse = 0.0\n'
            '    for i in range(n):\n'
            '        x, y = data[i]\n'
            '        pred = t0 + t1 * x\n'
            '        err = pred - y\n'
            '        final_mse += err * err\n'
            '    final_mse /= n\n'
            '    return (t0, t1, final_mse)\n'
            '\n'
            'def main():\n'
            '    data_in = sys.stdin.read().split()\n'
            '    idx = 0\n'
            '    N = int(data_in[idx]); idx += 1\n'
            '    alpha = float(data_in[idx]); idx += 1\n'
            '    iters = int(data_in[idx]); idx += 1\n'
            '    data = []\n'
            '    for _ in range(N):\n'
            '        x = float(data_in[idx]); idx += 1\n'
            '        y = float(data_in[idx]); idx += 1\n'
            '        data.append((x, y))\n'
            '    t0, t1, mse = linear_reg(data, alpha, iters)\n'
            '    print(f"{t0:.6f} {t1:.6f} {mse:.6f}")\n'
            '\n'
            'if __name__ == "__main__":\n'
            '    main()\n'
        ),
        "perceptron": (
            'import sys\n'
            '\n'
            'def perceptron(pts, labels, alpha, max_epoch):\n'
            '    n = len(pts)\n'
            '    y = [0] * n\n'
            '    if n > 0:\n'
            '        seen = sorted(set(labels))\n'
            '        first = seen[0]\n'
            '        for i in range(n):\n'
            '            y[i] = -1 if labels[i] == first else +1\n'
            '    w0, w1, w2 = 0.0, 0.0, 0.0\n'
            '    converged_epoch = -1\n'
            '    for epoch in range(max_epoch):\n'
            '        misses = 0\n'
            '        for i in range(n):\n'
            '            x1, x2 = pts[i]\n'
            '            a = w0 + w1 * x1 + w2 * x2\n'
            '            pred = +1 if a >= 0 else -1\n'
            '            if pred != y[i]:\n'
            '                misses += 1\n'
            '                w0 += alpha * (y[i] - pred) * 1.0\n'
            '                w1 += alpha * (y[i] - pred) * x1\n'
            '                w2 += alpha * (y[i] - pred) * x2\n'
            '        if misses == 0:\n'
            '            converged_epoch = epoch + 1\n'
            '            break\n'
            '    return (w0, w1, w2, converged_epoch)\n'
            '\n'
            'def main():\n'
            '    data = sys.stdin.read().split()\n'
            '    idx = 0\n'
            '    N = int(data[idx]); idx += 1\n'
            '    alpha = float(data[idx]); idx += 1\n'
            '    max_epoch = int(data[idx]); idx += 1\n'
            '    pts = []\n'
            '    labels = []\n'
            '    for _ in range(N):\n'
            '        x1 = float(data[idx]); idx += 1\n'
            '        x2 = float(data[idx]); idx += 1\n'
            '        lab = int(data[idx]); idx += 1\n'
            '        pts.append((x1, x2))\n'
            '        labels.append(lab)\n'
            '    w0, w1, w2, ep = perceptron(pts, labels, alpha, max_epoch)\n'
            '    print(f"{w0:.6f} {w1:.6f} {w2:.6f} {ep}")\n'
            '\n'
            'if __name__ == "__main__":\n'
            '    main()\n'
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


class TestOutputComparison:
    """Judge compares numbers with a small tolerance, text exactly."""

    def test_negative_zero_matches_zero(self):
        from app.runner import _outputs_match
        assert _outputs_match("-0.000000 1.500000", "0.000000 1.500000")

    def test_last_digit_rounding_tolerated(self):
        from app.runner import _outputs_match
        assert _outputs_match("2.660467", "2.660466")

    def test_real_numeric_difference_rejected(self):
        from app.runner import _outputs_match
        assert not _outputs_match("2.661000", "2.660466")

    def test_inf_must_match_literally(self):
        from app.runner import _outputs_match
        assert _outputs_match("0 INF", "0 INF")
        assert not _outputs_match("0 inf", "0 INF")

    def test_token_count_must_match(self):
        from app.runner import _outputs_match
        assert not _outputs_match("1 2", "1 2 3")
