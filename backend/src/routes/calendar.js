const router = require('express').Router()
const auth   = require('../middleware/auth')
const { CalEvent } = require('../models')

router.use(auth)

router.get('/', async (req, res) => {
  const { year, month } = req.query
  if (!year || !month) return res.json([])
  const start = new Date(+year, +month - 1, 1)
  const end   = new Date(+year, +month, 1)
  const events = await CalEvent.find({ date: { $gte: start, $lt: end } }).sort({ date: 1 })
  res.json(events)
})

router.post('/', async (req, res) => {
  const event = await CalEvent.create(req.body)
  res.status(201).json(event)
})

router.put('/:id', async (req, res) => {
  const event = await CalEvent.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(event)
})

router.delete('/:id', async (req, res) => {
  await CalEvent.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

module.exports = router
