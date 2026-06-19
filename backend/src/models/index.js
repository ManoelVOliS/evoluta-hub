const mongoose = require('mongoose')

const BacklogSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  priority:    { type: String, enum: ['P1','P2','P3'], default: 'P2' },
  tag:         { type: String, enum: ['tech','ops','biz','mkt'], default: 'tech' },
  done:        { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
})

const PlanSchema = new mongoose.Schema({
  week:        { type: Number, required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  tag:         { type: String, enum: ['tech','ops','biz','mkt'], default: 'ops' },
  done:        { type: Boolean, default: false }
})

const TRLSchema = new mongoose.Schema({
  currentLevel: { type: Number, default: 7 },
  criteria: [{
    level:  Number,
    text:   String,
    done:   { type: Boolean, default: false }
  }]
})

const ClientSchema = new mongoose.Schema({
  empresa:   { type: String, required: true },
  cnpj:      { type: String, default: '' },
  telefone:  { type: String, default: '' },
  motor:     { type: String, enum: ['CashBarber','Trink','AppBarber','Múltiplos','Outro'], required: true },
  ativo:     { type: Boolean, default: true },
  apiKey:    { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
})

const ReportSchema = new mongoose.Schema({
  clientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  mes:       { type: String, required: true },
  html:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

const MetricsSchema = new mongoose.Schema({
  clients:        { type: Number, default: 0 },
  mrr:            { type: Number, default: 0 },
  pricePerClient: { type: Number, default: 0 },
  updatedAt:      { type: Date, default: Date.now }
})

module.exports = {
  Backlog:  mongoose.model('Backlog', BacklogSchema),
  Plan:     mongoose.model('Plan', PlanSchema),
  TRL:      mongoose.model('TRL', TRLSchema),
  Metrics:  mongoose.model('Metrics', MetricsSchema),
  Client:   mongoose.model('Client', ClientSchema),
  Report:   mongoose.model('Report', ReportSchema),
}
