# eVOLUTA Hub — Documentação do Projeto

Painel de operação interna da eVOLUTA, empresa de BI para barbearias. Sistema fullstack com autenticação, gestão de clientes, geração automatizada de relatórios via n8n e ferramentas de acompanhamento operacional.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express + Mongoose |
| Banco de dados | MongoDB (externo em 100.76.56.62:27017) |
| Frontend | React 18 + Vite 5 + React Router v6 |
| Autenticação | JWT (senha única de admin) |
| Planilhas | SheetJS (xlsx) — leitura client-side |
| Relatórios | n8n webhooks (proxiados pelo backend) |
| Deploy | Docker multi-stage (Vite build → Express static) |

---

## Arquitetura

```
[Usuário]
   │
   ▼
[React SPA — localhost:5173 (dev) / porta 3000 (prod)]
   │
   ├─ Autenticação JWT via /api/auth
   │
   ├─ Dados operacionais via /api/* (backlog, plan, trl, metrics, clients)
   │
   └─ AutoReport AI via /api/n8n/*
          │
          └─ [Backend Express — porta 3000]
                 │
                 ├─ Proxy → n8n WEBHOOK_EXTRAIR (extração de métricas com IA)
                 └─ Proxy → n8n WEBHOOK_RELATORIO (geração de HTML com IA)
```

Os UUIDs dos webhooks do n8n ficam **apenas no `.env` do backend**, nunca expostos ao frontend.

---

## Estrutura de arquivos

```
evoluta-hub/
├── backend/
│   ├── src/
│   │   ├── index.js               # Entry point Express
│   │   ├── middleware/
│   │   │   └── auth.js            # Validação JWT
│   │   ├── models/
│   │   │   └── index.js           # Schemas Mongoose
│   │   └── routes/
│   │       ├── auth.js            # POST /api/auth/login
│   │       ├── backlog.js         # CRUD /api/backlog
│   │       ├── plan.js            # CRUD /api/plan
│   │       ├── trl.js             # GET/PUT /api/trl
│   │       ├── content.js         # CRUD /api/content (arquivos .md)
│   │       ├── metrics.js         # GET/PUT /api/metrics
│   │       ├── clients.js         # CRUD /api/clients + relatórios
│   │       └── n8n.js             # Proxy /api/n8n/extrair e /relatorio
│   ├── public/                    # Build do Vite (em produção)
│   ├── .env                       # Variáveis de ambiente (não commitado)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx               # Entry point React + rotas
│   │   ├── api.js                 # Cliente HTTP centralizado
│   │   ├── components/
│   │   │   ├── Layout.jsx         # Shell responsivo (sidebar + header)
│   │   │   └── ImportMd.jsx       # Importador de tarefas via .md
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Tela de login com JWT
│   │   │   ├── Dashboard.jsx      # Visão geral (MRR, TRL, plano, P1s)
│   │   │   ├── Clientes.jsx       # Gestão de clientes + SyncWizard
│   │   │   ├── Backlog.jsx        # Backlog com prioridade e tags
│   │   │   ├── Plan90.jsx         # Checklist 30 dias por semana
│   │   │   ├── TRL.jsx            # Análise TRL 1–9
│   │   │   └── Content.jsx        # Editor de notas .md
│   │   └── services/
│   │       └── n8n.js             # Extração de planilhas + chamadas n8n
│   ├── index.html                 # Estilos globais + variáveis CSS
│   └── package.json
│
├── .env.example                   # Template de variáveis
├── INTEGRATION_GUIDE.md           # Referência do motor AutoReport AI
└── PROJETO.md                     # Este documento
```

---

## Variáveis de ambiente (`backend/.env`)

```env
MONGO_URI=mongodb://usuario:senha@host:27017/evoluta-hub?authSource=admin
JWT_SECRET=string_longa_e_aleatoria
ADMIN_PASSWORD=sua_senha

# Webhooks do n8n (deixar vazio desabilita o botão Sincronizar)
N8N_WEBHOOK_EXTRAIR=https://n8n.manoelvolis.online/webhook/ea5a181e-71b6-43b1-b7c2-b2ef096e54f6
N8N_WEBHOOK_RELATORIO=https://n8n.manoelvolis.online/webhook/7e1419d5-2155-4335-a88a-0706b8ee2a6f
```

