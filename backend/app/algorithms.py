"""Algorithm problem data mirrored from the frontend engine modules.

Source of truth: frontend/src/engine/algorithms/*.ts — keep the test lists
in sync when editing either side.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class TestCase:
    input: str
    expected: str
    hidden: bool
    label: str | None = None


# n=100 stress case generated exactly like the frontend:
# values ((i*37) % 100) - 50 for i in 0..99, expected = numeric sort of same.
_STRESS_VALUES = [((i * 37) % 100) - 50 for i in range(100)]

BUBBLE_SORT_TESTS = [
    TestCase("5 2 8 1 9", "1 2 5 8 9", False, "sample 1"),
    TestCase("3 1 2", "1 2 3", False, "sample 2"),
    TestCase("", "", True, "empty"),
    TestCase("42", "42", True, "single element"),
    TestCase("2 2 2 2", "2 2 2 2", True, "all duplicates"),
    TestCase("1 2 3 4 5 6 7 8 9 10", "1 2 3 4 5 6 7 8 9 10", True, "already sorted"),
    TestCase("10 9 8 7 6 5 4 3 2 1", "1 2 3 4 5 6 7 8 9 10", True, "reversed"),
    TestCase("-5 3 -1 0 2 -8", "-8 -5 -1 0 2 3", True, "negatives"),
    TestCase("3 1 3 2 1 3 2 1 2", "1 1 1 2 2 2 3 3 3", True, "few unique"),
    TestCase(
        " ".join(map(str, _STRESS_VALUES)),
        " ".join(map(str, sorted(_STRESS_VALUES))),
        True,
        "n=100 stress",
    ),
]

INSERTION_SORT_TESTS = [
    TestCase("5 2 8 1 9", "1 2 5 8 9", False, "sample 1"),
    TestCase("3 1 2", "1 2 3", False, "sample 2"),
    TestCase("", "", True, "empty"),
    TestCase("42", "42", True, "single element"),
    TestCase("2 2 2 2", "2 2 2 2", True, "all duplicates"),
    TestCase("1 2 3 4 5 6 7 8 9 10", "1 2 3 4 5 6 7 8 9 10", True, "already sorted"),
    TestCase("10 9 8 7 6 5 4 3 2 1", "1 2 3 4 5 6 7 8 9 10", True, "reversed"),
    TestCase("-5 3 -1 0 2 -8", "-8 -5 -1 0 2 3", True, "negatives"),
    TestCase("3 1 3 2 1 3 2 1 2", "1 1 1 2 2 2 3 3 3", True, "few unique"),
    TestCase(
        " ".join(map(str, _STRESS_VALUES)),
        " ".join(map(str, sorted(_STRESS_VALUES))),
        True,
        "n=100 stress",
    ),
]

MERGE_SORT_TESTS = [
    TestCase("5 2 8 1 9", "1 2 5 8 9", False, "sample 1"),
    TestCase("3 1 2", "1 2 3", False, "sample 2"),
    TestCase("", "", True, "empty"),
    TestCase("42", "42", True, "single element"),
    TestCase("2 2 2 2", "2 2 2 2", True, "all duplicates"),
    TestCase("1 2 3 4 5 6 7 8 9 10", "1 2 3 4 5 6 7 8 9 10", True, "already sorted"),
    TestCase("10 9 8 7 6 5 4 3 2 1", "1 2 3 4 5 6 7 8 9 10", True, "reversed"),
    TestCase("-5 3 -1 0 2 -8", "-8 -5 -1 0 2 3", True, "negatives"),
    TestCase("1 3 5 7 2 4 6 8", "1 2 3 4 5 6 7 8", True, "two runs"),
    TestCase(
        " ".join(map(str, _STRESS_VALUES)),
        " ".join(map(str, sorted(_STRESS_VALUES))),
        True,
        "n=100 stress",
    ),
]

QUICK_SORT_TESTS = [
    TestCase("5 2 8 1 9", "1 2 5 8 9", False, "sample 1"),
    TestCase("3 1 2", "1 2 3", False, "sample 2"),
    TestCase("", "", True, "empty"),
    TestCase("42", "42", True, "single element"),
    TestCase("2 2 2 2", "2 2 2 2", True, "all duplicates"),
    TestCase("1 2 3 4 5 6 7 8 9 10", "1 2 3 4 5 6 7 8 9 10", True, "already sorted"),
    TestCase("10 9 8 7 6 5 4 3 2 1", "1 2 3 4 5 6 7 8 9 10", True, "reversed"),
    TestCase("-5 3 -1 0 2 -8", "-8 -5 -1 0 2 3", True, "negatives"),
    TestCase("3 1 3 2 1 3 2 1 2", "1 1 1 2 2 2 3 3 3", True, "few unique"),
    TestCase(
        " ".join(map(str, _STRESS_VALUES)),
        " ".join(map(str, sorted(_STRESS_VALUES))),
        True,
        "n=100 stress",
    ),
]

# 0, 3, 6, … 297 — mirrors the frontend's Array.from({length: 100}, (_, i) => i * 3).
_BSEARCH_100 = " ".join(str(i * 3) for i in range(100))

BINARY_SEARCH_TESTS = [
    TestCase("2 5 8 12 16 23 38 56 72 91\n23", "5", False, "sample 1"),
    TestCase("2 5 8 12 16 23 38 56 72 91\n40", "-1", False, "sample 2 (absent)"),
    TestCase("7\n7", "0", True, "single element hit"),
    TestCase("7\n3", "-1", True, "single element miss"),
    TestCase("1 3 5 7 9\n1", "0", True, "first element"),
    TestCase("1 3 5 7 9\n9", "4", True, "last element"),
    TestCase("1 3 5 7 9\n0", "-1", True, "below range"),
    TestCase("1 3 5 7 9\n10", "-1", True, "above range"),
    TestCase("-10 -5 0 5 10\n-5", "1", True, "negatives"),
    TestCase(f"{_BSEARCH_100}\n297", "99", True, "n=100, last index"),
    TestCase(f"{_BSEARCH_100}\n100", "-1", True, "n=100, between elements"),
]

BFS_TESTS = [
    TestCase("7 7 0\n0 1\n0 2\n1 3\n2 4\n3 5\n4 5\n5 6", "0 1 2 3 4 5 6", False, "sample 1"),
    TestCase("4 2 0\n0 1\n2 3", "0 1", False, "sample 2 (disconnected)"),
    TestCase("1 0 0", "0", True, "single node"),
    TestCase("2 1 1\n0 1", "1 0", True, "start not 0"),
    TestCase("5 5 0\n0 1\n1 2\n2 3\n3 4\n4 0", "0 1 4 2 3", True, "cycle"),
    TestCase("6 3 3\n0 1\n1 2\n3 4", "3 4", True, "disconnected, start in small comp"),
    TestCase("4 6 0\n0 1\n0 2\n0 3\n1 2\n1 3\n2 3", "0 1 2 3", True, "complete K4"),
    TestCase("7 6 0\n0 1\n0 2\n1 3\n1 4\n2 5\n2 6", "0 1 2 3 4 5 6", True, "binary tree"),
    TestCase("5 4 2\n2 4\n2 0\n4 1\n0 3", "2 0 4 3 1", True, "ascending-neighbor order check"),
    TestCase("3 3 0\n0 1\n0 1\n1 2", "0 1 2", True, "duplicate edge"),
]

DFS_TESTS = [
    TestCase("7 7 0\n0 1\n0 2\n1 3\n2 4\n3 5\n4 5\n5 6", "0 1 3 5 4 2 6", False, "sample 1"),
    TestCase("4 2 0\n0 1\n2 3", "0 1", False, "sample 2 (disconnected)"),
    TestCase("1 0 0", "0", True, "single node"),
    TestCase("2 1 1\n0 1", "1 0", True, "start not 0"),
    TestCase("5 5 0\n0 1\n1 2\n2 3\n3 4\n4 0", "0 1 2 3 4", True, "cycle"),
    TestCase("6 3 3\n0 1\n1 2\n3 4", "3 4", True, "disconnected, start in small comp"),
    TestCase("4 6 0\n0 1\n0 2\n0 3\n1 2\n1 3\n2 3", "0 1 2 3", True, "complete K4"),
    TestCase("7 6 0\n0 1\n0 2\n1 3\n1 4\n2 5\n2 6", "0 1 3 4 2 5 6", True, "binary tree"),
    TestCase("5 4 2\n2 4\n2 0\n4 1\n0 3", "2 0 3 4 1", True, "ascending-neighbor order check"),
    TestCase("3 3 0\n0 1\n0 1\n1 2", "0 1 2", True, "duplicate edge"),
]

DIJKSTRA_TESTS = [
    TestCase(
        "6 10 0\n0 1 4\n0 2 2\n1 2 1\n1 3 5\n2 1 1\n2 3 8\n2 4 10\n3 4 2\n3 5 6\n4 5 3",
        "0 3 2 8 10 13",
        False,
        "sample 1",
    ),
    TestCase(
        "3 3 0\n0 1 1\n1 2 1\n0 2 5",
        "0 1 2",
        False,
        "sample 2 (indirect wins)",
    ),
    TestCase("1 0 0", "0", True, "single node"),
    TestCase("5 3 0\n0 1 2\n1 2 3\n0 2 7", "0 2 5 INF INF", True, "unreachable nodes"),
    TestCase(
        "4 4 2\n0 1 1\n1 2 2\n2 3 4\n0 3 10",
        "INF INF 0 4",
        True,
        "start not 0, unreachable before start",
    ),
    TestCase(
        "4 6 0\n0 1 10\n0 2 5\n1 2 2\n2 1 3\n1 3 1\n2 3 9",
        "0 8 5 9",
        True,
        "stale heap entries",
    ),
    TestCase("5 0 0", "0 INF INF INF INF", True, "no edges"),
    TestCase("2 2 0\n0 1 5\n0 1 1", "0 1", True, "parallel edges"),
    TestCase(
        "7 8 0\n0 1 7\n0 2 9\n0 5 14\n1 2 10\n1 3 15\n2 3 11\n2 5 2\n5 4 9\n3 4 6",
        "0 7 9 20 20 11 INF",
        True,
        "classic CLRS example",
    ),
    TestCase(
        "5 6 1\n0 1 2\n1 2 3\n2 3 1\n0 3 7\n3 4 4\n1 4 12",
        "INF 0 3 4 8",
        True,
        "start=1, unreachable 0",
    ),
]

BST_TESTS = [
    TestCase(
        "9\ninsert 5\ninsert 3\ninsert 7\ninsert 1\ninsert 4\ninsert 6\ninsert 9\nsearch 4\nsearch 8",
        "1 3 4 5 6 7 9",
        False,
        "sample 1",
    ),
    TestCase(
        "4\ninsert 2\ninsert 1\ninsert 3\nsearch 2",
        "1 2 3",
        False,
        "sample 2",
    ),
    TestCase("0", "", True, "no ops"),
    TestCase("3\ninsert 42\ninsert 42\nsearch 42", "42", True, "duplicate insert"),
    TestCase(
        "5\ninsert 1\ninsert 2\ninsert 3\ninsert 4\ninsert 5",
        "1 2 3 4 5",
        True,
        "sorted worst case",
    ),
    TestCase(
        "7\ninsert 50\ninsert 30\ninsert 70\ninsert 20\ninsert 40\ninsert 60\ninsert 80",
        "20 30 40 50 60 70 80",
        True,
        "balanced build",
    ),
    TestCase(
        "6\ninsert 10\nsearch 5\nsearch 10\nsearch 15\ninsert 5\ninsert 15",
        "5 10 15",
        True,
        "search then insert",
    ),
    TestCase(
        "8\ninsert -5\ninsert 0\ninsert 5\ninsert -10\ninsert 10\nsearch 0\nsearch -5\nsearch 7",
        "-10 -5 0 5 10",
        True,
        "negatives",
    ),
    TestCase(
        "5\nsearch 1\nsearch 2\ninsert 2\nsearch 1\ninsert 1",
        "1 2",
        True,
        "searches on empty tree",
    ),
    TestCase(
        "14\ninsert 8\ninsert 3\ninsert 10\ninsert 1\ninsert 6\ninsert 14\ninsert 4\ninsert 7\ninsert 13\nsearch 6\nsearch 13\nsearch 99\ninsert 6\nsearch 1",
        "1 3 4 6 7 8 10 13 14",
        True,
        "comprehensive",
    ),
]


def _knn_stress_input() -> str:
    pts = []
    for i in range(200):
        cls = 0 if i < 100 else 1
        bx = -5 if cls == 0 else 5
        by = (i * 13) % 10
        x = bx + ((i * 7) % 3) - 1
        pts.append(f"{x} {by} {cls}")
    return "200 11 1\n" + "\n".join(pts) + "\n0 5"


KNN_TESTS = [
    TestCase(
        "5 3 1\n1 1 0\n2 2 0\n3 3 1\n4 5 1\n3 3\n3 2",
        "1",
        False,
        "sample 1: 2-class k=3",
    ),
    TestCase(
        "4 1 2\n0 0 0\n0 0 0\n10 10 1\n5 5 1\n1 1\n9 9",
        "0 1",
        False,
        "sample 2: k=1 two queries",
    ),
    TestCase("1 1 1\n5 5 7\n5 5", "7", True, "k=1 single point"),
    TestCase("0 0 1\n0 0", "-1", True, "empty train set"),
    TestCase(
        "6 3 1\n0 0 0\n0 1 0\n1 0 0\n0 10 1\n1 10 1\n10 10 2\n2 2",
        "0",
        True,
        "3-class unambiguous",
    ),
    TestCase(
        "6 3 1\n0 0 0\n1 1 1\n2 2 2\n10 0 0\n10 1 1\n10 2 2\n5 1",
        "0",
        True,
        "vote tie-break by smaller label",
    ),
    TestCase(
        "5 5 1\n1 1 0\n2 2 0\n-1 -1 1\n-2 -2 1\n0 0 0\n0 0",
        "0",
        True,
        "negative coords, k=N",
    ),
    TestCase(
        "10 1 1\n0 0 0\n0 0 1\n0 0 0\n0 0 2\n0 0 0\n0 0 1\n0 0 0\n0 0 2\n0 0 0\n0 0 3\n0 0",
        "0",
        True,
        "duplicate points tie-break by index",
    ),
    TestCase(
        "12 5 1\n0 1 0\n1 0 0\n1 1 0\n0 0 0\n5 1 1\n5 0 1\n6 1 1\n6 0 1\n3 5 2\n3 4 2\n4 5 2\n4 4 2\n3 2",
        "0",
        True,
        "3-class overlap from preset",
    ),
    TestCase(_knn_stress_input(), "0", True, "n=200 stress"),
]


def _kmeans_stress_input() -> str:
    pts = []
    for i in range(200):
        bx = -10 if i < 100 else 10
        by = (i % 10) - 5
        x = bx + ((i % 3) * 0.1)
        y = by + ((i % 5) * 0.1)
        pts.append(f"{x} {y}")
    return "200 2 0 20\n" + "\n".join(pts)


_KMEANS_STRESS_EXPECTED = ",".join(["0"] * 100 + ["1"] * 100)

KMEANS_TESTS = [
    TestCase(
        "4 2 0 20\n-3 0\n-2.5 0.5\n3 0\n2.5 0.5",
        "0,0,1,1",
        False,
        "sample 1: 2-blob k=2 seed=0",
    ),
    TestCase(
        "9 3 0 20\n-3 2\n-2.5 2.5\n-3.5 2.5\n3 2\n2.5 2.5\n3.5 2.5\n0 -3\n0.5 -3.5\n-0.5 -3.5",
        "0,0,0,1,1,1,2,2,2",
        False,
        "sample 2: 3-blob k=3",
    ),
    TestCase("1 1 0 20\n5 5", "0", True, "k=1 single point"),
    TestCase("3 3 0 20\n0 0\n1 1\n2 2", "0,1,2", True, "k=N each own cluster"),
    TestCase(
        "8 2 7 1\n0 0\n0.1 0.1\n0.2 0.2\n0.1 0\n10 10\n10.1 10.1\n10.2 10.2\n10.1 10",
        "0,0,0,0,1,1,1,1",
        True,
        "1 iter only still outputs last assign",
    ),
    TestCase(
        "10 2 0 20\n0 0\n0 0\n0 0\n0 0\n0 0\n10 10\n10 10\n10 10\n10 10\n10 10",
        "0,0,0,0,0,1,1,1,1,1",
        True,
        "duplicate points",
    ),
    TestCase(
        "8 2 0 20\n-5 -5\n-4 -5\n-5 -4\n-4 -4\n5 5\n4 5\n5 4\n4 4",
        "0,0,0,0,1,1,1,1",
        True,
        "negative coords",
    ),
    TestCase(_kmeans_stress_input(), _KMEANS_STRESS_EXPECTED, True, "n=200 stress"),
    TestCase(
        "20 4 7 20\n-3 -2\n-3.5 -2\n-3 -2.5\n-2.5 -2\n-3.2 -2.3\n3 -2\n3.5 -2\n3 -2.5\n2.5 -2\n3.2 -2.3\n-3 2\n-3.5 2\n-3 2.5\n-2.5 2\n-3.2 2.3\n3 2\n3.5 2\n3 2.5\n2.5 2\n3.2 2.3",
        "0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3",
        True,
        "k=4 quadrants seeded",
    ),
    TestCase(
        "6 2 0 20\n0 0\n1 0\n2 0\n100 0\n101 0\n102 0",
        "0,0,0,1,1,1",
        True,
        "seed=0 first-k-points init",
    ),
]


def _linreg_stress_input() -> str:
    pts = []
    for i in range(200):
        x = (i - 100) / 20
        y = 2 * x + 3 + (i % 7) * 0.01
        pts.append(f"{x:.4f} {y:.4f}")
    return "200 0.05 20\n" + "\n".join(pts)


LINEAR_REGRESSION_TESTS = [
    TestCase(
        "5 0.1 20\n1 2\n2 4\n3 6\n4 8\n5 10",
        "0.195720 1.946802 0.002483",
        False,
        "sample 1: exact line converges",
    ),
    TestCase(
        "4 0.05 5\n0 3\n1 5\n2 7\n3 9",
        "1.590113 2.341914 0.066750",
        False,
        "sample 2: y=2x+3 short run",
    ),
    TestCase("1 0.01 1\n5 7", "0.140000 0.700000 35.409600", True, "single point 1 iter"),
    TestCase("2 0.5 1\n0 0\n1 1", "0.500000 0.500000 0.125000", True, "2-points α=0.5 single iter"),
    TestCase(
        "10 0.03 20\n1 2.1\n2 3.9\n3 6.0\n4 8.1\n5 10.0\n6 12.2\n7 14.0\n8 15.9\n9 18.1\n10 20.0",
        "-0.131622 2.016440 0.011511",
        True,
        "noisy N=10 full 20 iter",
    ),
    TestCase(
        "6 0.001 5\n-3 0\n-2 1\n-1 2\n1 4\n2 5\n3 6",
        "0.083038 1.041000 0.400115",
        True,
        "negative x coords tiny alpha",
    ),
    TestCase(
        "4 1e-7 50\n0 1\n1 2\n2 3\n3 4",
        "0.000100 0.000200 6.046258",
        True,
        "micro-alpha slow convergence",
    ),
    TestCase(
        "8 0.5 20\n0 0\n1 2\n2 4\n3 6\n4 8\n5 10\n6 12\n7 14",
        "0.000000 2.000000 0.000000",
        True,
        "exact line MSE drops to ~0",
    ),
    TestCase(
        _linreg_stress_input(),
        "1.889801 2.003452 0.076929",
        True,
        "n=200 stress",
    ),
    TestCase(
        "6 0.05 1\n0 3\n1 5\n2 7\n3 9\n4 11\n5 13",
        "0.650000 2.175000 1.059688",
        True,
        "one-epoch deterministic check",
    ),
]


def _perceptron_stress_input() -> str:
    pts = []
    for i in range(100):
        pts.append(f"{-3 - (i % 3)} {-2 - ((i * 2) % 3)} 0")
    for i in range(100):
        pts.append(f"{3 + (i % 3)} {2 + ((i * 2) % 3)} 1")
    return "200 1 50\n" + "\n".join(pts)


PERCEPTRON_TESTS = [
    TestCase(
        "4 1 50\n-2 -2 0\n-1 -1 0\n2 2 1\n1 1 1",
        "2.000000 0.000000 2.000000 2",
        False,
        "sample 1: separable 4-pt",
    ),
    TestCase(
        "2 1 10\n0 0 0\n1 1 1",
        "0.000000 2.000000 2.000000 1",
        False,
        "sample 2: 2-pt 1-epoch converge",
    ),
    TestCase("1 1 10\n5 5 7", "0.000000 0.000000 0.000000 1", True, "single point converges in 1"),
    TestCase(
        "4 1 10\n0 0 0\n1 1 0\n0 1 1\n1 0 1",
        "-2.000000 2.000000 -2.000000 -1",
        True,
        "XOR 4-pt inseparable",
    ),
    TestCase(
        "6 0.5 20\n-3 1 0\n-2 0 0\n-1 -1 0\n1 1 1\n2 0 1\n3 -1 1",
        "0.000000 1.000000 0.000000 2",
        True,
        "6-pt separable α=0.5",
    ),
    TestCase(
        "10 0.1 10\n-3 -2 0\n-3 -1 0\n-2 -2 0\n-1 -3 0\n-2 -1 0\n3 2 1\n3 1 1\n2 2 1\n1 3 1\n2 1 1",
        "0.000000 0.400000 0.200000 2",
        True,
        "10-pt separable α=0.1",
    ),
    TestCase(
        "4 1 1\n0 0 0\n1 0 1\n0 1 1\n1 1 0",
        "0.000000 0.000000 0.000000 -1",
        True,
        "inseparable + cap=1 epoch returns -1",
    ),
    TestCase(
        "8 0.5 50\n-2 -1 0\n-1 -2 0\n-3 0 0\n0 -3 0\n2 1 1\n1 2 1\n3 0 1\n0 3 1",
        "0.000000 1.000000 1.000000 1",
        True,
        "8-pt opposite-quad separable",
    ),
    TestCase(
        _perceptron_stress_input(),
        "0.000000 6.000000 4.000000 1",
        True,
        "n=200 stress separable",
    ),
    TestCase(
        "3 1 50\n-1 0 0\n0 0 1\n1 0 0",
        "-2.000000 -2.000000 0.000000 -1",
        True,
        "boundary point activation=0 check",
    ),
]


@dataclass(frozen=True)
class Algorithm:
    id: str
    name: str
    statement: str
    tests: list[TestCase]


ALGORITHMS: dict[str, Algorithm] = {
    "bubble-sort": Algorithm(
        id="bubble-sort",
        name="Bubble Sort",
        statement=(
            "Implement bubble sort. Read a line of space-separated integers from "
            "standard input and print them in non-decreasing order, space-separated, "
            "on one line. You must sort with the bubble sort algorithm (adjacent "
            "compare-and-swap passes) — built-in sort functions will be flagged by "
            "the AI grader."
        ),
        tests=BUBBLE_SORT_TESTS,
    ),
    "insertion-sort": Algorithm(
        id="insertion-sort",
        name="Insertion Sort",
        statement=(
            "Implement insertion sort. Read a line of space-separated integers from "
            "standard input and print them in non-decreasing order, space-separated, "
            "on one line. You must sort with the insertion sort algorithm (grow a "
            "sorted prefix, shifting larger values right to insert each key) — "
            "built-in sort functions will be flagged by the AI grader."
        ),
        tests=INSERTION_SORT_TESTS,
    ),
    "merge-sort": Algorithm(
        id="merge-sort",
        name="Merge Sort",
        statement=(
            "Implement merge sort. Read a line of space-separated integers from "
            "standard input and print them in non-decreasing order, space-separated, "
            "on one line. You must sort with the merge sort algorithm (recursive "
            "split + merge of sorted halves) — built-in sort functions will be "
            "flagged by the AI grader."
        ),
        tests=MERGE_SORT_TESTS,
    ),
    "quick-sort": Algorithm(
        id="quick-sort",
        name="Quick Sort",
        statement=(
            "Implement quick sort with the Lomuto partition scheme (pivot = last "
            "element). Read a line of space-separated integers from standard input "
            "and print them in non-decreasing order, space-separated, on one line. "
            "You must sort with the quick sort algorithm (partition around a pivot, "
            "then recurse) — built-in sort functions will be flagged by the AI grader."
        ),
        tests=QUICK_SORT_TESTS,
    ),
    "binary-search": Algorithm(
        id="binary-search",
        name="Binary Search",
        statement=(
            "Implement binary search. Input: the first line contains a sorted list "
            "of space-separated integers; the second line contains the target. Print "
            "the index of the target (0-based), or -1 if it is not present. Your "
            "solution must run in O(log n) — a linear scan will be flagged by the "
            "AI grader."
        ),
        tests=BINARY_SEARCH_TESTS,
    ),
    "bfs": Algorithm(
        id="bfs",
        name="Breadth-First Search",
        statement=(
            'Implement breadth-first search. Input: first line has N M S — number of '
            "nodes (labeled 0..N-1), number of undirected edges, and the start node. "
            'The next M lines each contain an edge "u v". Neighbors must be explored '
            "in ascending order. Print the BFS visit order from S, space-separated, "
            "on one line."
        ),
        tests=BFS_TESTS,
    ),
    "dfs": Algorithm(
        id="dfs",
        name="Depth-First Search",
        statement=(
            "Implement depth-first search. Input: first line has N M S — number of "
            "nodes (labeled 0..N-1), number of undirected edges, and the start node. "
            'The next M lines each contain an edge "u v". Neighbors must be explored '
            "in ascending order (visit the smallest-numbered unvisited neighbor "
            "first). Print the DFS preorder visit order from S, space-separated, on "
            "one line."
        ),
        tests=DFS_TESTS,
    ),
    "dijkstra": Algorithm(
        id="dijkstra",
        name="Dijkstra's Shortest Path",
        statement=(
            "Implement Dijkstra's shortest-path algorithm. Input: first line has "
            "N M S — number of nodes (labeled 0..N-1), number of directed weighted "
            'edges, and the start node. The next M lines each contain "u v w" — a '
            "directed edge from u to v with non-negative integer weight w. Print the "
            "shortest distances from S to every node 0..N-1, space-separated, on one "
            "line. Print INF (exactly the three uppercase letters) for nodes "
            "unreachable from S. Use a min-heap / priority queue for O((V+E) log V)."
        ),
        tests=DIJKSTRA_TESTS,
    ),
    "bst": Algorithm(
        id="bst",
        name="Binary Search Tree",
        statement=(
            "Implement a binary search tree with insert and search operations "
            "(duplicate inserts are ignored). Input: the first line contains Q — "
            'the number of operations. The next Q lines each contain "insert x" or '
            '"search x" where x is an integer. After performing all operations, '
            "print the in-order traversal of the final tree as space-separated "
            "integers on one line. Neighbors must be explored in ascending order "
            "(left subtree before right subtree)."
        ),
        tests=BST_TESTS,
    ),
    "k-nearest-neighbors": Algorithm(
        id="k-nearest-neighbors",
        name="k-Nearest Neighbors",
        statement=(
            "Implement k-Nearest Neighbors classification. Input format:\n"
            "Line 1: N k Q — number of training points, neighbor count k, number of "
            "queries.\n"
            "Next N lines: x y label — one 2D training point with integer label.\n"
            "Next Q lines: x y — one 2D query point.\n"
            "For each query, find the k nearest training points by Euclidean "
            "distance (break distance ties by the smaller point-id string order; "
            "break vote ties by the smaller label). Print Q space-separated "
            "predicted labels on one line. If N==0 print -1 for each query."
        ),
        tests=KNN_TESTS,
    ),
    "k-means": Algorithm(
        id="k-means",
        name="k-Means Clustering",
        statement=(
            "Implement Lloyd's k-Means clustering. Input format:\n"
            "Line 1: N k seed max_iter — number of 2D points, cluster count, "
            "random seed, max iterations.\n"
            "Next N lines: x y — one 2D point (float).\n"
            "Centroid init rule: if seed==0 use the first k input points as "
            "initial centroids; otherwise use seed to seed a LCG PRNG "
            "(s=s*1103515245+12345; idx = abs(s>>16) % N) drawing k unique points.\n"
            "Run assign→move for up to max_iter iterations. Print the cluster "
            "assignment (0..k-1) of each input point as a comma-separated line."
        ),
        tests=KMEANS_TESTS,
    ),
    "linear-regression": Algorithm(
        id="linear-regression",
        name="Linear Regression (Batch GD)",
        statement=(
            "Implement univariate Linear Regression trained with Batch Gradient "
            "Descent. Input format:\n"
            "Line 1: N alpha iters — number of 2D points, learning rate, epochs.\n"
            "Next N lines: x y — one (x,y) pair (float).\n"
            "Model: h(x) = θ0 + θ1·x; loss = MSE over the batch of N points; "
            "update rule applied once per epoch (after summing all N gradients):\n"
            "  g0 = (1/N) Σ (θ0 + θ1·xi − yi)\n"
            "  g1 = (1/N) Σ (θ0 + θ1·xi − yi)·xi\n"
            "  θ0 := θ0 − α·g0 ;  θ1 := θ1 − α·g1\n"
            "Initialize θ0=0, θ1=0. Run exactly iters epochs. Print exactly 3 "
            "space-separated values formatted to 6 decimals: θ0 θ1 MSE(final)."
        ),
        tests=LINEAR_REGRESSION_TESTS,
    ),
    "perceptron": Algorithm(
        id="perceptron",
        name="Perceptron (Binary)",
        statement=(
            "Implement a binary Perceptron classifier trained by the perceptron "
            "update rule. Input format:\n"
            "Line 1: N alpha max_epoch — number of 2D points, learning rate, max "
            "training epochs.\n"
            "Next N lines: x1 x2 label — one 2D point with integer label.\n"
            "Label binarization: let L be the sorted list of unique labels; map "
            "L[0] → −1 and any other label → +1. Weight vector w = [w0, w1, w2] "
            "(bias + two input weights); activation = w0 + w1·x1 + w2·x2; "
            "prediction = +1 if activation ≥ 0 else −1.\n"
            "One epoch = a full pass over N points in input order; update rule "
            "on misclassification (pred≠bin_label):\n"
            "  w0 += α · bin_label ; w1 += α · bin_label · x1 ; w2 += α · bin_label · x2\n"
            "Stop when an epoch produces 0 misclassifications (converged). "
            "Initialize w = [0,0,0]. Print exactly 4 space-separated values: "
            "w0 w1 w2 (6 decimals) and epoch-converged (1-based) or −1 if not "
            "converged within max_epoch."
        ),
        tests=PERCEPTRON_TESTS,
    ),
}
