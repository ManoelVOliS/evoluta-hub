const router  = require('express').Router()
const jwt     = require('jsonwebtoken')
const bcrypt  = require('bcryptjs')
const rateLimit = require('express-rate-limit')
const { User } = require('../models')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body
  if (!password) return res.status(400).json({ error: 'Senha obrigatória' })

  // Login de admin via senha master (backward compat — sem email)
  if (!email) {
    const correct = process.env.ADMIN_PASSWORD
    if (!correct) return res.status(500).json({ error: 'Servidor mal configurado' })
    if (password !== correct) return res.status(401).json({ error: 'Senha incorreta' })
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' })
    return res.json({ token, role: 'admin' })
  }

  // Login de usuário (email + senha)
  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'Credenciais incorretas' })
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Credenciais incorretas' })
    const payload = { role: user.role, userId: String(user._id), clientId: user.clientId ? String(user.clientId) : null }
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, role: user.role, clientId: payload.clientId, nome: user.nome })
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' })
  }
})

module.exports = router
