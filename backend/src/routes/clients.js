const router = require('express').Router()
const auth   = require('../middleware/auth')
const { Client, Report } = require('../models')

router.use(auth)

/* ── Clientes ── */

router.get('/', async (req, res) => {
  const clients = await Client.find().sort({ createdAt: -1 })
  res.json(clients)
})

router.post('/', async (req, res) => {
  const client = await Client.create(req.body)
  res.status(201).json(client)
})

router.put('/:id', async (req, res) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(client)
})

router.delete('/:id', async (req, res) => {
  await Client.findByIdAndDelete(req.params.id)
  await Report.deleteMany({ clientId: req.params.id })
  res.json({ ok: true })
})

/* ── Relatórios por cliente ── */

router.get('/:id/reports', async (req, res) => {
  const reports = await Report.find({ clientId: req.params.id }, { html: 0 }).sort({ mes: -1 })
  res.json(reports)
})

router.post('/:id/reports', async (req, res) => {
  const { mes, html } = req.body
  if (!mes || !html) return res.status(400).json({ error: 'mes e html são obrigatórios' })
  const existing = await Report.findOne({ clientId: req.params.id, mes })
  if (existing) {
    existing.html = html; await existing.save(); return res.json(existing)
  }
  const report = await Report.create({ clientId: req.params.id, mes, html })
  res.status(201).json(report)
})

router.get('/:id/reports/:rid', async (req, res) => {
  const report = await Report.findOne({ _id: req.params.rid, clientId: req.params.id })
  if (!report) return res.status(404).json({ error: 'Não encontrado' })
  res.json(report)
})

router.delete('/:id/reports/:rid', async (req, res) => {
  await Report.findByIdAndDelete(req.params.rid)
  res.json({ ok: true })
})

/* ── Slot de integração com motores (futuro) ── */
// POST /api/clients/:id/sync  →  busca dados do motor e gera relatório
// router.post('/:id/sync', async (req, res) => { ... })

module.exports = router
