const router = require('express').Router()
const jwt = require('jsonwebtoken')

router.post('/login', (req, res) => {
  const { password } = req.body
  const correct = process.env.ADMIN_PASSWORD || 'evoluta2026'
  if (password !== correct) return res.status(401).json({ error: 'Senha incorreta' })
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' })
  res.json({ token })
})

module.exports = router
