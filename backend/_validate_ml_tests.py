"""Ad-hoc validator: 40/40 ML judge test cases."""
import sys, math

sys.path.insert(0, "c:/Users/DHEERAJ/Desktop/project/backend")
from app.algorithms import (
    KNN_TESTS, KMEANS_TESTS, LINEAR_REGRESSION_TESTS, PERCEPTRON_TESTS,
)

EPS = 1e-6


def knn_predict(pts, k_val, qx, qy):
    scored = []
    for i, (px, py, lab) in enumerate(pts):
        dx = px - qx; dy = py - qy
        dist = math.sqrt(dx * dx + dy * dy)
        scored.append((dist, str(i), lab))
    scored.sort(key=lambda t: (t[0], t[1]))
    top = scored[:k_val]
    if not top:
        return -1
    counts = {}
    for _, _, lab in top:
        counts[lab] = counts.get(lab, 0) + 1
    best_lab = None; best_cnt = -1
    for lab in sorted(counts.keys(), key=lambda x: (x, str(x))):
        c = counts[lab]
        if c > best_cnt:
            best_cnt = c; best_lab = lab
    return best_lab


def run_knn(input_str):
    d = input_str.split()
    idx = 0
    N = int(d[idx]); idx += 1
    k = int(d[idx]); idx += 1
    Q = int(d[idx]); idx += 1
    pts = []
    for _ in range(N):
        x = float(d[idx]); idx += 1
        y = float(d[idx]); idx += 1
        lab = int(d[idx]); idx += 1
        pts.append((x, y, lab))
    out = []
    k_use = max(1, k)
    for _ in range(Q):
        qx = float(d[idx]); idx += 1
        qy = float(d[idx]); idx += 1
        out.append(str(knn_predict(pts, k_use, qx, qy)))
    return " ".join(out)


def kmeans_lcg(pts, k, seed, max_iter):
    N = len(pts)
    if k <= 0 or N == 0:
        return [0] * N
    if seed == 0:
        centroids = [pts[i] for i in range(min(k, N))]
    else:
        s = seed; chosen = []; used = set()
        while len(chosen) < k and len(used) < N:
            s = s * 1103515245 + 12345
            idx_r = abs(s >> 16) % N
            if idx_r not in used:
                used.add(idx_r); chosen.append(idx_r)
        centroids = [pts[i] for i in chosen]
    assignment = [0] * N
    for _it in range(max_iter):
        changed = False
        for i in range(N):
            px, py = pts[i]
            best_c = 0; best_d = float("inf")
            for c in range(len(centroids)):
                cx, cy = centroids[c]
                d = (px - cx) ** 2 + (py - cy) ** 2
                if d < best_d:
                    best_d = d; best_c = c
            if assignment[i] != best_c:
                assignment[i] = best_c; changed = True
        sums = [(0.0, 0.0, 0) for _ in range(len(centroids))]
        for i in range(N):
            c = assignment[i]; px, py = pts[i]
            sx, sy, cnt = sums[c]
            sums[c] = (sx + px, sy + py, cnt + 1)
        for c in range(len(centroids)):
            sx, sy, cnt = sums[c]
            if cnt > 0:
                centroids[c] = (sx / cnt, sy / cnt)
        if not changed:
            break
    return assignment


def run_kmeans(input_str):
    d = input_str.split()
    idx = 0
    N = int(d[idx]); idx += 1
    k = int(d[idx]); idx += 1
    seed = int(d[idx]); idx += 1
    max_iter = int(d[idx]); idx += 1
    pts = []
    for _ in range(N):
        x = float(d[idx]); idx += 1
        y = float(d[idx]); idx += 1
        pts.append((x, y))
    res = kmeans_lcg(pts, k, seed, max_iter)
    return ",".join(map(str, res))


def linear_reg(data, alpha, iters):
    t0 = 0.0; t1 = 0.0
    N = len(data)
    final_mse = 0.0
    for ep in range(iters):
        sum_err = 0.0; sum_errx = 0.0; mse = 0.0
        for (x, y) in data:
            pred = t0 + t1 * x
            err = pred - y
            sum_err += err
            sum_errx += err * x
            mse += err * err
        mse /= N
        if ep == iters - 1:
            final_mse = mse
        g0 = sum_err / N
        g1 = sum_errx / N
        t0 -= alpha * g0
        t1 -= alpha * g1
    return (t0, t1, final_mse)


def run_linreg(input_str):
    d = input_str.split()
    idx = 0
    N = int(d[idx]); idx += 1
    alpha = float(d[idx]); idx += 1
    iters = int(d[idx]); idx += 1
    data = []
    for _ in range(N):
        x = float(d[idx]); idx += 1
        y = float(d[idx]); idx += 1
        data.append((x, y))
    t0, t1, mse = linear_reg(data, alpha, iters)
    return f"{t0:.6f} {t1:.6f} {mse:.6f}"


def perceptron_impl(pts, labels, alpha, max_epoch):
    n = len(pts)
    unique = sorted(set(map(str, labels)))
    first = unique[0]
    binlabels = [-1 if str(l) == first else +1 for l in labels]
    w0, w1, w2 = 0.0, 0.0, 0.0
    converged = -1
    if n == 0:
        return (0.0, 0.0, 0.0, -1)
    for epoch in range(max_epoch):
        misses = 0
        for i in range(n):
            x1, x2 = pts[i]
            act = w0 + w1 * x1 + w2 * x2
            pred = +1 if act >= 0 else -1
            truey = binlabels[i]
            if pred != truey:
                misses += 1
                delta = truey - pred
                w0 += alpha * delta * 1.0
                w1 += alpha * delta * x1
                w2 += alpha * delta * x2
        if misses == 0:
            converged = epoch + 1
            break
    return (w0, w1, w2, converged)


def run_perceptron(input_str):
    d = input_str.split()
    idx = 0
    N = int(d[idx]); idx += 1
    alpha = float(d[idx]); idx += 1
    max_epoch = int(d[idx]); idx += 1
    pts = []; labels = []
    for _ in range(N):
        x1 = float(d[idx]); idx += 1
        x2 = float(d[idx]); idx += 1
        lab = int(d[idx]); idx += 1
        pts.append((x1, x2)); labels.append(lab)
    w0, w1, w2, ep = perceptron_impl(pts, labels, alpha, max_epoch)
    return f"{w0:.6f} {w1:.6f} {w2:.6f} {ep}"


def check_label(name, tests, runner):
    pass_c = 0; total = 0; failures = []
    for t in tests:
        total += 1
        got = runner(t.input)
        ok = got == t.expected
        if ok:
            pass_c += 1
        else:
            failures.append((t.label, t.input, t.expected, got))
    print(f"\n{name}: {pass_c}/{total} passed")
    for (label, inp, exp, got) in failures:
        print(f"  FAIL [{label}]: expected {exp!r}, got {got!r}")
        if len(inp) < 120:
            print(f"    input = {inp!r}")
        else:
            print(f"    input (first 110 chars) = {inp[:110]!r}...")
    return pass_c, total


tot_pass = 0; tot_total = 0

p, t = check_label("kNN", KNN_TESTS, run_knn); tot_pass += p; tot_total += t
p, t = check_label("k-Means", KMEANS_TESTS, run_kmeans); tot_pass += p; tot_total += t
p, t = check_label("LinReg", LINEAR_REGRESSION_TESTS, run_linreg); tot_pass += p; tot_total += t
p, t = check_label("Perceptron", PERCEPTRON_TESTS, run_perceptron); tot_pass += p; tot_total += t

print(f"\nTOTAL: {tot_pass}/{tot_total}")
