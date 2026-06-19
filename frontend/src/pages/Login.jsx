import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    const res = await api.login(pw)
    if (res?.token) { localStorage.setItem('token', res.token); nav('/') }
    else setErr('Senha incorreta')
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)', padding:'16px' }}>
      <div style={{ width:'100%', maxWidth:380, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'32px 24px' }}>
        <div style={{ background:'var(--gradient)', backgroundClip:'text', WebkitBackgroundClip:'text', color:'transparent', fontSize:24, fontWeight:700, marginBottom:8, letterSpacing:-0.5 }}>
          eVOLUTA Hub
        </div>
        <div style={{ fontSize:14, color:'var(--muted)', marginBottom:28 }}>Painel de operação interna</div>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Senha"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus
            style={{
              width:'100%',
              background:'var(--surface2)',
              border:'1px solid var(--border)',
              borderRadius:'var(--radius)',
              padding:'10px 14px',
              color:'var(--text)',
              fontSize:14,
              marginBottom:12,
              outline:'none',
              transition:'border .2s'
            }}
            onFocus={e => e.target.style.borderColor='var(--primary)'}
            onBlur={e => e.target.style.borderColor='var(--border)'}
          />
          {err && <div style={{ color:'var(--red)', fontSize:12, marginBottom:10, padding:'8px 10px', background:'rgba(248, 81, 73, 0.1)', borderRadius:'var(--radius)' }}>{err}</div>}
          <button
            type="submit"
            style={{
              width:'100%',
              background:'var(--gradient)',
              border:'none',
              borderRadius:'var(--radius)',
              padding:'11px 16px',
              color:'#fff',
              fontWeight:600,
              cursor:'pointer',
              fontSize:14,
              transition:'opacity .2s'
            }}
            onMouseEnter={e => e.target.style.opacity='0.9'}
            onMouseLeave={e => e.target.style.opacity='1'}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
