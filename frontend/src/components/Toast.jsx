import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((msg, type = 'error', duration = 4500) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  const remove = (id) => setToasts(t => t.filter(x => x.id !== id))

  const COLORS = {
    error:   { bg:'rgba(248,81,73,.12)',  border:'rgba(248,81,73,.35)',  text:'#F85149' },
    success: { bg:'rgba(62,189,124,.12)', border:'rgba(62,189,124,.35)', text:'#3EBD7C' },
    info:    { bg:'rgba(88,166,255,.12)', border:'rgba(88,166,255,.35)', text:'#58A6FF' },
  }

  // Captura erros globais do api.js
  React.useEffect(() => {
    const handler = (e) => show(e.detail, 'error')
    window.addEventListener('api:error', handler)
    return () => window.removeEventListener('api:error', handler)
  }, [show])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:340 }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.error
          return (
            <div key={t.id} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:'var(--radius)', padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:10, backdropFilter:'blur(8px)', boxShadow:'0 4px 12px rgba(0,0,0,.3)', animation:'slideIn .2s ease' }}>
              <span style={{ flex:1, fontSize:13, color:c.text, lineHeight:1.4 }}>{t.msg}</span>
              <button onClick={() => remove(t.id)} style={{ background:'none', border:'none', color:c.text, cursor:'pointer', fontSize:16, lineHeight:1, padding:0, opacity:.7, flexShrink:0 }}>×</button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </ToastCtx.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
