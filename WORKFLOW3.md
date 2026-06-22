# eVOLUTA — Guia Técnico: Workflow 3 (Benchmark)
**Página separada de comparativo entre barbearias da rede**

---

## Visão Geral

O Workflow 3 varre os snapshots de todos os clientes do mês, normaliza os nomes de serviços/produtos via Gemini, calcula métricas comparativas, gera um texto de insight e monta uma página HTML separada do relatório principal.

**Não altera W1 nem W2.**

---

## Pré-requisitos

- [ ] `unidade_slug` populado em todos os documentos de `snapshots_mensais`
- [ ] Collection `service_categories` criada no MongoDB (pode estar vazia)
- [ ] Collection `benchmark_pages` criada no MongoDB
- [ ] Endpoint de salvar/buscar benchmark criado na API (ver seção Backend)

---

## MongoDB

### Collections necessárias

**`service_categories`**
Mapa de normalização cacheado. Nunca deletar — é acumulativo.
```json
{
  "_id": "...",
  "nome_original": "COMBO PADRÃO ETO'S (Corte + Barba)",
  "categoria": "combo",
  "criado_em": "2026-06-01T00:00:00Z"
}
```

**`benchmark_pages`**
Página gerada por mês. Uma por execução.
```json
{
  "_id": "...",
  "mes": "06/2026",
  "html": "<!DOCTYPE html>...",
  "gerado_em": "2026-06-22T00:00:00Z",
  "total_clientes": 7
}
```

---

## Backend (Express/NestJS)

### Endpoints necessários

**GET `/api/benchmark/:mes`**
Busca a página de benchmark gerada para o mês.
```
Params: mes = "06-2026"
Response: { html, gerado_em, total_clientes }
Erro 404 se ainda não gerado
```

**POST `/api/benchmark`**
Salva ou atualiza a página gerada pelo W3.
```
Body: { mes, html, total_clientes }
Comportamento: upsert por mes
```

**GET `/api/service-categories`**
Retorna todos os mapeamentos salvos.
```
Response: [{ nome_original, categoria }]
Usado pelo W3 para saber o que já foi classificado
```

**POST `/api/service-categories`**
Salva novos mapeamentos retornados pelo Gemini.
```
Body: [{ nome_original, categoria }]
Comportamento: insertMany, ignorar duplicatas
```

---

## n8n — Workflow 3

### Estrutura dos nós

```
[Webhook]
  ↓
[MongoDB — Buscar snapshots do mês]
  ↓
[MongoDB — Buscar service_categories salvas]
  ↓
[Code — Extrair nomes novos]
  ↓ (se tiver nomes novos)
[Gemini — Normalizar categorias]
  ↓
[HTTP Request — POST /api/service-categories]
  ↓
[Code — Aplicar categorias + Calcular benchmark]
  ↓
[Gemini — Gerar texto de insight]
  ↓
[Code — Montar HTML completo]
  ↓
[HTTP Request — POST /api/benchmark]
  ↓
[Webhook Response]
```

---

### Nó: Webhook

```
Método: POST
Path: /benchmark/gerar
Body esperado: { "mes": "06/2026" }
```

---

### Nó: MongoDB — Buscar snapshots

```javascript
// Query
{ "meta.mes_analisado": "{{ $json.mes }}" }

// Campos retornados
{
  "meta.unidade_slug": 1,
  "financeiro": 1,
  "clientes": 1,
  "pacotes": 1,
  "ranking_barbeiros": 1,
  "auditoria_profissionais": 1
}
```

---

### Nó: Code — Extrair nomes novos

```javascript
const snapshots = $input.all().map(i => i.json);
const categoriasExistentes = $node["MongoDB - service_categories"].all()
  .map(i => i.json.nome_original);

const nomesUnicos = new Set();

snapshots.forEach(snap => {
  (snap.auditoria_profissionais || []).forEach(prof => {
    Object.keys(prof.servicos_valor || {}).forEach(n => nomesUnicos.add(n));
    Object.keys(prof.produtos_valor || {}).forEach(n => nomesUnicos.add(n));
  });
});

const nomesNovos = [...nomesUnicos].filter(n => !categoriasExistentes.includes(n));

return [{ json: { nomesNovos, snapshots } }];
```

> Se `nomesNovos.length === 0`, usar nó IF para pular o Gemini de normalização.

---

### Nó: Gemini — Normalizar categorias

**Prompt:**
```
Classifique cada nome da lista abaixo em UMA das categorias.

CATEGORIAS PERMITIDAS:
- corte
- barba
- combo
- acabamento
- quimico
- estetica
- produto_capilar
- produto_consumivel
- pacote_assinatura
- outros

Responda APENAS com JSON válido, sem texto antes ou depois:
{ "NOME ORIGINAL": "categoria" }

LISTA:
{{ $json.nomesNovos.join('\n') }}
```

---

### Nó: Code — Calcular benchmark

