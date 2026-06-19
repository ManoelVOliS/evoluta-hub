const router = require('express').Router()
const auth = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

const CONTENT_DIR = path.join(__dirname, '../../..', 'content')

router.use(auth)

router.get('/', (req, res) => {
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'))
  res.json(files)
})

router.get('/:file', (req, res) => {
  const file = path.join(CONTENT_DIR, req.params.file.replace(/\.\./g, ''))
  if (!file.endsWith('.md') || !fs.existsSync(file)) return res.status(404).json({ error: 'Arquivo não encontrado' })
  res.json({ content: fs.readFileSync(file, 'utf8') })
})

router.put('/:file', (req, res) => {
  const file = path.join(CONTENT_DIR, req.params.file.replace(/\.\./g, ''))
  if (!file.endsWith('.md')) return res.status(400).json({ error: 'Apenas arquivos .md' })
  fs.writeFileSync(file, req.body.content || '')
  res.json({ ok: true })
})

router.post('/:file', (req, res) => {
  const file = path.join(CONTENT_DIR, req.params.file.replace(/\.\./g, ''))
  if (!file.endsWith('.md')) return res.status(400).json({ error: 'Apenas arquivos .md' })
  if (fs.existsSync(file)) return res.status(409).json({ error: 'Arquivo já existe' })
  fs.writeFileSync(file, req.body.content || '')
  res.status(201).json({ ok: true })
})

router.delete('/:file', (req, res) => {
  const file = path.join(CONTENT_DIR, req.params.file.replace(/\.\./g, ''))
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Arquivo não encontrado' })
  fs.unlinkSync(file)
  res.json({ ok: true })
})

module.exports = router
