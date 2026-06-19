const router = require('express').Router()
const auth = require('../middleware/auth')
const { Backlog } = require('../models')

router.use(auth)

router.get('/', async (req, res) => {
  const items = await Backlog.find().sort({ priority: 1, createdAt: 1 })
  res.json(items)
})

router.post('/', async (req, res) => {
  const item = await Backlog.create(req.body)
  res.status(201).json(item)
})

router.put('/:id', async (req, res) => {
  const item = await Backlog.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(item)
})

router.delete('/:id', async (req, res) => {
  await Backlog.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

module.exports = router