```javascript
const snapshots = $json.snapshots;
const categorias = $node["MongoDB - service_categories"].all()
  .reduce((acc, i) => { acc[i.json.nome_original] = i.json.categoria; return acc; }, {});

const metricas = snapshots.map(snap => {
  const fat = snap.financeiro.faturamento_total || 0;
  const lucro = snap.financeiro.lucro_real || 0;
  const servicos = snap.financeiro.faturamento_servicos || 0;
  const produtos = snap.financeiro.faturamento_produtos || 0;
  const barbeiros = snap.ranking_barbeiros || [];
  const ticket = barbeiros.length
    ? barbeiros.reduce((a, b) => a + b.ticket_medio, 0) / barbeiros.length
    : 0;
  const retencao = snap.clientes.base_total > 0
    ? snap.clientes.retorno_clientes / snap.clientes.base_total
    : 0;
  const tem_pacotes = (snap.pacotes?.quantidade_total_vendida || 0) > 0;

  // Receita por categoria
  const por_categoria = {};
  (snap.auditoria_profissionais || []).forEach(prof => {
    Object.entries(prof.servicos_valor || {}).forEach(([nome, valor]) => {
      const cat = categorias[nome] || "outros";
      por_categoria[cat] = (por_categoria[cat] || 0) + valor;
    });
  });

  return {
    slug: snap.meta.unidade_slug,
    margem: fat > 0 ? lucro / fat : 0,
    pct_servicos: fat > 0 ? servicos / fat : 0,
    pct_produtos: fat > 0 ? produtos / fat : 0,
    ticket_medio: ticket,
    retencao,
    tem_pacotes,
    por_categoria
  };
});

// Anonimizar — labels aleatórios por execução
const LABELS = ["Barbearia A","Barbearia B","Barbearia C","Barbearia D",
                 "Barbearia E","Barbearia F","Barbearia G","Barbearia H"];
const shuffled = LABELS.sort(() => Math.random() - 0.5);

const anonimizado = metricas.map((m, i) => ({
  label: shuffled[i],
  ...m
}));

// Médias do grupo (mínimo 3 para exibir)
const calcMedia = (campo) => {
  const validos = anonimizado.filter(c => c[campo] > 0);
  if (validos.length < 3) return null;
  return validos.reduce((a, c) => a + c[campo], 0) / validos.length;
};

const media = {
  margem:       calcMedia("margem"),
  ticket_medio: calcMedia("ticket_medio"),
  pct_servicos: calcMedia("pct_servicos"),
  retencao:     calcMedia("retencao")
};

const comPacotes = anonimizado.filter(c => c.tem_pacotes).length;

return [{ json: { anonimizado, media, total: metricas.length, comPacotes } }];
```

---

### Nó: Gemini — Gerar texto de insight

**Prompt:**
```
Você é analista da eVOLUTA, plataforma de BI para barbearias.

Escreva um parágrafo de comparativo em português, tom consultivo, máximo 120 palavras.
Não cite nomes de barbearias. Use apenas "as demais barbearias da rede eVOLUTA".

MÉDIAS DA REDE:
- Margem média: {{ (media.margem * 100).toFixed(1) }}%
- Ticket médio: R$ {{ media.ticket_medio.toFixed(2) }}
- % receita de serviços: {{ (media.pct_servicos * 100).toFixed(1) }}%
- Taxa de retorno: {{ (media.retencao * 100).toFixed(1) }}%
- Barbearias que vendem pacotes: {{ comPacotes }} de {{ total }}

Destaque 1 ponto positivo da rede e 1 oportunidade de melhoria coletiva.
Termine com 1 sugestão prática.
Retorne apenas o texto, sem títulos ou marcações.
```

---

### Nó: Code — Montar HTML

```javascript
const { anonimizado, media, total, comPacotes } = $json;
const insight = $node["Gemini - Insight"].first().json.candidates[0]
  .content.parts[0].text;

const linhasTabela = anonimizado.map(c => `
  <tr>
    <td style="color:#F7FAFC;font-weight:600">${c.label}</td>
    <td style="color:#7B2CBF">${(c.margem * 100).toFixed(1)}%</td>
    <td style="color:#38bdf8">R$ ${c.ticket_medio.toFixed(2)}</td>
    <td style="color:#68d391">${(c.retencao * 100).toFixed(1)}%</td>
    <td style="color:${c.tem_pacotes ? '#68d391' : '#fc8181'}">
      ${c.tem_pacotes ? '✓ Sim' : '✗ Não'}
    </td>
  </tr>
