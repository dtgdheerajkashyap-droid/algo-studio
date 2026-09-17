import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AppLayout } from './app/AppLayout'
import { CatalogPage } from './app/CatalogPage'
import { AlgorithmPage } from './app/AlgorithmPage'
import { DashboardPage } from './app/DashboardPage'
import { LoginPage, RegisterPage } from './app/AuthPages'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/algorithms/:id" element={<AlgorithmPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
