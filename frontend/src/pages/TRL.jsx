import React, { useEffect, useState } from 'react'
import { api } from '../api'

const LEVELS = {
  1: { label:'TRL 1', name:'Princípios básicos', desc:'Princípios básicos observados e reportados. Pesquisa científica pura.' },
  2: { label:'TRL 2', name:'Conceito formulado', desc:'Conceito tecnológico e aplicação formulados. Ideia no papel.' },
  3: { label:'TRL 3', name:'Prova de conceito', desc:'Prova de conceito analítica e experimental. Primeiros testes.' },
  4: { label:'TRL 4', name:'Validado em lab', desc:'Componentes validados em ambiente de laboratório controlado.' },
  5: { label:'TRL 5', name:'Validado no campo', desc:'Componentes validados em ambiente relevante ao negócio.' },
  6: { label:'TRL 6', name:'Protótipo demonstrado', desc:'Protótipo do sistema demonstrado em ambiente relevante.' },
  7: { label:'TRL 7', name:'Protótipo operacional', desc:'Protótipo em ambiente operacional com clientes reais.' },
  8: { label:'TRL 8', name:'Sistema completo', desc:'Sistema completo, qualificado, documentado e escalável.' },
  9: { label:'TRL 9', name:'Missão plena', desc:'Sistema provado em operação plena — produto maduro.' },
}

const GRADIENT = 'linear-gradient(135deg, #F15BB5, #7B2CBF)'

export default function TRL() {
  const [state, setState] = useState(null)

  const load = () => api.trl.get().then(setState)
  useEffect(() => { load() }, [])

  const setLevel = async (l) => {
    const updated = { ...state, currentLevel: l }
    setState(updated)
    await api.trl.update(updated)
  }

  const toggleCriteria = async (idx) => {
    const updated = { ...state, criteria: state.criteria.map((c,i) => i===idx ? {...c,done:!c.done} : c) }
    setState(updated)
    await api.trl.update(updated)
  }

  if (!state) return <div style={{ color:'var(--muted)', padding:24 }}>Carregando...</div>

  const doneCriteria = state.criteria.filter(c => c.done).length
  const totalCriteria = state.criteria.length
  const pct = totalCriteria ? Math.round(doneCriteria / totalCriteria * 100) : 0
  const nextLevel = LEVELS[state.currentLevel + 1]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>Análise TRL</h1>
        <p style={{ fontSize:12, color:'var(--muted)' }}>Technology Readiness Level — eVOLUTA</p>
      </div>

      {/* Cards topo */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:28 }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px', borderLeft:'3px solid #F15BB5' }}>
          <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Nível atual</div>
          <div style={{ fontSize:36, fontWeight:800, background:GRADIENT, backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' }}>
            {state.currentLevel}
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{LEVELS[state.currentLevel]?.name}</div>
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
          <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Critérios atendidos</div>
          <div style={{ fontSize:36, fontWeight:800 }}>
            {doneCriteria}<span style={{ fontSize:16, color:'var(--muted)', fontWeight:400 }}>/{totalCriteria}</span>
          </div>
          <div style={{ marginTop:10, height:4, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:GRADIENT, transition:'width .4s' }} />
          </div>
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px', borderLeft:'3px solid #F58216' }}>
          <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Próxima meta</div>
          <div style={{ fontSize:36, fontWeight:800, color:'#F58216' }}>
            {state.currentLevel < 9 ? state.currentLevel + 1 : '✓'}
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
            {nextLevel ? nextLevel.name : 'Nível máximo atingido'}
          </div>
        </div>
      </div>

      {/* Escala TRL — todos os 9 níveis */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Escala de maturidade</span>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8 }}>
          {Object.entries(LEVELS).map(([lvl, info]) => {
            const n = +lvl
            const isCurrent = n === state.currentLevel
            const isDone = n < state.currentLevel
            const isNext = n === state.currentLevel + 1

            return (
              <button key={n} onClick={() => setLevel(n)} style={{
                textAlign:'left', cursor:'pointer',
                background: isCurrent ? 'transparent' : 'var(--surface)',
                backgroundImage: isCurrent ? GRADIENT : 'none',
                border: isNext ? '1px solid #F58216' : isCurrent ? 'none' : '1px solid var(--border)',
                borderRadius:'var(--radius)',
                padding:'10px 12px',
                opacity: n > state.currentLevel + 1 ? .5 : 1,
                transition:'all .2s',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight:700, color: isCurrent ? '#fff' : isNext ? '#F58216' : isDone ? '#3EBD7C' : 'var(--muted)' }}>
                    {info.label}
                  </span>
                  {isDone && <span style={{ fontSize:10, color:'#3EBD7C' }}>✓</span>}
                  {isCurrent && <span style={{ fontSize:10, color:'#fff', background:'rgba(255,255,255,.2)', padding:'1px 6px', borderRadius:4 }}>atual</span>}
                </div>
                <div style={{ fontSize:12, fontWeight:500, color: isCurrent ? '#fff' : 'var(--text)', marginBottom:2 }}>{info.name}</div>
                <div style={{ fontSize:11, color: isCurrent ? 'rgba(255,255,255,.75)' : 'var(--muted)', lineHeight:1.4 }}>{info.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Critérios de maturidade */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Critérios por nível</span>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>

        {state.criteria.map((c, idx) => (
          <div key={idx} style={{
            display:'flex', gap:10, alignItems:'flex-start',
            padding:'10px 14px', marginBottom:5,
            background:'var(--surface)', border:'1px solid var(--border)',
            borderLeft: `3px solid ${c.done ? '#3EBD7C' : c.level === state.currentLevel ? '#F15BB5' : 'var(--border)'}`,
            borderRadius:'var(--radius)',
            opacity: c.level > state.currentLevel + 1 ? .4 : 1
          }}>
            <input type="checkbox" checked={c.done} onChange={() => toggleCriteria(idx)}
              style={{ marginTop:3, accentColor:'#F15BB5', flexShrink:0, width:14, height:14 }} />
            <div style={{ flex:1 }}>
              <span style={{
                fontSize:10, padding:'1px 7px', borderRadius:4, marginRight:8, fontWeight:600,
                background: c.done ? '#3EBD7C22' : c.level === state.currentLevel ? '#F15BB522' : 'var(--surface2)',
                color: c.done ? '#3EBD7C' : c.level === state.currentLevel ? '#F15BB5' : 'var(--muted)',
                border: `1px solid ${c.done ? '#3EBD7C44' : c.level === state.currentLevel ? '#F15BB544' : 'transparent'}`
              }}>TRL {c.level}</span>
              <span style={{ fontSize:13, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--muted)' : 'var(--text)' }}>
                {c.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
