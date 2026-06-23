import React, { useEffect, useState } from 'react'
import { api } from '../api'

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const toMesApi  = (ym) => ym.split('-').reverse().join('/')  // "2026-06" → "06/2026"
const toMesUrl  = (ym) => ym.split('-').reverse().join('-')  // "2026-06" → "06-2026"
const toDisplay = (mes) => mes                               // "06/2026" já está no formato certo

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Benchmark() {
  const [benchmarks, setBenchmarks] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [mes,        setMes]        = useState(currentMonth())
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState(null)
  const [success,    setSuccess]    = useState(null)

  const load = () => {
    setLoading(true)
    api.benchmark.list()
      .then(setBenchmarks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const gerar = async () => {
    setError(null)
    setSuccess(null)
    setGenerating(true)
    try {
      const mesApi = toMesApi(mes)
      const data = await api.benchmark.gerar(mesApi)
      if (data?.error) throw new Error(data.error)
      setSuccess(`Benchmark de ${toDisplay(mesApi)} gerado com sucesso!`)
      load()
    } catch (e) {
      setError(e.message || 'Erro ao gerar benchmark')
    } finally {
      setGenerating(false)
    }
  }

  const visualizar = async (mesDb) => {
    const mesUrl = mesDb.replace(/\//g, '-')
    const data = await api.benchmark.get(mesUrl)
    if (data?.error) { alert(data.error); return }
    const win = window.open('', '_blank')
    win.document.write(data.html)
    win.document.close()
  }

  const jaGerado = benchmarks.some(b => b.mes === toMesApi(mes))

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2, background: 'var(--gradient)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Benchmark da Rede
        </h1>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Comparativo anonimizado entre todas as barbearias · W3
        </p>
      </div>

      {/* Painel de geração */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
          Gerar novo benchmark
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="month"
            value={mes}
            onChange={e => { setMes(e.target.value); setError(null); setSuccess(null) }}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              color: 'var(--text)', padding: '6px 10px', fontSize: 13,
              colorScheme: 'dark'
            }}
          />

          <button
            onClick={gerar}
            disabled={generating || !mes}
            style={{
              background: generating ? 'var(--surface2)' : 'var(--primary)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius)',
              padding: '7px 18px', fontSize: 13, fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? .7 : 1,
              display: 'flex', alignItems: 'center', gap: 7
            }}
          >
            {generating && (
              <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            )}
            {generating ? 'Gerando…' : jaGerado ? 'Regerado' : 'Gerar'}
          </button>

          {jaGerado && !generating && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Já existe um benchmark para este mês — será substituído
            </span>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 'var(--radius)', fontSize: 12, color: '#f87171' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(62,189,124,.1)', border: '1px solid rgba(62,189,124,.3)', borderRadius: 'var(--radius)', fontSize: 12, color: '#3EBD7C' }}>
            {success}
          </div>
        )}

        <p style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
          O W3 varre todos os snapshots do mês, classifica serviços via Gemini e gera o HTML. Pode levar 10–20 s.
        </p>
      </div>

      {/* Lista de benchmarks gerados */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          Histórico
        </p>

        {loading && (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando…</div>
        )}

        {!loading && benchmarks.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 13, fontStyle: 'italic' }}>
            Nenhum benchmark gerado ainda.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {benchmarks.map(b => (
            <div key={b._id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: '3px solid var(--primary)',
              borderRadius: 'var(--radius)', padding: '14px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  {toDisplay(b.mes)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {b.total_clientes} barbearia{b.total_clientes !== 1 ? 's' : ''} · gerado em {fmtDate(b.gerado_em)}
                </p>
              </div>

              <button
                onClick={() => visualizar(b.mes)}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text)',
                  padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Visualizar →
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
