# Python Data Engine v2 - Corrigido

## 🎯 Problema Original

O sistema anterior tinha problemas ao processar planilhas com:
- ❌ Cabeçalhos em linhas diferentes
- ❌ Células mescladas
- ❌ Linhas de total misturadas com dados
- ❌ Duas seções com estruturas levemente diferentes

## ✅ Correções Aplicadas

### 1. **Formato de Saída Compatível com N8N**

**ANTES**: O endpoint `/parse-sheet` retornava apenas metadados, sem os dados reais.

**DEPOIS**: Novo endpoint `/process-for-n8n` retorna exatamente o que o N8N DC Pipeline espera:

```json
{
  "user_id": "...",
  "intent": "gerar dashboard",
  "file": {
    "name": "arquivo.xlsx",
    "type": "xlsx",
    "columns": ["Col1", "Col2", ...]
  },
  "columns": [
    {"name": "Col1", "type": "currency", "sample": [...]},
    ...
  ],
  "sample_data": [
    {"Col1": "valor1", "Col2": "valor2", ...},
    ...
  ],
  "row_count": 150,
  "timestamp": "2025-12-30T17:00:00Z"
}
```

### 2. **Detecção de Cabeçalhos Mais Flexível**

- Threshold reduzido de 0.55 para 0.45
- Suporte a cabeçalhos com datas (ex: meses como colunas)
- Melhor propagação de células mescladas horizontalmente

### 3. **Detecção de Linhas de Total Expandida**

Agora detecta mais padrões:
- `total`, `subtotal`, `totais`
- `total geral`, `geral`
- `soma`, `sum`, `grand total`
- `média`, `average`
- Padrões como `Total:` ou `Soma =`

### 4. **Melhor Tratamento de Células Mescladas**

- Propaga valores mesclados horizontalmente nos cabeçalhos
- Mantém integridade de células mescladas verticalmente
- Suporte a diferentes encodings de CSV

---

## 📋 Endpoints Disponíveis

### `POST /process-for-n8n` ⭐ PRINCIPAL

Use este endpoint para integrar com o N8N DC Pipeline.

**Parâmetros:**
- `file` (obrigatório): Arquivo Excel ou CSV
- `user_id` (obrigatório): ID do usuário
- `intent` (opcional): Intenção (default: "gerar dashboard")
- `sheet` (opcional): Nome da sheet (default: primeira com dados)
- `block_index` (opcional): Índice do bloco (default: 0)

**Exemplo de uso no N8N (HTTP Request):**
```
POST https://seu-servidor.com/process-for-n8n
Content-Type: multipart/form-data

file: [arquivo]
user_id: "user_123"
intent: "analisar vendas"
```

### `POST /list-blocks`

Lista todos os blocos de dados encontrados no arquivo.

**Parâmetros:**
- `file`: Arquivo Excel ou CSV

**Retorno:**
```json
{
  "status": "ok",
  "sheets": [
    {
      "name": "Planilha1",
      "blocks": [
        {
          "index": 0,
          "id": "Planilha1_block_1",
          "columns": ["A", "B", "C"],
          "row_count": 50,
          "preview": [...]
        }
      ]
    }
  ]
}
```

### `POST /parse-sheet` (Legado)

Mantido para compatibilidade. Use `/list-blocks` para novos projetos.

### `POST /extract-block` (Legado)

Mantido para compatibilidade. Use `/process-for-n8n` para novos projetos.

### `GET /health`

Health check simples.

---

## 🔧 Como Usar com o N8N DC Pipeline

### Opção A: Substituir o HTTP Request no N8N

1. Adicione um nó HTTP Request ANTES do "Validate & Normalize"
2. Configure:
   - Method: POST
   - URL: `https://seu-servidor.com/process-for-n8n`
   - Body Type: Form-Data
   - Form Parameters:
     - `file`: Binário do arquivo
     - `user_id`: `{{ $json.user_id }}`
     - `intent`: `{{ $json.intent }}`

3. O output já estará no formato correto para o "Validate & Normalize"

### Opção B: Chamar via Code Node

```javascript
const formData = new FormData();
formData.append('file', $binary.file.data, 'arquivo.xlsx');
formData.append('user_id', $json.user_id);

const response = await fetch('https://seu-servidor.com/process-for-n8n', {
  method: 'POST',
  body: formData
});

return [{ json: await response.json() }];
```

---

## 📁 Estrutura de Arquivos

```
app/
├── __init__.py
├── main.py           # API FastAPI
├── reader.py         # Leitura de Excel/CSV
├── block_detector.py # Detecção de blocos
└── normalizer.py     # Normalização de saída
```

---

## 🚀 Instalação

```bash
pip install fastapi uvicorn pandas openpyxl python-multipart

# Para rodar:
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 📝 Changelog v2

- ✅ Novo endpoint `/process-for-n8n` com formato compatível
- ✅ Novo endpoint `/list-blocks` para listar blocos disponíveis
- ✅ Detecção de tipos de colunas (date, currency, number, category, text)
- ✅ Threshold de cabeçalho reduzido para pegar mais casos
- ✅ Mais padrões de detecção de linhas de total
- ✅ Propagação de células mescladas horizontalmente
- ✅ Suporte a diferentes encodings de CSV
- ✅ Melhor tratamento de erros
- ✅ Health check endpoint
