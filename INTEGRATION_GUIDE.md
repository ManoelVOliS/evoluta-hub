# AutoReport AI — Guia de Integração e Migração

> Documento de referência para recriar ou portar o projeto para outro ambiente.  
> Captura as decisões de arquitetura, fluxos de dados e pontos de integração externos.

---

## Visão Geral da Arquitetura

```
[Usuário]
   │
   ▼
[WizardUpload]           ← Dropzone + Seleção de Sistema + Tabela Manual
   │
   ├─ extratorXLSX.js   ← Lê os arquivos localmente (sem servidor)
   │
   ▼
[n8n — WEBHOOK_EXTRAIR]  ← Recebe JSON limpo, aplica IA, devolve métricas
   │
   ▼
[Dashboard]              ← Exibe GridMetricas, Gráficos, TabelasOperacionais
   │
   ▼
[n8n — WEBHOOK_RELATORIO] ← Gera o HTML do relatório via IA
   │
   ▼
[RelatorioHTML]          ← Visualiza, edita, exporta PDF / .html
```

---

## 1. Integração com n8n (API)

**Arquivo:** `src/services/api.js`

```js
export const WEBHOOK_EXTRAIR   = '/api-n8n/webhook/ea5a181e-71b6-43b1-b7c2-b2ef096e54f6';
export const WEBHOOK_RELATORIO = '/api-n8n/webhook/7e1419d5-2155-4335-a88a-0706b8ee2a6f';
```

### Proxy (Vite)

As chamadas usam o prefixo `/api-n8n` que é reescrito pelo Vite para o servidor n8n real.  
Configurar em `vite.config.js`:

```js
server: {
  proxy: {
    '/api-n8n': {
      target: 'http://<IP_DO_N8N>:5678',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api-n8n/, '')
    }
  }
}
```

### Chamada 1 — Extração (`WEBHOOK_EXTRAIR`)

**Quem chama:** `WizardUpload.jsx > handleProcessarPlanilhas()`

**Payload enviado:**
```json
{
  "motor": "APPBARBER | TRINK | CASHBARBER",
  "dados_planilha": [ ...linhas do JSON extraído das planilhas... ]
}
```

**Resposta esperada (response.data):**
```json
{
  "numeros": {
    "financeiro": { "entrada": 0, "saida": 0, "comissao_total": 0, "lucro_real": 0 },
    "clientes":   { "base_total": 0, "novos_marco": 0 },
    "produtos":   { "quantidade_total_vendida": 0 },
    "estoque":    { "repor": [] },
    "meta":       { "mes_analisado": "Março/2025" },
    "urls_graficos": {
      "dre_pizza": "https://...",
      "faturamento_servicos_barbeiro": "https://...",
      "ticket_medio": "https://...",
      "receita_fisica_recorrente": "https://...",
      "vendas_produtos_barbeiro": "https://...",
      "qtd_clientes_barbeiro": "https://...",
      "fidelidade_clientes": "https://...",
      "conversao_assinaturas": "https://..."
    }
  }
}
```

### Chamada 2 — Relatório (`WEBHOOK_RELATORIO`)

**Quem chama:** `App.jsx > handleGerarRelatorio()`

**Payload enviado:**
```json
{ "numeros": { ...objeto numeros completo... } }
```

**Resposta esperada:**
```json
{ "html": "<html>...relatório completo gerado pela IA...</html>" }
```

---

## 2. Dropzone

**Arquivo:** `src/components/WizardUpload.jsx`  
**Biblioteca:** `react-dropzone`

```js
import { useDropzone } from 'react-dropzone';

const onDrop = useCallback((acceptedFiles) => {
  const planilhas = acceptedFiles.filter(file =>
    file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
  );
  setArquivos(prev => [...prev, ...planilhas]);
}, []);

const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
```

- Aceita múltiplos arquivos em sequência (array acumulado no state)
- Filtro manual por extensão no `onDrop`
- `isDragActive` controla o estilo visual da zona de drop

---

## 3. Extrator XLSX

**Arquivo:** `src/services/extratorXLSX.js`  
**Biblioteca:** `xlsx` (SheetJS)

```js
import * as XLSX from 'xlsx';
```

### Assinatura

```js
export const processarPlanilhas = async (arquivos, sistema, lancamentosManuais) => {}
```

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `arquivos` | `File[]` | Lista vinda do Dropzone |
| `sistema` | `string` | `'appbarber'`, `'trink'` ou `'cashbarber'` |
| `lancamentosManuais` | `Array<{metrica, valor}>` | Inserções manuais da UI |

### Lógica do Scanner Automático

O **Scanner** é ativado automaticamente para `trink` e `cashbarber` porque essas plataformas exportam planilhas com cabeçalhos sujos (linhas de metadados antes da tabela real).

```
Sistema       │ Scanner │ Comportamento
──────────────┼─────────┼──────────────────────────────────────────────
appbarber     │  OFF    │ Lê a planilha direto (sheet_to_json padrão)
trink         │  ON     │ Varre as 20 primeiras linhas, encontra a linha
cashbarber    │  ON     │ com mais colunas preenchidas e usa como header
```

