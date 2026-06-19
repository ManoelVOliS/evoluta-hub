require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const mongoose = require('mongoose')

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/evoluta_hub')
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Erro MongoDB:', err))

app.use('/api/auth',    require('./routes/auth'))
app.use('/api/backlog', require('./routes/backlog'))
app.use('/api/plan',    require('./routes/plan'))
app.use('/api/trl',     require('./routes/trl'))
app.use('/api/content', require('./routes/content'))
app.use('/api/metrics', require('./routes/metrics'))
app.use('/api/clients', require('./routes/clients'))
app.use('/api/n8n',    require('./routes/n8n'))

app.use(express.static(path.join(__dirname, '../public')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`eVOLUTA Hub rodando na porta ${PORT}`))
