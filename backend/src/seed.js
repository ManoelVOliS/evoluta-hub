const mongoose = require('mongoose')
const { Backlog, Plan } = require('./models')

const BACKLOG = [
  { title: 'Congelar schema JSON do TRINK Motor', description: 'Definir estrutura final do output. Toda mudança futura vira versão nova.', priority: 'P1', tag: 'tech' },
  { title: 'Migrar Groq → Gemini API', description: 'Substituir chamadas nos 3 motores. Testar com planilhas reais antes de produção.', priority: 'P1', tag: 'tech' },
  { title: 'Testes de regressão nos 3 motores', description: 'Mínimo 1 script por motor com planilha de exemplo fixa.', priority: 'P1', tag: 'tech' },
  { title: 'Runbook de incidentes', description: 'Passo a passo para os 5 cenários de falha mais prováveis.', priority: 'P1', tag: 'tech' },
  { title: 'Planilha de controle dos clientes', description: 'Nome, software, último ciclo, status, próximo vencimento. Google Sheets.', priority: 'P2', tag: 'ops' },
  { title: 'Processo de onboarding documentado', description: 'Passo a passo que o cliente segue sozinho para exportar e enviar planilha.', priority: 'P2', tag: 'ops' },
  { title: 'SLA informal com clientes', description: 'Horário de atendimento, janela de manutenção, aviso antes de updates.', priority: 'P2', tag: 'ops' },
  { title: 'Entrevistar os 7 clientes atuais', description: '5 perguntas: o que usa, o que ignora, o que falta, motivo de cancelar, limite de preço.', priority: 'P2', tag: 'biz' },
  { title: 'Dashboard web MVP', description: 'Interface mínima além do Telegram mostrando KPIs principais.', priority: 'P2', tag: 'tech' },
  { title: '4ª integração de motor', description: 'Pesquisar software com maior penetração em PE/NE. Só após P1 e P2 concluídos.', priority: 'P3', tag: 'tech' },
  { title: 'Modelo de pricing por tier', description: 'Tier 1 (1 unidade), Tier 2 (2-5), Tier 3 (franquia). Antes de escalar aquisição.', priority: 'P3', tag: 'biz' },
  { title: 'Billing automatizado', description: 'Pix recorrente ou link automático. Avaliar Asaas ou Pagar.me.', priority: 'P3', tag: 'ops' },
]

const PLAN = [
  { week: 1, title: 'Criar planilha de controle dos 7 clientes', description: 'Nome, software, último ciclo, status, próximo vencimento.', tag: 'ops' },
  { week: 1, title: 'Migrar Groq → Gemini API', description: 'Começar pelo motor mais simples. Testar com planilha real.', tag: 'tech' },
  { week: 1, title: 'Congelar schema JSON do TRINK', description: 'Definir e documentar a estrutura final.', tag: 'tech' },
  { week: 1, title: 'Criar perfil Instagram @evoluta.automacao', description: 'Bio, foto, link. Não precisa postar ainda.', tag: 'mkt' },
  { week: 2, title: 'Gravar vídeo de treinamento — AppBarber', description: 'Gravação de tela, máximo 5 minutos.', tag: 'ops' },
  { week: 2, title: 'Gravar vídeo de treinamento — CashBarber', description: 'Mesmo formato. Um vídeo por software.', tag: 'ops' },
  { week: 2, title: 'Gravar vídeo de treinamento — TRINK', description: 'Ao fim da semana: 3 vídeos prontos.', tag: 'ops' },
  { week: 2, title: 'Publicar 2 posts no Instagram', description: 'Post 1: o que é BI para barbearia. Post 2: print de relatório real.', tag: 'mkt' },
  { week: 3, title: 'Enviar vídeos para os 7 clientes', description: 'Mensagem clara pedindo que exportem sozinhos no próximo ciclo.', tag: 'biz' },
  { week: 3, title: 'Escrever runbook de incidentes', description: 'Os 5 cenários mais prováveis. Máximo 1h de trabalho.', tag: 'tech' },
  { week: 3, title: 'Publicar 2 posts no Instagram', description: 'Post 3: 3 métricas que todo dono deveria ver. Post 4: bastidor do produto.', tag: 'mkt' },
  { week: 3, title: 'Listar 10 barbearias para prospectar', description: 'Google Maps + Instagram. Foco em 3+ cadeiras em Igarassu/Recife.', tag: 'biz' },
  { week: 4, title: 'Verificar quais clientes enviaram planilha sozinhos', description: 'Quem não enviou: ligar, não mandar mensagem.', tag: 'ops' },
  { week: 4, title: 'Abordar 3 barbearias presencialmente', description: 'Visita direta. Levar celular com relatório no Telegram para mostrar.', tag: 'biz' },
  { week: 4, title: 'Publicar 2 posts no Instagram', description: 'Post 5: depoimento de cliente. Post 6: livre.', tag: 'mkt' },
  { week: 4, title: 'Revisão dos 30 dias', description: 'Clientes auto-suficientes? Posts publicados? Barbearias abordadas? Ajustar plano.', tag: 'biz' },
]

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/evoluta_hub')
  const backlogCount = await Backlog.countDocuments()
  const planCount = await Plan.countDocuments()
  if (backlogCount === 0) { await Backlog.insertMany(BACKLOG); console.log('Backlog inserido') }
  if (planCount === 0) { await Plan.insertMany(PLAN); console.log('Plano inserido') }
  await mongoose.disconnect()
}

seed().catch(console.error)
