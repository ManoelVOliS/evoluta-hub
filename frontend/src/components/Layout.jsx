import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api'

const getShellStyle = (isDesktop) => ({
  display: 'flex',
  height: '100vh',
  width: '100%',
  flexDirection: isDesktop ? 'row' : 'column',
})

const getSidebarStyle = (open, isDesktop) => ({
  width: isDesktop ? 220 : '100%',
  height: isDesktop ? '100vh' : 'auto',
  maxHeight: isDesktop ? '100vh' : open ? '400px' : 0,
  background: 'var(--surface)',
  borderRight: isDesktop ? '1px solid var(--border)' : 'none',
  borderBottom: isDesktop ? 'none' : '1px solid var(--border)',
  display: 'flex',
  flexDirection: isDesktop ? 'column' : 'row',
  flexShrink: 0,
  overflow: isDesktop ? 'auto' : 'hidden',
  transition: isDesktop ? 'none' : 'max-height 0.3s ease',
})

const getMainStyle = (isDesktop) => ({
  flex: 1,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  width: isDesktop ? 'auto' : '100%',
  minWidth: 0,
})

const S = {
  logo: { padding:'12px 16px 8px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap', flexShrink:0 },
  logoName: { fontSize:14, fontWeight:600, background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent', letterSpacing:.5 },
  logoSub: { fontSize:10, color:'var(--muted)', marginTop:1 },
  nav: (isDesktop) => ({ flex:1, padding: isDesktop ? '12px 8px' : '8px 4px', display:'flex', flexDirection: isDesktop ? 'column' : 'row', gap: isDesktop ? 2 : 4, overflowX: isDesktop ? 'visible' : 'auto' }),
  link: { display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:'var(--radius)', color:'var(--muted)', textDecoration:'none', fontSize:13, transition:'all .15s', whiteSpace:'nowrap', flexShrink:0 },
  header: { padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' },
  content: { padding:'16px', flex:1, overflow:'auto' },
  logout: { background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:11, padding:'4px 8px' },
  mrr: { background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3px 8px', fontSize:11, color:'var(--muted)', whiteSpace:'nowrap' },
  toggle: { background:'none', border:'none', color:'var(--text)', cursor:'pointer', fontSize:18, padding:'8px' }
}

const links = [
  { to:'/', label:'Dashboard', icon:'◉' },
  { to:'/clientes',  label:'Clientes',   icon:'◐' },
  { to:'/prospects', label:'Prospects',  icon:'◑' },
  { to:'/calendar',   label:'Calendário',  icon:'◻' },
  { to:'/relatorios', label:'Relatórios',  icon:'◪' },
  { to:'/benchmark',  label:'Benchmark',   icon:'◬' },
  { to:'/backlog', label:'Backlog', icon:'◈' },
  { to:'/plan', label:'Plano 30 dias', icon:'◷' },
  { to:'/trl', label:'Análise TRL', icon:'◎' },
  { to:'/content', label:'Notas .md', icon:'◫' },
]

export default function Layout() {
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth > 768)

  React.useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    api.metrics.get().then(setMetrics).catch(() => {})
  }, [])

  const logout = () => { localStorage.removeItem('token'); nav('/login') }

  const mrrLabel = metrics ? `MRR R$${metrics.mrr.toLocaleString('pt-BR')}` : 'MRR —'
  const trlLabel = metrics ? `TRL ${metrics.clients > 0 ? '·' : ''} ${metrics.clients} cliente${metrics.clients !== 1 ? 's' : ''}` : 'TRL —'

  return (
    <div style={getShellStyle(isDesktop)}>
      {!isDesktop && (
        <div style={{ height:50, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 12px', gap:8, background:'var(--surface)' }}>
          <button style={S.toggle} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <span style={{ fontSize:13, color:'var(--muted)', flex:1, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>eVOLUTA</span>
          <span style={S.mrr}>{mrrLabel}</span>
        </div>
      )}

      <aside style={getSidebarStyle(menuOpen, isDesktop)}>
        {isDesktop && (
          <div style={S.logo}>
            <div style={S.logoName}>eVOLUTA Hub</div>
            <div style={S.logoSub}>Painel de operação</div>
          </div>
        )}
        <nav style={S.nav(isDesktop)}>
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to==='/'} onClick={() => setMenuOpen(false)} style={({ isActive }) => ({
              ...S.link,
              background: isActive ? 'var(--surface2)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--muted)',
              borderBottom: isActive && !isDesktop ? '2px solid var(--primary)' : '2px solid transparent',
              borderLeft: isActive && isDesktop ? '2px solid var(--primary)' : '2px solid transparent'
            })}>
              <span style={{ fontSize:12 }}>{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        {isDesktop && (
          <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', fontSize:11 }}>
            <div style={{ color:'var(--muted)', marginBottom:4 }}>Versão atual</div>
            <div style={{ background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent', fontWeight:500 }}>{trlLabel}</div>
          </div>
        )}
      </aside>

      <div style={getMainStyle(isDesktop)}>
        {isDesktop && (
          <header style={S.header}>
            <span style={{ fontSize:13, color:'var(--muted)' }}>eVOLUTA · BI para barbearias</span>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <span style={S.mrr}>{mrrLabel}</span>
              <button style={S.logout} onClick={logout}>Sair</button>
            </div>
          </header>
        )}
        <div style={S.content}>
          <Outlet />
        </div>
        {!isDesktop && (
          <div style={{ padding:'12px', borderTop:'1px solid var(--border)', textAlign:'center' }}>
            <button style={{ ...S.logout, width:'100%', padding:'8px' }} onClick={logout}>Sair</button>
          </div>
        )}
      </div>
    </div>
  )
}
