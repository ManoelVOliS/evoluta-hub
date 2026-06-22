import React, { useEffect, useState, useRef } from 'react'
import { api } from '../api'
import { extrairPlanilhas, extrairMetricas, gerarRelatorioHTML } from '../services/n8n'

const MOTORS = ['CashBarber', 'Trink', 'AppBarber', 'Múltiplos', 'Outro']
const MOTOR_COLOR = { CashBarber:'#3EBD7C', Trink:'#58A6FF', AppBarber:'#F15BB5', Múltiplos:'#F58216', Outro:'#8B949E' }

const RPT_STATUS_COLOR = { gerado:'#8B949E', revisado:'#58A6FF', enviado:'#3EBD7C' }
const RPT_STATUS_NEXT  = { gerado:'revisado', revisado:'enviado', enviado:null }
const RPT_STATUS_LABEL = { gerado:'Gerado', revisado:'Revisado', enviado:'Enviado' }

const EMPTY_CLIENT = { empresa:'', cnpj:'', telefone:'', motor:'CashBarber', ativo:true, treinado:false, envia_planilha:false }

const REVIEW_CAMPOS = [
  { label:'Faturamento',   path:'financeiro.entrada',                tipo:'moeda'  },
  { label:'Despesas',      path:'financeiro.saida',                  tipo:'moeda'  },
  { label:'Comissões',     path:'financeiro.comissao_total',         tipo:'moeda'  },
  { label:'Lucro Real',    path:'financeiro.lucro_real',             tipo:'moeda'  },
  { label:'Retorno',       path:'clientes.base_total',               tipo:'numero' },
  { label:'Novos clientes',path:'clientes.novos_marco',              tipo:'numero' },
  { label:'Produtos',      path:'produtos.quantidade_total_vendida', tipo:'numero' },
  { label:'Mês',           path:'meta.mes_analisado',                tipo:'texto'  },
]
const getNumPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k] ?? '', obj)
const setNumPath = (obj, path, value) => {
  const keys = path.split('.'), clone = JSON.parse(JSON.stringify(obj || {}))
  let cur = clone
  for (let i = 0; i < keys.length - 1; i++) { if (!cur[keys[i]]) cur[keys[i]] = {}; cur = cur[keys[i]] }
  cur[keys[keys.length - 1]] = value
  return clone
}

const inputStyle = {
  background:'var(--surface2)', border:'1px solid var(--border)',
  borderRadius:'var(--radius)', padding:'8px 10px',
  color:'var(--text)', fontSize:13, width:'100%'
}

const MotorBadge = ({ motor }) => (
  <span style={{
    fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600,
    background: (MOTOR_COLOR[motor] || '#8B949E') + '22',
    color: MOTOR_COLOR[motor] || '#8B949E',
    border: `1px solid ${(MOTOR_COLOR[motor] || '#8B949E')}44`
  }}>{motor}</span>
)