`).join('');

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>eVOLUTA — Benchmark da Rede</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter','Segoe UI',sans-serif;background:#070e24;color:#F7FAFC}
  .ev-page{max-width:1280px;margin:0 auto;padding:24px 16px 64px;display:flex;flex-direction:column;gap:24px}
  .ev-card{background:#111A3A;border-radius:16px;padding:24px;border:1px solid #1A2342}
  .ev-title{font-size:1rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#A0AEC0;margin-bottom:16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #1A2342;padding-bottom:10px}
  .ev-stat{background:#0A1128;border-radius:12px;padding:16px;border:1px solid #1A2342}
  .ev-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#A0AEC0;margin-bottom:4px}
  .ev-big{font-size:1.8rem;font-weight:900;line-height:1.1}
  .ev-badge{display:inline-block;padding:3px 10px;border-radius:9999px;font-size:.72rem;font-weight:700}
  .ev-prose{font-size:.85rem;line-height:1.7;color:#A0AEC0}
  .ev-table{width:100%;border-collapse:collapse;font-size:.82rem}
  .ev-table th{padding:10px 14px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:#A0AEC0;font-weight:700;border-bottom:1px solid #1A2342}
  .ev-table td{padding:10px 14px;border-bottom:1px solid #1A2342}
  .ev-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  @media(max-width:640px){.ev-grid-4{grid-template-columns:1fr 1fr}}
  .gradient-text{background:linear-gradient(90deg,#7B2CBF,#F15BB5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
</style>
</head>
<body>
<div class="ev-page">

  <header style="background:linear-gradient(135deg,#0A1128,#140826,#1e0d3d);border-radius:20px;padding:40px 36px;border:1px solid #1A2342">
    <p style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7B2CBF;margin-bottom:6px">
      eVOLUTA · Benchmark da Rede
    </p>
    <h1 style="font-size:2rem;font-weight:900;letter-spacing:-.02em">
      Como a rede está<br><span class="gradient-text">performando</span>
    </h1>
    <p style="margin-top:10px;color:#A0AEC0;font-size:.9rem">
      Dados anonimizados · <strong style="color:#F7FAFC">${total} barbearias</strong> · Todos os nomes omitidos por privacidade
    </p>
  </header>

  <div class="ev-grid-4">
    <div class="ev-stat" style="border-top:3px solid #7B2CBF">
      <p class="ev-label">Margem Média</p>
      <p class="ev-big" style="color:#7B2CBF">${(media.margem * 100).toFixed(1)}%</p>
    </div>
    <div class="ev-stat" style="border-top:3px solid #38bdf8">
      <p class="ev-label">Ticket Médio</p>
      <p class="ev-big" style="color:#38bdf8">R$ ${media.ticket_medio.toFixed(2)}</p>
    </div>
    <div class="ev-stat" style="border-top:3px solid #68d391">
      <p class="ev-label">Taxa de Retorno</p>
      <p class="ev-big" style="color:#68d391">${(media.retencao * 100).toFixed(1)}%</p>
    </div>
    <div class="ev-stat" style="border-top:3px solid #F58216">
      <p class="ev-label">Vendem Pacotes</p>
      <p class="ev-big" style="color:#F58216">${comPacotes}/${total}</p>
    </div>
  </div>

  <section class="ev-card" style="border-top:4px solid #7B2CBF">
    <h2 class="ev-title">
      <span class="ev-badge" style="background:#7B2CBF;color:#fff">★</span>
      Análise da Rede
    </h2>
    <p class="ev-prose">${insight}</p>
  </section>

  <section class="ev-card" style="border-top:4px solid #1A2342">
    <h2 class="ev-title">Comparativo Detalhado</h2>
    <div style="overflow-x:auto">
      <table class="ev-table">
        <thead>
          <tr>
            <th>Barbearia</th>
            <th>Margem</th>
            <th>Ticket Médio</th>
            <th>Retorno</th>
            <th>Pacotes</th>
          </tr>
        </thead>
        <tbody>${linhasTabela}</tbody>
      </table>
    </div>
  </section>

  <p style="text-align:center;color:#475569;font-size:.75rem;padding-top:8px">
    Dados anonimizados e embaralhados a cada geração · eVOLUTA Business Intelligence
  </p>

</div>
</body>
</html>`;

return [{ json: { html, mes: $node["Webhook"].first().json.mes } }];
```

---

## Frontend (Hub)

### O que adicionar

**Nova rota:** `/benchmark`

**O que a página faz:**
- Campo para selecionar o mês
- Botão "Gerar" → chama `POST /api/benchmark/gerar` (aciona W3 via webhook)
- Botão "Visualizar" → abre a página gerada em nova aba
- Lista os benchmarks já gerados com data de criação

**Componente simples:**
```
┌─────────────────────────────────────┐
│  Benchmark da Rede                  │
│                                     │
│  Mês: [06/2026 ▼]  [Gerar]         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 06/2026 · 7 clientes        │    │
│  │ Gerado em 22/06/2026        │    │
│  │              [Visualizar →] │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Estados da UI
- **Gerando:** botão desabilitado + spinner (W3 pode levar 10–20s)
- **Gerado:** card com link para visualizar
- **Erro:** mensagem com motivo

---

## Ordem de implementação

1. Criar collections no MongoDB
2. Criar endpoints no backend
3. Montar o Workflow 3 no n8n e testar isolado
4. Adicionar rota `/benchmark` no Hub
5. Testar fluxo completo: Hub → W3 → HTML → visualização