---

## Modelos de dados (MongoDB)

### Backlog
```js
{ title, description, priority: 'P1'|'P2'|'P3', tag: 'tech'|'ops'|'biz'|'mkt', done, createdAt }
```

### Plan
```js
{ week: 1–4, title, description, tag: 'tech'|'ops'|'biz'|'mkt', done }
```

### TRL
```js
{ currentLevel: 1–9, criteria: [{ level, text, done }] }
```

### Metrics
```js
{ clients, mrr, pricePerClient, updatedAt }
```

### Client
```js
{ empresa, cnpj, telefone, motor: 'CashBarber'|'Trink'|'AppBarber'|'Múltiplos'|'Outro', ativo, createdAt }
```

### Report
```js
{ clientId (ref Client), mes, html, createdAt }
```

---

## Módulos do frontend

### Login
- Senha única → POST `/api/auth/login` → token JWT no `localStorage`
- Redirect automático para `/` se já autenticado
- Fix aplicado: `flex: 1` no wrapper para centralizar corretamente dentro do `#root` que é flex container

### Layout (shell responsivo)
- Desktop (>768px): sidebar fixa à esquerda com logo, navegação e rodapé de versão
- Mobile (<768px): barra superior com hambúrguer, menu colapsável com animação `max-height`
- Header com MRR atual e botão Sair
- NavLink com destaque ativo (borda esquerda no desktop, borda inferior no mobile)

### Dashboard
- Cards: MRR (editável), TRL atual, progresso do plano 30d, P1s abertos
- Clique no card MRR abre formulário inline para atualizar clientes/MRR/preço por cliente
- MRR calculado automaticamente com alerta se diverge do MRR manual
- Lista dos 4 P1s abertos mais recentes com link para Backlog
- Lista das 4 próximas tarefas do plano com link para Plano

### Clientes
- Lista de clientes agrupados em Ativos / Inativos
- Badge colorido por motor (CashBarber=verde, Trink=azul, AppBarber=rosa, Múltiplos=laranja)
- Busca por nome
- CRUD completo (criar, editar, deletar com confirmação)
- Cada cliente tem acesso ao painel de relatórios

#### SyncWizard (dentro de Clientes)
Motor de sincronização com o AutoReport AI. Estados: `idle → extraindo → extraido → gerando → salvo | erro`

1. **Dropzone** — aceita 1 ou mais arquivos `.xlsx/.xls/.csv`
   - Arrastar e soltar ou clique para abrir seletor (com `multiple`)
   - Arquivos acumulados, deduplicados por nome
   - Lista visual com nome, tamanho em KB e botão × para remover
   - Detecção automática do mês de referência pelo nome do arquivo
2. **Lançamentos manuais** — seção "+ Adicionar linha"
   - Grid: Métrica | Valor | ×
   - Injetados no JSON com as chaves corretas por motor (`Faturamento Geral` para CashBarber, `Geral` para outros, `__EMPTY` para valor)
3. **Campo mês** + botão "Extrair dados →"
4. **Preview de métricas** após extração (faturamento, despesas, comissões, lucro, clientes, novos, produtos, estoque)
5. Botão "Gerar relatório HTML →" → chama n8n → salva no banco → aparece na lista de relatórios

#### ReportsPanel
- Lista de relatórios do cliente em cards por mês
- Upload manual de arquivo `.html` ou colagem de HTML
- Visualização abre o HTML em nova aba via `Blob URL`
- Exclusão com confirmação

### Backlog
- Itens agrupados por prioridade (P1/P2/P3) com cor por grupo
- Tags por área: Técnico, Operação, Negócio, Marketing
- Filtro por tag
- Marcar como feito (com risco visual), editar, excluir
- Importação via arquivo `.md` (componente `ImportMd`)

