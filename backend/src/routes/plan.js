const router = require('express').Router()
const auth = require('../middleware/auth')
const { Plan } = require('../models')

router.use(auth)

router.get('/', async (req, res) => {
  const items = await Plan.find().sort({ week: 1 })
  res.json(items)
})

router.post('/', async (req, res) => {
  const item = await Plan.create(req.body)
  res.status(201).json(item)
})

router.put('/:id', async (req, res) => {
  const item = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true })
  res.json(item)
})

router.delete('/:id', async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

module.exports = router
