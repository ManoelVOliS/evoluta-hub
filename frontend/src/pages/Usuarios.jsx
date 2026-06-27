import React, { useEffect, useState } from 'react'
import { api } from '../api'

const MOTORS = ['CashBarber', 'Trink', 'AppBarber', 'Múltiplos', 'Outro']

const inp = { background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 10px', color:'var(--text)', fontSize:13, width:'100%' }

const EMPTY = { email:'', password:'', nome:'', role:'client', clientId:'' }

export default function Usuarios() {
  const [users,    setUsers]    = useState([])
  const [clients,  setClients]  = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [editing,  setEditing]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState('')

  const load = () => Promise.all([api.users.list(), api.clients.list()]).then(([u, c]) => { setUsers(u || []); setClients(c || []) })
  useEffect(() => { load() }, [])

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.email) return setErro('Email obrigatório')
    if (!editing && !form.password) return setErro('Senha obrigatória')
    setLoading(true); setErro('')
    try {
      const data = { ...form, clientId: form.clientId || null }
      if (!data.password) delete data.password
      if (editing) await api.users.update(editing, data)
      else         await api.users.create(data)
      setForm(EMPTY); setEditing(null); setShowForm(false); load()
    } catch { setErro('Erro ao salvar') }
    setLoading(false)
  }

  const edit = (u) => {
    setForm({ email: u.email, password: '', nome: u.nome || '', role: u.role, clientId: u.clientId || '' })
    setEditing(u._id); setShowForm(true); setErro('')
  }

  const del = async (u) => {
    if (!confirm(`Remover usuário ${u.email}?`)) return
    await api.users.delete(u._id); load()
  }

  const cancel = () => { setShowForm(false); setForm(EMPTY); setEditing(null); setErro('') }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent' }}>Usuários</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Acesso ao portal de relatórios para clientes</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY); setErro('') }} style={{ background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500 }}>
          + Usuário
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:20, marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--primary)', marginBottom:16 }}>
            {editing ? 'Editar usuário' : 'Novo usuário'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Email *</div>
              <input type="email" value={form.email} onChange={e => upd('email', e.target.value)} style={inp} placeholder="email@barbearia.com" />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{editing ? 'Nova senha (deixe em branco pra manter)' : 'Senha *'}</div>
              <input type="password" value={form.password} onChange={e => upd('password', e.target.value)} style={inp} placeholder="••••••••" />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Nome</div>
              <input value={form.nome} onChange={e => upd('nome', e.target.value)} style={inp} placeholder="Nome do contato" />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Perfil</div>
              <select value={form.role} onChange={e => upd('role', e.target.value)} style={inp}>
                <option value="client">Cliente</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'client' && (
              <div>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Cliente vinculado</div>
                <select value={form.clientId} onChange={e => upd('clientId', e.target.value)} style={inp}>
                  <option value="">— nenhum —</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.empresa}</option>)}
                </select>
              </div>
            )}
          </div>
          {erro && <div style={{ fontSize:12, color:'var(--red)', marginBottom:10, padding:'6px 10px', background:'rgba(248,81,73,.1)', borderRadius:'var(--radius)' }}>{erro}</div>}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={save} disabled={loading} style={{ background:'var(--gradient)', border:'none', borderRadius:'var(--radius)', padding:'7px 16px', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:500 }}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={cancel} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'7px 14px', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {users.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--muted)', fontSize:13 }}>
          Nenhum usuário cadastrado.<br />
          <span style={{ fontSize:11, opacity:.7 }}>Crie usuários para dar acesso ao portal de relatórios aos clientes.</span>
        </div>
      ) : (
        <div style={{ display:'grid', gap:8 }}>
          {users.map(u => {
            const linked = clients.find(c => c._id === u.clientId || c._id === String(u.clientId))
            return (
              <div key={u._id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{u.nome || u.email}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                    {u.email}
                    {linked && <span style={{ marginLeft:8, color:'var(--primary)' }}>· {linked.empresa}</span>}
                  </div>
                </div>
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600, background: u.role === 'admin' ? 'rgba(88,166,255,.15)' : 'rgba(62,189,124,.15)', color: u.role === 'admin' ? '#58A6FF' : '#3EBD7C', border:`1px solid ${u.role === 'admin' ? '#58A6FF44' : '#3EBD7C44'}` }}>
                  {u.role}
                </span>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => edit(u)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'5px 10px', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>✎</button>
                  <button onClick={() => del(u)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'5px 10px', color:'var(--red)', cursor:'pointer', fontSize:12 }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
