const router = require('express').Router()
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

router.post('/login', loginLimiter, (req, res) => {
  const { password } = req.body
  if (!password) return res.status(400).json({ error: 'Senha obrigatória' })

  const correct = process.env.ADMIN_PASSWORD
  if (!correct) return res.status(500).json({ error: 'Servidor mal configurado' })

  if (password !== correct) return res.status(401).json({ error: 'Senha incorreta' })

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

module.exports = router
