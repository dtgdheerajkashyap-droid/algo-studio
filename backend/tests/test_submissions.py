"""HTTP tests for POST /api/submissions and GET /api/progress.

AI feedback is stubbed to None in conftest; the runner executes real Python
subprocesses (fast — small test lists via bubble-sort's echo-simple cases).
"""

from conftest import csrf_headers

SORT_OK = (
    "import sys\n"
    "a = [int(x) for x in sys.stdin.read().split()]\n"
    "for p in range(len(a) - 1):\n"
    "    for j in range(len(a) - 1 - p):\n"
    "        if a[j] > a[j + 1]: a[j], a[j + 1] = a[j + 1], a[j]\n"
    "print(' '.join(map(str, a)))\n"
)


def submit(client, **overrides):
    body = {"algorithm_id": "bubble-sort", "language": "python", "code": SORT_OK}
    body.update(overrides)
    return client.post("/api/submissions", json=body, headers=csrf_headers(client))


class TestSubmissionValidation:
    def test_requires_auth(self, client):
        res = client.post(
            "/api/submissions",
            json={"algorithm_id": "bubble-sort", "language": "python", "code": "x"},
        )
        assert res.status_code == 401

    def test_unknown_algorithm_404(self, auth_client):
        assert submit(auth_client, algorithm_id="quantum-sort").status_code == 404

    def test_unsupported_language_422(self, auth_client):
        assert submit(auth_client, language="rust").status_code == 422

    def test_empty_code_422(self, auth_client):
        assert submit(auth_client, code="   \n  ").status_code == 422

    def test_oversized_code_422(self, auth_client):
        assert submit(auth_client, code="#" * 50_001).status_code == 422


class TestSubmissionOutcomes:
    def test_accepted(self, auth_client):
        res = submit(auth_client)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "accepted"
        assert body["ai_feedback"] is None  # stubbed
        assert all(r["passed"] for r in body["results"])

    def test_wrong_answer_hides_hidden_tests(self, auth_client):
        res = submit(auth_client, code="print('42')")
        body = res.json()
        assert body["status"] == "wrong-answer"
        for r in body["results"]:
            if r["hidden"]:
                assert "output" not in r and "expected" not in r

    def test_runtime_error(self, auth_client):
        res = submit(auth_client, code="raise SystemExit(3)")
        assert res.json()["status"] == "error"


class TestProgress:
    def test_requires_auth(self, client):
        assert client.get("/api/progress").status_code == 401

    def test_empty_initially(self, auth_client):
        body = auth_client.get("/api/progress").json()
        assert body == {"solved_algorithm_ids": [], "submissions": []}

    def test_accepted_submission_marks_solved(self, auth_client):
        submit(auth_client)
        body = auth_client.get("/api/progress").json()
        assert body["solved_algorithm_ids"] == ["bubble-sort"]
        assert len(body["submissions"]) == 1
        sub = body["submissions"][0]
        assert sub["algorithm_id"] == "bubble-sort"
        assert sub["status"] == "accepted"
        assert sub["language"] == "python"
        assert "code" not in sub  # summary view omits the code blob

    def test_failed_submission_recorded_but_not_solved(self, auth_client):
        submit(auth_client, code="print('42')")
        body = auth_client.get("/api/progress").json()
        assert body["solved_algorithm_ids"] == []
        assert len(body["submissions"]) == 1

    def test_solved_ids_deduplicated(self, auth_client):
        submit(auth_client)
        submit(auth_client)
        body = auth_client.get("/api/progress").json()
        assert body["solved_algorithm_ids"] == ["bubble-sort"]
        assert len(body["submissions"]) == 2

    def test_progress_is_per_user(self, auth_client, client):
        submit(auth_client)
        # Second user registers in the same client (cookies overwrite).
        auth_client.post("/api/auth/logout", headers=csrf_headers(auth_client))
        auth_client.post(
            "/api/auth/register",
            json={"email": "bob@example.com", "name": "Bob", "password": "another-pass-1"},
        )
        body = auth_client.get("/api/progress").json()
        assert body == {"solved_algorithm_ids": [], "submissions": []}


class TestHealth:
    def test_health(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["ok"] is True
