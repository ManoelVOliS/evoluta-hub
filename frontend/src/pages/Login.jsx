import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const inp = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '10px 14px',
  color: 'var(--text)',
  fontSize: 14,
  marginBottom: 12,
  outline: 'none',
}

export default function Login() {
  const [mode,  setMode]  = useState('admin')  // 'admin' | 'user'
  const [email, setEmail] = useState('')
  const [pw,    setPw]    = useState('')
  const [err,   setErr]   = useState('')
  const [loading, setLoading] = useState(false)
  const [info,  setInfo]  = useState(() => {
    const m = sessionStorage.getItem('auth_msg')
    if (m) sessionStorage.removeItem('auth_msg')
    return m || ''
  })
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      const payload = mode === 'admin' ? { password: pw } : { email, password: pw }
      const res = await api.login(payload)
      if (res?.token) {
        localStorage.setItem('token', res.token)
        localStorage.setItem('role', res.role || 'admin')
        if (res.clientId) localStorage.setItem('clientId', res.clientId)
        else localStorage.removeItem('clientId')
        nav(res.role === 'client' ? '/portal' : '/')
      } else {
        setErr(res?.error || 'Credenciais incorretas')
      }
    } catch {
      setErr('Erro ao conectar ao servidor')
    }
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)', padding:16, flex:1 }}>
      <div style={{ width:'100%', maxWidth:380, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'32px 24px' }}>
        <div style={{ background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent', fontSize:24, fontWeight:700, marginBottom:4, letterSpacing:-0.5 }}>
          eVOLUTA Hub
        </div>
        <div style={{ fontSize:13, color:'var(--muted)', marginBottom:24 }}>Painel de operação interna</div>

        {/* Seletor de modo */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--surface2)', borderRadius:'var(--radius)', padding:3 }}>
          {[['admin','Admin'], ['user','Cliente']].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setErr('') }} style={{
              flex:1, padding:'6px 0', border:'none', borderRadius:'var(--radius)',
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--muted)',
              cursor:'pointer', fontSize:13, fontWeight: mode === m ? 600 : 400,
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,.2)' : 'none',
              transition:'all .15s'
            }}>{label}</button>
          ))}
        </div>

        {info && (
          <div style={{ fontSize:12, color:'var(--accent)', marginBottom:16, padding:'8px 10px', background:'rgba(245,130,22,.1)', borderRadius:'var(--radius)', border:'1px solid rgba(245,130,22,.25)' }}>
            {info}
          </div>
        )}

        <form onSubmit={submit}>
          {mode === 'user' && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              style={inp}
              onFocus={e => e.target.style.borderColor='var(--primary)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />
          )}
          <input
            type="password"
            placeholder={mode === 'admin' ? 'Senha master' : 'Senha'}
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus={mode === 'admin'}
            style={inp}
            onFocus={e => e.target.style.borderColor='var(--primary)'}
            onBlur={e => e.target.style.borderColor='var(--border)'}
          />
          {err && (
            <div style={{ color:'var(--red)', fontSize:12, marginBottom:10, padding:'8px 10px', background:'rgba(248,81,73,.1)', borderRadius:'var(--radius)' }}>
              {err}
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            width:'100%', background:'var(--gradient)', border:'none',
            borderRadius:'var(--radius)', padding:'11px 16px', color:'#fff',
            fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer',
            fontSize:14, opacity: loading ? .7 : 1, transition:'opacity .2s'
          }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
