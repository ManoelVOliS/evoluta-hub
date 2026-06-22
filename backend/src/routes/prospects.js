const router = require('express').Router()
const auth   = require('../middleware/auth')
const { Prospect } = require('../models')

router.use(auth)

router.get('/', async (req, res) => {
  const prospects = await Prospect.find().sort({ createdAt: -1 })
  res.json(prospects)
})

router.post('/', async (req, res) => {
  const prospect = await Prospect.create(req.body)
  res.status(201).json(prospect)
})

router.put('/:id', async (req, res) => {
  const update = { ...req.body, data_ultimo_contato: new Date() }
  const prospect = await Prospect.findByIdAndUpdate(req.params.id, update, { new: true })
  res.json(prospect)
})

router.delete('/:id', async (req, res) => {
  await Prospect.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

module.exports = router
