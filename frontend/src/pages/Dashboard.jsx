import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'

const Card = ({ label, value, sub, color, highlight, onClick, editable }) => (
  <div
    onClick={onClick}
    style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--radius)', padding:'16px 20px',
      flex:1, minWidth:'140px', transition:'all .2s',
      cursor: editable ? 'pointer' : 'default',
      ...(highlight && { borderColor:'var(--primary)', boxShadow:'0 0 0 1px rgba(241,91,181,.15)' }),
      ...(editable && { ':hover':{ borderColor:'var(--primary)' } })
    }}
  >
    <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6, fontWeight:500, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      {label}
      {editable && <span style={{ fontSize:10, color:'var(--muted)', opacity:.6 }}>✎</span>}
    </div>
    <div style={{ fontSize:22, fontWeight:700, color: color || 'var(--text)', marginBottom:4 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{sub}</div>}
  </div>
)

export default function Dashboard() {
  const [backlog,  setBacklog]  = useState([])
  const [plan,     setPlan]     = useState([])
  const [trl,      setTrl]      = useState(null)
  const [metrics,  setMetrics]  = useState(null)
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState({ clients:0, mrr:0, pricePerClient:0 })

  const loadMetrics = () => api.metrics.get().then(m => { setMetrics(m); setForm({ clients:m.clients, mrr:m.mrr, pricePerClient:m.pricePerClient }) })

  useEffect(() => {
    api.backlog.list().then(setBacklog)
    api.plan.list().then(setPlan)
    api.trl.get().then(setTrl)
    loadMetrics()
  }, [])

  const saveMetrics = async () => {
    const updated = await api.metrics.update(form)
    setMetrics(updated)
    setEditing(false)
  }

  const done   = plan.filter(i => i.done).length
  const pct    = plan.length ? Math.round(done / plan.length * 100) : 0
  const p1open = backlog.filter(i => i.priority === 'P1' && !i.done).length

  const inputStyle = {
    background:'var(--surface2)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)', padding:'7px 10px',
    color:'var(--text)', fontSize:13, width:'100%'
  }

  return (
    <div>
      <div style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4, background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' }}>Visão geral</h1>
          <p style={{ color:'var(--muted)', fontSize:12 }}>Operação solo · Julho 2026</p>
        </div>
      </div>

      {/* Cards de métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom: editing ? 0 : 24 }}>
        <Card
          label="MRR" editable
          value={metrics ? `R$${metrics.mrr.toLocaleString('pt-BR')}` : '—'}
          sub={metrics ? `${metrics.clients} cliente${metrics.clients !== 1 ? 's' : ''}` : '—'}
          color="var(--accent)" highlight
          onClick={() => setEditing(true)}
        />
        <Card label="TRL atual" value={trl ? `${trl.currentLevel}/9` : '—'} sub="Protótipo" />
        <Card label="Plano 30d" value={`${pct}%`} sub={`${done}/${plan.length}`} color={pct > 50 ? 'var(--primary)' : 'var(--accent)'} />
        <Card label="P1 abertos" value={p1open} sub="Máxima prioridade" color={p1open > 0 ? 'var(--red)' : 'var(--primary)'} />
      </div>

      {/* Formulário de edição de métricas */}
      {editing && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--primary)', borderRadius:'var(--radius)', padding:16, marginBottom:24, marginTop:8 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:12, color:'var(--primary)' }}>Atualizar métricas</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Clientes ativos</div>
              <input type="number" min="0" value={form.clients}
                onChange={e => setForm(f => ({ ...f, clients: +e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>MRR total (R$)</div>
              <input type="number" min="0" value={form.mrr}
                onChange={e => setForm(f => ({ ...f, mrr: +e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Preço por cliente (R$)</div>
              <input type="number" min="0" value={form.pricePerClient}
                onChange={e => setForm(f => ({ ...f, pricePerClient: +e.target.value }))}
                style={inputStyle} />
            </div>
          </div>
          {form.clients > 0 && form.pricePerClient > 0 && (
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>
              MRR calculado: <strong style={{ color:'var(--accent)' }}>R${(form.clients * form.pricePerClient).toLocaleString('pt-BR')}</strong>
              {form.mrr !== form.clients * form.pricePerClient && (
                <span style={{ marginLeft:8, color:'var(--muted)' }}>(diferente do MRR manual — tiers ou descontos?)</span>
              )}
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={saveMetrics} style={{ background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500 }}>
              Salvar
            </button>
            <button onClick={() => setEditing(false)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'7px 14px', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Listas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:8 }}>
            <span style={{ fontWeight:600, fontSize:13 }}>Backlog P1</span>
            <Link to="/backlog" style={{ fontSize:11, color:'var(--primary)', textDecoration:'none', whiteSpace:'nowrap' }}>ver todos →</Link>
          </div>
          {backlog.filter(i => i.priority === 'P1' && !i.done).slice(0, 4).map(i => (
            <div key={i._id} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--red)', marginTop:6, flexShrink:0 }} />
              <span style={{ lineHeight:1.3 }}>{i.title}</span>
            </div>
          ))}
          {backlog.filter(i => i.priority === 'P1' && !i.done).length === 0 && (
            <div style={{ color:'var(--primary)', fontSize:12, padding:'8px 0', fontWeight:500 }}>✓ Todos concluídos</div>
          )}
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:8 }}>
            <span style={{ fontWeight:600, fontSize:13 }}>Próximas tarefas</span>
            <Link to="/plan" style={{ fontSize:11, color:'var(--primary)', textDecoration:'none', whiteSpace:'nowrap' }}>ver plano →</Link>
          </div>
          {plan.filter(i => !i.done).slice(0, 4).map(i => (
            <div key={i._id} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
              <span style={{ fontSize:10, color:'var(--accent)', fontWeight:600, marginTop:4, flexShrink:0 }}>S{i.week}</span>
              <span style={{ lineHeight:1.3 }}>{i.title}</span>
            </div>
          ))}
          {plan.filter(i => !i.done).length === 0 && (
            <div style={{ color:'var(--primary)', fontSize:12, padding:'8px 0', fontWeight:500 }}>✓ Plano concluído</div>
          )}
        </div>
      </div>
    </div>
  )
}