**Algoritmo de detecção de cabeçalho:**
```js
// Nas primeiras 20 linhas, a que tiver mais colunas não-vazias = cabeçalho real
for (let i = 0; i < Math.min(20, rawData.length); i++) {
  const colunasPreenchidas = rawData[i].filter(c => c !== null && c !== undefined && c !== "").length;
  if (colunasPreenchidas > maxColunas) {
    maxColunas = colunasPreenchidas;
    linhaDoCabecalho = i;
  }
}
XLSX.utils.sheet_to_json(worksheet, { range: linhaDoCabecalho, defval: "" });
```

### Injeção da Tabela Geral Manual

Quando o sistema falha ao exportar os totais, o usuário preenche manualmente. Os dados são injetados no JSON com as chaves corretas por plataforma:

```js
const chaveColuna1 = sistema === 'cashbarber' ? 'Faturamento Geral' : 'Geral';
const chaveColuna2 = '__EMPTY';

lancamentosManuais.map(lanc => ({
  [chaveColuna1]: lanc.metrica,
  [chaveColuna2]: lanc.valor
}));
```

---

## 4. Configuração de Sistemas Suportados

**Arquivo:** `src/config/sistemas.js`

```js
export const sistemasSuportados = [
  { id: 'APPBARBER',  nome: 'APPBARBER',  icone: '⚙️', sistema: 'appbarber'  },
  { id: 'TRINK',      nome: 'TRINK',      icone: '👑', sistema: 'trink'      },
  { id: 'CASHBARBER', nome: 'CASHBARBER', icone: '💈', sistema: 'cashbarber' }
];
```

Para adicionar um novo sistema: incluir aqui + adicionar o comportamento do Scanner em `extratorXLSX.js`.

---

## 5. Fluxo de Estado (App.jsx)

```
State                 Valor inicial   Quem muda
────────────────────  ──────────────  ────────────────────────────────
dadosExtraidos        null            WizardUpload → onSucesso(response.data)
relatorioHTML         null            handleGerarRelatorio → setRelatorioHTML(res.data.html)
statusRelatorio       'idle'          'gerando' → 'gerado' | 'erro'
```

- `dadosExtraidos === null` → mostra `WizardUpload`
- `dadosExtraidos !== null` → mostra `Dashboard`
- Botão "Nova Análise" chama `resetarTudo()` → volta para o estado inicial

---

## 6. Componentes Visuais do Dashboard

| Componente | Entrada | O que faz |
|---|---|---|
| `HeaderAcoes` | `mesReferencia`, `statusRelatorio`, `onGerarRelatorio` | Cabeçalho com botão "Gerar Relatório" |
| `GridMetricas` | `numeros` | 8 cards: Faturamento, Despesas, Comissão, Lucro, Clientes, Novos, Produtos, Estoque |
| `GraficoPreview` | `numeros.urls_graficos` | Grid de imagens dos gráficos gerados pela IA no n8n |
| `TabelasOperacionais` | `numeros` | Tabelas detalhadas de operação |
| `RelatorioHTML` | `html`, `onChange`, `mesReferencia`, `loading` | Iframe + editor de HTML + botões de export |

### Mapeamento de chaves do JSON `numeros`

```
numeros.financeiro.entrada              → Faturamento Bruto
numeros.financeiro.saida                → Saída / Despesas
numeros.financeiro.comissao_total       → Comissões Pagas
numeros.financeiro.lucro_real           → Lucro Real
numeros.clientes.base_total             → Retorno de Clientes
numeros.clientes.novos_marco            → Novos Clientes
numeros.produtos.quantidade_total_vendida → Itens Vendidos
numeros.estoque.repor                   → Array de itens para repor (length = contagem)
numeros.meta.mes_analisado              → Mês exibido no cabeçalho
numeros.urls_graficos.*                 → URLs das imagens dos gráficos
```

---

## 7. Utilitários de Export

**Arquivo:** `src/Utils/exportDocs.js`

```js
// Abre nova janela e dispara window.print() → salva como PDF
export const imprimirRelatorio = (htmlCompleto) => { ... }

// Cria Blob e força download do arquivo .html
export const exportarRelatorioHTML = (html, mesReferencia) => { ... }
```

- O nome do arquivo segue o padrão: `Relatorio_MES-ANO.html`
- O PDF é gerado via impressão nativa do browser (sem biblioteca externa)

---

## 8. Dependências Críticas

```json
"react-dropzone": "para a zona de upload",
"xlsx":           "para leitura client-side das planilhas",
"axios":          "para chamadas HTTP aos webhooks do n8n",
"lucide-react":   "ícones",
"tailwindcss":    "estilização"
```

---

## 9. Variáveis de Ambiente / Configuração para Migração

| O que mudar | Onde | Valor atual |
|---|---|---|
| Endereço do n8n | `vite.config.js` → `proxy.target` | `http://<IP>:5678` |
| UUID do webhook de extração | `src/services/api.js` | `ea5a181e-...` |
| UUID do webhook de relatório | `src/services/api.js` | `7e1419d5-...` |

---

## 10. Checklist de Migração

- [ ] Configurar instância do n8n e importar os workflows
- [ ] Atualizar os dois UUIDs em `src/services/api.js`
- [ ] Configurar o proxy em `vite.config.js` apontando para o n8n
- [ ] Instalar dependências: `npm install`
- [ ] Testar upload com planilha AppBarber (scanner off)
- [ ] Testar upload com planilha Trink/Cashbarber (scanner on)
- [ ] Testar geração de relatório HTML
- [ ] Testar export PDF e download .html
