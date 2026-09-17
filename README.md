# Algorithm Studio

A full-stack algorithm learning platform where every algorithm is visualized in interactive 3D. Students watch each comparison, swap, and graph traversal step-by-step, edit starter code in a Monaco editor, submit solutions for backend judging, and chat with a built-in Anthropic AI tutor for hints and explanations. The core contract is a semantic event stream: each algorithm is a pure generator that yields `AlgorithmEvent`s consumed by the 3D visualizer, synced code highlighter, playback engine, counter dashboard, and tutor context window.

**Catalog today (9):** Bubble Sort, Insertion Sort, Merge Sort, Quick Sort, Binary Search, BFS, DFS, Dijkstra's Shortest Path, Binary Search Tree.

---

## Dev setup

Algorithm Studio has two processes that talk over HTTP: a FastAPI backend on `:8000` and a Vite frontend on `:5173` (with `/api/*` proxied to the backend).

### 1. Backend (Python 3.11+)

```bash
cd backend
python -m venv venv
# Windows PowerShell:
#   venv\Scripts\Activate.ps1
# macOS / Linux:
#   source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET to a random string.
python -m uvicorn app.main:app --reload --port 8000
```

Verify: open <http://localhost:8000/docs> — the Swagger UI should load.

### 2. Frontend (Node 20+, npm)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies every `/api/*` request to `http://localhost:8000` (see [vite.config.ts](frontend/vite.config.ts)), so running both with defaults just works.

> **Note for Windows PowerShell users:** If `*.ps1` scripts are blocked, call the `.cmd` variants explicitly — e.g. `npm.cmd install` / `npm.cmd run dev`.

---

## Environment

Copy `backend/.env.example` → `backend/.env`. Required and optional variables:

| Variable               | Required | Purpose                                                                 |
| ---------------------- | -------- | ----------------------------------------------------------------------- |
| `JWT_SECRET`           | ✅ Yes   | HS256 signing key for auth JWTs. Use a long random string.              |
| `DATABASE_URL`         | No       | SQLite file path (defaults to `app.db` in the backend folder).          |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No  | Session lifetime (default: 60).                                         |
| `ANTHROPIC_API_KEY`    | No       | Enables the AI Tutor tab (Claude-powered hints + code review).          |
| `GOOGLE_CLIENT_ID`     | No       | Enables "Sign in with Google" on the auth pages.                        |
| `GOOGLE_CLIENT_SECRET` | No       | Pair of the above.                                                      |

Without `ANTHROPIC_API_KEY` the tutor tab falls back to a friendly "tutor unavailable" message. Without Google OAuth, only email/password sign-in works.

---

## Production (single container)

A single `Dockerfile` builds the frontend statically and serves it through the FastAPI app on port 8000, so there is no separate Nginx layer. Use Docker Compose:

```bash
# From project root
docker compose up --build
```

Then open <http://localhost:8000>. The `docker-compose.yml` defines one service (`app`) exposed on `8000:8000`, a bind-mounted SQLite DB so submissions survive restarts, and env-file import from `backend/.env`.

---

## How to add a new algorithm

The plugin contract means adding an algorithm = **three small changes, zero routing / UI work**. The catalog card, visualizer, playback controls, solution tab, examples tab, complexity tab, practice tab, and AI tutor all light up automatically.

1. **Write the generator module** in `frontend/src/engine/algorithms/<my-algo>.ts`.
   - Export an `AlgorithmDefinition` object with id, name, category, difficulty, bigO, summary, realWorldUse, complexity, defaultInput, presets, examples, problem (statement, signatures, starters, 10 tests), and a `run` generator.
   - The generator must be deterministic, never mutate the caller's input, respect the caps in `TRACE_LIMITS` (`maxArraySize=100`, `maxGraphNodes=50`, `maxEvents=50_000`), and end with exactly one `done` event.
   - Line maps inside events point to the reference implementations you add in `frontend/src/engine/algorithms/solutions/<my-algo>-solutions.ts` (C++ / Java / Python). Keep the two files in sync.
   - Use existing modules as templates: `bubble-sort.ts` for sorting, `binary-search.ts` for searching, `bfs.ts` / `dijkstra.ts` for graph, `bst.ts` for tree-ops.

2. **Register it** in `frontend/src/engine/registry.ts` — `import` the object and add it to the `ALGORITHMS` array. The catalog page will now list it.

3. **Mirror the problem.tests + statement in the backend** (`backend/app/algorithms.py`): add `MY_ALGO_TESTS` (same order, same labels, same inputs/expecteds as step 1's problem.tests) and an entry in the `ALGORITHMS` dict with the statement verbatim. The comment at the top of the file says tests must stay in sync — the practice tab judge uses the backend copy.

4. **Run tests** (see next section), update snapshots, and you are done.

---

## How to run tests

### Frontend

```bash
cd frontend
npm test          # vitest run — generator snapshots, player, event schema
```

When you change a generator's event output, snapshots will fail intentionally. Re-run with `npx vitest run -u` to update the checked-in snapshots **after confirming the diff looks correct**.

Build (also runs TypeScript type-check first):

```bash
npm run build
```

### Backend

```bash
cd backend
# activate venv first
python -m pytest -q
```

Tests cover auth, security config, the subprocess code runner (Python / C++ / Java), and submission plumbing.

---

## Architecture in a sentence

> Every algorithm is a deterministic `AlgorithmEvent` generator. The trace worker runs the generator against user input into a capped `Trace`, which the playback store consumes; the 3D scene (Three.js / R3F), Monaco code-highlight overlay, counters panel, narration strip, and tutor prompt-builder all read from the same live trace position.

Key files to browse next:
- Event contract + caps: `frontend/src/engine/events.ts`
- Algorithm plugin interface: `frontend/src/engine/definition.ts`
- Trace runner + worker: `frontend/src/engine/trace.ts`, `frontend/src/engine/trace.worker.ts`
- Visualization state reducer: `frontend/src/engine/visstate.ts`
- 3D scenes: `frontend/src/viz/ArrayScene.tsx`, `frontend/src/viz/GraphScene.tsx`
- Code runner + judge: `backend/app/runner.py`, `backend/app/routers/submissions.py`
- AI tutor prompt + stream: `backend/app/ai.py`, `backend/app/routers/tutor.py`