// Etapas: idle → extraindo → extraido → gerando → salvo | erro
function SyncWizard({ client, onSaved }) {
  const [open,     setOpen]    = useState(false)
  const [step,     setStep]    = useState('idle')
  const [arquivos, setArquivos] = useState([])
  const [mes,      setMes]     = useState('')
  const [manuais,  setManuais] = useState([])  // [{metrica, valor}]
  const [numeros,  setNumeros] = useState(null)
  const [erro,     setErro]    = useState('')
  const dropRef = useRef()

  const reset = () => { setStep('idle'); setArquivos([]); setMes(''); setManuais([]); setNumeros(null); setErro('') }
  const close = () => { setOpen(false); reset() }

  const addArquivos = (files) => {
    const novos = Array.from(files).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name))
    if (!novos.length) return
    setArquivos(prev => {
      const nomes = new Set(prev.map(f => f.name))
      const merged = [...prev, ...novos.filter(f => !nomes.has(f.name))]
      // tenta detectar mês pelo primeiro arquivo que tiver
      if (!mes) {
        for (const f of merged) {
          const m = f.name.match(/(\d{2}[-_]?\d{4}|\d{4}[-_]?\d{2})/)
          if (m) { setMes(m[0].replace(/[-_]/g, '/')); break }
        }
      }
      return merged
    })
  }

  const removeArquivo = (nome) => setArquivos(prev => prev.filter(f => f.name !== nome))

  const addManual = () => setManuais(prev => [...prev, { metrica: '', valor: '' }])
  const updateManual = (i, field, val) => setManuais(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  const removeManual = (i) => setManuais(prev => prev.filter((_, idx) => idx !== i))

  const extrair = async () => {
    if (!arquivos.length || !mes.trim()) return
    setStep('extraindo'); setErro('')
    try {
      const dados = await extrairPlanilhas(arquivos, client.motor, manuais)
      const nums  = await extrairMetricas(client.motor, dados)
      setNumeros(nums)
      setStep('extraido')
    } catch(e) {
      setErro(e.message); setStep('erro')
    }
  }

  const gerar = async () => {
    setStep('gerando'); setErro('')
    try {
      const html = await gerarRelatorioHTML(numeros)
      await api.clients.reports.save(client._id, { mes: mes.trim(), html, numeros })
      setStep('salvo')
      onSaved()
    } catch(e) {
      setErro(e.message); setStep('erro')
    }
  }

  const motorColor = MOTOR_COLOR[client.motor] || '#8B949E'
  const podeExtrair = arquivos.length > 0 && mes.trim()

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{
        background:'var(--surface)', border:`1px solid ${open ? motorColor + '44' : 'var(--border)'}`,
        borderRadius:'var(--radius)', padding:14, transition:'border .2s'
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color: open ? motorColor : 'var(--muted)', marginBottom:2 }}>
              Sincronizar via {client.motor}
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', opacity:.7 }}>
              Envie as planilhas exportadas do motor para gerar o relatório automaticamente
            </div>
          </div>
          <button onClick={() => { setOpen(s => !s); if (open) reset() }} style={{
            background: open ? 'none' : 'var(--surface2)',
            border:`1px solid ${open ? 'var(--border)' : motorColor + '55'}`,
            borderRadius:'var(--radius)', padding:'6px 14px',
            color: open ? 'var(--muted)' : motorColor,
            cursor:'pointer', fontSize:12, fontWeight:500
          }}>
            {open ? 'Fechar' : 'Abrir'}
          </button>
        </div>

        {open && (
          <div style={{ marginTop:16 }}>

            {/* STEP: idle/erro — dropzone + manuais + mês */}
            {(step === 'idle' || step === 'erro') && (
              <div>
                {/* Dropzone múltiplos arquivos */}
                <div
                  ref={dropRef}
                  onDragOver={e => { e.preventDefault(); dropRef.current.style.borderColor = motorColor }}
                  onDragLeave={() => dropRef.current.style.borderColor = 'var(--border)'}
                  onDrop={e => { e.preventDefault(); addArquivos(e.dataTransfer.files); dropRef.current.style.borderColor = 'var(--border)' }}
                  style={{ border:'2px dashed var(--border)', borderRadius:'var(--radius)', padding:'20px 16px', textAlign:'center', marginBottom:10, transition:'border .2s', cursor:'pointer' }}
                  onClick={() => document.getElementById(`sync-input-${client._id}`).click()}
                >
                  <input
                    id={`sync-input-${client._id}`}
                    type="file" accept=".xlsx,.xls,.csv" multiple style={{ display:'none' }}
                    onChange={e => addArquivos(e.target.files)}
                  />
                  <div style={{ fontSize:13, color:'var(--muted)' }}>Arraste uma ou mais planilhas ou clique para selecionar</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:4, opacity:.7 }}>.xlsx · .xls · .csv · múltiplos arquivos aceitos</div>
                </div>

                {/* Lista de arquivos adicionados */}
                {arquivos.length > 0 && (
                  <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:4 }}>
                    {arquivos.map(f => (
                      <div key={f.name} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface2)', borderRadius:'var(--radius)', padding:'6px 10px', fontSize:12 }}>
                        <span style={{ color: motorColor, flexShrink:0 }}>▪</span>
                        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
                        <span style={{ color:'var(--muted)', flexShrink:0 }}>{(f.size/1024).toFixed(0)} KB</span>
                        <button onClick={() => removeArquivo(f.name)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:14, lineHeight:1, padding:'0 2px', flexShrink:0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Lançamentos manuais */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>Lançamentos manuais</span>
                    <div style={{ flex:1, height:1, background:'var(--border)' }} />
                    <button onClick={addManual} style={{
                      background:'none', border:`1px solid ${motorColor}55`,
                      borderRadius:'var(--radius)', padding:'3px 10px',
                      color: motorColor, cursor:'pointer', fontSize:11, fontWeight:600, flexShrink:0
                    }}>
                      + Adicionar linha
                    </button>
                  </div>

                  {manuais.length === 0 && (
                    <div style={{ fontSize:11, color:'var(--muted)', opacity:.6, paddingLeft:2 }}>
                      Dados que não constam na planilha. Ex: valores manuais de comissão, ajustes, etc.
                    </div>
                  )}

                  {manuais.map((m, i) => (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 140px auto', gap:6, marginBottom:6 }}>
                      <input
                        placeholder="Métrica (ex: Comissão extra)"
                        value={m.metrica}
                        onChange={e => updateManual(i, 'metrica', e.target.value)}
                        style={inputStyle}
                      />
                      <input
                        placeholder="Valor"
                        value={m.valor}
                        onChange={e => updateManual(i, 'valor', e.target.value)}
                        style={inputStyle}
                      />
                      <button onClick={() => removeManual(i)} style={{
                        background:'none', border:'1px solid var(--border)',
                        borderRadius:'var(--radius)', padding:'0 10px',
                        color:'var(--muted)', cursor:'pointer', fontSize:14
                      }}>×</button>
                    </div>
                  ))}
                </div>

                {/* Mês + botão extrair */}
                <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:140 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Mês de referência</div>
                    <input placeholder="ex: 06/2026" value={mes} onChange={e => setMes(e.target.value)} style={inputStyle} />
                  </div>
                  <button onClick={extrair} disabled={!podeExtrair} style={{
                    background: podeExtrair ? 'var(--gradient)' : 'var(--border)',
                    border:'none', borderRadius:'var(--radius)', padding:'8px 18px',
                    color:'#fff', cursor: podeExtrair ? 'pointer' : 'not-allowed', fontSize:13, fontWeight:500, whiteSpace:'nowrap'
                  }}>
                    Extrair dados →
                  </button>
                </div>

                {step === 'erro' && (
                  <div style={{ marginTop:10, fontSize:12, color:'var(--red)', padding:'8px 10px', background:'rgba(248,81,73,.1)', borderRadius:'var(--radius)' }}>
                    {erro}
                  </div>
                )}
              </div>
            )}

            {/* STEP: extraindo */}
            {step === 'extraindo' && (
              <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:13 }}>
                Lendo {arquivos.length} arquivo{arquivos.length !== 1 ? 's' : ''} e enviando para análise...
              </div>
            )}

            {/* STEP: extraido — revisão editável dos dados */}
            {step === 'extraido' && numeros && (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#3EBD7C' }}>✓ Dados extraídos — revise e corrija antes de gerar</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>
                    {arquivos.length} arquivo{arquivos.length !== 1 ? 's' : ''}
                    {manuais.filter(m => m.metrica).length > 0 && ` + ${manuais.filter(m => m.metrica).length} manual`}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:8, marginBottom:16 }}>
                  {REVIEW_CAMPOS.map(campo => (
                    <div key={campo.path} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'10px 12px' }}>
                      <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>{campo.label}</div>
                      <input
                        type={campo.tipo === 'texto' ? 'text' : 'number'}
                        value={getNumPath(numeros, campo.path)}
                        onChange={e => setNumeros(prev => setNumPath(prev, campo.path, campo.tipo === 'texto' ? e.target.value : +e.target.value))}
                        style={{ background:'transparent', border:'none', borderBottom:`1px solid ${motorColor}55`, outline:'none', width:'100%', fontSize:15, fontWeight:700, color:'var(--text)', padding:'2px 0' }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button onClick={gerar} style={{ background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'8px 18px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500 }}>
                    Gerar relatório →
                  </button>
                  <button onClick={reset} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 14px', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>
                    Recomeçar
                  </button>
                </div>
              </div>
            )}

            {/* STEP: gerando */}
            {step === 'gerando' && (
              <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:13 }}>
                Gerando relatório via IA...
              </div>
            )}

            {/* STEP: salvo */}
            {step === 'salvo' && (
              <div style={{ textAlign:'center', padding:'24px 0' }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#3EBD7C', marginBottom:8 }}>✓ Relatório {mes} salvo!</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16 }}>Aparece na lista de relatórios abaixo.</div>
                <button onClick={close} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'7px 16px', color:'var(--text)', cursor:'pointer', fontSize:12 }}>
                  Fechar
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

const CAMPOS = [
  { secao:'Financeiro', path:'financeiro.entrada',                label:'Faturamento Bruto', tipo:'moeda'  },
  { secao:'Financeiro', path:'financeiro.saida',                  label:'Despesas / Saída',  tipo:'moeda'  },
  { secao:'Financeiro', path:'financeiro.comissao_total',         label:'Comissões Pagas',   tipo:'moeda'  },
  { secao:'Financeiro', path:'financeiro.lucro_real',             label:'Lucro Real',        tipo:'moeda'  },
  { secao:'Clientes',   path:'clientes.base_total',               label:'Retorno de Clientes', tipo:'numero' },
  { secao:'Clientes',   path:'clientes.novos_marco',              label:'Novos Clientes',    tipo:'numero' },
  { secao:'Produtos',   path:'produtos.quantidade_total_vendida', label:'Itens Vendidos',    tipo:'numero' },
  { secao:'Meta',       path:'meta.mes_analisado',                label:'Mês analisado',     tipo:'texto'  },
]
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k] ?? '', obj)
const setPath = (obj, path, value) => {
  const keys  = path.split('.')
  const clone = JSON.parse(JSON.stringify(obj || {}))
  let cur = clone
  for (let i = 0; i < keys.length - 1; i++) { if (!cur[keys[i]]) cur[keys[i]] = {}; cur = cur[keys[i]] }
  cur[keys[keys.length - 1]] = value
  return clone
}

