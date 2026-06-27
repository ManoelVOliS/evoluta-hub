require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const mongoose = require('mongoose')

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não definido. Defina no .env antes de iniciar.')
  process.exit(1)
}

const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
      styleSrc:       ["'self'", "'unsafe-inline'", "https:"],
      imgSrc:         ["'self'", "data:", "blob:", "https:"],
      fontSrc:        ["'self'", "data:", "https:"],
      connectSrc:     ["'self'"],
      frameSrc:       ["'self'", "blob:"],
      objectSrc:      ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'"],
      frameAncestors: ["'self'"],
    }
  },
  hsts: false,
  crossOriginOpenerPolicy: false
}))

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use(cors({
  origin: [allowedOrigin, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))

app.use(express.json({ limit: '50mb' }))

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/evoluta_hub')
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Erro MongoDB:', err))

app.get('/health', (req, res) => {
  const state = mongoose.connection.readyState
  const mongo = state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected'
  res.status(mongo === 'connected' ? 200 : 503).json({
    status: mongo === 'connected' ? 'ok' : 'degraded',
    mongo,
    uptime: Math.floor(process.uptime())
  })
})

app.use('/api/auth',        require('./routes/auth'))
app.use('/api/backlog',     require('./routes/backlog'))
app.use('/api/plan',        require('./routes/plan'))
app.use('/api/trl',         require('./routes/trl'))
app.use('/api/content',     require('./routes/content'))
app.use('/api/metrics',     require('./routes/metrics'))
app.use('/api/clients',     require('./routes/clients'))
app.use('/api/n8n',         require('./routes/n8n'))
app.use('/api/prospects',   require('./routes/prospects'))
app.use('/api/calendar',    require('./routes/calendar'))
app.use('/api/users',       require('./routes/users'))

const { benchmarkRouter, serviceCatRouter } = require('./routes/benchmark')
app.use('/api/benchmark',          benchmarkRouter)
app.use('/api/service-categories', serviceCatRouter)

app.use(express.static(path.join(__dirname, '../public')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`eVOLUTA Hub rodando na porta ${PORT}`))