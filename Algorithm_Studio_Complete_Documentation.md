# Algorithm Studio — Complete Project Documentation

> **Version:** 1.0 · **Last updated:** September 2026
> **Audience:** Beginners — no prior knowledge of this project is assumed.

---

## Table of Contents

1. [What Is Algorithm Studio?](#1-what-is-algorithm-studio)
2. [Key Features](#2-key-features)
3. [Technology Stack (What Tools We Use)](#3-technology-stack-what-tools-we-use)
4. [Project Folder Structure](#4-project-folder-structure)
5. [High-Level Architecture](#5-high-level-architecture)
6. [The Core Idea — Event Stream](#6-the-core-idea--event-stream)
7. [Frontend (The User Interface)](#7-frontend-the-user-interface)
   - 7.1 Entry Point & Routing
   - 7.2 Pages Overview
   - 7.3 The Engine Layer (Brain of the Visualizer)
   - 7.4 3D Visualization Layer
   - 7.5 State Management (Zustand Stores)
   - 7.6 API Client (Talking to the Backend)
8. [Backend (The Server)](#8-backend-the-server)
   - 8.1 Entry Point (main.py)
   - 8.2 Configuration (config.py)
   - 8.3 Database (db.py & models.py)
   - 8.4 Authentication & Security
   - 8.5 API Routes (Routers)
   - 8.6 Code Runner (runner.py)
   - 8.7 AI Integration (ai.py)
   - 8.8 Algorithm Test Data (algorithms.py)
   - 8.9 Rate Limiting (rate_limit.py)
9. [Database Design](#9-database-design)
10. [Security Architecture](#10-security-architecture)
11. [The 9 Algorithms](#11-the-9-algorithms)
12. [How to Set Up and Run the Project](#12-how-to-set-up-and-run-the-project)
13. [Environment Variables](#13-environment-variables)
14. [Docker Deployment (Production)](#14-docker-deployment-production)
15. [Testing](#15-testing)
16. [How to Add a New Algorithm](#16-how-to-add-a-new-algorithm)
17. [File-by-File Reference](#17-file-by-file-reference)
18. [Glossary of Terms](#18-glossary-of-terms)

---

## 1. What Is Algorithm Studio?

**Algorithm Studio** is a full-stack web application for learning algorithms through interactive 3D visualization. Instead of just reading about how Bubble Sort or Dijkstra's algorithm works, you can:

- **Watch** every comparison, swap, and traversal step rendered as animated 3D bars (for arrays) or 3D node-and-edge graphs.
- **Control** playback — play, pause, step forward/backward, scrub the timeline, adjust speed.
- **Read** reference solutions in C++, Java, and Python with real-time line highlighting synced to the visualization.
- **Practice** by writing your own code in a built-in code editor and submitting it for automated judging.
- **Chat** with an AI tutor powered by large language models (Claude, GPT, Llama, Gemini, etc.) that is aware of what you're currently watching.

Think of it as a **YouTube player for algorithms** — but instead of a video, the content is generated live from the algorithm's actual logic, and you can interact with it.

---

## 2. Key Features

| Feature | Description |
|---|---|
| **3D Visualization** | Arrays rendered as bars, graphs as 3D node networks using Three.js |
| **9 Algorithms** | Bubble Sort, Insertion Sort, Merge Sort, Quick Sort, Binary Search, BFS, DFS, Dijkstra, BST |
| **Step-by-Step Playback** | Play/pause/step/scrub/speed controls (0.25×–4×) |
| **Synced Code Highlighting** | Reference solutions highlight the executing line in real-time |
| **Monaco Code Editor** | Full VS Code-quality editor for writing practice solutions |
| **Multi-Language Judge** | Submit solutions in Python, C++, or Java — tested against 10 cases per algorithm |
| **AI Tutor** | Chat with an AI that knows the algorithm, your current playback step, and the visualization context |
| **AI Feedback** | Automatic feedback on submitted code (what went wrong, how to improve) |
| **User Accounts** | Email/password or Google OAuth sign-in |
| **Progress Dashboard** | Track which algorithms you've solved, review past submissions |
| **Docker Deployment** | Single container serves both frontend and backend |

---

## 3. Technology Stack (What Tools We Use)

### Frontend (What the user sees in the browser)

| Tool | What It Does |
|---|---|
| **React 19** | JavaScript library for building the user interface |
| **TypeScript** | Typed JavaScript — catches bugs at compile time |
| **Vite** | Fast build tool and development server |
| **Three.js + React Three Fiber (R3F)** | Renders 3D graphics in the browser using WebGL |
| **@react-three/drei** | Helper components for R3F (orbit controls, etc.) |
| **Monaco Editor** | The same code editor that powers VS Code, embedded in the browser |
| **Framer Motion** | Animation library for smooth UI transitions |
| **Zustand** | Lightweight state management library (like Redux but simpler) |
| **React Router** | Client-side routing (page navigation without page reloads) |
| **Zod** | Schema validation library (validates algorithm event data) |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **Vitest** | Testing framework (like Jest but integrated with Vite) |

### Backend (The server that runs behind the scenes)

| Tool | What It Does |
|---|---|
| **Python 3.11+** | The programming language for the backend |
| **FastAPI** | High-performance web framework for building APIs |
| **Uvicorn** | ASGI server that runs the FastAPI application |
| **SQLAlchemy** | ORM (Object-Relational Mapper) — talks to the database using Python objects |
| **SQLite** | Lightweight file-based database (no separate database server needed) |
| **PyJWT** | Creates and validates JSON Web Tokens for authentication |
| **Anthropic / OpenAI SDK** | Talk to AI language models for the tutor and feedback features |
| **httpx** | HTTP client for making API calls (used for Google OAuth) |
| **pytest** | Testing framework for Python |

### DevOps (Deployment & Infrastructure)

| Tool | What It Does |
|---|---|
| **Docker** | Containers the entire app into a single deployable image |
| **Docker Compose** | Orchestrates the Docker container with environment variables and volumes |

---

## 4. Project Folder Structure

Here's every important file and folder in the project, explained:

```
project/
│
├── frontend/                    # Everything the user sees (React app)
│   ├── index.html               # The single HTML page (Single Page App)
│   ├── package.json             # npm dependencies & scripts
│   ├── vite.config.ts           # Vite build & dev server configuration
│   ├── tsconfig.json            # TypeScript configuration
│   │
│   └── src/                     # All source code
│       ├── main.tsx             # App entry point — renders React, sets up routing
│       ├── index.css            # Global styles and CSS custom properties
│       │
│       ├── app/                 # Pages & layout
│       │   ├── AppLayout.tsx    # Navigation bar + page shell
│       │   ├── CatalogPage.tsx  # Home page — algorithm cards grid
│       │   ├── AlgorithmPage.tsx # Main page — 3D visualizer + learning tabs
│       │   ├── DashboardPage.tsx # User progress & submission history
│       │   ├── AuthPages.tsx    # Login & Register pages
│       │   └── tabs/           # Tabs inside the Algorithm page
│       │       ├── SolutionTab.tsx   # Reference code with line highlighting
│       │       ├── ExamplesTab.tsx   # Worked examples with narration
│       │       ├── ComplexityTab.tsx # Big-O complexity panel
│       │       ├── PracticeTab.tsx   # Code editor + test submission
│       │       └── TutorTab.tsx     # AI chat interface
│       │
│       ├── engine/              # Algorithm execution engine
│       │   ├── events.ts        # THE event type definitions (the core contract)
│       │   ├── definition.ts    # AlgorithmDefinition interface (plugin API)
│       │   ├── registry.ts      # List of all registered algorithms
│       │   ├── trace.ts         # Runs algorithm → collects events into a Trace
│       │   ├── trace.worker.ts  # Web Worker wrapper (runs trace off main thread)
│       │   ├── player.ts        # Keyframe-based seek/scrub engine
│       │   ├── visstate.ts      # Visual state machine (events → visual changes)
│       │   └── algorithms/      # One file per algorithm
│       │       ├── bubble-sort.ts
│       │       ├── insertion-sort.ts
│       │       ├── merge-sort.ts
│       │       ├── quick-sort.ts
│       │       ├── binary-search.ts
│       │       ├── bfs.ts
│       │       ├── dfs.ts
│       │       ├── dijkstra.ts
│       │       ├── bst.ts
│       │       └── solutions/   # Reference solutions in C++/Java/Python
│       │
│       ├── viz/                 # 3D visualization components
│       │   ├── Visualizer.tsx   # R3F Canvas + scene switching
│       │   ├── ArrayScene.tsx   # 3D bars for arrays/sorting
│       │   ├── GraphScene.tsx   # 3D nodes/edges for graphs/trees
│       │   ├── InputPanel.tsx   # Input editing UI (array/graph editors)
│       │   ├── PlaybackControls.tsx # Play/pause/step/speed/timeline slider
│       │   ├── colors.ts       # Color palette for visual states
│       │   └── layout.ts       # 3D layout math (bar positioning, graph layout)
│       │
│       ├── stores/              # State management
│       │   ├── auth.ts          # User session state (login/logout/register)
│       │   └── playback.ts      # Playback state (step, speed, play/pause)
│       │
│       └── lib/                 # Shared utilities
│           └── api.ts           # HTTP client wrapper (fetch + CSRF + JWT refresh)
│
├── backend/                     # The server (Python/FastAPI)
│   ├── requirements.txt         # Python package dependencies
│   ├── .env.example             # Template for environment variables
│   ├── .env                     # Your actual environment variables (not in git)
│   ├── app.db                   # SQLite database file (auto-created)
│   ├── pytest.ini               # Pytest configuration
│   │
│   ├── app/                     # Application package
│   │   ├── __init__.py          # Makes this a Python package
│   │   ├── main.py              # FastAPI app creation & startup
│   │   ├── config.py            # Settings (reads .env file)
│   │   ├── db.py                # Database engine & session setup
│   │   ├── models.py            # Database table definitions (User, Submission, etc.)
│   │   ├── security.py          # Passwords, JWT tokens, CSRF protection
│   │   ├── runner.py            # Executes user code submissions via subprocess
│   │   ├── ai.py                # AI tutor & feedback (multi-provider)
│   │   ├── algorithms.py        # Algorithm test cases (mirrored from frontend)
│   │   ├── rate_limit.py        # In-memory rate limiter (sliding window)
│   │   └── routers/             # API route handlers
│   │       ├── auth.py          # /auth/* — register, login, logout, Google OAuth
│   │       ├── submissions.py   # /submissions — submit code, get results + AI feedback
│   │       ├── tutor.py         # /tutor/chat — streaming AI tutor
│   │       └── progress.py      # /progress — user's solved algorithms & history
│   │
│   └── tests/                   # Backend unit tests
│       ├── conftest.py          # Test fixtures & setup
│       ├── test_auth.py         # Auth endpoint tests
│       ├── test_config.py       # Configuration tests
│       ├── test_runner.py       # Code runner tests
│       ├── test_security.py     # Security module tests
│       └── test_submissions.py  # Submission endpoint tests
│
├── Dockerfile                   # Multi-stage Docker build (frontend + backend)
├── docker-compose.yml           # Docker Compose configuration
├── .dockerignore                # Files excluded from Docker builds
└── README.md                    # Developer quick-start guide
```

---

## 5. High-Level Architecture

Algorithm Studio is a **client-server web application** with two main parts:

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  React App   │  │  Web Worker  │  │   Three.js / R3F      │  │
│  │  (Pages,     │  │  (Trace      │  │   (3D Visualization)  │  │
│  │   Tabs, UI)  │  │   Generator) │  │                       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                 │                     │               │
│         │    Zustand Store (shared state)        │               │
│         └─────────────────┼─────────────────────┘               │
│                           │                                     │
│                   /api/* requests                               │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP (JSON + streaming)
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                           │
│                                                               │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────────────┐   │
│  │ FastAPI  │  │ Security │  │ Code   │  │ AI Provider    │   │
│  │ Routers  │  │ (JWT,    │  │ Runner │  │ (Anthropic /   │   │
│  │ (REST    │  │  CSRF,   │  │ (sub-  │  │  OpenAI /      │   │
│  │  API)    │  │  PBKDF2) │  │  proc) │  │  Groq / etc.)  │   │
│  └────┬─────┘  └──────────┘  └────────┘  └────────────────┘   │
│       │                                                       │
│  ┌────┴──────────────────────────────────────────────────┐    │
│  │              SQLite Database (app.db)                  │    │
│  │      Users · Submissions · RefreshTokens              │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### How They Communicate

1. **In development**: The Vite dev server runs on port `5173` and proxies all `/api/*` requests to the backend on port `8000`. This means the frontend and backend appear to be on the same domain.

2. **In production**: The backend builds and serves the frontend statically. A single Docker container on port `8000` handles everything.

---

## 6. The Core Idea — Event Stream

This is the **most important concept** in the entire project. Everything revolves around it.

### What Is It?

Every algorithm is a **generator function** that produces a stream of **events**. Each event describes one semantic step the algorithm takes — "I'm comparing elements at index 2 and 5", "I'm swapping them", "I've visited node 3", etc.

### Why?

Instead of hardcoding animations or pre-recording videos, the algorithm's logic **directly drives** the visualization. This means:

- The 3D visualizer reads the events and animates accordingly
- The code highlighter reads the events and highlights the corresponding line
- The counters panel reads the events and counts comparisons/swaps
- The AI tutor receives the events as context to give relevant answers
- All of this stays perfectly synchronized

### Event Types

There are **16 event types**, grouped into three categories:

**Array events** (for sorting/searching algorithms):
| Event | What It Means |
|---|---|
| `compare` | "I'm comparing elements at indices i and j" |
| `swap` | "I'm swapping elements at indices i and j" |
| `write` | "I'm writing value X into index Y" (for merge sort) |
| `read` | "I'm reading the element at index Y" (for binary search) |
| `mark-sorted` | "These indices are now in their final sorted position" |
| `range-focus` | "I'm working on the subarray from index lo to hi" |

**Graph/Tree events** (for BFS, DFS, Dijkstra, BST):
| Event | What It Means |
|---|---|
| `visit` | "I'm currently processing node X" |
| `discover` | "I've discovered node X (added it to frontier)" |
| `traverse-edge` | "I'm traveling along the edge from A to B" |
| `update-node` | "Node X now has distance/value Y" |
| `insert-node` | "Inserting node X into the tree" |
| `frontier` | "The current queue/stack/priority-queue contains [...]" |

**Generic events** (used by all algorithms):
| Event | What It Means |
|---|---|
| `pointer-move` | "Move named pointer(s) to new positions" |
| `annotate` | "Display this text in the narration strip" |
| `highlight-line` | "Highlight this line of code in the solution tab" |
| `done` | "Algorithm finished!" (every trace ends with exactly one) |

### Example: Bubble Sort Event Stream

For the input `[5, 2, 8, 1]`, bubble sort might produce:
```
compare(i=0, j=1, result=1)    → "5 > 2, need to swap"
swap(i=0, j=1)                  → array becomes [2, 5, 8, 1]
compare(i=1, j=2, result=-1)   → "5 < 8, no swap needed"
compare(i=2, j=3, result=1)    → "8 > 1, need to swap"
swap(i=2, j=3)                  → array becomes [2, 5, 1, 8]
mark-sorted(indices=[3])        → "index 3 is final"
... (more passes) ...
done(summary="Sorted!")
```

### Safety Limits

To prevent the app from freezing on large inputs:
- **Max array size:** 100 elements
- **Max graph nodes:** 50
- **Max events:** 50,000

If a trace hits the event cap, it's truncated with a warning.

---

## 7. Frontend (The User Interface)

### 7.1 Entry Point & Routing

**File: `frontend/src/main.tsx`**

This is where the app starts. It creates the React root, wraps everything in a `BrowserRouter`, and defines the page routes:

| URL Path | Page | Description |
|---|---|---|
| `/` | `CatalogPage` | Home page — grid of algorithm cards |
| `/algorithms/:id` | `AlgorithmPage` | Visualizer + learning tabs for a specific algorithm |
| `/dashboard` | `DashboardPage` | User's progress and submission history |
| `/login` | `LoginPage` | Sign-in form |
| `/register` | `RegisterPage` | Create account form |

All routes share the `AppLayout` component (the navigation bar).

---

### 7.2 Pages Overview

#### CatalogPage (Home)
- Displays a grid of algorithm cards
- Each card shows the algorithm's name, Big-O complexity, summary, category, and difficulty
- Filterable by category (All / Sorting / Searching / Graph / Data Structures)
- Works for guests (no sign-in required)

#### AlgorithmPage (The Heart of the App)
This is the main page with a **two-column layout**:

**Left column:**
- Algorithm name, description, and Big-O
- Input panel (edit the input array/graph)
- 3D visualizer canvas
- Playback controls (play/pause/step/scrub/speed)

**Right column — 5 tabs:**
1. **Solution Tab**: Reference implementations in C++, Java, Python with a Monaco editor. The currently executing line highlights in real-time as you watch the visualization.
2. **Examples Tab**: Pre-made worked examples with narration paragraphs.
3. **Complexity Tab**: Time complexity (best/average/worst), space complexity, stability info, and an intuition paragraph.
4. **Practice Tab**: Full Monaco code editor where you write and submit your own solution. Results show test case pass/fail status, and optional AI feedback on your code.
5. **AI Tutor Tab**: Chat interface where you can ask questions. The AI knows what algorithm you're looking at, your current playback step, and the recent visualization events.

#### DashboardPage
- Shows which algorithms the user has solved (✓) vs. not solved
- Lists recent submissions with algorithm name, language, status (accepted/wrong-answer/error), and timestamp
- Requires sign-in

#### AuthPages
- Login form (email + password)
- Register form (email + name + password)
- "Continue with Google" button (when Google OAuth is configured)
- Both forms handle errors gracefully and show user-friendly messages

---

### 7.3 The Engine Layer (Brain of the Visualizer)

This is the most complex part of the frontend. Here's how data flows:

```
User clicks "Play"
       │
       ▼
┌──────────────────┐     postMessage      ┌────────────────────┐
│  Playback Store  │ ──────────────────▶  │   Web Worker       │
│  (playback.ts)   │                      │  (trace.worker.ts) │
└──────────────────┘                      └────────┬───────────┘
                                                   │
                                            imports algorithm
                                            from registry.ts
                                                   │
                                                   ▼
                                          ┌────────────────────┐
                                          │  Algorithm Module  │
                                          │  e.g. bubble-sort  │
                                          │  (generator func)  │
                                          └────────┬───────────┘
                                                   │
                                          yields AlgorithmEvents
                                                   │
                                                   ▼
                                          ┌────────────────────┐
                                          │   Trace Runner     │
                                          │   (trace.ts)       │
                                          │   Collects events  │
                                          │   + cumulative     │
                                          │   counters         │
                                          └────────┬───────────┘
                                                   │
                                           Trace object
                                           sent back via
                                           postMessage
                                                   │
                                                   ▼
                                          ┌────────────────────┐
                                          │   Player           │
                                          │   (player.ts)      │
                                          │   Builds keyframes │
                                          │   for fast seeking │
                                          └────────┬───────────┘
                                                   │
                                          stateAt(step) called
                                          by playback store
                                                   │
                                                   ▼
                                          ┌────────────────────┐
                                          │   VisState         │
                                          │   (visstate.ts)    │
                                          │   Visual snapshot  │
                                          │   at current step  │
                                          └────────┬───────────┘
                                                   │
                                    consumed by React components
                                                   │
                        ┌──────────────────┬───────┴────────┐
                        ▼                  ▼                ▼
                 ┌─────────────┐  ┌───────────────┐  ┌──────────┐
                 │ ArrayScene  │  │ GraphScene    │  │ Counters │
                 │ (3D bars)   │  │ (3D nodes)    │  │ Panel    │
                 └─────────────┘  └───────────────┘  └──────────┘
```

#### Key Files Explained:

**`events.ts`** — The Central Contract
- Defines all 16 event types using Zod schemas (for runtime validation)
- Defines `TRACE_LIMITS` (max array size, max graph nodes, max events)
- The `countersFor()` function says which counters each event increments

**`definition.ts`** — The Plugin Interface
- Defines `AlgorithmDefinition` — the shape every algorithm must conform to
- Includes: id, name, category, difficulty, bigO, complexity info, default inputs, presets, solutions, examples, practice tests, and the `run()` generator function
- Defines input types: `ArrayInput`, `GraphInput`, `TreeOpsInput`

**`registry.ts`** — The Algorithm Catalog
- Imports all 9 algorithm modules and exports them as an array
- `getAlgorithm(id)` looks up an algorithm by its string ID

**`trace.ts`** — The Trace Runner
- `runTrace()` drains the generator, collecting all events into a `Trace` object
- Applies safety caps (stops at 50,000 events)
- Validates events against the Zod schema (opt-in, always on in tests)
- Computes cumulative counters (comparisons, swaps, writes, accesses) at each step

**`trace.worker.ts`** — Web Worker Wrapper
- Runs `runTrace()` in a separate browser thread so the UI doesn't freeze
- Communicates with the main thread via `postMessage`

**`player.ts`** — Keyframe-Based Seeking
- Builds "keyframes" (full visual state snapshots) every 25 events
- To seek to step N: restore the nearest keyframe, then replay at most 24 events
- This makes scrubbing/rewinding fast regardless of trace length

**`visstate.ts`** — Visual State Machine
- `VisState` is a snapshot of what the visualization should look like at a given moment
- `applyEvent()` takes a VisState and one event, and mutates the state accordingly
- Handles both array visualization (bar colors, values, sorted markers) and graph visualization (node colors, edge states, tree insertions)

---

### 7.4 3D Visualization Layer

**`Visualizer.tsx`** — The main canvas
- Uses React Three Fiber (`<Canvas>`) with orbit controls
- Renders either `ArrayScene` or `GraphScene` based on the algorithm type
- Shows a color legend, narration text, and frontier readout
- Displays loading/error/warning states

**`ArrayScene.tsx`** — 3D bars for arrays
- Each array element is a 3D box (bar)
- Bar height represents the element's value
- Bar color represents its state:
  - Default: neutral gray
  - Comparing: blue (being looked at)
  - Swapping: orange/amber (being moved)
  - Sorted: green (in final position)
  - Current: purple (active focus)
- Values are shown as floating text labels

**`GraphScene.tsx`** — 3D nodes for graphs/trees
- Each node is a 3D sphere
- Edges are 3D lines/tubes connecting nodes
- Node color reflects its state (default/frontier/current/visited)
- Node labels show IDs and auxiliary values (distances, keys)
- Graph layout is computed automatically

**`InputPanel.tsx`** — Input editing
- For array algorithms: text field where you type numbers
- For graph algorithms: node count, edge list editor
- Preset buttons for common inputs (random, sorted, reversed, etc.)
- "Run" button regenerates the trace with new input

**`PlaybackControls.tsx`** — VCR-style controls
- ⏮ Restart, ◀ Step back, ▶ Play/Pause, ▶ Step forward
- Timeline slider for scrubbing
- Speed selector (0.25×, 0.5×, 1×, 2×, 4×)
- Step counter ("Step 42 / 156")
- Counters dashboard (comparisons, swaps, writes, accesses)

---

### 7.5 State Management (Zustand Stores)

The app uses **Zustand** — a minimal React state manager. There are two stores:

#### Auth Store (`stores/auth.ts`)
Manages the current user session:
- `user`: the logged-in user (or `null` for guests)
- `ready`: whether the initial session check has completed
- `bootstrap()`: on app load, checks `/auth/config` and `/auth/me` to restore session
- `login()`, `register()`, `logout()`: call the backend and update state

#### Playback Store (`stores/playback.ts`)
Manages everything about the visualization playback:
- `status`: 'idle' → 'loading' → 'ready' ↔ 'playing'
- `step`: current step number (0 to totalSteps)
- `speed`: playback speed multiplier
- `visState`: the current visual state (consumed by 3D scenes)
- `counters`: current comparison/swap/write/access counts
- `load()`: sends algorithm + input to the Web Worker
- `play()`, `pause()`, `stepForward()`, `stepBack()`, `seek()`, `restart()`
- `contextWindow()`: returns events around the current step (for AI tutor)

The playback loop uses `requestAnimationFrame` for smooth animation, advancing a fractional number of steps per frame based on the speed setting.

---

### 7.6 API Client (`lib/api.ts`)

A thin wrapper around the browser's `fetch()` API:

- **CSRF Protection**: Reads the `csrf_token` cookie and sends it as an `X-CSRF-Token` header on every POST/DELETE request
- **Automatic Token Refresh**: If a request gets a 401 (Unauthorized), it transparently tries to refresh the session via `/auth/refresh`, then retries the original request
- **Streaming**: `streamPost()` is an async generator that yields text chunks from a streaming response (used for the AI tutor chat)
- **Error Handling**: Wraps non-OK responses in `ApiError` objects with status code and message

---

## 8. Backend (The Server)

### 8.1 Entry Point (`main.py`)

This file creates the FastAPI application and wires everything together:

1. **Creates database tables** using SQLAlchemy's `create_all()` (creates them if they don't exist)
2. **Runs migrations** (e.g., adding `updated_at` column to existing databases)
3. **Creates the FastAPI app** with CSRF protection as a global dependency
4. **Sets up CORS** (Cross-Origin Resource Sharing) for the frontend URL
5. **Mounts all API routes** under the `/api` prefix
6. **Defines the health check** endpoint at `/health`
7. **Serves the frontend** in production mode (when built files exist in the static directory)

The SPA (Single Page App) serving is clever: it serves `/assets/*` as static files, and any other non-API path returns `index.html` — this lets React Router handle client-side routing.

---

### 8.2 Configuration (`config.py`)

The `Settings` class reads environment variables from `backend/.env`:

- **JWT_SECRET**: Secret key for signing authentication tokens (required in production)
- **DATABASE_URL**: Where to store data (defaults to `sqlite:///app.db`)
- **STATIC_DIR**: Built frontend location (for production serving)
- **AI API Keys**: Supports 6 providers (Anthropic, OpenAI, Groq, OpenRouter, Gemini, Ollama)
- **Google OAuth**: Client ID + secret for "Sign in with Google"
- **Token Lifetimes**: Access tokens last 30 minutes, refresh tokens last 14 days

Production mode (`APP_ENV=production`) enforces:
- A real JWT_SECRET (not the dev default)
- Minimum 32-character key length
- Secure (HTTPS-only) cookies

---

### 8.3 Database (`db.py` & `models.py`)

#### Database Setup (`db.py`)

Uses SQLite with Write-Ahead Logging (WAL) mode for better performance:
- **WAL mode**: Allows multiple readers while one writer is active (prevents "database is locked" errors)
- **Foreign keys**: Enforced at the database level
- **Busy timeout**: 5 seconds (waits instead of failing immediately if locked)

The `get_db()` function is a FastAPI dependency that provides a database session and automatically closes it after the request.

#### Database Tables (`models.py`)

**Users table:**
| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Auto-incrementing unique identifier |
| `email` | String(255) | Unique, indexed, used for login |
| `name` | String(120) | Display name |
| `password_hash` | String(255) | Nullable — Google-only users have no password |
| `google_sub` | String(64) | Google account ID (nullable, unique) |
| `avatar_url` | String(512) | Profile picture URL (from Google) |
| `created_at` | DateTime | When the account was created (UTC) |

**Submissions table:**
| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Auto-incrementing unique identifier |
| `user_id` | Integer (FK→Users) | Who submitted it |
| `algorithm_id` | String(64) | Which algorithm (e.g., "bubble-sort") |
| `language` | String(16) | "python", "cpp", or "java" |
| `code` | Text | The submitted source code |
| `status` | String(16) | "accepted", "wrong-answer", or "error" |
| `results_json` | Text | Serialized test results |
| `ai_feedback` | Text | AI-generated feedback (nullable) |
| `created_at` | DateTime | When submitted |
| `updated_at` | DateTime | Last updated (e.g., when AI feedback arrives) |

**RefreshTokens table:**
| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Auto-incrementing unique identifier |
| `jti` | String(64) | Unique token identifier (UUID) |
| `user_id` | Integer (FK→Users) | Token owner |
| `issued_at` | DateTime | When the token was created |
| `expires_at` | DateTime | When the token expires |
| `revoked` | Boolean | Whether this token has been used/revoked |

---

### 8.4 Authentication & Security (`security.py`)

#### Password Hashing
- Uses **PBKDF2-SHA256** with 260,000 iterations and a random 16-byte salt
- Format: `pbkdf2_sha256$260000$<salt>$<hash>`
- Verification uses constant-time comparison (`hmac.compare_digest`) to prevent timing attacks

#### JWT Tokens (Cookie-Based)
Three cookies are set on login:

1. **`access_token`** (httpOnly): Short-lived JWT (30 min). Identifies the user on every request. Cannot be read by JavaScript.
2. **`refresh_token`** (httpOnly): Longer-lived JWT (14 days). Only used to get new access tokens.
3. **`csrf_token`** (NOT httpOnly): A random string readable by JavaScript. The frontend must echo it back as an `X-CSRF-Token` header on state-changing requests.

#### CSRF Protection (Double-Submit Cookie Pattern)
- On every POST/PUT/DELETE request, the server checks that the `csrf_token` cookie matches the `X-CSRF-Token` header
- This prevents Cross-Site Request Forgery attacks — a malicious website can't forge requests because it can't read the cookie from a different domain

#### Refresh Token Rotation
- Each refresh token has a unique `jti` (JWT ID) stored in the database
- When you refresh: the old jti is revoked, and a brand new jti is issued
- If someone tries to reuse a revoked jti (possible token theft), ALL of that user's refresh tokens are invalidated

---

### 8.5 API Routes (Routers)

#### Auth Router (`/api/auth/*`)

| Endpoint | Method | Auth Required? | What It Does |
|---|---|---|---|
| `/auth/config` | GET | No | Returns `{google_enabled, configured, provider, model}` |
| `/auth/me` | GET | Yes | Returns the current user's profile |
| `/auth/register` | POST | No | Creates a new account (rate-limited: 5 per IP per 5 min) |
| `/auth/login` | POST | No | Logs in with email+password (rate-limited: 10 per IP per min) |
| `/auth/refresh` | POST | Cookie | Rotates access + refresh tokens |
| `/auth/logout` | POST | No | Clears all auth cookies |
| `/auth/google` | GET | No | Starts Google OAuth flow (redirect to Google) |
| `/auth/google/callback` | GET | No | Handles Google's redirect, creates/links account |

#### Submissions Router (`/api/submissions`)

| Endpoint | Method | Auth Required? | What It Does |
|---|---|---|---|
| `/submissions` | POST | Yes | Submits code for judging |

The submission flow:
1. Rate-limit check (12/user/min, 30/IP/min)
2. Validate algorithm ID and language
3. Run the code against all test cases via subprocess
4. Save the submission to the database
5. Ask AI for feedback (asynchronously, non-blocking)
6. Return results + AI feedback

#### Tutor Router (`/api/tutor/*`)

| Endpoint | Method | Auth Required? | What It Does |
|---|---|---|---|
| `/tutor/chat` | POST | Yes | Streams an AI tutor reply |

The request body includes:
- `algorithm_id`: which algorithm the student is viewing
- `question`: what they're asking
- `history`: previous chat messages
- `step`: current playback step number
- `context`: recent visualization events (for grounding the AI's answer)

#### Progress Router (`/api/progress`)

| Endpoint | Method | Auth Required? | What It Does |
|---|---|---|---|
| `/progress` | GET | Yes | Returns solved algorithm IDs + recent 25 submissions |

---

### 8.6 Code Runner (`runner.py`)

This module executes user-submitted code in **subprocesses** with safety measures:

#### Supported Languages

| Language | How It Runs | Compilation |
|---|---|---|
| Python | `sys.executable main.py` | Not needed |
| C++ | `g++ -O2 -std=c++17 main.cpp -o main && ./main` | 30s compile timeout |
| Java | `javac Main.java && java -cp . Main` | 30s compile timeout |

#### Safety Measures

1. **Scrubbed Environment**: Child processes only get essential env vars (PATH, TEMP). All API keys, secrets, and database URLs are stripped.
2. **Isolated Working Directory**: Each submission runs in a fresh temporary directory that's deleted after execution.
3. **HOME Redirection**: HOME/USERPROFILE point to the temp directory so the code can't access `~/.ssh`, `~/.aws`, etc.
4. **POSIX Resource Limits** (Linux/Mac):
   - 256 MB memory limit
   - 256 file descriptor limit
   - CPU time limit (run timeout + 2s)
   - No core dumps
5. **Timeouts**: 5 seconds per test case, 30 seconds for compilation.
6. **Output Truncation**: Outputs capped at 10,000 characters.

#### Judging Logic

For each test case:
1. Run the program with the test input as stdin
2. Capture stdout
3. Normalize whitespace (strip trailing spaces/newlines)
4. Compare with expected output

Status determination:
- All tests pass → `accepted`
- Any runtime error or timeout → `error`
- Wrong output → `wrong-answer`

---

### 8.7 AI Integration (`ai.py`)

Algorithm Studio supports **6 AI providers** with automatic fallback:

| Priority | Provider | Model | Cost |
|---|---|---|---|
| 1 | Anthropic | Claude 3.5 Sonnet | Paid |
| 2 | OpenAI | GPT-4o Mini | Paid (cheap) |
| 3 | Groq | Llama 3.3 70B | Free tier (14K req/day) |
| 4 | OpenRouter | Mistral 7B Instruct | Free models available |
| 5 | Google Gemini | Gemini 1.5 Flash | Free tier (15 RPM) |
| 6 | Ollama | Llama 3.2 (local) | 100% free (runs on your machine) |

The first configured provider (with a valid API key) wins.

#### Two AI Features

**1. AI Tutor (Streaming Chat)**
- The student asks a question while watching an algorithm
- The system prompt tells the AI it's a tutor inside Algorithm Studio
- It receives the student's current playback step and a window of recent visualization events
- The AI streams its response text-chunk-by-chunk (real-time typing effect)
- Rules: be concise, teach rather than just answer, don't give complete solutions

**2. Submission Feedback (One-Shot)**
- After code is submitted and judged, the AI reviews the code
- If tests failed: point toward the likely bug
- If all passed: confirm the approach and suggest improvements
- The AI is told to detect if the student bypasses the required algorithm (e.g., using Python's built-in `sorted()` for a bubble sort problem)

#### Graceful Degradation
- Without any API key: the tutor shows "AI tutor isn't configured yet" with setup instructions
- Submissions still work (tests still run, just no AI feedback)
- Error messages are user-friendly ("credits exhausted", "rate limited", etc.)

---

### 8.8 Algorithm Test Data (`algorithms.py`)

This file mirrors the test cases from the frontend's algorithm modules. Each algorithm has 10 test cases:

- **2 visible "sample" tests** (students see input, expected output, and their actual output)
- **8 hidden tests** (students only see pass/fail, not the test data)

Test cases cover: basic examples, empty input, single element, all duplicates, already sorted, reversed, negative numbers, large stress tests (n=100).

The backend and frontend must keep their test cases **exactly in sync**.

---

### 8.9 Rate Limiting (`rate_limit.py`)

A lightweight in-memory sliding-window rate limiter:

| Policy | Scope | Limit | Purpose |
|---|---|---|---|
| `auth.login` | Per IP | 10 per 60s | Prevent brute-force password guessing |
| `auth.register` | Per IP | 5 per 5 min | Prevent signup spam |
| `submit.perUser` | Per User | 12 per 60s | Prevent CPU abuse from rapid submissions |
| `submit.perIP` | Per IP | 30 per 60s | Catch multi-account abuse |
| `tutor.perUser` | Per User | 30 per 60s | Control AI API spend |

- Uses monotonic clock (immune to system time changes)
- Stale entries reaped lazily every 64 operations
- No external dependencies (no Redis needed)

---

## 9. Database Design

```
┌──────────────────┐       ┌────────────────────────┐
│     users        │       │     submissions         │
├──────────────────┤       ├────────────────────────┤
│ id (PK)          │──┐    │ id (PK)                │
│ email (unique)   │  │    │ user_id (FK→users.id)  │
│ name             │  ├───▶│ algorithm_id           │
│ password_hash    │  │    │ language               │
│ google_sub       │  │    │ code                   │
│ avatar_url       │  │    │ status                 │
│ created_at       │  │    │ results_json           │
└──────────────────┘  │    │ ai_feedback            │
                      │    │ created_at             │
                      │    │ updated_at             │
                      │    └────────────────────────┘
                      │
                      │    ┌────────────────────────┐
                      │    │   refresh_tokens        │
                      │    ├────────────────────────┤
                      └───▶│ id (PK)                │
                           │ jti (unique)           │
                           │ user_id (FK→users.id)  │
                           │ issued_at              │
                           │ expires_at             │
                           │ revoked                │
                           └────────────────────────┘
```

---

## 10. Security Architecture

```
Browser                                      Server
──────                                       ──────

  ┌─ access_token (httpOnly cookie) ─────────▶ JWT decode → user_id
  │
  ├─ refresh_token (httpOnly cookie) ────────▶ JWT decode → jti lookup
  │                                             in refresh_tokens table
  │
  ├─ csrf_token (readable cookie) ──┐
  │                                 ├────────▶ Compare cookie vs header
  └─ X-CSRF-Token (request header) ─┘          (double-submit pattern)

  Password flow:
  password → PBKDF2-SHA256 (260K iterations + random salt) → stored hash

  Refresh token rotation:
  old jti revoked → new jti issued → old jti reused = ALL tokens invalidated
```

---

## 11. The 9 Algorithms

| # | Algorithm | Category | Difficulty | Time Complexity | Input Type |
|---|---|---|---|---|---|
| 1 | Bubble Sort | Sorting | Easy | O(n²) | Array |
| 2 | Insertion Sort | Sorting | Easy | O(n²) | Array |
| 3 | Merge Sort | Sorting | Medium | O(n log n) | Array |
| 4 | Quick Sort | Sorting | Medium | O(n log n) avg | Array |
| 5 | Binary Search | Searching | Easy | O(log n) | Array + target |
| 6 | BFS | Graph | Medium | O(V + E) | Graph + start |
| 7 | DFS | Graph | Medium | O(V + E) | Graph + start |
| 8 | Dijkstra | Graph | Hard | O((V+E) log V) | Weighted graph |
| 9 | BST | Data Structure | Medium | O(n log n) avg | Insert/search ops |

Each algorithm module exports an `AlgorithmDefinition` containing:
- Metadata (id, name, category, difficulty, bigO)
- Default input and preset inputs
- The `run()` generator function (produces the event stream)
- Reference solutions in C++, Java, Python
- Worked examples with narration
- Complexity analysis
- Practice problem with 10 test cases and starter code templates

---

## 12. How to Set Up and Run the Project

### Prerequisites

- **Python 3.11 or newer** (for the backend)
- **Node.js 20 or newer** + npm (for the frontend)
- **Git** (to clone the project, if applicable)

### Step 1: Set Up the Backend

```bash
# Navigate to the backend folder
cd backend

# Create a Python virtual environment
python -m venv venv

# Activate it (Windows PowerShell)
venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Create your environment file
copy .env.example .env
# Edit .env and set JWT_SECRET to any random string

# Start the backend server
python -m uvicorn app.main:app --reload --port 8000
```

✅ **Verify**: Open http://localhost:8000/docs — you should see the Swagger API documentation.

### Step 2: Set Up the Frontend

```bash
# Navigate to the frontend folder (in a new terminal)
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

✅ **Verify**: Open http://localhost:5173 — the Algorithm Studio homepage should load.

### How It Works Together

The Vite dev server on port 5173 automatically proxies all `/api/*` requests to the backend on port 8000. This is configured in `vite.config.ts`. So from the browser's perspective, everything is on the same origin.

---

## 13. Environment Variables

All environment variables are configured in `backend/.env`. Here's a complete reference:

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `APP_ENV` | No | `development` | Set to `production` for secure cookies |
| `JWT_SECRET` | ✅ Prod | dev fallback | HS256 signing key for auth tokens |
| `DATABASE_URL` | No | `sqlite:///app.db` | SQLAlchemy database connection string |
| `STATIC_DIR` | No | `../frontend/dist` | Built frontend assets directory |
| `ANTHROPIC_API_KEY` | No | — | Enables Claude-based AI tutor |
| `OPENAI_API_KEY` | No | — | Enables GPT-based AI tutor |
| `GROQ_API_KEY` | No | — | Enables Groq-based AI tutor (free tier) |
| `OPENROUTER_API_KEY` | No | — | Enables OpenRouter AI tutor (free models) |
| `GEMINI_API_KEY` | No | — | Enables Gemini AI tutor (free tier) |
| `OLLAMA_BASE_URL` | No | — | Enables local Ollama AI tutor (fully free) |
| `GOOGLE_CLIENT_ID` | No | — | Enables Google OAuth sign-in |
| `GOOGLE_CLIENT_SECRET` | No | — | Pair of the above |
| `GOOGLE_REDIRECT_URI` | No | `http://localhost:5173/api/auth/google/callback` | OAuth redirect URL |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS origin / OAuth redirect target |

**Without any AI key**: Everything works except the AI tutor and AI submission feedback.
**Without Google OAuth keys**: Only email/password sign-in works.

---

## 14. Docker Deployment (Production)

Algorithm Studio uses a **multi-stage Docker build** that produces a single container serving both frontend and backend:

### Stage 1: Build Frontend
```dockerfile
FROM node:22-alpine AS frontend
# Install deps and build the React app (produces dist/ folder)
```

### Stage 2: Production Server
```dockerfile
FROM python:3.12-slim
# Install g++ (for C++ submissions)
# Install Python deps
# Copy backend code + frontend build output
# Serve everything on port 8000
```

### Running with Docker Compose

```bash
# From the project root
cp backend/.env.example backend/.env
# Edit backend/.env — set JWT_SECRET

docker compose up --build
```

Then open http://localhost:8000.

The SQLite database is stored on a Docker volume (`app-data:/data`) so it survives container restarts.

---

## 15. Testing

### Frontend Tests

```bash
cd frontend
npm test          # Run all tests (vitest)
```

Tests cover:
- Algorithm generator output (snapshot tests — the event stream is deterministic)
- Player keyframe/seek logic
- Event schema validation

To update snapshots after intentionally changing an algorithm:
```bash
npx vitest run -u
```

### Backend Tests

```bash
cd backend
# Activate virtual environment first
python -m pytest -q
```

Tests cover:
- Authentication (register, login, logout, refresh, Google OAuth)
- Security configuration validation
- Code runner (Python, C++, Java subprocess execution)
- Submission endpoint (rate limiting, code execution, AI feedback)

Test files:
| File | What It Tests |
|---|---|
| `conftest.py` | Test fixtures — in-memory database, test client, test user |
| `test_auth.py` | Registration, login, session refresh, logout |
| `test_config.py` | Production config validation (JWT_SECRET requirements) |
| `test_runner.py` | Code execution in all three languages, timeouts, errors |
| `test_security.py` | Password hashing, JWT creation/validation, CSRF checks |
| `test_submissions.py` | Full submission flow with mocked runner and AI |

---

## 16. How to Add a New Algorithm

The system is designed so adding a new algorithm requires **three changes and zero UI/routing work**. Everything lights up automatically.

### Step 1: Write the Algorithm Module

Create `frontend/src/engine/algorithms/<my-algo>.ts`:

```typescript
import { ev, type AlgorithmDefinition, type ArrayInput } from '../definition';

export const myAlgo: AlgorithmDefinition = {
  id: 'my-algo',
  name: 'My Algorithm',
  category: 'sorting',       // or 'searching' | 'graph' | 'data-structure'
  difficulty: 'easy',        // or 'medium' | 'hard'
  bigO: 'O(n²)',
  summary: 'A brief description of what this algorithm does.',
  realWorldUse: 'Where it is used in real life.',

  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    stable: true,
    intuition: 'Why the complexity is what it is.',
  },

  defaultInput: { kind: 'array', values: [5, 3, 8, 1, 2] },
  presets: [
    { label: 'Small', input: { kind: 'array', values: [3, 1, 2] } },
  ],

  // The generator function — THE core of the algorithm
  *run(input: ArrayInput) {
    const arr = [...(input as ArrayInput).values];
    // ... algorithm logic ...
    // yield events as you go:
    yield ev({ type: 'compare', i: 0, j: 1, result: 1 });
    yield ev({ type: 'swap', i: 0, j: 1 });
    // ... more events ...
    yield ev({ type: 'done', summary: 'Sorted!' });
  },

  solutions: [ /* C++, Java, Python reference solutions */ ],
  examples: [ /* worked examples with narration */ ],
  problem: { /* practice problem spec with tests */ },
};
```

### Step 2: Register It

In `frontend/src/engine/registry.ts`:

```typescript
import { myAlgo } from './algorithms/my-algo';

export const ALGORITHMS: AlgorithmDefinition[] = [
  // ... existing algorithms ...
  myAlgo,  // ← add this line
];
```

### Step 3: Mirror Tests in Backend

In `backend/app/algorithms.py`:

```python
MY_ALGO_TESTS = [
    TestCase("5 3 8 1 2", "1 2 3 5 8", False, "sample 1"),
    # ... 9 more test cases, matching the frontend ...
]

ALGORITHMS["my-algo"] = Algorithm(
    id="my-algo",
    name="My Algorithm",
    statement="Problem description...",
    tests=MY_ALGO_TESTS,
)
```

### That's It!

The catalog page, visualizer, playback controls, solution tab, examples tab, complexity tab, practice tab, and AI tutor all work automatically for the new algorithm.

---

## 17. File-by-File Reference

### Frontend Files

| File | Lines | Purpose |
|---|---|---|
| `main.tsx` | 26 | App entry — React root + routing |
| `index.css` | ~80 | Global styles, CSS custom properties |
| `app/AppLayout.tsx` | 89 | Navigation bar + page shell |
| `app/CatalogPage.tsx` | 86 | Algorithm card grid (home page) |
| `app/AlgorithmPage.tsx` | 91 | 3D visualizer + 5-tab learning panel |
| `app/DashboardPage.tsx` | 136 | User progress & submission history |
| `app/AuthPages.tsx` | ~150 | Login + Register forms |
| `app/tabs/SolutionTab.tsx` | ~90 | Reference code with line highlighting |
| `app/tabs/ExamplesTab.tsx` | ~50 | Worked examples |
| `app/tabs/ComplexityTab.tsx` | ~70 | Big-O complexity panel |
| `app/tabs/PracticeTab.tsx` | ~200 | Code editor + submission |
| `app/tabs/TutorTab.tsx` | ~180 | AI chat interface |
| `engine/events.ts` | 230 | Event type definitions (Zod schemas) |
| `engine/definition.ts` | 122 | AlgorithmDefinition plugin interface |
| `engine/registry.ts` | 33 | Algorithm catalog list |
| `engine/trace.ts` | 104 | Event collection + safety caps |
| `engine/trace.worker.ts` | ~40 | Web Worker wrapper |
| `engine/player.ts` | 76 | Keyframe-based seek engine |
| `engine/visstate.ts` | 199 | Visual state machine |
| `viz/Visualizer.tsx` | 78 | R3F canvas + scene routing |
| `viz/ArrayScene.tsx` | ~100 | 3D bar rendering |
| `viz/GraphScene.tsx` | ~100 | 3D node/edge rendering |
| `viz/InputPanel.tsx` | ~180 | Input editing UI |
| `viz/PlaybackControls.tsx` | ~100 | VCR controls + timeline |
| `viz/colors.ts` | ~50 | Color palette |
| `viz/layout.ts` | ~100 | 3D layout math |
| `stores/auth.ts` | 85 | Auth state management |
| `stores/playback.ts` | 196 | Playback state management |
| `lib/api.ts` | 124 | HTTP client + CSRF + JWT refresh |

### Backend Files

| File | Lines | Purpose |
|---|---|---|
| `app/main.py` | 94 | FastAPI app creation + startup |
| `app/config.py` | 72 | Settings from .env |
| `app/db.py` | 54 | SQLite + SQLAlchemy setup |
| `app/models.py` | 83 | ORM models (User, Submission, RefreshToken) |
| `app/security.py` | 205 | Passwords, JWT, CSRF |
| `app/runner.py` | 295 | Code execution in subprocess |
| `app/ai.py` | 437 | Multi-provider AI integration |
| `app/algorithms.py` | 357 | Test case data for all 9 algorithms |
| `app/rate_limit.py` | 130 | Sliding-window rate limiter |
| `routers/auth.py` | 227 | Auth endpoints |
| `routers/submissions.py` | 128 | Code submission + judging |
| `routers/tutor.py` | 60 | AI tutor streaming chat |
| `routers/progress.py` | 43 | User progress data |

### Configuration Files

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage Docker build |
| `docker-compose.yml` | Production container orchestration |
| `.dockerignore` | Files excluded from Docker context |
| `backend/.env.example` | Environment variable template |
| `backend/requirements.txt` | Python dependencies |
| `frontend/package.json` | npm dependencies + scripts |
| `frontend/vite.config.ts` | Vite + proxy + test configuration |
| `frontend/tsconfig.json` | TypeScript configuration |

---

## 18. Glossary of Terms

| Term | Definition |
|---|---|
| **API** | Application Programming Interface — a set of rules for how software components talk to each other. Here, the backend exposes a REST API. |
| **CORS** | Cross-Origin Resource Sharing — browser security policy that controls which websites can make requests to your server. |
| **CSRF** | Cross-Site Request Forgery — an attack where a malicious website tricks your browser into making requests to a site you're logged into. |
| **DOM** | Document Object Model — the browser's representation of the HTML page as a tree of objects. |
| **Event Stream** | A sequence of events describing each step of an algorithm's execution. |
| **FastAPI** | A modern Python web framework for building APIs, with automatic documentation. |
| **Generator** | A function that can pause and resume execution, yielding values one at a time (uses `yield` in Python, `function*` in JavaScript). |
| **httpOnly Cookie** | A cookie that JavaScript cannot read — only sent automatically by the browser with requests. Prevents XSS attacks from stealing session tokens. |
| **JWT** | JSON Web Token — a signed, self-contained token that encodes user identity. Used for authentication. |
| **Keyframe** | A saved snapshot of the visualization state, used for efficient seeking/scrubbing. |
| **Middleware** | Code that runs between receiving a request and processing it (e.g., CORS headers, CSRF checks). |
| **ORM** | Object-Relational Mapper — lets you use Python objects instead of SQL queries to interact with the database. |
| **PBKDF2** | Password-Based Key Derivation Function 2 — a slow hashing algorithm designed to make brute-force password cracking expensive. |
| **R3F** | React Three Fiber — a React wrapper for Three.js that lets you build 3D scenes using JSX components. |
| **REST API** | Representational State Transfer — a convention for designing web APIs using HTTP methods (GET, POST, PUT, DELETE). |
| **SPA** | Single Page Application — a web app that loads one HTML page and dynamically updates content using JavaScript (no full page reloads). |
| **SQLAlchemy** | A Python ORM library that maps Python classes to database tables. |
| **SQLite** | A lightweight database stored in a single file, requiring no separate server process. |
| **SSE** | Server-Sent Events — a protocol for streaming data from server to client over HTTP. |
| **Three.js** | A JavaScript library for creating 3D graphics in the browser using WebGL. |
| **Trace** | The complete list of events produced by running an algorithm on a specific input. |
| **TypeScript** | A typed superset of JavaScript — adds static type checking to catch bugs before runtime. |
| **Vite** | A fast build tool and development server for JavaScript/TypeScript projects. |
| **VisState** | Visual State — a snapshot describing exactly what the 3D visualization should look like at a given moment. |
| **WAL** | Write-Ahead Logging — a SQLite journal mode that allows concurrent reads during writes. |
| **Web Worker** | A browser feature that runs JavaScript in a background thread, keeping the main UI thread responsive. |
| **WebGL** | Web Graphics Library — a browser API for rendering 2D and 3D graphics using the GPU. |
| **Zustand** | A small, fast state management library for React (German for "state"). |

---

> **Congratulations!** You now have a complete understanding of the Algorithm Studio project. If you're a developer looking to contribute, start by reading the [How to Add a New Algorithm](#16-how-to-add-a-new-algorithm) section. If you're a student, just open the app and start exploring! 🚀
