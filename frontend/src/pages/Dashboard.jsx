import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'

const ATIVOS_STATUS = ['identificado', 'abordado', 'em negociação']

/* ── Gráfico de área — MRR ── */
function MrrAreaChart({ data }) {
  if (data.length < 2) return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: '28px 0', fontStyle: 'italic' }}>
      Atualize o MRR ao menos 2 vezes para ver o histórico
    </div>
  )
  const pts  = [...data].reverse()
  const vals = pts.map(h => h.mrr)
  const n    = pts.length
  const maxV = Math.max(...vals) * 1.12 || 1

  const W = 600, H = 100, PL = 44, PR = 8, PT = 6, PB = 22
  const iW = W - PL - PR, iH = H - PT - PB
  const cx  = i => PL + (n < 2 ? iW / 2 : (i / (n - 1)) * iW)
  const cy  = v => PT + iH - (v / maxV) * iH
  const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)

  const coords = pts.map((h, i) => [cx(i), cy(h.mrr)])
  const line   = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area   = `${line} L${coords.at(-1)[0].toFixed(1)},${H - PB} L${coords[0][0].toFixed(1)},${H - PB} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ width: '100%', height: 100, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F15BB5" stopOpacity=".3"/>
          <stop offset="100%" stopColor="#F15BB5" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.85, 0.42].map(r => (
        <line key={r} x1={PL} y1={cy(maxV * r)} x2={W - PR} y2={cy(maxV * r)}
          stroke="var(--border)" strokeWidth=".5" strokeDasharray="4 3" />
      ))}
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--border)" strokeWidth=".5" />
      <path d={area} fill="url(#mrrFill)" />
      <path d={line} fill="none" stroke="#F15BB5" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#F15BB5" />)}
      {pts.map((h, i) => (
        <text key={i} x={cx(i)} y={H - 5} textAnchor="middle" fontSize="8.5" fill="#8B949E">
          {new Date(h.registeredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </text>
      ))}
      {[0.85, 0.42].map((r, i) => (
        <text key={i} x={PL - 3} y={cy(maxV * r) + 3} textAnchor="end" fontSize="8.5" fill="#8B949E">
          {fmt(Math.round(maxV * r))}
        </text>
      ))}
    </svg>
  )
}

/* ── Funil de prospects ── */
function ProspectFunnel({ prospects }) {
  const STAGES = [
    { status: 'identificado',  label: 'Identificados',  color: '#8B949E' },
    { status: 'abordado',      label: 'Abordados',      color: '#58A6FF' },
    { status: 'em negociação', label: 'Em negociação',  color: '#F58216' },
    { status: 'convertido',    label: 'Convertidos',    color: '#3EBD7C' },
  ]
  const counts = STAGES.map(s => prospects.filter(p => p.status === s.status).length)
  const max    = Math.max(...counts, 1)

  if (prospects.length === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: '28px 0', fontStyle: 'italic' }}>
      Nenhum prospect cadastrado ainda
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {STAGES.map((s, i) => (
        <div key={s.status}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            <span>{s.label}</span>
            <span style={{ fontWeight: 700, color: s.color }}>{counts[i]}</span>
          </div>
          <div style={{ height: 7, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${counts[i] / max * 100}%`, background: s.color, borderRadius: 4, transition: 'width .6s ease' }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        Total: <strong>{prospects.length}</strong> prospect{prospects.length !== 1 ? 's' : ''}
        {counts[3] > 0 && (
          <span style={{ marginLeft: 10, color: '#3EBD7C', fontWeight: 600 }}>
            · {Math.round(counts[3] / prospects.length * 100)}% conversão
          </span>
        )}
      </div>
    </div>
  )
}

const daysSince = (date) => {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24))
}