### Plano 30 dias
- Itens agrupados por semana (1 a 4) com rótulos descritivos
- Barra de progresso global
- Marcar como feito, excluir
- Importação via arquivo `.md`

### Análise TRL
- Cards com nível atual, critérios atendidos (progresso) e próxima meta
- Grid clicável dos 9 níveis — clicar define o nível atual
- Lista de critérios com checkbox, todos os TRLs agrupados
- Estado persiste no MongoDB

### Notas .md
- Lista de arquivos `.md` na coluna esquerda
- Editor de texto (modo `editar`) com `textarea` monoespaçada
- Preview renderizado com `marked` (Markdown → HTML)
- Criar novo arquivo, deletar, salvar

---

## AutoReport AI — Integração n8n

### Rota backend (`backend/src/routes/n8n.js`)
Todas as chamadas ao n8n passam pelo backend para manter os UUIDs fora do cliente.

```
POST /api/n8n/extrair   → proxy para N8N_WEBHOOK_EXTRAIR
POST /api/n8n/relatorio → proxy para N8N_WEBHOOK_RELATORIO
```

- Retorna 503 se a variável de ambiente não estiver configurada
- Retorna 502 se o n8n responder com erro
- Protegido por middleware JWT

### Serviço frontend (`frontend/src/services/n8n.js`)

#### Leitura de planilhas
- `extrairPlanilhas(arquivos, motor, manuais)` — lê múltiplos arquivos em paralelo (`Promise.all`), concatena os resultados e injeta os lançamentos manuais

**Scanner automático de cabeçalho** (ativo para `trink` e `cashbarber`):
- Varre as primeiras 20 linhas da planilha
- A linha com mais colunas preenchidas é usada como cabeçalho
- `appbarber` lê direto, sem scanner

**Injeção de lançamentos manuais:**
```js
{ [motor === 'cashbarber' ? 'Faturamento Geral' : 'Geral']: metrica, '__EMPTY': valor }
```

#### Chamadas ao backend
- `extrairMetricas(motor, dados_planilha)` → POST `/api/n8n/extrair`
- `gerarRelatorioHTML(numeros)` → POST `/api/n8n/relatorio`

---

## Correções aplicadas durante o desenvolvimento

| Problema | Causa | Solução |
|---|---|---|
| 413 Payload Too Large | Limite padrão do Express de 100kb no body JSON | `express.json({ limit: '50mb' })` em `backend/src/index.js` |
| 503 n8n não configurado | Variáveis de webhook ausentes no `backend/.env` | Adicionadas `N8N_WEBHOOK_EXTRAIR` e `N8N_WEBHOOK_RELATORIO` |
| Login não centralizado | `#root { display: flex }` faz o wrapper do Login ser item flex sem `width: 100%` | `flex: 1` no div wrapper do `Login.jsx` |

---

## Como rodar localmente

```bash
# Backend
cd backend
npm install
node src/index.js        # porta 3000

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev              # porta 5173
```

O frontend em dev usa o Vite dev server. Em produção, o Express serve o build estático em `/public`.

---

## Como fazer o build de produção

```bash
cd frontend && npm run build    # gera dist/
cp -r dist/* ../backend/public/
cd ../backend && node src/index.js
# Tudo na porta 3000
```

---

## Checklist de configuração para novo ambiente

- [ ] Instalar Node.js 18+
- [ ] Configurar instância MongoDB e obter a URI de conexão
- [ ] Criar `backend/.env` com todas as variáveis (ver seção acima)
- [ ] Configurar instância n8n e importar os workflows de extração e relatório
- [ ] Adicionar os webhooks do n8n ao `.env`
- [ ] `npm install` no backend e no frontend
- [ ] Testar login com a senha do `ADMIN_PASSWORD`
- [ ] Testar upload de planilha AppBarber (scanner OFF) e Trink/CashBarber (scanner ON)
- [ ] Testar geração de relatório HTML pelo SyncWizard
