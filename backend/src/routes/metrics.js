const router = require('express').Router()
const auth = require('../middleware/auth')
const { Metrics } = require('../models')

router.use(auth)

router.get('/', async (req, res) => {
  let m = await Metrics.findOne()
  if (!m) m = await Metrics.create({ clients: 7, mrr: 840, pricePerClient: 120 })
  res.json(m)
})

router.put('/', async (req, res) => {
  let m = await Metrics.findOne()
  if (!m) m = new Metrics()
  const { clients, mrr, pricePerClient } = req.body
  if (clients !== undefined)        m.clients        = clients
  if (mrr !== undefined)            m.mrr            = mrr
  if (pricePerClient !== undefined) m.pricePerClient = pricePerClient
  m.updatedAt = new Date()
  await m.save()
  res.json(m)
})

module.exports = router
