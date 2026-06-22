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

const Protected = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="backlog" element={<Backlog />} />
        <Route path="plan" element={<Plan90 />} />
        <Route path="trl" element={<TRL />} />
        <Route path="content" element={<Content />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="prospects" element={<Prospects />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="relatorios" element={<Relatorios />} />
      </Route>
    </Routes>
  </BrowserRouter>
)
