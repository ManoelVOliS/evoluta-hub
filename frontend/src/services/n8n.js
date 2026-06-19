import * as XLSX from 'xlsx'

// ── Extrator de planilhas ──────────────────────────────────────────────────

const SCANNER_ON = ['cashbarber', 'trink']

function detectarCabecalho(rawData) {
  let maxCols = 0, headerRow = 0
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const filled = rawData[i].filter(c => c !== null && c !== undefined && c !== '').length
    if (filled > maxCols) { maxCols = filled; headerRow = i }
  }
  return headerRow
}

function lerArquivo(file, motor) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const sistema = motor.toLowerCase()
        let dados
        if (SCANNER_ON.includes(sistema)) {
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          const headerRow = detectarCabecalho(raw)
          dados = XLSX.utils.sheet_to_json(ws, { range: headerRow, defval: '' })
        } else {
          dados = XLSX.utils.sheet_to_json(ws, { defval: '' })
        }
        resolve(dados)
      } catch (err) {
        reject(new Error(`${file.name}: ${err.message}`))
      }
    }
    reader.onerror = () => reject(new Error(`Falha ao carregar ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

// Injeção de lançamentos manuais conforme formato esperado pelo n8n
function injetarManuais(dados, manuais, motor) {
  if (!manuais || !manuais.length) return dados
  const sistema = motor.toLowerCase()
  const chave1 = sistema === 'cashbarber' ? 'Faturamento Geral' : 'Geral'
  const chave2 = '__EMPTY'
  const linhasManuais = manuais
    .filter(m => m.metrica.trim())
    .map(m => ({ [chave1]: m.metrica, [chave2]: m.valor }))
  return [...dados, ...linhasManuais]
}

// Lê múltiplos arquivos e combina as linhas
export async function extrairPlanilhas(arquivos, motor, manuais = []) {
  const resultados = await Promise.all(arquivos.map(f => lerArquivo(f, motor)))
  const combinado  = resultados.flat()
  return injetarManuais(combinado, manuais, motor)
}

// ── Chamadas ao backend (que proxeia para o n8n) ──────────────────────────

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
})

export async function extrairMetricas(motor, dados_planilha) {
  const res = await fetch('/api/n8n/extrair', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ motor: motor.toUpperCase(), dados_planilha })
  })
  if (res.status === 503) throw new Error('n8n não configurado no servidor.')
  if (!res.ok) throw new Error('Falha na extração: ' + res.statusText)
  const json = await res.json()
  return json.numeros ?? json
}

export async function gerarRelatorioHTML(numeros) {
  const res = await fetch('/api/n8n/relatorio', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ numeros })
  })
  if (res.status === 503) throw new Error('n8n não configurado no servidor.')
  if (!res.ok) throw new Error('Falha na geração do relatório: ' + res.statusText)
  const json = await res.json()
  return json.html ?? json
}