function EditReportModal({ clientId, report, onClose, onSaved }) {
  const [numeros,     setNumeros]     = useState(report.numeros     || {})
  const [observacoes, setObservacoes] = useState(report.observacoes || '')
  const [previewHtml, setPreviewHtml] = useState(report.html        || '')
  const [previewing,  setPreviewing]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [erro,        setErro]        = useState('')

  const secoes = [...new Set(CAMPOS.map(c => c.secao))]
  const upd    = (path, val) => setNumeros(prev => setPath(prev, path, val))

  const doPreview = async () => {
    setPreviewing(true); setErro('')
    try { setPreviewHtml(await gerarRelatorioHTML(numeros)) }
    catch (e) { setErro(e.message) }
    setPreviewing(false)
  }

  const doSave = async () => {
    setSaving(true); setErro('')
    try {
      const html = previewHtml || await gerarRelatorioHTML(numeros)
      await api.clients.reports.update(clientId, report._id, { html, numeros, observacoes })
      onSaved(); onClose()
    } catch (e) { setErro(e.message) }
    setSaving(false)
  }

  const inputS = { background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'7px 10px', color:'var(--text)', fontSize:13, width:'100%' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', width:'100%', maxWidth:980, maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

        {/* Header do modal */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>Editar relatório · {report.mes}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Ajuste os dados e clique em Salvar para regenerar o HTML via IA.</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:22, lineHeight:1, padding:'0 4px' }}>×</button>
        </div>

        {/* Corpo: campos | preview */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Painel esquerdo — campos editáveis */}
          <div style={{ width:320, flexShrink:0, padding:'16px 20px', overflowY:'auto', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:0 }}>
            {secoes.map(secao => (
              <div key={secao} style={{ marginBottom:18 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>{secao}</div>
                {CAMPOS.filter(c => c.secao === secao).map(campo => (
                  <div key={campo.path} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>{campo.label}</div>
                    <input
                      type={campo.tipo === 'texto' ? 'text' : 'number'}
                      value={getPath(numeros, campo.path)}
                      onChange={e => upd(campo.path, campo.tipo === 'texto' ? e.target.value : +e.target.value)}
                      style={inputS}
                    />
                  </div>
                ))}
              </div>
            ))}

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Observações</div>
              <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
                placeholder="Notas internas sobre este relatório..."
                rows={4} style={{ ...inputS, resize:'vertical' }} />
            </div>

            {erro && <div style={{ fontSize:12, color:'var(--red)', padding:'8px 10px', background:'rgba(248,81,73,.1)', borderRadius:'var(--radius)', marginBottom:12 }}>{erro}</div>}

            <div style={{ display:'flex', gap:8, marginTop:'auto', paddingTop:8 }}>
              <button onClick={doPreview} disabled={previewing} style={{ flex:1, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 10px', color:'var(--muted)', cursor: previewing ? 'not-allowed' : 'pointer', fontSize:12 }}>
                {previewing ? 'Gerando...' : '▶ Preview'}
              </button>
              <button onClick={doSave} disabled={saving} style={{ flex:1, background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'8px 10px', color:'#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize:12, fontWeight:500 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Painel direito — iframe de preview */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#fff', overflow:'hidden' }}>
            {previewHtml ? (
              <iframe srcDoc={previewHtml} style={{ flex:1, border:'none', width:'100%' }} title="preview" />
            ) : (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#999', fontSize:13, flexDirection:'column', gap:8 }}>
                <span style={{ fontSize:32 }}>▶</span>
                Clique em Preview para ver o relatório atualizado
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportsPanel({ client, onBack }) {
  const [reports, setReports]   = useState([])
  const [showAdd, setShowAdd]   = useState(false)
  const [mes, setMes]           = useState('')
  const [html, setHtml]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [viewing,   setViewing]  = useState(null)
  const [editModal, setEditModal] = useState(null)

  const load = () => api.clients.reports.list(client._id).then(setReports)
  useEffect(() => { load() }, [client._id])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setHtml(ev.target.result)
    reader.readAsText(file)
    if (!mes) {
      const m = file.name.match(/(\d{2}[-_]?\d{4}|\d{4}[-_]?\d{2})/)
      if (m) setMes(m[0].replace(/[-_]/g, '/'))
    }
  }

  const save = async () => {
    if (!mes.trim() || !html.trim()) return
    setLoading(true)
    await api.clients.reports.save(client._id, { mes: mes.trim(), html })
    setMes(''); setHtml(''); setShowAdd(false); load()
    setLoading(false)
  }

  const viewReport = async (r) => {
    const full = await api.clients.reports.get(client._id, r._id)
    const blob = new Blob([full.html], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  const del = async (r) => {
    if (!confirm(`Remover relatório ${r.mes}?`)) return
    await api.clients.reports.delete(client._id, r._id)
    load()
  }

  const updateStatus = async (r, status) => {
    await api.clients.reports.status(client._id, r._id, status)
    load()
  }

  const openEdit = async (r) => {
    const full = await api.clients.reports.get(client._id, r._id)
    setEditModal({ ...r, numeros: full.numeros || {}, observacoes: full.observacoes || '', html: full.html || '' })
  }

  return (
    <>
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'5px 12px', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>
          ← Voltar
        </button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:16, fontWeight:700, background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' }}>
            {client.empresa}
          </h1>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:3 }}>
            <MotorBadge motor={client.motor} />
            {client.telefone && <span style={{ fontSize:11, color:'var(--muted)' }}>{client.telefone}</span>}
            {client.cnpj && <span style={{ fontSize:11, color:'var(--muted)' }}>{client.cnpj}</span>}
          </div>
        </div>
        <button onClick={() => setShowAdd(s => !s)} style={{
          background:'var(--gradient)', border:'none', borderRadius:'var(--radius)',
          padding:'7px 14px', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:500
        }}>
          + Relatório
        </button>
      </div>

      <SyncWizard client={client} onSaved={() => load()} />

      {/* Form upload */}
      {showAdd && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16, marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--primary)', marginBottom:12 }}>Adicionar relatório</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Mês de referência</div>
              <input placeholder="ex: 06/2026" value={mes} onChange={e => setMes(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Arquivo .html</div>
              <label style={{ ...inputStyle, display:'block', cursor:'pointer', padding:'7px 10px' }}>
                {html ? '✓ Arquivo carregado' : 'Escolher arquivo .html'}
                <input type="file" accept=".html,.htm" onChange={handleFile} style={{ display:'none' }} />
              </label>
            </div>
          </div>
          {!html && (
            <textarea
              placeholder="Ou cole o HTML do relatório aqui..."
              value={html}
              onChange={e => setHtml(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize:'vertical', marginBottom:10 }}
            />
          )}
          {html && (
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:10, padding:'6px 10px', background:'var(--surface2)', borderRadius:'var(--radius)' }}>
              {(html.length / 1024).toFixed(1)} KB carregados
              <button onClick={() => setHtml('')} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:11, marginLeft:8 }}>remover</button>
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={save} disabled={!mes || !html || loading} style={{
              background: mes && html ? 'var(--gradient)' : 'var(--border)',
              border:'none', borderRadius:'var(--radius)', padding:'7px 16px',
              color:'#fff', cursor: mes && html ? 'pointer' : 'not-allowed', fontSize:13, fontWeight:500
            }}>
              {loading ? 'Salvando...' : 'Salvar relatório'}
            </button>
            <button onClick={() => { setShowAdd(false); setMes(''); setHtml('') }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'7px 14px', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de relatórios */}
      {reports.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--muted)', fontSize:13 }}>
          Nenhum relatório ainda.<br />
          <span style={{ fontSize:11, opacity:.7 }}>Adicione o primeiro relatório com o botão acima.</span>
        </div>
      ) : (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>
              {reports.length} relatório{reports.length !== 1 ? 's' : ''}
            </span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
            {reports.map(r => {
              const rStatus = r.status || 'gerado'
              const rNext   = RPT_STATUS_NEXT[rStatus]
              return (
                <div key={r._id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <div style={{ fontSize:14, fontWeight:700 }}>{r.mes}</div>
                    <span style={{
                      fontSize:9, padding:'2px 7px', borderRadius:4, fontWeight:600, flexShrink:0,
                      background: RPT_STATUS_COLOR[rStatus] + '22',
                      color: RPT_STATUS_COLOR[rStatus],
                      border:`1px solid ${RPT_STATUS_COLOR[rStatus]}44`
                    }}>{RPT_STATUS_LABEL[rStatus]}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                    {r.enviado_em && <span style={{ marginLeft:8 }}>· Enviado {new Date(r.enviado_em).toLocaleDateString('pt-BR')}</span>}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => viewReport(r)} style={{
                      flex:1, background:'var(--gradient)', border:'none', borderRadius:'var(--radius)',
                      padding:'6px 10px', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:500
                    }}>
                      Visualizar
                    </button>
                    <button onClick={() => openEdit(r)} title="Editar HTML" style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'6px 8px', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>✎</button>
                    {rNext && (
                      <button onClick={() => updateStatus(r, rNext)} title={`Marcar como ${rNext}`} style={{
                        background:'var(--surface2)', border:`1px solid ${RPT_STATUS_COLOR[rNext]}55`,
                        borderRadius:'var(--radius)', padding:'6px 10px',
                        color: RPT_STATUS_COLOR[rNext], cursor:'pointer', fontSize:11, fontWeight:500, whiteSpace:'nowrap'
                      }}>→ {RPT_STATUS_LABEL[rNext]}</button>
                    )}
                    <button onClick={() => del(r)} style={{
                      background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)',
                      padding:'6px 8px', color:'var(--muted)', cursor:'pointer', fontSize:12
                    }}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
    {editModal && (
      <EditReportModal
        clientId={client._id}
        report={editModal}
        onClose={() => setEditModal(null)}
        onSaved={() => { load(); setEditModal(null) }}
      />
    )}
    </>
  )
}

export default function Clientes() {
  const [clients, setClients]   = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY_CLIENT)
  const [search, setSearch]     = useState('')

  const load = () => api.clients.list().then(setClients)
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.empresa.trim()) return
    if (editing) await api.clients.update(editing, form)
    else await api.clients.create(form)
    setForm(EMPTY_CLIENT); setEditing(null); setShowForm(false); load()
  }

  const edit = (c) => {
    setForm({ empresa:c.empresa, cnpj:c.cnpj, telefone:c.telefone, motor:c.motor, ativo:c.ativo, treinado:c.treinado||false, envia_planilha:c.envia_planilha||false })
    setEditing(c._id); setShowForm(true)
  }

  const del = async (c) => {
    if (!confirm(`Remover ${c.empresa} e todos os relatórios?`)) return
    await api.clients.delete(c._id)
    if (selected?._id === c._id) setSelected(null)
    load()
  }

  const shown = clients.filter(c => c.empresa.toLowerCase().includes(search.toLowerCase()))
  const ativos   = shown.filter(c => c.ativo)
  const inativos = shown.filter(c => !c.ativo)

  if (selected) {
    const fresh = clients.find(c => c._id === selected._id) || selected
    return <ReportsPanel client={fresh} onBack={() => setSelected(null)} />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, marginBottom:2, background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' }}>Clientes</h1>
          <p style={{ fontSize:12, color:'var(--muted)' }}>{clients.filter(c=>c.ativo).length} ativo{clients.filter(c=>c.ativo).length !== 1 ? 's' : ''} · {clients.length} total</p>
        </div>
        <button onClick={() => { setForm(EMPTY_CLIENT); setEditing(null); setShowForm(s => !s) }} style={{
          background:'var(--gradient)', border:'none', borderRadius:'var(--radius)',
          padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500
        }}>
          + Novo cliente
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16, marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--primary)', marginBottom:12 }}>
            {editing ? 'Editar cliente' : 'Novo cliente'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:8, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Empresa *</div>
              <input placeholder="Nome da empresa" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa:e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Motor *</div>
              <select value={form.motor} onChange={e => setForm(f => ({ ...f, motor:e.target.value }))} style={inputStyle}>
                {MOTORS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>CNPJ <span style={{ opacity:.6 }}>(opcional)</span></div>
              <input placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj:e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Telefone <span style={{ opacity:.6 }}>(opcional)</span></div>
              <input placeholder="(81) 99999-9999" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone:e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:12 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--muted)', cursor:'pointer' }}>
              <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo:e.target.checked }))} style={{ accentColor:'var(--primary)' }} />
              Ativo
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--muted)', cursor:'pointer' }}>
              <input type="checkbox" checked={form.treinado||false} onChange={e => setForm(f => ({ ...f, treinado:e.target.checked }))} style={{ accentColor:'var(--primary)' }} />
              Treinado
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--muted)', cursor:'pointer' }}>
              <input type="checkbox" checked={form.envia_planilha||false} onChange={e => setForm(f => ({ ...f, envia_planilha:e.target.checked }))} style={{ accentColor:'var(--primary)' }} />
              Envia planilha
            </label>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={save} style={{ background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500 }}>
              {editing ? 'Salvar edição' : 'Cadastrar'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_CLIENT) }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'7px 14px', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Busca */}
      <input
        placeholder="Buscar cliente..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom:20, maxWidth:300 }}
      />

      {/* Lista */}
      {clients.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 16px', color:'var(--muted)', fontSize:13 }}>
          Nenhum cliente cadastrado ainda.
        </div>
      ) : (
        <>
          {[{ label:'Ativos', list: ativos, color:'var(--primary)' }, { label:'Inativos', list: inativos, color:'var(--muted)' }]
            .filter(g => g.list.length > 0)
            .map(group => (
              <div key={group.label} style={{ marginBottom:28 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>
                    {group.label} ({group.list.length})
                  </span>
                  <div style={{ flex:1, height:1, background:'var(--border)' }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
                  {group.list.map(c => (
                    <div key={c._id} style={{
                      background:'var(--surface)', border:'1px solid var(--border)',
                      borderRadius:'var(--radius)', padding:'14px 16px',
                      borderLeft:`3px solid ${MOTOR_COLOR[c.motor] || '#8B949E'}`,
                      opacity: c.ativo ? 1 : .6
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div style={{ fontSize:14, fontWeight:700, lineHeight:1.3 }}>{c.empresa}</div>
                        <MotorBadge motor={c.motor} />
                      </div>
                      {c.cnpj && <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>{c.cnpj}</div>}
                      {c.telefone && <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{c.telefone}</div>}
                      {(c.treinado || c.envia_planilha || c.ultima_sincronizacao) && (
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8, marginTop:4 }}>
                          {c.treinado       && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:'#3EBD7C22', color:'#3EBD7C', border:'1px solid #3EBD7C44' }}>Treinado</span>}
                          {c.envia_planilha && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:'#58A6FF22', color:'#58A6FF', border:'1px solid #58A6FF44' }}>Envia planilha</span>}
                          {c.ultima_sincronizacao && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:'var(--surface2)', color:'var(--muted)', border:'1px solid var(--border)' }}>Sync {new Date(c.ultima_sincronizacao).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:6, marginTop:10 }}>
                        <button onClick={() => setSelected(c)} style={{
                          flex:1, background:'var(--gradient)', border:'none', borderRadius:'var(--radius)',
                          padding:'6px 10px', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:500
                        }}>
                          Relatórios
                        </button>
                        <button onClick={() => edit(c)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'6px 8px', color:'var(--muted)', cursor:'pointer', fontSize:11 }}>✎</button>
                        <button onClick={() => del(c)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'6px 8px', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          }
        </>
      )}
    </div>
  )
}
