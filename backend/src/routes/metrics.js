const router = require('express').Router()
const auth = require('../middleware/auth')
const { Metrics, MetricsHistory } = require('../models')

router.use(auth)

router.get('/', async (req, res) => {
  let m = await Metrics.findOne()
  if (!m) m = await Metrics.create({ clients: 7, mrr: 840, pricePerClient: 120 })
  res.json(m)
})

router.get('/history', async (req, res) => {
  const history = await MetricsHistory.find().sort({ registeredAt: -1 }).limit(12)
  res.json(history)
})

router.put('/', async (req, res) => {
  let m = await Metrics.findOne()
  if (!m) m = new Metrics()
  const { clients, mrr, pricePerClient, planStartDate } = req.body
  if (clients !== undefined)        m.clients        = clients
  if (mrr !== undefined)            m.mrr            = mrr
  if (pricePerClient !== undefined) m.pricePerClient = pricePerClient
  if (planStartDate  !== undefined) m.planStartDate  = planStartDate || null
  const changed = m.mrr !== (mrr ?? m.mrr) || m.clients !== (clients ?? m.clients)
  m.updatedAt = new Date()
  await m.save()
  if (changed) {
    await MetricsHistory.create({ clients: m.clients, mrr: m.mrr, pricePerClient: m.pricePerClient })
  }
  res.json(m)
})

module.exports = router
