import React, { useEffect, useState, useMemo } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'

const WEEKDAYS   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ATIVOS_ST  = ['identificado','abordado','em negociação']

const TIPO = {
  reuniao:            { label: 'Reunião',    color: '#A371F7', bg: '#A371F718' },
  ligacao:            { label: 'Ligação',    color: '#58A6FF', bg: '#58A6FF18' },
  entrega:            { label: 'Entrega',    color: '#3EBD7C', bg: '#3EBD7C18' },
  outro:              { label: 'Outro',      color: '#8B949E', bg: '#8B949E18' },
  'prospect-followup':{ label: 'Follow-up', color: '#F58216', bg: '#F5821618' },
  'prospect-overdue': { label: 'Atrasado',  color: '#F85149', bg: '#F8514918' },
  'client-sync':      { label: 'Sync',      color: '#E3B341', bg: '#E3B34118' },
  'plan':             { label: 'Tarefa',    color: '#56D364', bg: '#56D36418' },
}

const btnNav = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '4px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 16, lineHeight: '24px'
}
const btnIcon = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
  color: 'var(--muted)', padding: '2px 6px', borderRadius: 4, lineHeight: 1.4
}

export default function Calendar() {
  const now = new Date()

  const [year,         setYear]         = useState(now.getFullYear())
  const [month,        setMonth]        = useState(now.getMonth() + 1)
  const [manualEvents, setManualEvents] = useState([])
  const [clients,      setClients]      = useState([])
  const [prospects,    setProspects]    = useState([])
  const [selectedDay,  setSelectedDay]  = useState(null)
  const [showForm,     setShowForm]     = useState(false)
  const [form,         setForm]         = useState({ title: '', tipo: 'reuniao', nota: '', clientId: '', prospectId: '' })
  const [saving,       setSaving]       = useState(false)
  const [planItems,    setPlanItems]    = useState([])
  const [planStart,    setPlanStart]    = useState(null)

  const loadEvents = () =>
    api.calendar.list(year, month).then(setManualEvents).catch(() => {})

  useEffect(() => {
    loadEvents()
    api.clients.list().then(setClients).catch(() => {})
    api.prospects.list().then(setProspects).catch(() => {})
    api.plan.list().then(setPlanItems).catch(() => {})
    api.metrics.get().then(m => { if (m.planStartDate) setPlanStart(new Date(m.planStartDate)) }).catch(() => {})
  }, [year, month])

  /* ── Navegação ── */
  const goTo = (y, m) => { setYear(y); setMonth(m); setSelectedDay(null); setShowForm(false) }
  const prev = () => month === 1 ? goTo(year - 1, 12) : goTo(year, month - 1)
  const next = () => month === 12 ? goTo(year + 1, 1) : goTo(year, month + 1)
  const hoje = () => { goTo(now.getFullYear(), now.getMonth() + 1); setSelectedDay(now.getDate()) }

  /* ── Grade do mês ── */
  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1).getDay()
    const last  = new Date(year, month, 0).getDate()
    const arr   = Array(first).fill(null)
    for (let d = 1; d <= last; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month])

  /* ── Eventos derivados ── */
  const derivedEvents = useMemo(() => {
    const events = []
    const today  = new Date()
    const viewingNow = year === today.getFullYear() && month === today.getMonth() + 1

    prospects.filter(p => ATIVOS_ST.includes(p.status)).forEach(p => {
      if (!p.data_ultimo_contato) return
      const due     = new Date(new Date(p.data_ultimo_contato).getTime() + 7 * 86400000)
      const overdue = due < today

      if (overdue && viewingNow) {
        events.push({ id: `ov-${p._id}`, day: today.getDate(), title: `⚠ ${p.nome}`, tipo: 'prospect-overdue', source: 'derived', link: '/prospects', done: false })
      } else if (!overdue && due.getFullYear() === year && due.getMonth() + 1 === month) {
        events.push({ id: `fu-${p._id}`, day: due.getDate(), title: p.nome, tipo: 'prospect-followup', source: 'derived', link: '/prospects', done: false })
      }
    })

    clients.filter(c => c.ativo).forEach(c => {
      const base = c.ultima_sincronizacao || c.createdAt
      if (!base) return
      const due = new Date(new Date(base).getTime() + 30 * 86400000)
      if (due.getFullYear() === year && due.getMonth() + 1 === month) {
        events.push({ id: `sy-${c._id}`, day: due.getDate(), title: c.empresa, tipo: 'client-sync', source: 'derived', link: '/clientes', done: false })
      }
    })

    if (planStart) {
      planItems.filter(t => !t.done).forEach(task => {
        const d = new Date(planStart)
        d.setDate(d.getDate() + (task.week - 1) * 7)
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          events.push({ id: `plan-${task._id}`, day: d.getDate(), title: task.title, tipo: 'plan', source: 'derived', link: '/plan', done: false })
        }
      })
    }

    return events
  }, [prospects, clients, planItems, planStart, year, month])

  /* ── Índice por dia ── */
  const byDay = useMemo(() => {
    const map = {}
    const addTo = (day, e) => { if (!map[day]) map[day] = []; map[day].push(e) }
    derivedEvents.forEach(e => addTo(e.day, e))
    manualEvents.forEach(e => {
      const d = new Date(e.date).getDate()
      addTo(d, { ...e, source: 'manual' })
    })
    return map
  }, [derivedEvents, manualEvents])

  const eventsFor = (day) => byDay[day] || []

  const isToday = (day) =>
    day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()

  /* ── Ações ── */
  const addEvent = async () => {
    if (!form.title.trim() || !selectedDay) return
    setSaving(true)
    await api.calendar.create({
      ...form,
      date: new Date(year, month - 1, selectedDay),
      clientId:   form.clientId   || null,
      prospectId: form.prospectId || null,
    })
    setForm({ title: '', tipo: 'reuniao', nota: '', clientId: '', prospectId: '' })
    setShowForm(false)
    setSaving(false)
    loadEvents()
  }

  const toggleDone = async (e) => {
    await api.calendar.update(e._id, { done: !e.done })
    loadEvents()
  }

  const deleteEvent = async (e) => {
    await api.calendar.delete(e._id)
    loadEvents()
  }

  /* ── Contagens para legenda ── */
  const totalEvents    = Object.values(byDay).flat().length
  const overdueCount   = derivedEvents.filter(e => e.tipo === 'prospect-overdue').length
  const followupCount  = derivedEvents.filter(e => e.tipo === 'prospect-followup').length
  const syncCount      = derivedEvents.filter(e => e.tipo === 'client-sync').length
  const manualCount    = manualEvents.length

  const selectedEvents = selectedDay ? eventsFor(selectedDay) : []

  const inputStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '7px 10px',
    color: 'var(--text)', fontSize: 13, width: '100%', outline: 'none'
  }

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, background: 'var(--gradient)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', flex: 1 }}>
          Calendário
        </h1>
        <button onClick={hoje} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>
          Hoje
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prev} style={btnNav}>‹</button>
          <span style={{ fontWeight: 600, fontSize: 13, minWidth: 148, textAlign: 'center' }}>
            {MONTHS_PT[month - 1]} {year}
          </span>
          <button onClick={next} style={btnNav}>›</button>
        </div>
      </div>

      {/* ── Resumo inteligente ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {overdueCount > 0 && (
          <div style={{ fontSize: 11, background: TIPO['prospect-overdue'].bg, border: `1px solid ${TIPO['prospect-overdue'].color}40`, borderRadius: 'var(--radius)', padding: '4px 10px', color: TIPO['prospect-overdue'].color, fontWeight: 600 }}>
            ⚠ {overdueCount} follow-up atrasado{overdueCount !== 1 ? 's' : ''}
          </div>
        )}
        {followupCount > 0 && (
          <div style={{ fontSize: 11, background: TIPO['prospect-followup'].bg, border: `1px solid ${TIPO['prospect-followup'].color}40`, borderRadius: 'var(--radius)', padding: '4px 10px', color: TIPO['prospect-followup'].color }}>
            {followupCount} follow-up{followupCount !== 1 ? 's' : ''} agendado{followupCount !== 1 ? 's' : ''}
          </div>
        )}
        {syncCount > 0 && (
          <div style={{ fontSize: 11, background: TIPO['client-sync'].bg, border: `1px solid ${TIPO['client-sync'].color}40`, borderRadius: 'var(--radius)', padding: '4px 10px', color: TIPO['client-sync'].color }}>
            {syncCount} sync{syncCount !== 1 ? 's' : ''} vence{syncCount === 1 ? '' : 'm'} esse mês
          </div>
        )}
        {manualCount > 0 && (
          <div style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 10px', color: 'var(--muted)' }}>
            {manualCount} evento{manualCount !== 1 ? 's' : ''} manual{manualCount !== 1 ? 'is' : ''}
          </div>
        )}
        {totalEvents === 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 0' }}>Nenhum evento automático neste mês.</div>
        )}
      </div>

      {/* ── Legenda ── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['reuniao','Reunião'],['ligacao','Ligação'],['entrega','Entrega'],['plan','Tarefa do plano'],['prospect-followup','Follow-up'],['prospect-overdue','Atrasado'],['client-sync','Sync']].map(([t, l]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: TIPO[t].color, flexShrink: 0 }} />
            {l}
          </div>
        ))}
      </div>

      {/* ── Grade do calendário ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: selectedDay ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)', overflow: 'hidden' }}>
        {/* Dias da semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
          {WEEKDAYS.map(w => (
            <div key={w} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8 }}>
              {w}
            </div>
          ))}
        </div>

        {/* Células */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => {
            const events   = day ? eventsFor(day) : []
            const today    = day ? isToday(day) : false
            const selected = day === selectedDay
            const hasOver  = events.some(e => e.tipo === 'prospect-overdue')

            return (
              <div
                key={idx}
                onClick={() => {
                  if (!day) return
                  if (day === selectedDay) { setSelectedDay(null); setShowForm(false) }
                  else { setSelectedDay(day); setShowForm(false) }
                }}
                style={{
                  minHeight: 82,
                  padding: '5px 5px 3px',
                  borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                  borderBottom: idx < cells.length - 7 ? '1px solid var(--border)' : 'none',
                  cursor: day ? 'pointer' : 'default',
                  background: selected
                    ? 'rgba(241,91,181,.08)'
                    : hasOver
                    ? 'rgba(248,81,73,.04)'
                    : today
                    ? 'rgba(241,91,181,.03)'
                    : 'transparent',
                  transition: 'background .1s',
                  position: 'relative',
                }}
              >
                {day && (
                  <>
                    <div style={{
                      fontSize: 12, fontWeight: today ? 700 : 400,
                      width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                      background: today ? 'var(--primary)' : 'transparent',
                      color: today ? '#fff' : selected ? 'var(--primary)' : 'var(--text)',
                      marginBottom: 3,
                    }}>
                      {day}
                    </div>
                    {events.slice(0, 3).map((e, i) => {
                      const cfg = TIPO[e.tipo] || TIPO.outro
                      return (
                        <div key={e.id || e._id || i} style={{
                          fontSize: 10, padding: '2px 4px', marginBottom: 2, borderRadius: 3,
                          background: cfg.bg, color: cfg.color, lineHeight: 1.4,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          opacity: e.done ? .4 : 1,
                          textDecoration: e.done ? 'line-through' : 'none',
                        }}>
                          {e.title}
                        </div>
                      )
                    })}
                    {events.length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--muted)', paddingLeft: 2 }}>
                        +{events.length - 3} mais
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Painel do dia selecionado ── */}
      {selectedDay && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {selectedDay} de {MONTHS_PT[month - 1]}
              {isToday(selectedDay) && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--primary)', fontWeight: 400 }}>· hoje</span>}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>{selectedEvents.length} evento{selectedEvents.length !== 1 ? 's' : ''}</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setShowForm(f => !f)}
              style={{ background: 'var(--gradient)', border: 'none', borderRadius: 'var(--radius)', padding: '5px 14px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              + Novo evento
            </button>
          </div>

          {/* Formulário de adição */}
          {showForm && (
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5 }}>
                Novo evento · {selectedDay} de {MONTHS_PT[month - 1]}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
                <input
                  autoFocus
                  placeholder="Título do evento"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addEvent()}
                  style={inputStyle}
                />
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  style={{ ...inputStyle, width: 'auto', paddingRight: 8 }}>
                  <option value="reuniao">Reunião</option>
                  <option value="ligacao">Ligação</option>
                  <option value="entrega">Entrega</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Cliente (opcional)</div>
                  <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} style={inputStyle}>
                    <option value="">—</option>
                    {clients.filter(c => c.ativo).map(c => <option key={c._id} value={c._id}>{c.empresa}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Prospect (opcional)</div>
                  <select value={form.prospectId} onChange={e => setForm(f => ({ ...f, prospectId: e.target.value }))} style={inputStyle}>
                    <option value="">—</option>
                    {prospects.filter(p => ATIVOS_ST.includes(p.status)).map(p => <option key={p._id} value={p._id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>
              <input
                placeholder="Nota (opcional)"
                value={form.nota}
                onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addEvent} disabled={saving || !form.title.trim()}
                  style={{ background: 'var(--gradient)', border: 'none', borderRadius: 'var(--radius)', padding: '7px 16px', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, opacity: !form.title.trim() ? .5 : 1 }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button onClick={() => setShowForm(false)}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de eventos */}
          {selectedEvents.length === 0 && !showForm && (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 0' }}>Dia livre — nenhum evento.</div>
          )}
          {selectedEvents.map((e, i) => {
            const cfg = TIPO[e.tipo] || TIPO.outro
            return (
              <div key={e.id || e._id || i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                background: cfg.bg, borderRadius: 'var(--radius)', marginBottom: 6,
                border: `1px solid ${cfg.color}30`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textDecoration: e.done ? 'line-through' : 'none', opacity: e.done ? .45 : 1 }}>
                    {e.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {cfg.label}
                    {e.source === 'derived' && <span style={{ marginLeft: 6, opacity: .6 }}>· automático</span>}
                  </div>
                  {e.nota && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontStyle: 'italic' }}>{e.nota}</div>}
                  {e.source === 'derived' && e.link && (
                    <Link to={e.link} style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>
                      Ver detalhes →
                    </Link>
                  )}
                </div>
                {e.source === 'manual' && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => toggleDone(e)} style={{ ...btnIcon, color: e.done ? 'var(--primary)' : '#3EBD7C' }} title={e.done ? 'Reabrir' : 'Concluir'}>
                      {e.done ? '↩' : '✓'}
                    </button>
                    <button onClick={() => deleteEvent(e)} style={{ ...btnIcon, color: 'var(--red)' }} title="Excluir">
                      ×
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