const mesAtual = () => {
  const s = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const Card = ({ label, value, sub, color, highlight, onClick, editable, badge }) => (
  <div
    onClick={onClick}
    style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 20px',
      transition: 'all .2s', cursor: editable ? 'pointer' : 'default',
      position: 'relative', overflow: 'hidden',
      ...(highlight && { borderColor: 'var(--primary)', boxShadow: '0 0 0 1px rgba(241,91,181,.12)' }),
    }}
  >
    {badge != null && badge > 0 && (
      <span style={{ position: 'absolute', top: 10, right: 10, background: 'var(--red)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px', lineHeight: '16px' }}>
        {badge}
      </span>
    )}
    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
      {label}
      {editable && <span style={{ fontSize: 10, color: 'var(--muted)', opacity: .5, marginLeft: 'auto' }}>✎</span>}
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text)', marginBottom: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
  </div>
)

const SectionHeader = ({ title, to, linkLabel }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    {to && <Link to={to} style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>{linkLabel || 'ver todos →'}</Link>}
  </div>
)

const ListBox = ({ children, style }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, ...style }}>
    {children}
  </div>
)

export default function Dashboard() {
  const [backlog,    setBacklog]    = useState([])
  const [plan,       setPlan]       = useState([])
  const [trl,        setTrl]        = useState(null)
  const [metrics,    setMetrics]    = useState(null)
  const [editing,    setEditing]    = useState(false)
  const [form,       setForm]       = useState({ clients: 0, mrr: 0, pricePerClient: 0 })
  const [clients,    setClients]    = useState([])
  const [prospects,  setProspects]  = useState([])
  const [mrrHistory, setMrrHistory] = useState([])

  const loadMetrics = () =>
    api.metrics.get().then(m => {
      setMetrics(m)
      setForm({ clients: m.clients, mrr: m.mrr, pricePerClient: m.pricePerClient })
    })

  useEffect(() => {
    api.backlog.list().then(setBacklog)
    api.plan.list().then(setPlan)
    api.trl.get().then(setTrl)
    loadMetrics()
    api.clients.list().then(setClients)
    api.prospects.list().then(setProspects)
    api.metrics.history().then(setMrrHistory).catch(() => {})
  }, [])

  const saveMetrics = async () => {
    const updated = await api.metrics.update(form)
    setMetrics(updated)
    setForm({ clients: updated.clients, mrr: updated.mrr, pricePerClient: updated.pricePerClient })
    setEditing(false)
    api.metrics.history().then(setMrrHistory).catch(() => {})
  }

  /* ── Plano ── */
  const donePlan = plan.filter(i => i.done).length
  const pct      = plan.length ? Math.round(donePlan / plan.length * 100) : 0
  const p1open   = backlog.filter(i => i.priority === 'P1' && !i.done).length

  /* ── Clientes ── */
  const clientesAtivos = clients.filter(c => c.ativo)
  const treinados      = clientesAtivos.filter(c => c.treinado)
  const enviamPlanilha = clientesAtivos.filter(c => c.envia_planilha)
  const semSync        = clientesAtivos.filter(c => {
    const d = daysSince(c.ultima_sincronizacao)
    return d === null || d > 30
  })

  /* ── Prospects ── */
  const prospectsAtivos = prospects.filter(p => ATIVOS_STATUS.includes(p.status))
  const prospectsAlerta = prospectsAtivos.filter(p => (daysSince(p.data_ultimo_contato) || 0) >= 7)
  const convertidos     = prospects.filter(p => p.status === 'convertido')
  const convertidosMes  = convertidos.filter(p => {
    const d = new Date(p.data_ultimo_contato || p.createdAt)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  })

  /* ── MRR delta ── */
  const mrrDelta = mrrHistory.length >= 2 ? mrrHistory[0].mrr - mrrHistory[1].mrr : null

  const hasAlerts = prospectsAlerta.length > 0 || semSync.length > 0

  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '7px 10px',
    color: 'var(--text)', fontSize: 13, width: '100%'
  }

  const ROW = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, background: 'var(--gradient)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>Visão geral</h1>
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>Operação solo · {mesAtual()}</p>
        </div>
        {hasAlerts && (
          <div style={{ fontSize: 11, background: 'rgba(245,130,22,.12)', border: '1px solid rgba(245,130,22,.3)', borderRadius: 'var(--radius)', padding: '5px 10px', color: 'var(--accent)', fontWeight: 600 }}>
            ⚠ {prospectsAlerta.length + semSync.length} item{prospectsAlerta.length + semSync.length !== 1 ? 's' : ''} precisam de atenção
          </div>
        )}
      </div>

      {/* ── KPIs principais ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: editing ? 0 : 20 }}>
        <Card
          label="MRR" editable highlight
          value={metrics ? `R$ ${metrics.mrr.toLocaleString('pt-BR')}` : '—'}
          sub={
            mrrDelta !== null
              ? `${mrrDelta >= 0 ? '▲' : '▼'} R$ ${Math.abs(mrrDelta).toLocaleString('pt-BR')} vs anterior`
              : metrics ? `${metrics.clients} cliente${metrics.clients !== 1 ? 's' : ''}` : '—'
          }
          color={mrrDelta !== null ? (mrrDelta > 0 ? '#3EBD7C' : mrrDelta < 0 ? 'var(--red)' : 'var(--accent)') : 'var(--accent)'}
          onClick={() => setEditing(true)}
        />
        <Card
          label="TRL atual"
          value={trl ? `${trl.currentLevel}/9` : '—'}
          sub={trl ? `Nível ${trl.currentLevel} de maturidade` : '—'}
        />
        <Card
          label="Plano 30d"
          value={`${pct}%`}
          sub={`${donePlan}/${plan.length} tarefas concluídas`}
          color={pct >= 75 ? '#3EBD7C' : pct >= 40 ? 'var(--primary)' : 'var(--accent)'}
        />
        <Card
          label="P1 abertos"
          value={p1open}
          sub="Máxima prioridade"
          color={p1open > 0 ? 'var(--red)' : '#3EBD7C'}
          badge={p1open}
        />
      </div>

      {/* ── Formulário edição métricas ── */}
      {editing && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--primary)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20, marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: 'var(--primary)' }}>Atualizar métricas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Clientes ativos</div>
              <input type="number" min="0" value={form.clients}
                onChange={e => setForm(f => ({ ...f, clients: +e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>MRR total (R$)</div>
              <input type="number" min="0" value={form.mrr}
                onChange={e => setForm(f => ({ ...f, mrr: +e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Preço por cliente (R$)</div>
              <input type="number" min="0" value={form.pricePerClient}
                onChange={e => setForm(f => ({ ...f, pricePerClient: +e.target.value }))} style={inputStyle} />
            </div>
          </div>
          {form.clients > 0 && form.pricePerClient > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
              MRR calculado: <strong style={{ color: 'var(--accent)' }}>R$ {(form.clients * form.pricePerClient).toLocaleString('pt-BR')}</strong>
              {form.mrr !== form.clients * form.pricePerClient && (
                <span style={{ marginLeft: 8 }}>(difere do MRR manual — tiers ou descontos?)</span>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveMetrics} style={{ background: 'var(--gradient)', border: 'none', borderRadius: 'var(--radius)', padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Salvar</button>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── KPIs clientes & prospects ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Card
          label="Clientes ativos"
          value={clientesAtivos.length}
          sub={`${clients.length} total · ${treinados.length} treinados`}
          color="var(--primary)"
        />
        <Card
          label="Prospects"
          value={prospectsAtivos.length}
          sub={prospectsAlerta.length > 0
            ? `⚠ ${prospectsAlerta.length} sem contato 7d+`
            : `${convertidosMes.length} convertido${convertidosMes.length !== 1 ? 's' : ''} esse mês`}
          color={prospectsAlerta.length > 0 ? 'var(--accent)' : 'var(--text)'}
          badge={prospectsAlerta.length}
        />
        <Card
          label="Envia planilha"
          value={`${enviamPlanilha.length}/${clientesAtivos.length}`}
          sub={clientesAtivos.length === 0 ? '—'
            : enviamPlanilha.length === clientesAtivos.length
              ? '✓ Todos autônomos'
              : `${clientesAtivos.length - enviamPlanilha.length} precisam de ajuda`}
          color={clientesAtivos.length > 0 && enviamPlanilha.length === clientesAtivos.length ? '#3EBD7C' : 'var(--muted)'}
        />
        <Card
          label="Sem sync"
          value={semSync.length}
          sub={semSync.length === 0 ? '✓ Todos atualizados' : '+30 dias sem relatório'}
          color={semSync.length > 0 ? 'var(--red)' : '#3EBD7C'}
          badge={semSync.length}
        />
      </div>

      {/* ── Gráficos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
        <ListBox>
          <SectionHeader title="Evolução do MRR" />
          <MrrAreaChart data={mrrHistory} />
        </ListBox>
        <ListBox>
          <SectionHeader title="Funil de prospects" to="/prospects" />
          <ProspectFunnel prospects={prospects} />
        </ListBox>
      </div>

      {/* ── Painel de alertas ── */}
      {hasAlerts && (
        <div style={{ background: 'rgba(245,130,22,.06)', border: '1px solid rgba(245,130,22,.22)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>⚠ Atenção necessária</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {prospectsAlerta.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Prospects inativos</div>
                {prospectsAlerta.slice(0, 5).map(p => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <span>{p.nome}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{daysSince(p.data_ultimo_contato)}d</span>
                  </div>
                ))}
                <Link to="/prospects" style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', display: 'block', marginTop: 8 }}>Ir para Prospects →</Link>
              </div>
            )}
            {semSync.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Clientes sem sync</div>
                {semSync.slice(0, 5).map(c => (
                  <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <span>{c.empresa}</span>
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                      {c.ultima_sincronizacao ? `${daysSince(c.ultima_sincronizacao)}d` : 'nunca'}
                    </span>
                  </div>
                ))}
                <Link to="/clientes" style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', display: 'block', marginTop: 8 }}>Ir para Clientes →</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Backlog P1 & Próximas tarefas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
        <ListBox>
          <SectionHeader title="Backlog P1" to="/backlog" />
          {backlog.filter(i => i.priority === 'P1' && !i.done).length === 0
            ? <div style={{ color: '#3EBD7C', fontSize: 12, padding: '8px 0', fontWeight: 500 }}>✓ Nenhum P1 em aberto</div>
            : backlog.filter(i => i.priority === 'P1' && !i.done).slice(0, 5).map(i => (
              <div key={i._id} style={ROW}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', marginTop: 6, flexShrink: 0 }} />
                <span style={{ lineHeight: 1.4 }}>{i.title}</span>
              </div>
            ))
          }
        </ListBox>

        <ListBox>
          <SectionHeader title="Próximas tarefas" to="/plan" linkLabel="ver plano →" />
          {plan.filter(i => !i.done).length === 0
            ? <div style={{ color: '#3EBD7C', fontSize: 12, padding: '8px 0', fontWeight: 500 }}>✓ Plano concluído</div>
            : plan.filter(i => !i.done).slice(0, 5).map(i => (
              <div key={i._id} style={ROW}>
                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, marginTop: 4, flexShrink: 0, minWidth: 22 }}>S{i.week}</span>
                <span style={{ lineHeight: 1.4 }}>{i.title}</span>
              </div>
            ))
          }
        </ListBox>
      </div>

      {/* ── Histórico de MRR ── */}
      {mrrHistory.length > 1 && (
        <ListBox>
          <SectionHeader title="Histórico de MRR" />
          {mrrHistory.slice(0, 6).map((h, idx) => {
            const prev  = mrrHistory[idx + 1]
            const delta = prev ? h.mrr - prev.mrr : null
            return (
              <div key={h._id || idx} style={{ ...ROW, alignItems: 'center' }}>
                <span style={{ color: 'var(--muted)', flexShrink: 0, minWidth: 90, fontSize: 11 }}>
                  {new Date(h.registeredAt).toLocaleDateString('pt-BR')}
                </span>
                <span style={{ fontWeight: 600 }}>R$ {h.mrr.toLocaleString('pt-BR')}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 4 }}>{h.clients} cliente{h.clients !== 1 ? 's' : ''}</span>
                {delta !== null && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, flexShrink: 0, color: delta > 0 ? '#3EBD7C' : delta < 0 ? 'var(--red)' : 'var(--muted)' }}>
                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} R$ {Math.abs(delta).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            )
          })}
        </ListBox>
      )}
    </div>
  )
}
