const express           = require('express')
const auth              = require('../middleware/auth')
const { ServiceCategory, BenchmarkPage } = require('../models')

const benchmarkRouter    = express.Router()
const serviceCatRouter   = express.Router()

/* ═══════════════════════════════════════════
   BENCHMARK — frontend (requer auth)
═══════════════════════════════════════════ */

/* Lista todos os benchmarks gerados (sem o HTML) */
benchmarkRouter.get('/', auth, async (req, res) => {
  try {
    const pages = await BenchmarkPage.find({}, { html: 0 }).sort({ gerado_em: -1 })
    res.json(pages)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* Aciona o Workflow 3 no n8n */
benchmarkRouter.post('/gerar', auth, async (req, res) => {
  const { mes } = req.body
  if (!mes) return res.status(400).json({ error: 'mes obrigatório' })
  const url = process.env.N8N_WEBHOOK_BENCHMARK
  if (!url) return res.status(503).json({ error: 'Webhook n8n não configurado no servidor.' })
  try {
    const r = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mes })
    })
    const data = await r.json()
    res.status(r.ok ? 200 : 502).json(data)
  } catch (e) {
    res.status(502).json({ error: 'Falha ao chamar n8n: ' + e.message })
  }
})

/* Retorna a página HTML de um mês (URL: 06-2026 → DB: 06/2026) */
benchmarkRouter.get('/:mes', auth, async (req, res) => {
  try {
    const mes  = req.params.mes.replace(/-/g, '/')
    const page = await BenchmarkPage.findOne({ mes })
    if (!page) return res.status(404).json({ error: 'Benchmark não gerado para este mês' })
    res.json({ html: page.html, gerado_em: page.gerado_em, total_clientes: page.total_clientes })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ═══════════════════════════════════════════
   BENCHMARK — callback do n8n (sem auth)
═══════════════════════════════════════════ */

/* n8n chama este endpoint ao terminar de gerar o HTML */
benchmarkRouter.post('/', async (req, res) => {
  try {
    const { mes, html, total_clientes } = req.body
    if (!mes || !html) return res.status(400).json({ error: 'mes e html obrigatórios' })
    const page = await BenchmarkPage.findOneAndUpdate(
      { mes },
      { html, total_clientes: total_clientes || 0, gerado_em: new Date() },
      { upsert: true, new: true }
    )
    res.json({ ok: true, id: page._id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ═══════════════════════════════════════════
   SERVICE CATEGORIES — callback do n8n (sem auth)
═══════════════════════════════════════════ */

serviceCatRouter.get('/', async (req, res) => {
  try {
    const cats = await ServiceCategory.find({}, { nome_original: 1, categoria: 1, _id: 0 })
    res.json(cats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

serviceCatRouter.post('/', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body]
    if (!items.length) return res.json({ ok: true, upserted: 0 })
    const ops = items
      .filter(i => i.nome_original && i.categoria)
      .map(item => ({
        updateOne: {
          filter: { nome_original: item.nome_original },
          update: { $set: { categoria: item.categoria } },
          upsert: true
        }
      }))
    if (ops.length) await ServiceCategory.bulkWrite(ops, { ordered: false })
    res.json({ ok: true, upserted: ops.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = { benchmarkRouter, serviceCatRouter }
