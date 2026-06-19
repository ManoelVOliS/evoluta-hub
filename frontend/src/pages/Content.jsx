import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { marked } from 'marked'

export default function Content() {
  const [files, setFiles]     = useState([])
  const [active, setActive]   = useState(null)
  const [content, setContent] = useState('')
  const [mode, setMode]       = useState('preview')
  const [newFile, setNewFile] = useState('')
  const [saved, setSaved]     = useState(false)

  const loadFiles = () => api.content.list().then(fs => { setFiles(fs); if (!active && fs.length) open(fs[0]) })
  useEffect(() => { loadFiles() }, [])

  const open = async (f) => {
    setActive(f)
    const res = await api.content.get(f)
    setContent(res.content || '')
    setMode('preview')
    setSaved(false)
  }

  const save = async () => {
    await api.content.save(active, content)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const create = async () => {
    const name = newFile.endsWith('.md') ? newFile : `${newFile}.md`
    if (!name || name === '.md') return
    await api.content.create(name, `# ${name.replace('.md','')}\n\n`)
    setNewFile('')
    await loadFiles()
    open(name)
  }

  const del = async (f) => {
    if (!confirm(`Deletar ${f}?`)) return
    await api.content.delete(f)
    setActive(null); setContent('')
    loadFiles()
  }

  return (
    <div style={{ display:'flex', gap:16, height:'calc(100vh - 100px)' }}>
      <div style={{ width:180, flexShrink:0 }}>
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Arquivos .md</div>
        {files.map(f => (
          <div key={f} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:'var(--radius)', background: active===f ? 'var(--surface2)' : 'transparent', cursor:'pointer', marginBottom:2 }}
            onClick={()=>open(f)}>
            <span style={{ fontSize:13, color: active===f ? 'var(--text)' : 'var(--muted)' }}>{f}</span>
            <button onClick={e=>{e.stopPropagation();del(f)}} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:12, opacity:.6, lineHeight:1 }}>×</button>
          </div>
        ))}
        <div style={{ marginTop:12, display:'flex', gap:4 }}>
          <input value={newFile} onChange={e=>setNewFile(e.target.value)} placeholder="novo.md"
            onKeyDown={e=>e.key==='Enter'&&create()}
            style={{ flex:1, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'5px 8px', color:'var(--text)', fontSize:12 }} />
          <button onClick={create} style={{ background:'var(--green)', border:'none', borderRadius:'var(--radius)', padding:'5px 8px', color:'#fff', cursor:'pointer', fontSize:12 }}>+</button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {active ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:500 }}>{active}</span>
              <div style={{ display:'flex', gap:8 }}>
                {saved && <span style={{ fontSize:12, color:'var(--green)' }}>Salvo</span>}
                <button onClick={()=>setMode(m=>m==='editor'?'preview':'editor')}
                  style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'5px 12px', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>
                  {mode === 'editor' ? 'Preview' : 'Editar'}
                </button>
                {mode === 'editor' && (
                  <button onClick={save} style={{ background:'var(--green)', border:'none', borderRadius:'var(--radius)', padding:'5px 12px', color:'#fff', cursor:'pointer', fontSize:12 }}>
                    Salvar
                  </button>
                )}
              </div>
            </div>

            {mode === 'editor' ? (
              <textarea value={content} onChange={e=>setContent(e.target.value)}
                style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:16, color:'var(--text)', fontSize:13, fontFamily:'monospace', resize:'none', lineHeight:1.6, outline:'none' }} />
            ) : (
              <div style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:20, overflow:'auto', lineHeight:1.7 }}
                dangerouslySetInnerHTML={{ __html: marked(content) }} />
            )}
          </>
        ) : (
          <div style={{ color:'var(--muted)', fontSize:13, marginTop:40, textAlign:'center' }}>Selecione um arquivo</div>
        )}
      </div>
    </div>
  )
}
