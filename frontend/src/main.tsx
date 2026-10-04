import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AppLayout } from './app/AppLayout'
import { CatalogPage } from './app/CatalogPage'
import { DashboardPage } from './app/DashboardPage'
import { LoginPage, RegisterPage } from './app/AuthPages'

// The visualizer pulls in three.js / r3f; load it only when a user opens an
// algorithm so the catalog and auth pages stay light.
const AlgorithmPage = lazy(() =>
  import('./app/AlgorithmPage').then((m) => ({ default: m.AlgorithmPage })),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route
            path="/algorithms/:id"
            element={
              <Suspense fallback={<div className="p-8 text-sm text-ink-muted">Loading…</div>}>
                <AlgorithmPage />
              </Suspense>
            }
          />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
