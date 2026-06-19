import React, { useState } from 'react'

const TAG_ALIASES = { técnico:'tech', tecnico:'tech', tech:'tech', operação:'ops', operacao:'ops', ops:'ops', negócio:'biz', negocio:'biz', biz:'biz', marketing:'mkt', mkt:'mkt' }
const PRIO_MAP = { p1:'P1', p2:'P2', p3:'P3', '1':'P1', '2':'P2', '3':'P3' }
const WEEK_MAP = { '1':1, '2':2, '3':3, '4':4, 'semana1':1, 'semana2':2, 'semana3':3, 'semana4':4 }

function parseTag(str) {
  return TAG_ALIASES[(str||'').toLowerCase().trim()] || 'ops'
}

export function parsePlanMd(text) {
  const items = []
  let currentWeek = 1
  const lines = text.split('\n')
  let pendingDesc = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Header de semana: ## Semana 1 ou ## Semana 1 — Título
    if (/^##\s+semana\s*(\d)/i.test(line)) {
      const m = line.match(/semana\s*(\d)/i)
      currentWeek = parseInt(m[1]) || 1
      pendingDesc = null
      continue
    }

    // Item: - Título | tag
    if (/^\s*-\s+/.test(line)) {
      if (pendingDesc) items[items.length - 1].description = pendingDesc.trim()
      const content = line.replace(/^\s*-\s*\[[ x]?\]\s*/, '').replace(/^\s*-\s*/, '')
      const parts = content.split('|')
      const title = parts[0].trim()
      const tag   = parseTag(parts[1])
      items.push({ week: currentWeek, title, tag, description: '' })
      pendingDesc = null
      continue
    }

    // Linha de descrição (indentada ou continuação)
    if (items.length && /^\s{2,}/.test(line) && line.trim()) {
      if (!items[items.length - 1].description) {
        items[items.length - 1].description = line.trim()
      }
      continue
    }
  }

  return items.filter(i => i.title)
}

export function parseBacklogMd(text) {
  const items = []
  let currentPrio = 'P2'
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Header de prioridade: ## P1 ou ## P1 — Crítico
    if (/^##\s+p[123]/i.test(line)) {
      const m = line.match(/p([123])/i)
      currentPrio = PRIO_MAP[`p${m[1]}`] || 'P2'
      continue
    }

    // Item: - Título | tag
    if (/^\s*-\s+/.test(line)) {
      const content = line.replace(/^\s*-\s*\[[ x]?\]\s*/, '').replace(/^\s*-\s*/, '')
      const parts = content.split('|')
      const title = parts[0].trim()
      const tag   = parseTag(parts[1])
      const desc  = (lines[i+1] && /^\s{2,}/.test(lines[i+1])) ? lines[i+1].trim() : ''
      if (desc) i++
      items.push({ priority: currentPrio, title, tag, description: desc })
    }
  }

  return items.filter(i => i.title)
}

export default function ImportMd({ type, onImport }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const parse = () => {
    setError('')
    const items = type === 'plan' ? parsePlanMd(text) : parseBacklogMd(text)
    if (!items.length) { setError('Nenhum item encontrado. Verifique o formato do arquivo.'); return }
    setPreview(items)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setText(ev.target.result); setPreview([]) }
    reader.readAsText(file)
  }

  const doImport = async () => {
    if (!preview.length) return
    setLoading(true)
    try {
      await onImport(preview)
      setText(''); setPreview([]); setOpen(false)
    } catch(e) {
      setError('Erro ao importar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 10px', color:'var(--text)', fontSize:13 }

  const example = type === 'plan'
    ? `## Semana 1\n- Criar planilha de controle | ops\n  Nome, software, status.\n\n## Semana 2\n- Gravar vídeo AppBarber | ops`
    : `## P1\n- Congelar schema JSON | tech\n  Definir estrutura final.\n\n## P2\n- Planilha de clientes | ops`

  return (
    <div style={{ marginBottom:16 }}>
      <button onClick={() => setOpen(s => !s)} style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:'var(--radius)', padding:'7px 14px',
        color:'var(--muted)', cursor:'pointer', fontSize:13,
        display:'flex', alignItems:'center', gap:6
      }}>
        <span>↑</span> Importar .md
      </button>

      {open && (
        <div style={{ marginTop:10, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16 }}>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>
            <strong style={{ color:'var(--text)' }}>Formato esperado:</strong>
            <pre style={{ marginTop:6, background:'var(--surface2)', padding:'8px 10px', borderRadius:'var(--radius)', fontSize:11, overflowX:'auto', lineHeight:1.6 }}>
              {example}
            </pre>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center', flexWrap:'wrap' }}>
            <label style={{ ...inputStyle, padding:'7px 14px', cursor:'pointer', flexShrink:0 }}>
              Escolher arquivo .md
              <input type="file" accept=".md,.txt" onChange={handleFile} style={{ display:'none' }} />
            </label>
            <span style={{ fontSize:11, color:'var(--muted)' }}>ou cole o conteúdo abaixo</span>
          </div>

          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setPreview([]) }}
            placeholder={`Cole o conteúdo .md aqui...\n\n${example}`}
            rows={6}
            style={{ ...inputStyle, width:'100%', resize:'vertical', marginBottom:10, lineHeight:1.5 }}
          />

          {error && <div style={{ fontSize:12, color:'var(--red)', marginBottom:8, padding:'6px 10px', background:'rgba(248,81,73,.1)', borderRadius:'var(--radius)' }}>{error}</div>}

          {!preview.length ? (
            <button onClick={parse} disabled={!text.trim()} style={{
              background: text.trim() ? 'var(--surface2)' : 'var(--border)',
              border:'1px solid var(--border)', borderRadius:'var(--radius)',
              padding:'7px 14px', color: text.trim() ? 'var(--text)' : 'var(--muted)',
              cursor: text.trim() ? 'pointer' : 'not-allowed', fontSize:13
            }}>
              Pré-visualizar ({text.trim() ? '?' : '0'} itens)
            </button>
          ) : (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>
                <strong style={{ color:'#3EBD7C' }}>{preview.length} itens encontrados:</strong>
              </div>
              <div style={{ maxHeight:200, overflowY:'auto', marginBottom:12 }}>
                {preview.map((item, i) => (
                  <div key={i} style={{ fontSize:12, padding:'6px 10px', background:'var(--surface2)', borderRadius:'var(--radius)', marginBottom:4, display:'flex', gap:8 }}>
                    <span style={{ color:'var(--muted)', flexShrink:0 }}>
                      {type === 'plan' ? `S${item.week}` : item.priority}
                    </span>
                    <span>{item.title}</span>
                    <span style={{ color:'var(--muted)', marginLeft:'auto', flexShrink:0 }}>{item.tag}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={doImport} disabled={loading} style={{
                  background:'var(--gradient)', border:'none', borderRadius:'var(--radius)',
                  padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500
                }}>
                  {loading ? 'Importando...' : `Importar ${preview.length} itens`}
                </button>
                <button onClick={() => setPreview([])} style={{
                  background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)',
                  padding:'7px 14px', color:'var(--muted)', cursor:'pointer', fontSize:13
                }}>Voltar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
