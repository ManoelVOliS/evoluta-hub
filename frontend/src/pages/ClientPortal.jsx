import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const ST_COLOR = { gerado:'#8B949E', revisado:'#58A6FF', enviado:'#3EBD7C' }
const ST_LABEL = { gerado:'Gerado', revisado:'Revisado', enviado:'Enviado' }

export default function ClientPortal() {
  const [client,  setClient]  = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  const clientId = localStorage.getItem('clientId')

  useEffect(() => {
    if (!clientId) { nav('/login'); return }
    Promise.all([
      api.clients.list(),
      api.clients.reports.list(clientId),
    ]).then(([clients, rpts]) => {
      setClient(clients?.[0] || null)
      setReports(rpts || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [clientId])

  const view = async (r) => {
    const full = await api.clients.reports.get(clientId, r._id)
    if (!full?.html) return
    const blob = new Blob([full.html], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  const download = async (r) => {
    const full = await api.clients.reports.get(clientId, r._id)
    if (!full?.html) return
    const blob = new Blob([full.html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `relatorio-${r.mes.replace('/', '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('clientId')
    nav('/login')
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--muted)', fontSize:13 }}>Carregando...</div>

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:16 }}>
      {/* Header */}
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' }}>
              eVOLUTA Hub
            </div>
            {client && (
              <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>{client.empresa}</div>
            )}
          </div>
          <button onClick={logout} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'6px 14px', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>
            Sair
          </button>
        </div>

        <h2 style={{ fontSize:15, fontWeight:700, marginBottom:16, color:'var(--text)' }}>
          Seus relatórios <span style={{ fontSize:12, color:'var(--muted)', fontWeight:400 }}>({reports.length})</span>
        </h2>

        {reports.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 16px', color:'var(--muted)', fontSize:13 }}>
            Nenhum relatório disponível ainda.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12 }}>
            {reports.map(r => {
              const status = r.status || 'gerado'
              return (
                <div key={r._id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 18px', borderTop:`2px solid ${ST_COLOR[status]}` }}>
                  <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{r.mes}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600, background: ST_COLOR[status]+'22', color: ST_COLOR[status], border:`1px solid ${ST_COLOR[status]}44` }}>
                      {ST_LABEL[status]}
                    </span>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>{new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => view(r)} style={{ flex:1, background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'8px 0', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:500 }}>
                      Visualizar
                    </button>
                    <button onClick={() => download(r)} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 10px', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>
                      ↓
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
