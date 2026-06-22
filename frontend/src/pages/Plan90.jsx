import React, { useEffect, useState } from 'react'
import { api } from '../api'
import ImportMd from '../components/ImportMd'

const TAG_COLOR  = { tech:'#58A6FF', ops:'#F58216', biz:'#3EBD7C', mkt:'#8B949E' }
const TAG_LABEL  = { tech:'Técnico', ops:'Operação', biz:'Negócio', mkt:'Marketing' }
const WEEKS = [1,2,3,4]
const WEEK_LABEL = {
  1:'Semana 1 — Base',
  2:'Semana 2 — Treinamento',
  3:'Semana 3 — Transferência',
  4:'Semana 4 — Primeiros resultados'
}
const EMPTY = { week:1, title:'', description:'', tag:'ops' }

const Badge = ({ tag }) => (
  <span style={{
    fontSize:10, padding:'2px 8px', borderRadius:4, flexShrink:0,
    background: TAG_COLOR[tag] + '22', color: TAG_COLOR[tag],
    border: `1px solid ${TAG_COLOR[tag]}55`, fontWeight:500
  }}>
    {TAG_LABEL[tag]}
  </span>
)

export default function Plan90() {
  const [items,         setItems]         = useState([])
  const [form,          setForm]          = useState(EMPTY)
  const [show,          setShow]          = useState(false)
  const [planStartDate, setPlanStartDate] = useState('')
  const [editingDate,   setEditingDate]   = useState(false)

  const load = () => api.plan.list().then(setItems)
  useEffect(() => {
    load()
    api.metrics.get().then(m => {
      if (m.planStartDate) setPlanStartDate(new Date(m.planStartDate).toISOString().substring(0, 10))
    }).catch(() => {})
  }, [])

  const savePlanDate = async (date) => {
    await api.metrics.update({ planStartDate: date || null })
    setPlanStartDate(date)
    setEditingDate(false)
  }

  const weekLabel = (w) => {
    if (!planStartDate) return WEEK_LABEL[w]
    const start = new Date(planStartDate)
    start.setDate(start.getDate() + (w - 1) * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    return `Semana ${w} · ${fmt(start)} – ${fmt(end)}`
  }

  const planTitle = () => {
    if (!planStartDate) return 'Plano 30 dias'
    const d = new Date(planStartDate)
    const s = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    return `Plano — ${s.charAt(0).toUpperCase()}${s.slice(1)}`
  }

  const done  = items.filter(i => i.done).length
  const total = items.length
  const pct   = total ? Math.round(done / total * 100) : 0

  const save = async () => {
    if (!form.title.trim()) return
    await api.plan.create(form)
    setForm(EMPTY); setShow(false); load()
  }

  const toggle = async (i) => { await api.plan.update(i._id, { done: !i.done }); load() }
  const del    = async (id) => { await api.plan.delete(id); load() }

  const inputStyle = {
    background:'var(--surface2)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)', padding:'8px 10px',
    color:'var(--text)', fontSize:13, width:'100%'
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>{planTitle()}</h1>
            <p style={{ fontSize:12, color:'var(--muted)' }}>30 dias · operação solo · sem metas heroicas</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {editingDate ? (
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <input type="date" defaultValue={planStartDate}
                  onChange={e => savePlanDate(e.target.value)}
                  style={{ background:'var(--surface2)', border:'1px solid var(--primary)', borderRadius:'var(--radius)', padding:'4px 8px', color:'var(--text)', fontSize:12 }} />
                <button onClick={() => setEditingDate(false)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setEditingDate(true)} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'4px 10px', color:'var(--muted)', cursor:'pointer', fontSize:11 }}>
                {planStartDate ? `Início: ${new Date(planStartDate).toLocaleDateString('pt-BR')} ✎` : '+ Definir data de início'}
              </button>
            )}
            <span style={{ fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>{done} de {total} feitos</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:14 }}>
          <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden', marginBottom:6 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'var(--gradient)', borderRadius:3, transition:'width .4s' }} />
          </div>
          <span style={{ fontSize:11, color:'var(--muted)' }}>{pct}% concluído</span>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap' }}>
          {Object.entries(TAG_LABEL).map(([key, label]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--muted)' }}>
              <span style={{ width:8, height:8, borderRadius:2, background: TAG_COLOR[key], flexShrink:0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Add + Import buttons */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <button onClick={() => setShow(s => !s)} style={{
          background:'var(--gradient)', border:'none', borderRadius:'var(--radius)',
          padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500
        }}>
          + Adicionar tarefa
        </button>
      </div>

      <ImportMd type="plan" onImport={async (itens) => {
        for (const item of itens) await api.plan.create(item)
        load()
      }} />

      {/* Form */}
      {show && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16, marginBottom:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:8, marginBottom:8 }}>
            <select value={form.week} onChange={e => setForm(f => ({ ...f, week:+e.target.value }))} style={inputStyle}>
              {WEEKS.map(w => <option key={w} value={w}>Semana {w}</option>)}
            </select>
            <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag:e.target.value }))} style={inputStyle}>
              {Object.entries(TAG_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <input placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} style={{ ...inputStyle, marginBottom:8 }} />
          <textarea placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} rows={2}
            style={{ ...inputStyle, resize:'vertical', marginBottom:10 }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={save} style={{ background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13 }}>Salvar</button>
            <button onClick={() => setShow(false)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'7px 14px', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Weeks */}
      {WEEKS.map(w => {
        const week = items.filter(i => i.week === w)
        if (!week.length) return null
        return (
          <div key={w} style={{ marginBottom:28 }}>
            {/* Week header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, whiteSpace:'nowrap' }}>
                {weekLabel(w)}
              </span>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            {/* Items */}
            {week.map(i => (
              <div key={i._id} style={{
                display:'flex', gap:10, alignItems:'flex-start',
                padding:'10px 14px', marginBottom:6,
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:'var(--radius)', opacity: i.done ? .5 : 1,
                transition:'opacity .2s'
              }}>
                <input type="checkbox" checked={i.done} onChange={() => toggle(i)}
                  style={{ marginTop:3, accentColor:'var(--primary)', flexShrink:0, width:14, height:14 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <span style={{ fontSize:13, fontWeight:500, textDecoration: i.done ? 'line-through' : 'none', lineHeight:1.4 }}>
                    {i.title}
                  </span>
                  {i.description && (
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:4, lineHeight:1.5 }}>{i.description}</div>
                  )}
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                  <Badge tag={i.tag} />
                  <button onClick={() => del(i._id)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:16, lineHeight:1, padding:'0 2px' }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
