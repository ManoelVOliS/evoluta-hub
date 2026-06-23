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
  empresa:              { type: String, required: true },
  cnpj:                 { type: String, default: '' },
  telefone:             { type: String, default: '' },
  motor:                { type: String, enum: ['CashBarber','Trink','AppBarber','Múltiplos','Outro'], required: true },
  ativo:                { type: Boolean, default: true },
  apiKey:               { type: String, default: '' },
  treinado:             { type: Boolean, default: false },
  envia_planilha:       { type: Boolean, default: false },
  ultima_sincronizacao: { type: Date },
  createdAt:            { type: Date, default: Date.now }
})

const ReportSchema = new mongoose.Schema({
  clientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  mes:        { type: String, required: true },
  tipo:       { type: String, enum: ['mensal', 'quinzenal'], default: 'mensal' },
  periodo:    { type: String, default: null }, // null para mensal; 'Q1' ou 'Q2' para quinzenal
  html:       { type: String, required: true },
  status:      { type: String, enum: ['gerado','revisado','enviado'], default: 'gerado' },
  enviado_em:  { type: Date },
  numeros:     { type: mongoose.Schema.Types.Mixed, default: null },
  observacoes: { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now }
})

const MetricsSchema = new mongoose.Schema({
  clients:        { type: Number, default: 0 },
  mrr:            { type: Number, default: 0 },
  pricePerClient: { type: Number, default: 0 },
  planStartDate:  { type: Date, default: null },
  updatedAt:      { type: Date, default: Date.now }
})

const MetricsHistorySchema = new mongoose.Schema({
  clients:        { type: Number, default: 0 },
  mrr:            { type: Number, default: 0 },
  pricePerClient: { type: Number, default: 0 },
  registeredAt:   { type: Date, default: Date.now }
})

const ProspectSchema = new mongoose.Schema({
  nome:                { type: String, required: true },
  contato:             { type: String, default: '' },
  num_cadeiras:        { type: Number, default: 0 },
  status:              { type: String, enum: ['identificado','abordado','em negociação','convertido','descartado'], default: 'identificado' },
  data_ultimo_contato: { type: Date, default: Date.now },
  observacoes:         { type: String, default: '' },
  createdAt:           { type: Date, default: Date.now }
})

const CalEventSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  date:       { type: Date, required: true },
  tipo:       { type: String, enum: ['reuniao','ligacao','entrega','outro'], default: 'outro' },
  clientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  prospectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prospect', default: null },
  done:       { type: Boolean, default: false },
  nota:       { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now }
})

const ServiceCategorySchema = new mongoose.Schema({
  nome_original: { type: String, required: true, unique: true },
  categoria:     { type: String, required: true },
  criado_em:     { type: Date, default: Date.now }
})

const BenchmarkPageSchema = new mongoose.Schema({
  mes:            { type: String, required: true, unique: true },
  html:           { type: String, required: true },
  gerado_em:      { type: Date, default: Date.now },
  total_clientes: { type: Number, default: 0 }
})

module.exports = {
  Backlog:          mongoose.model('Backlog', BacklogSchema),
  Plan:             mongoose.model('Plan', PlanSchema),
  TRL:              mongoose.model('TRL', TRLSchema),
  Metrics:          mongoose.model('Metrics', MetricsSchema),
  MetricsHistory:   mongoose.model('MetricsHistory', MetricsHistorySchema),
  Client:           mongoose.model('Client', ClientSchema),
  Report:           mongoose.model('Report', ReportSchema),
  Prospect:         mongoose.model('Prospect', ProspectSchema),
  CalEvent:         mongoose.model('CalEvent', CalEventSchema),
  ServiceCategory:  mongoose.model('ServiceCategory', ServiceCategorySchema),
  BenchmarkPage:    mongoose.model('BenchmarkPage', BenchmarkPageSchema),
}
