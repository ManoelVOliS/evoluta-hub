# eVOLUTA Hub — Backlog de melhorias

> Documento vivo. Atualizar conforme o uso real revelar novas necessidades.
> Última revisão: Julho 2026

---

## Legenda

- 🔴 **Correção** — algo quebrado ou que compromete o uso real
- 🟡 **Melhoria** — existe mas precisa evoluir
- 🟢 **Feature nova** — não existe ainda, exige desenvolvimento

---

## 🔴 Correções

### INTEGRATION_GUIDE.md ausente
O arquivo é referenciado na estrutura do projeto mas não foi criado.
Documentar o contrato entre o SyncWizard e o n8n:
- Formato exato do payload enviado para `N8N_WEBHOOK_EXTRAIR`
- Formato exato do payload enviado para `N8N_WEBHOOK_RELATORIO`
- Campos obrigatórios por motor (CashBarber, Trink, AppBarber)
- Estrutura do HTML retornado pelo n8n
- Exemplos de request e response para cada webhook

**Por que agora:** enquanto o conhecimento ainda está fresco. Em 2 meses você não vai lembrar dos detalhes do contrato.

---

### Health check endpoint ausente
O Dockge e o Cloudflare Tunnel só sabem se o container está rodando, não se a aplicação está funcional.

Adicionar:
```
GET /health
→ { status: 'ok', mongo: 'connected', uptime: 123 }
```
Deve verificar a conexão real com o MongoDB antes de retornar `ok`.

---

### JWT sem tratamento de expiração suave
Token expira em 7 dias e o usuário recebe um redirect abrupto para o login sem mensagem.

Corrigir para exibir: *"Sua sessão expirou. Faça login novamente."* antes do redirect.

---

## 🟡 Melhorias

### Histórico de MRR
O modelo `Metrics` guarda apenas o snapshot atual. Não existe curva histórica.

Alterar para acumular snapshots com data:
```js
{ mrr, clients, pricePerClient, registeredAt: Date }
```
Cada atualização manual cria um novo documento em vez de sobrescrever.
Permite visualizar crescimento mês a mês no Dashboard futuramente.

---

### Campo de onboarding no modelo Client
Não tem como rastrear quais clientes já se viraram sozinhos.

Adicionar ao modelo `Client`:
```js
treinado: Boolean          // recebeu os vídeos de treinamento
envia_planilha: Boolean    // já exporta e envia sem ajuda
ultima_sincronizacao: Date // data do último relatório gerado
```
Exibir status visual na lista de clientes (ícone ou badge).

---

### Status do relatório após geração
Após gerar o HTML, não tem como marcar se foi revisado e enviado ao cliente.

Adicionar ao modelo `Report`:
```js
status: 'gerado' | 'revisado' | 'enviado'
enviado_em: Date
```
Botão simples na ReportsPanel para avançar o status.

---

## 🟢 Features novas

### Pipeline de prospects
Não existe nenhum lugar para registrar barbearias em prospecção.

Nova seção ou aba dentro de Clientes:
- Nome da barbearia
- Contato (WhatsApp / Instagram)
- Número de cadeiras (indicador de ticket potencial)
- Status: `identificado → abordado → em negociação → convertido | descartado`
- Data do último contato
- Campo de observações livre
- Alerta automático quando um prospect está há mais de 7 dias sem atualização

**Prioridade:** alta. Você começa abordagens esse mês.

---

### Histórico de MRR — gráfico no Dashboard
Depende da melhoria de histórico de Metrics acima.

Linha simples de evolução do MRR mês a mês.
Só faz sentido construir depois de ter pelo menos 2 meses de dados acumulados.

**Prioridade:** baixa. Construir em agosto/setembro.

---

### Calendário de conteúdo — Instagram
Gerenciar o calendário editorial diretamente no Hub.

- Grade semanal ou mensal
- Card por post: tema, tipo (educativo / prova / bastidor / depoimento), status (ideia / rascunho / publicado)
- Campo de legenda rascunho
- Integração futura com geração de legenda via Gemini (comando manual)

**Prioridade:** média. Útil quando o ritmo de 2 posts/semana estiver consolidado.

**Não construir agora.** Um `.md` no Content resolve até lá.

---

### Notificações internas
Alertas sem precisar abrir o Hub:
- Cliente sem relatório gerado há mais de 20 dias
- Prospect sem contato há mais de 7 dias
- Tarefa do plano em semana vencida e não marcada

Canal de entrega: Telegram (já é a infra existente).
Implementar via n8n com cron trigger — não exige mudança no Hub em si.

**Prioridade:** média. Implementar quando o n8n estiver mais estável.

---

### Exportação de dados
Exportar backlog e plano para `.csv` ou `.md` para backup manual ou compartilhamento.

Botão simples no Backlog e no Plano 30 dias.

**Prioridade:** baixa.

---

## Ordem de execução sugerida

| # | Item | Tipo | Quando |
|---|------|------|--------|
| 1 | INTEGRATION_GUIDE.md | 🔴 Correção | Esta semana |
| 2 | Health check `/health` | 🔴 Correção | Esta semana |
| 3 | JWT expiração suave | 🔴 Correção | Esta semana |
| 4 | Campo onboarding no Client | 🟡 Melhoria | Semana 1–2 |
| 5 | Pipeline de prospects | 🟢 Feature | Semana 2–3 |
| 6 | Histórico de MRR (modelo) | 🟡 Melhoria | Semana 2–3 |
| 7 | Status do relatório | 🟡 Melhoria | Semana 3–4 |
| 8 | Notificações via Telegram | 🟢 Feature | Agosto |
| 9 | Calendário de conteúdo | 🟢 Feature | Agosto/Setembro |
| 10 | Gráfico histórico MRR | 🟢 Feature | Setembro+ |
| 11 | Exportação de dados | 🟢 Feature | Quando sentir necessidade |