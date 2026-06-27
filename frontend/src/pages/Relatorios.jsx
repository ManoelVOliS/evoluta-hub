import React, { useEffect, useState, useMemo } from 'react'
import { api } from '../api'
import { useToast } from '../components/Toast'

const MOTOR_COLOR = { CashBarber:'#3EBD7C', Trink:'#58A6FF', AppBarber:'#F15BB5', Múltiplos:'#F58216', Outro:'#8B949E' }
const ST_ORDER = ['gerado', 'revisado', 'enviado']
const ST_COLOR = { gerado:'#8B949E', revisado:'#58A6FF', enviado:'#3EBD7C' }
const ST_LABEL = { gerado:'G', revisado:'R', enviado:'E' }
const ST_FULL  = { gerado:'Gerado', revisado:'Revisado', enviado:'Enviado' }
const ST_NEXT  = { gerado:'revisado', revisado:'enviado', enviado:'gerado' }

export default function Relatorios() {
  const toast = useToast()
  const [summary,  setSummary]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('todos')
  const [updating, setUpdating] = useState(null) // `${clientId}-${reportId}`

  const load = () =>
    api.clients.reportsSummary()
      .then(setSummary)
      .catch(() => toast('Erro ao carregar relatórios'))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const shown = filter === 'ativos' ? summary.filter(c => c.ativo) : summary

  const meses = useMemo(() => {
    const all = new Set(summary.flatMap(c => c.reports.map(r => r.mes)))
    return [...all].sort((a, b) => b.localeCompare(a)).slice(0, 14)
  }, [summary])

  const totalByMes = useMemo(() => {
    const t = {}
    meses.forEach(m => {
      const all = summary.flatMap(c => c.reports.filter(r => r.mes === m))
      t[m] = { total: all.length, enviado: all.filter(r => r.status === 'enviado').length }
    })
    return t
  }, [meses, summary])

  const totalRelatorios = summary.reduce((s, c) => s + c.reports.length, 0)
  const totalEnviados   = summary.reduce((s, c) => s + c.reports.filter(r => r.status === 'enviado').length, 0)

  const cycleStatus = async (c, r) => {
    const key = `${c._id}-${r._id}`
    if (updating === key) return
    setUpdating(key)
    const next = ST_NEXT[r.status || 'gerado']
    try {
      await api.clients.reports.status(c._id, r._id, next)
      setSummary(prev => prev.map(cl =>
        cl._id !== c._id ? cl : {
          ...cl,
          reports: cl.reports.map(rr => rr._id !== r._id ? rr : { ...rr, status: next, enviado_em: next === 'enviado' ? new Date().toISOString() : rr.enviado_em })
        }
      ))
    } catch { toast('Erro ao atualizar status') }
    setUpdating(null)
  }

  const viewReport = async (c, r) => {
    try {
      const full = await api.clients.reports.get(c._id, r._id)
      if (!full?.html) return toast('Relatório sem HTML', 'info')
      const blob = new Blob([full.html], { type: 'text/html' })
      window.open(URL.createObjectURL(blob), '_blank')
    } catch { toast('Erro ao abrir relatório') }
  }

  const downloadReport = async (c, r) => {
    try {
      const full = await api.clients.reports.get(c._id, r._id)
      if (!full?.html) return
      const blob = new Blob([full.html], { type: 'text/html' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `relatorio-${c.empresa.replace(/\s+/g,'-')}-${r.mes.replace('/','-')}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast('Erro ao baixar relatório') }
  }

  if (loading) return <div style={{ color:'var(--muted)', fontSize:13, padding:24 }}>Carregando...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, marginBottom:2, background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' }}>Relatórios</h1>
          <p style={{ fontSize:12, color:'var(--muted)' }}>{totalRelatorios} relatório{totalRelatorios !== 1 ? 's' : ''} · {totalEnviados} enviado{totalEnviados !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['todos', 'ativos'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'var(--surface2)' : 'none',
              border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius:'var(--radius)', padding:'5px 12px',
              color: filter === f ? 'var(--primary)' : 'var(--muted)',
              cursor:'pointer', fontSize:12, textTransform:'capitalize'
            }}>{f === 'ativos' ? 'Só ativos' : 'Todos'}</button>
          ))}
        </div>
      </div>

      {/* Totais por mês */}
      {meses.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          {meses.slice(0, 6).map(m => {
            const t = totalByMes[m]
            return (
              <div key={m} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 14px', minWidth:80 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{m}</div>
                <div style={{ fontSize:15, fontWeight:700 }}>{t.total}</div>
                <div style={{ fontSize:10, color:'#3EBD7C', marginTop:2 }}>{t.enviado} env.</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legenda */}
      <div style={{ display:'flex', gap:14, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        {Object.entries(ST_FULL).map(([k, v]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--muted)' }}>
            <span style={{ width:16, height:16, borderRadius:3, background:ST_COLOR[k]+'30', border:`1px solid ${ST_COLOR[k]}60`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:ST_COLOR[k] }}>{ST_LABEL[k]}</span>
            {v}
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--muted)' }}>
          <span style={{ width:16, height:16, borderRadius:3, background:'var(--surface2)', border:'1px dashed var(--border)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--muted)' }}>—</span>
          Sem relatório
        </div>
        <span style={{ fontSize:10, color:'var(--muted)', marginLeft:4, fontStyle:'italic' }}>· clique na badge para avançar o status · clique no cliente para ver</span>
      </div>

      {/* Grade */}
      {meses.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 16px', color:'var(--muted)', fontSize:13 }}>Nenhum relatório cadastrado ainda.</div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <div style={{
            display:'grid',
            gridTemplateColumns: `200px repeat(${meses.length}, minmax(80px, 1fr))`,
            gap:0,
            minWidth: 200 + meses.length * 80,
          }}>
            {/* Header */}
            <div style={{ padding:'8px 12px', fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.8, background:'var(--surface)', borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)' }}>Cliente</div>
            {meses.map(m => (
              <div key={m} style={{ padding:'8px 6px', fontSize:10, fontWeight:700, color:'var(--muted)', textAlign:'center', background:'var(--surface)', borderBottom:'1px solid var(--border)', borderRight:'1px solid var(--border)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m}</div>
            ))}

            {/* Rows */}
            {shown.map((c, rowIdx) => {
              const isLast = rowIdx === shown.length - 1
              const mc = MOTOR_COLOR[c.motor] || '#8B949E'
              return (
                <React.Fragment key={c._id}>
                  <div style={{ padding:'10px 12px', fontSize:12, fontWeight:500, display:'flex', alignItems:'center', gap:6, background:'var(--surface)', borderBottom: isLast ? 'none' : '1px solid var(--border)', borderRight:'1px solid var(--border)', borderLeft:`3px solid ${mc}`, opacity: c.ativo ? 1 : .5, overflow:'hidden' }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.empresa}</span>
                    {!c.ativo && <span style={{ fontSize:9, color:'var(--muted)', flexShrink:0 }}>inativo</span>}
                  </div>

                  {meses.map(m => {
                    const r   = c.reports.find(rr => rr.mes === m)
                    const key = r ? `${c._id}-${r._id}` : null
                    const busy = updating === key
                    return (
                      <div key={m} style={{ padding:'8px 6px', textAlign:'center', background: r ? ST_COLOR[r.status||'gerado']+'0d' : 'transparent', borderBottom: isLast ? 'none' : '1px solid var(--border)', borderRight:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                        {r ? (
                          <>
                            {/* Badge clicável — cicla status */}
                            <button
                              onClick={() => cycleStatus(c, r)}
                              disabled={busy}
                              title={`${ST_FULL[r.status||'gerado']} — clique para avançar`}
                              style={{ width:22, height:22, borderRadius:4, fontSize:10, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', background: ST_COLOR[r.status||'gerado']+'25', border:`1px solid ${ST_COLOR[r.status||'gerado']}55`, color: ST_COLOR[r.status||'gerado'], cursor: busy ? 'wait' : 'pointer', transition:'all .15s', padding:0 }}
                            >
                              {busy ? '…' : ST_LABEL[r.status||'gerado']}
                            </button>
                            {/* Ver */}
                            <button onClick={() => viewReport(c, r)} title="Visualizar" style={{ width:18, height:18, borderRadius:3, fontSize:9, display:'inline-flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer', padding:0 }}>▶</button>
                            {/* Baixar */}
                            <button onClick={() => downloadReport(c, r)} title="Baixar .html" style={{ width:18, height:18, borderRadius:3, fontSize:9, display:'inline-flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer', padding:0 }}>↓</button>
                          </>
                        ) : (
                          <span style={{ color:'var(--border)', fontSize:13 }}>—</span>
                        )}
                      </div>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
