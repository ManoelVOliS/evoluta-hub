const router = require('express').Router()
const auth   = require('../middleware/auth')

router.use(auth)

const N8N_EXTRAIR   = process.env.N8N_WEBHOOK_EXTRAIR
const N8N_RELATORIO = process.env.N8N_WEBHOOK_RELATORIO

const proxyN8N = async (url, body, res) => {
  if (!url) return res.status(503).json({ error: 'Webhook n8n não configurado no servidor.' })
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await r.json()
  res.status(r.ok ? 200 : 502).json(data)
}

router.post('/extrair', async (req, res) => {
  try {
    await proxyN8N(N8N_EXTRAIR, req.body, res)
  } catch (e) {
    res.status(502).json({ error: 'Falha ao chamar n8n: ' + e.message })
  }
})

router.post('/relatorio', async (req, res) => {
  try {
    await proxyN8N(N8N_RELATORIO, req.body, res)
  } catch (e) {
    res.status(502).json({ error: 'Falha ao chamar n8n: ' + e.message })
  }
})

module.exports = router
