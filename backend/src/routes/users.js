const router    = require('express').Router()
const bcrypt    = require('bcryptjs')
const auth      = require('../middleware/auth')
const adminOnly = require('../middleware/adminOnly')
const { User }  = require('../models')

router.use(auth, adminOnly)

router.get('/', async (req, res) => {
  const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 })
  res.json(users)
})

router.post('/', async (req, res) => {
  const { email, password, nome, role, clientId } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Email já cadastrado' })
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ email, passwordHash, nome: nome || '', role: role || 'client', clientId: clientId || null })
  res.status(201).json({ _id: user._id, email: user.email, nome: user.nome, role: user.role, clientId: user.clientId, createdAt: user.createdAt })
})

router.put('/:id', async (req, res) => {
  const { nome, role, clientId, password } = req.body
  const update = {}
  if (nome      !== undefined) update.nome     = nome
  if (role      !== undefined) update.role     = role
  if (clientId  !== undefined) update.clientId = clientId || null
  if (password)                update.passwordHash = await bcrypt.hash(password, 10)
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, projection: { passwordHash: 0 } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  res.json(user)
})

router.delete('/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

module.exports = router
