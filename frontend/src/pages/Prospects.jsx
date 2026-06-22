import React, { useEffect, useState } from 'react'
import { api } from '../api'

const STATUS_ORDER = ['identificado', 'abordado', 'em negociação', 'convertido', 'descartado']
const STATUS_COLOR = {
  identificado:   '#8B949E',
  abordado:       '#58A6FF',
  'em negociação':'#F58216',
  convertido:     '#3EBD7C',
  descartado:     '#F85149',
}
const STATUS_NEXT = {
  identificado: 'abordado',
  abordado:     'em negociação',
}

const ATIVOS = ['identificado', 'abordado', 'em negociação']
const EMPTY  = { nome: '', contato: '', num_cadeiras: 0, status: 'identificado', observacoes: '' }

const daysSince = (date) => {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24))
}

const StatusBadge = ({ status }) => (
  <span style={{
    fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600, flexShrink: 0,
    background: (STATUS_COLOR[status] || '#8B949E') + '22',
    color: STATUS_COLOR[status] || '#8B949E',
    border: `1px solid ${(STATUS_COLOR[status] || '#8B949E')}44`
  }}>{status}</span>
)

export default function Prospects() {
  const [items,        setItems]        = useState([])
  const [form,         setForm]         = useState(EMPTY)
  const [editing,      setEditing]      = useState(null)
  const [showForm,     setShowForm]     = useState(false)
  const [filterStatus, setFilterStatus] = useState('ativos')

  const load = () => api.prospects.list().then(setItems)
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.nome.trim()) return
    if (editing) await api.prospects.update(editing, form)
    else         await api.prospects.create(form)
    setForm(EMPTY); setEditing(null); setShowForm(false); load()
  }

  const edit = (p) => {
    setForm({ nome: p.nome, contato: p.contato, num_cadeiras: p.num_cadeiras, status: p.status, observacoes: p.observacoes })
    setEditing(p._id); setShowForm(true)
  }

  const del = async (p) => {
    if (!confirm(`Remover ${p.nome}?`)) return
    await api.prospects.delete(p._id); load()
  }

  const advance = async (p, nextStatus) => {
    await api.prospects.update(p._id, { ...p, status: nextStatus })
    load()
  }

  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '8px 10px',
    color: 'var(--text)', fontSize: 13, width: '100%'
  }

  const shown   = filterStatus === 'ativos' ? items.filter(p => ATIVOS.includes(p.status)) : items
  const alertas = items.filter(p => ATIVOS.includes(p.status) && daysSince(p.data_ultimo_contato) >= 7)
  const grouped = STATUS_ORDER
    .filter(s => filterStatus === 'todos' || ATIVOS.includes(s))
    .map(s => ({ status: s, items: shown.filter(p => p.status === s) }))
    .filter(g => g.items.length > 0)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2, background: 'var(--gradient)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            Pipeline de Prospects
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            {items.filter(p => ATIVOS.includes(p.status)).length} em andamento · {items.filter(p => p.status === 'convertido').length} convertidos
          </p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(s => !s) }} style={{
          background: 'var(--gradient)', border: 'none', borderRadius: 'var(--radius)',
          padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500
        }}>
          + Novo prospect
        </button>
      </div>

      {/* Alertas de inatividade */}
      {alertas.length > 0 && (
        <div style={{ background: 'rgba(245,130,22,.08)', border: '1px solid rgba(245,130,22,.3)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
            ⚠ {alertas.length} prospect{alertas.length !== 1 ? 's' : ''} sem contato há 7+ dias
          </div>
          {alertas.map(p => (
            <div key={p._id} style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
              · {p.nome} — {daysSince(p.data_ultimo_contato)} dias
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>
            {editing ? 'Editar prospect' : 'Novo prospect'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Nome *</div>
              <input placeholder="Barbearia do João" value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Contato</div>
              <input placeholder="@instagram ou WhatsApp" value={form.contato}
                onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Cadeiras</div>
              <input type="number" min="0" value={form.num_cadeiras}
                onChange={e => setForm(f => ({ ...f, num_cadeiras: +e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Status</div>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Observações</div>
            <textarea placeholder="Anotações livres..." value={form.observacoes} rows={2}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={{ background: 'var(--gradient)', border: 'none', borderRadius: 'var(--radius)', padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              {editing ? 'Salvar edição' : 'Adicionar'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY) }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtro */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[['ativos', 'Em andamento'], ['todos', 'Todos']].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)} style={{
            background: filterStatus === val ? 'var(--surface2)' : 'transparent',
            border: `1px solid ${filterStatus === val ? 'var(--border)' : 'transparent'}`,
            borderRadius: 'var(--radius)', padding: '4px 12px',
            color: filterStatus === val ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', fontSize: 12
          }}>{label}</button>
        ))}
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--muted)', fontSize: 13 }}>
          Nenhum prospect cadastrado ainda.
        </div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)', fontSize: 13 }}>
          Nenhum prospect em andamento.{' '}
          <button onClick={() => setFilterStatus('todos')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
            Ver todos
          </button>
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.status} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[group.status], flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[group.status], textTransform: 'uppercase', letterSpacing: 1 }}>
                {group.status} ({group.items.length})
              </span>
              <div style={{ flex: 1, height: 1, background: STATUS_COLOR[group.status] + '33' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {group.items.map(p => {
                const dias   = daysSince(p.data_ultimo_contato)
                const alerta = dias >= 7 && ATIVOS.includes(p.status)
                const next   = STATUS_NEXT[p.status]
                return (
                  <div key={p._id} style={{
                    background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '14px 16px',
                    border: alerta ? '1px solid rgba(245,130,22,.4)' : '1px solid var(--border)',
                    borderLeft: `3px solid ${STATUS_COLOR[p.status]}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, flex: 1, marginRight: 8 }}>{p.nome}</div>
                      <StatusBadge status={p.status} />
                    </div>
                    {p.contato && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{p.contato}</div>}
                    {p.num_cadeiras > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                        {p.num_cadeiras} cadeira{p.num_cadeiras !== 1 ? 's' : ''}
                      </div>
                    )}
                    {p.observacoes && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.4, fontStyle: 'italic' }}>
                        {p.observacoes}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: alerta ? 'var(--accent)' : 'var(--muted)', marginBottom: 10 }}>
                      {dias === null ? '' : alerta ? `⚠ ${dias}d sem contato` : dias === 0 ? 'contato hoje' : `${dias}d atrás`}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {next && (
                        <button onClick={() => advance(p, next)} style={{
                          flex: 1, background: 'var(--surface2)', border: `1px solid ${STATUS_COLOR[next]}55`,
                          borderRadius: 'var(--radius)', padding: '5px 8px',
                          color: STATUS_COLOR[next], cursor: 'pointer', fontSize: 11, fontWeight: 500
                        }}>
                          → {next}
                        </button>
                      )}
                      {p.status === 'em negociação' && (<>
                        <button onClick={() => advance(p, 'convertido')} style={{
                          flex: 1, background: '#3EBD7C22', border: '1px solid #3EBD7C55',
                          borderRadius: 'var(--radius)', padding: '5px 8px',
                          color: '#3EBD7C', cursor: 'pointer', fontSize: 11, fontWeight: 500
                        }}>✓ Converter</button>
                        <button onClick={() => advance(p, 'descartado')} style={{
                          background: '#F8514922', border: '1px solid #F8514955',
                          borderRadius: 'var(--radius)', padding: '5px 8px',
                          color: '#F85149', cursor: 'pointer', fontSize: 11
                        }}>✗</button>
                      </>)}
                      <button onClick={() => edit(p)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 8px', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}>✎</button>
                      <button onClick={() => del(p)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 8px', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
