import React, { useEffect, useState } from 'react'
import { api } from '../api'
import ImportMd from '../components/ImportMd'

const TAGS       = ['tech','ops','biz','mkt']
const PRIOS      = ['P1','P2','P3']
const TAG_COLOR  = { tech:'#58A6FF', ops:'#F58216', biz:'#3EBD7C', mkt:'#8B949E' }
const TAG_LABEL  = { tech:'Técnico', ops:'Operação', biz:'Negócio', mkt:'Marketing' }
const PRIO_COLOR = { P1:'#F85149', P2:'#F58216', P3:'#7B2CBF' }
const PRIO_LABEL = { P1:'P1', P2:'P2', P3:'P3' }

const EMPTY = { title:'', description:'', priority:'P2', tag:'tech' }

const PrioBadge = ({ p }) => (
  <span style={{
    fontSize:10, padding:'2px 7px', borderRadius:4, flexShrink:0,
    background: PRIO_COLOR[p] + '22', color: PRIO_COLOR[p],
    border:`1px solid ${PRIO_COLOR[p]}55`, fontWeight:700
  }}>{p}</span>
)

const TagBadge = ({ t }) => (
  <span style={{
    fontSize:10, padding:'2px 7px', borderRadius:4, flexShrink:0,
    background: TAG_COLOR[t] + '22', color: TAG_COLOR[t],
    border:`1px solid ${TAG_COLOR[t]}55`
  }}>{TAG_LABEL[t]}</span>
)

export default function Backlog() {
  const [items, setItems]     = useState([])
  const [form, setForm]       = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [show, setShow]       = useState(false)
  const [filterTag, setFilterTag] = useState('all')

  const load = () => api.backlog.list().then(setItems)
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.title.trim()) return
    if (editing) await api.backlog.update(editing, form)
    else await api.backlog.create(form)
    setForm(EMPTY); setEditing(null); setShow(false); load()
  }

  const toggle = async (i) => { await api.backlog.update(i._id, { done: !i.done }); load() }
  const del    = async (id) => { await api.backlog.delete(id); load() }
  const edit   = (i) => {
    setForm({ title:i.title, description:i.description, priority:i.priority, tag:i.tag })
    setEditing(i._id); setShow(true)
  }

  const filtered = filterTag === 'all' ? items : items.filter(i => i.tag === filterTag)
  const done = items.filter(i => i.done).length

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
            <h1 style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>Backlog</h1>
            <p style={{ fontSize:12, color:'var(--muted)' }}>
              {done} de {items.length} concluídos · operação solo
            </p>
          </div>
          <button onClick={() => { setForm(EMPTY); setEditing(null); setShow(s => !s) }} style={{
            background:'var(--gradient)', border:'none', borderRadius:'var(--radius)',
            padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500
          }}>
            + Adicionar
          </button>
        </div>
      </div>

      {/* Form */}
      {show && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16, marginBottom:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:8, marginBottom:8 }}>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority:e.target.value }))} style={inputStyle}>
              {PRIOS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag:e.target.value }))} style={inputStyle}>
              {TAGS.map(t => <option key={t} value={t}>{TAG_LABEL[t]}</option>)}
            </select>
          </div>
          <input placeholder="Título da tarefa" value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))}
            style={{ ...inputStyle, marginBottom:8 }} />
          <textarea placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} rows={2}
            style={{ ...inputStyle, resize:'vertical', marginBottom:10 }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={save} style={{ background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13 }}>
              {editing ? 'Salvar edição' : 'Adicionar'}
            </button>
            <button onClick={() => { setShow(false); setEditing(null); setForm(EMPTY) }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'7px 14px', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ImportMd type="backlog" onImport={async (itens) => {
        for (const item of itens) await api.backlog.create(item)
        load()
      }} />

      {/* Filter by tag */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        <button onClick={() => setFilterTag('all')} style={{
          background: filterTag === 'all' ? 'var(--surface2)' : 'transparent',
          border:`1px solid ${filterTag === 'all' ? 'var(--border)' : 'transparent'}`,
          borderRadius:'var(--radius)', padding:'4px 12px',
          color: filterTag === 'all' ? 'var(--text)' : 'var(--muted)', cursor:'pointer', fontSize:12
        }}>Todos</button>
        {TAGS.map(t => (
          <button key={t} onClick={() => setFilterTag(t)} style={{
            background: filterTag === t ? TAG_COLOR[t] + '22' : 'transparent',
            border:`1px solid ${filterTag === t ? TAG_COLOR[t] + '55' : 'transparent'}`,
            borderRadius:'var(--radius)', padding:'4px 12px',
            color: filterTag === t ? TAG_COLOR[t] : 'var(--muted)', cursor:'pointer', fontSize:12
          }}>{TAG_LABEL[t]}</button>
        ))}
      </div>

      {/* Items grouped by priority */}
      {PRIOS.map(p => {
        const group = filtered.filter(i => i.priority === p)
        if (!group.length) return null
        return (
          <div key={p} style={{ marginBottom:24 }}>
            {/* Priority group header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ width:10, height:10, borderRadius:'50%', background:PRIO_COLOR[p], flexShrink:0 }} />
              <span style={{ fontSize:11, fontWeight:700, color:PRIO_COLOR[p], textTransform:'uppercase', letterSpacing:1 }}>
                {PRIO_LABEL[p]}
              </span>
              <div style={{ flex:1, height:1, background:PRIO_COLOR[p] + '33' }} />
              <span style={{ fontSize:11, color:'var(--muted)' }}>{group.filter(i => !i.done).length} abertos</span>
            </div>

            {/* Items */}
            {group.map(i => (
              <div key={i._id} style={{
                display:'flex', gap:10, alignItems:'flex-start',
                padding:'10px 14px', marginBottom:6,
                background:'var(--surface)', border:'1px solid var(--border)',
                borderLeft:`3px solid ${PRIO_COLOR[p]}`,
                borderRadius:'var(--radius)', opacity: i.done ? .5 : 1,
                transition:'opacity .2s'
              }}>
                <input type="checkbox" checked={i.done} onChange={() => toggle(i)}
                  style={{ marginTop:3, accentColor: PRIO_COLOR[p], flexShrink:0, width:14, height:14 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <span style={{ fontSize:13, fontWeight:500, textDecoration: i.done ? 'line-through' : 'none', lineHeight:1.4 }}>
                    {i.title}
                  </span>
                  {i.description && (
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:4, lineHeight:1.5 }}>{i.description}</div>
                  )}
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                  <TagBadge t={i.tag} />
                  <PrioBadge p={i.priority} />
                  <button onClick={() => edit(i)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:12, padding:'0 2px' }}>✎</button>
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
