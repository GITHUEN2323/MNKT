# MonkeyType Cheat - Integração Tampermonkey + Python

## 📋 Visão Geral

Sistema integrado que extrai texto do MonkeyType via Tampermonkey e envia para um servidor Python que simula digitação humanizada.

## 🚀 Como Usar

### 1. Instalar Dependências
```bash
pip install -r requirements.txt
```

### 2. Iniciar Servidor Python
```bash
python servidor.py
```
O servidor iniciará em `http://localhost:8080`

### 3. Instalar Script Tampermonkey
1. Abra o Tampermonkey no seu navegador
2. Crie um novo script
3. Cole o conteúdo do arquivo `words-html`
4. Salve o script

### 4. Usar no MonkeyType
1. Acesse qualquer página do MonkeyType
2. Aguarde o botão "Extrair #words" aparecer no canto inferior direito
3. Verifique se o status mostra "Conectado" (verde)
4. Clique em "Extrair #words" para enviar o texto para o Python
5. No terminal do Python, acesse `http://localhost:8080/iniciar` ou use o endpoint para iniciar a digitação

## 📡 Endpoints do Servidor

- `GET /status` - Verifica status do servidor
- `POST /texto` - Recebe texto extraído do Tampermonkey  
- `GET /iniciar` - Inicia processo de digitação automática

## 🎯 Funcionalidades

### Script Tampermonkey (`words-html`)
- ✅ Extrai texto do elemento `#words` automaticamente
- ✅ Testa conexão com servidor Python a cada 3 segundos
- ✅ Interface visual com status de conexão
- ✅ Envia texto via fetch POST para `/texto`
- ✅ Confirmação visual quando texto é enviado

### Servidor Python (`servidor.py`)
- ✅ Servidor HTTP com CORS habilitado
- ✅ Recebe e processa texto do Tampermonkey
- ✅ Sistema de digitação humanizada com:
  - Delays variáveis entre caracteres (0.05-0.09s)
  - Erros ocasionais com correção automática (13% chance)
  - Delays anômalos para simular comportamento humano (3% chance)
- ✅ Progresso em tempo real
- ✅ Estatísticas de velocidade (WPM)

## 🔧 Configurações

### Digitação (em `servidor.py`)
```python
typo_chance = 13  # Chance de erro (%)
character_entry_time_min = 0.05  # Tempo mínimo entre caracteres
character_entry_time_max = 0.09  # Tempo máximo entre caracteres
outlier_chance = 3  # Chance de delay anômalo (%)
```

### Conexão (em `words-html`)
```javascript
const PYTHON_SERVER = 'http://localhost:8080';  // URL do servidor
```

## 📊 Status e Logs

### Tampermonkey
- 🔴 "Desconectado" - Servidor Python offline
- 🟢 "Conectado" - Comunicação estabelecida
- 🔵 "Enviando..." - Enviando texto para Python

### Servidor Python
```
TEXTO RECEBIDO DO TAMPERMONKEY!
Texto: the quick brown fox jumps...
URL: https://monkeytype.com
Tamanho: 245 caracteres

CONEXAO ESTABELECIDA COM TAMPERMONKEY!
Pronto para iniciar digitacao!
```

## 🛠️ Solução de Problemas

### Erro "Servidor offline"
- Verifique se `servidor.py` está rodando
- Confirme que a porta 8080 não está bloqueada
- Teste: `curl http://localhost:8080/status`

### Erro "Não achei o container #words"
- Verifique se está em uma página do MonkeyType
- Aguarde a página carregar completamente
- O elemento `#words` deve estar presente no DOM

### Problemas de Encoding (Windows)
- O servidor foi corrigido para funcionar no Windows
- Emojis foram removidos para evitar erros de codificação

## 📁 Estrutura dos Arquivos

```
monkeytype-cheat-main/
├── servidor.py          # Servidor Python principal
├── words-html           # Script Tampermonkey
├── main.py             # Versão original (não usar)
├── requirements.txt    # Dependências Python
├── words.txt           # Arquivo de exemplo
└── README_INTEGRACAO.md # Este arquivo
```

## 🎮 Fluxo Completo

1. **Usuário** executa `python servidor.py`
2. **Servidor** inicia em localhost:8080 e aguarda conexões
3. **Tampermonkey** detecta servidor e mostra status "Conectado"
4. **Usuário** acessa MonkeyType e clica "Extrair #words"
5. **JavaScript** extrai texto e envia via POST para `/texto`
6. **Servidor** recebe texto e confirma no terminal
7. **Usuário** acessa `/iniciar` para começar digitação automática
8. **Python** simula digitação humanizada com delays e erros ocasionais

## ⚡ Melhorias Implementadas

- ✅ Comunicação bidirecional Tampermonkey ↔ Python
- ✅ Interface visual de status no navegador
- ✅ Sistema de reconexão automática
- ✅ Digitação humanizada com variações realistas
- ✅ Logs detalhados e informativos
- ✅ Tratamento de erros robusto
- ✅ Compatibilidade com Windows (encoding corrigido)

---

**Desenvolvido por:** Kelve Style  
**Versão:** 2.0 - Integração Tampermonkey + Python
