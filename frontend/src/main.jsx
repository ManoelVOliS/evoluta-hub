import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Backlog from './pages/Backlog'
import Plan90 from './pages/Plan90'
import TRL from './pages/TRL'
import Content from './pages/Content'
import Clientes from './pages/Clientes'
import Prospects from './pages/Prospects'
import Calendar from './pages/Calendar'
import Relatorios from './pages/Relatorios'
import Benchmark from './pages/Benchmark'
import Usuarios from './pages/Usuarios'
import ClientPortal from './pages/ClientPortal'
import { ToastProvider } from './components/Toast'

const Protected = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />
}

const AdminOnly = ({ children }) => {
  const role = localStorage.getItem('role')
  if (!localStorage.getItem('token')) return <Navigate to="/login" />
  if (role === 'client') return <Navigate to="/portal" />
  return children
}

createRoot(document.getElementById('root')).render(
  <ToastProvider>
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal" element={<Protected><ClientPortal /></Protected>} />
      <Route path="/" element={<AdminOnly><Layout /></AdminOnly>}>
        <Route index element={<Dashboard />} />
        <Route path="backlog" element={<Backlog />} />
        <Route path="plan" element={<Plan90 />} />
        <Route path="trl" element={<TRL />} />
        <Route path="content" element={<Content />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="prospects" element={<Prospects />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="benchmark" element={<Benchmark />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
    </Routes>
  </BrowserRouter>
  </ToastProvider>
)
