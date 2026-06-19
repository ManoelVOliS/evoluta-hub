const router = require('express').Router()
const auth = require('../middleware/auth')
const { TRL } = require('../models')

const DEFAULT_CRITERIA = [
  { level: 1, text: 'Princípios básicos observados e documentados', done: true },
  { level: 2, text: 'Conceito tecnológico formulado', done: true },
  { level: 3, text: 'Prova de conceito experimental', done: true },
  { level: 4, text: 'Tecnologia validada em ambiente controlado', done: true },
  { level: 5, text: 'Tecnologia validada em ambiente relevante', done: true },
  { level: 6, text: 'Tecnologia demonstrada em ambiente relevante', done: true },
  { level: 7, text: 'Protótipo em ambiente operacional com clientes reais', done: true },
  { level: 8, text: 'Sistema completo, qualificado e documentado', done: false },
  { level: 9, text: 'Sistema provado em operação plena e escalável', done: false },
]

router.use(auth)

router.get('/', async (req, res) => {
  let state = await TRL.findOne()
  if (!state) {
    state = await TRL.create({ currentLevel: 7, criteria: DEFAULT_CRITERIA })
  }
  res.json(state)
})

router.put('/', async (req, res) => {
  let state = await TRL.findOne()
  if (!state) state = new TRL()
  Object.assign(state, req.body)
  await state.save()
  res.json(state)
})

module.exports = router
