const router = require('express').Router()
const auth   = require('../middleware/auth')
const { Client, Report } = require('../models')

router.use(auth)

/* ── Resumo geral de relatórios ── */

router.get('/reports-summary', async (req, res) => {
  const [clients, reports] = await Promise.all([
    Client.find().sort({ empresa: 1 }),
    Report.find({}, { html: 0, numeros: 0, observacoes: 0 }).sort({ mes: -1 })
  ])
  const byClient = {}
  reports.forEach(r => {
    const key = r.clientId.toString()
    if (!byClient[key]) byClient[key] = []
    byClient[key].push(r)
  })
  res.json(clients.map(c => ({
    _id: c._id, empresa: c.empresa, ativo: c.ativo, motor: c.motor,
    reports: byClient[c._id.toString()] || []
  })))
})

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
  const { mes, html, numeros, tipo = 'mensal', periodo = null } = req.body
  if (!mes || !html) return res.status(400).json({ error: 'mes e html são obrigatórios' })
  const existing = await Report.findOne({ clientId: req.params.id, mes, tipo, periodo })
  if (existing) {
    existing.html = html
    if (numeros !== undefined) existing.numeros = numeros
    await existing.save()
    await Client.findByIdAndUpdate(req.params.id, { ultima_sincronizacao: new Date() })
    return res.json(existing)
  }
  const report = await Report.create({ clientId: req.params.id, mes, html, numeros: numeros || null, tipo, periodo })
  await Client.findByIdAndUpdate(req.params.id, { ultima_sincronizacao: new Date() })
  res.status(201).json(report)
})

router.get('/:id/reports/:rid', async (req, res) => {
  const report = await Report.findOne({ _id: req.params.rid, clientId: req.params.id })
  if (!report) return res.status(404).json({ error: 'Não encontrado' })
  res.json(report)
})

router.patch('/:id/reports/:rid/status', async (req, res) => {
  const { status } = req.body
  if (!['gerado','revisado','enviado'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' })
  }
  const update = { status }
  if (status === 'enviado') update.enviado_em = new Date()
  const report = await Report.findByIdAndUpdate(req.params.rid, update, { new: true })
  res.json(report)
})

router.put('/:id/reports/:rid', async (req, res) => {
  const { html, numeros, observacoes } = req.body
  if (!html) return res.status(400).json({ error: 'html é obrigatório' })
  const update = { html }
  if (numeros     !== undefined) update.numeros     = numeros
  if (observacoes !== undefined) update.observacoes = observacoes
  const report = await Report.findByIdAndUpdate(req.params.rid, update, { new: true })
  res.json(report)
})

router.delete('/:id/reports/:rid', async (req, res) => {
  await Report.findByIdAndDelete(req.params.rid)
  res.json({ ok: true })
})

module.exports = router
