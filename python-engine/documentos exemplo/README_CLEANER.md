# 🧹 Python Engine - Limpeza de Planilhas para N8N

## 📋 Objetivo

Este módulo Python foi desenvolvido para **limpar planilhas** de forma simples e cirúrgica antes de enviá-las para o webhook do N8N. Ele remove:

1. ✅ **Linhas nulas no topo** da planilha
2. ✅ **Logos e imagens** incorporadas
3. ✅ **Anotações de rodapé** desnecessárias

## 🏗️ Arquitetura

```
python-engine/
├── app/
│   ├── cleaner.py          ← 🆕 NOVO! Módulo de limpeza cirúrgica
│   ├── reader.py           ← Atualizado com limpeza automática
│   ├── block_detector.py   ← Detecta blocos de dados
│   ├── normalizer.py       ← Normaliza dados
│   └── main.py             ← API FastAPI
├── test_cleaner.py         ← 🆕 Script de teste
└── requirements.txt
```

## 🔧 Módulo `cleaner.py`

### Funções principais:

#### 1. `remove_top_empty_rows(df)`
Remove todas as linhas vazias do início da planilha.

**Exemplo:**
```python
# ANTES:
# [linha vazia]
# [linha vazia]
# [Nome | Idade | Cidade]
# [João | 25    | SP    ]

# DEPOIS:
# [Nome | Idade | Cidade]
# [João | 25    | SP    ]
```

#### 2. `remove_footer_rows(df)`
Remove anotações de rodapé como "Obs:", "Nota:", etc.

**Exemplo:**
```python
# ANTES:
# [Cliente A | 1000]
# [Cliente B | 2000]
# [           |     ]
# [Obs: Dados de 2024]
# [Fonte: Sistema XYZ]

# DEPOIS:
# [Cliente A | 1000]
# [Cliente B | 2000]
```

#### 3. `remove_images_from_excel(content)`
Remove todas as imagens, logos e desenhos de arquivos Excel.

#### 4. `clean_spreadsheet(file, filename)`
**Função principal** que aplica todas as limpezas de uma vez.

## 🚀 Como Usar

### Opção 1: Via API (Recomendado para N8N)

O endpoint `/process-for-n8n` já usa a limpeza automaticamente:

```bash
curl -X POST http://localhost:8000/process-for-n8n \
  -F "file=@planilha.xlsx" \
  -F "user_id=123" \
  -F "intent=gerar dashboard"
```

**Resposta limpa e pronta para JSON:**
```json
{
  "user_id": "123",
  "intent": "gerar dashboard",
  "file": {
    "name": "planilha.xlsx",
    "type": "xlsx",
    "columns": ["Cliente", "Valor", "Data"]
  },
  "sample_data": [
    {"Cliente": "Cliente A", "Valor": 1000, "Data": "2024-01-01"},
    {"Cliente": "Cliente B", "Valor": 2000, "Data": "2024-01-02"}
  ],
  "row_count": 2
}
```

### Opção 2: Usar diretamente no código

```python
from app.cleaner import clean_spreadsheet

# Limpa a planilha
cleaned_sheets = clean_spreadsheet(file, "planilha.xlsx")

# Agora os dados estão limpos e prontos!
for sheet_name, df in cleaned_sheets.items():
    print(f"Sheet: {sheet_name}")
    print(df)
```

## 🧪 Testar a limpeza

Execute o script de teste:

```bash
cd python-engine
python test_cleaner.py
```

Você verá exemplos de:
- ✅ Remoção de linhas vazias do topo
- ✅ Remoção de rodapés
- ✅ Limpeza completa (topo + rodapé)

## 📦 Instalação

```bash
cd python-engine
pip install -r requirements.txt
```

## ▶️ Executar a API

```bash
cd python-engine
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A API estará disponível em `http://localhost:8000`

## 🎯 Fluxo de Dados para N8N

```
┌─────────────────┐
│  Planilha Excel │
│  (com logos,    │
│   linhas vazias,│
│   rodapés)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  cleaner.py     │
│  - Remove topo  │
│  - Remove logos │
│  - Remove rodapé│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  reader.py      │
│  - Lê planilha  │
│  - Merged cells │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ block_detector  │
│  - Detecta      │
│    cabeçalhos   │
│  - Separa dados │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   main.py       │
│  - Gera JSON    │
│  - Envia N8N    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Webhook N8N    │
│  (dados limpos) │
└─────────────────┘
```

## ✨ Diferencial

Este código é **simples e cirúrgico**:

- ❌ Não tenta adivinhar estruturas complexas
- ❌ Não usa IA ou heurísticas complicadas
- ✅ Faz apenas 3 coisas muito bem feitas
- ✅ Código limpo e fácil de manter
- ✅ Integração transparente com o sistema existente

## 📝 Logs e Debug

Para ver o que está sendo removido, adicione prints no `cleaner.py`:

```python
def remove_top_empty_rows(df):
    # ...código...
    print(f"✂️ Removidas {idx} linhas vazias do topo")
    return df.iloc[idx:].reset_index(drop=True)
```

## 🔗 Integração com N8N

O webhook do N8N receberá dados já limpos:

- ✅ Sem linhas vazias
- ✅ Sem logos ou imagens
- ✅ Sem rodapés de observação
- ✅ Pronto para conversão em JSON
- ✅ Pronto para análise e dashboard

## 🆘 Suporte

Em caso de dúvidas ou problemas:

1. Verifique os logs da API
2. Execute `test_cleaner.py` para validar
3. Teste com `/health` para verificar se a API está rodando

---

**Desenvolvido com ❤️ para processamento limpo de planilhas!**
