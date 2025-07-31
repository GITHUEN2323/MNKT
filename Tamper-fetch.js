// ==UserScript==
// @name         Extrair #words e enviar para Python
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Extrai texto do #words e envia para servidor Python via fetch
// @author       Kelve Style
// @match        https://monkeytype.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Configuração do servidor Python
    const PYTHON_SERVER = 'http://localhost:8080';

    // Status da conexão
    let conectado = false;
    let monitoramentoAtivo = false;
    let textoAnterior = '';
    let intervalMonitoramento = null;
    let ultimaDeteccao = null;
    let timeoutMonitoramento = null;

    // Container principal
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        fontFamily: 'Segoe UI, Arial, sans-serif',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,240,240,0.95))',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.3)',
        minWidth: '220px',
        maxWidth: '280px'
    });
    document.body.appendChild(container);

    // Título do menu
    const title = document.createElement('div');
    title.textContent = '🐒 MonkeyType Cheat';
    Object.assign(title.style, {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: '12px',
        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
    });
    container.appendChild(title);

    // Botão principal
    const btn = document.createElement('button');
    btn.textContent = '📝 Extrair Texto';
    Object.assign(btn.style, {
        display: 'block',
        width: '100%',
        padding: '14px 20px',
        fontSize: '14px',
        fontWeight: '600',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        userSelect: 'none',
        marginBottom: '10px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    });
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
    });
    container.appendChild(btn);

    // Botão iniciar digitação
    const startBtn = document.createElement('button');
    startBtn.textContent = '🚀 Iniciar Digitação';
    startBtn.disabled = true;
    Object.assign(startBtn.style, {
        display: 'block',
        width: '100%',
        padding: '14px 20px',
        fontSize: '14px',
        fontWeight: '600',
        background: 'linear-gradient(135deg, #48bb78, #38a169)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        userSelect: 'none',
        marginBottom: '12px',
        opacity: '0.6',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(72, 187, 120, 0.3)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    });
    startBtn.addEventListener('mouseenter', () => {
        if (!startBtn.disabled) {
            startBtn.style.transform = 'translateY(-2px)';
            startBtn.style.boxShadow = '0 6px 20px rgba(72, 187, 120, 0.4)';
        }
    });
    startBtn.addEventListener('mouseleave', () => {
        startBtn.style.transform = 'translateY(0)';
        startBtn.style.boxShadow = '0 4px 15px rgba(72, 187, 120, 0.3)';
    });
    container.appendChild(startBtn);

    // Controle de velocidade
    const speedContainer = document.createElement('div');
    Object.assign(speedContainer.style, {
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
        padding: '12px',
        borderRadius: '12px',
        marginBottom: '12px',
        color: '#333',
        fontSize: '13px',
        border: '1px solid rgba(102, 126, 234, 0.2)'
    });

    const speedLabel = document.createElement('div');
    speedLabel.textContent = '⚡ Velocidade: 1.0x';
    Object.assign(speedLabel.style, {
        marginBottom: '8px',
        fontWeight: '600',
        textAlign: 'center',
        color: '#4a5568'
    });
    speedContainer.appendChild(speedLabel);

    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0.1';
    speedSlider.max = '10.0';
    speedSlider.step = '0.1';
    speedSlider.value = '1.0';
    Object.assign(speedSlider.style, {
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: '#e2e8f0',
        outline: 'none',
        WebkitAppearance: 'none',
        cursor: 'pointer'
    });

    // Estilo personalizado para o thumb do slider
    const style = document.createElement('style');
    style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
    `;
    document.head.appendChild(style);

    speedContainer.appendChild(speedSlider);
    container.appendChild(speedContainer);

    // Status da conexão
    const statusDiv = document.createElement('div');
    statusDiv.textContent = '🔴 Desconectado';
    Object.assign(statusDiv.style, {
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: '600',
        background: 'linear-gradient(135deg, #f56565, #e53e3e)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        userSelect: 'none',
        textAlign: 'center',
        boxShadow: '0 4px 15px rgba(245, 101, 101, 0.3)',
        animation: 'pulse 2s infinite'
    });

    // Adicionar animação de pulso
    const pulseStyle = document.createElement('style');
    pulseStyle.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    `;
    document.head.appendChild(pulseStyle);

    container.appendChild(statusDiv);

    // Função para extrair texto do #words
    function extrairTexto() {
        const containerWords = document.querySelector('#words');
        if (!containerWords) {
            console.log('Container #words não encontrado');
            return null;
        }

        // Pega todas as palavras dentro de #words
        const wordDivs = Array.from(containerWords.querySelectorAll('div.word'));
        const palavras = wordDivs.map(div => {
            // Verificar se há letras dentro da palavra
            const letras = div.querySelectorAll('letter');
            if (letras.length > 0) {
                return Array.from(letras).map(l => l.textContent?.trim() || '').join('');
            } else {
                // Se não houver letras, tentar pegar o texto diretamente
                return div.textContent?.trim() || '';
            }
        }).filter(palavra => palavra.length > 0); // Filtrar palavras vazias

        const frase = palavras.join(' ');
        
        // Log detalhado para debug
        console.log('Palavras extraídas:', palavras);
        console.log('Total de palavras:', palavras.length);
        console.log('Texto completo:', frase);

        return frase;
    }

    // Função para enviar texto para o servidor
    async function enviarTexto(texto) {
        if (!conectado || !texto) return false;
        
        try {
            const response = await fetch(`${PYTHON_SERVER}/texto`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    texto: texto,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                const resultado = await response.json();
                console.log('Texto enviado com sucesso:', resultado);
                return true;
            }
        } catch (error) {
            console.error('Erro ao enviar texto:', error);
        }
        return false;
    }

    // Função de monitoramento contínuo
    function monitorarTexto() {
        const textoAtual = extrairTexto();
        
        if (textoAtual && textoAtual !== textoAnterior) {
            console.log('Novo texto detectado:', textoAtual);
            console.log('Texto anterior:', textoAnterior);
            console.log('Diferença de tamanho:', textoAtual.length - textoAnterior.length);
            
            // Atualizar timestamp da última detecção
            ultimaDeteccao = Date.now();
            
            // Resetar timeout
            if (timeoutMonitoramento) {
                clearTimeout(timeoutMonitoramento);
            }
            
            // Configurar novo timeout de 5 segundos
            timeoutMonitoramento = setTimeout(() => {
                console.log('Timeout de 5s atingido - finalizando monitoramento');
                finalizarMonitoramento();
            }, 5000);
       
            // Enviar texto para o servidor (apenas acumular, não digitar)
            enviarTexto(textoAtual).then(sucesso => {
                if (sucesso) {
                    console.log('Texto novo acumulado no servidor');
                }
            });
            
            textoAnterior = textoAtual;
        }
    }
    
    // Função para finalizar monitoramento
    function finalizarMonitoramento() {
        if (monitoramentoAtivo || intervalMonitoramento) {
            monitoramentoAtivo = false;
            
            if (intervalMonitoramento) {
                clearInterval(intervalMonitoramento);
                intervalMonitoramento = null;
            }
            
            if (timeoutMonitoramento) {
                clearTimeout(timeoutMonitoramento);
                timeoutMonitoramento = null;
            }
            
            // Atualizar botão startBtn
            startBtn.textContent = '🚀 Iniciar Digitação';
            startBtn.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
            
            textoAnterior = '';
            ultimaDeteccao = null;
            
            console.log('Monitoramento finalizado - texto acumulado disponível para digitação manual');
        }
    }

    // Função para testar conexão
    async function testarConexao() {
        try {
            console.log('Testando conexão com:', PYTHON_SERVER);
            console.log('URL atual:', window.location.href);
            
            // Configuração simplificada para evitar problemas CORS
            const response = await fetch(`${PYTHON_SERVER}/status`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit', // Não enviar cookies/credenciais
                cache: 'no-cache'
            });
            
            console.log('Resposta recebida:', response.status, response.statusText);
            
            if (response.ok) {
                conectado = true;
                statusDiv.textContent = '🟢 Conectado';
                statusDiv.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
                statusDiv.style.animation = 'none';
                btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                btn.textContent = '📝 Extrair Texto';
                
                // Habilitar botão de digitação se houver texto
                const data = await response.json();
                if (data.texto_recebido) {
                    startBtn.disabled = false;
                    startBtn.style.opacity = '1';
                    startBtn.style.cursor = 'pointer';
                    startBtn.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
                }
                
                console.log('Conexão estabelecida com sucesso!');
                return true;
            } else {
                console.log('Resposta não OK:', response.status);
            }
        } catch (error) {
            console.error('Erro detalhado de conexão:', {
                message: error.message,
                name: error.name,
                stack: error.stack,
                url: window.location.href,
                servidor: PYTHON_SERVER
            });
            
            // Verificar se é erro de CORS/Mixed Content
            if (error.message.includes('CORS') || error.message.includes('Mixed Content')) {
                statusDiv.textContent = 'Erro CORS/HTTPS';
            } else if (error.message.includes('fetch')) {
                statusDiv.textContent = 'Servidor offline';
            } else {
                statusDiv.textContent = 'Erro conexão';
            }
        }
        
        conectado = false;
        statusDiv.textContent = '🔴 Desconectado';
        statusDiv.style.background = 'linear-gradient(135deg, #f56565, #e53e3e)';
        statusDiv.style.animation = 'pulse 2s infinite';
        btn.style.background = 'linear-gradient(135deg, #a0aec0, #718096)';
        btn.textContent = '📝 Servidor Offline';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.6';
        startBtn.style.background = 'linear-gradient(135deg, #a0aec0, #718096)';
        return false;
    }

    // Event listeners
    speedSlider.addEventListener('input', async function() {
        const speed = parseFloat(this.value);
        speedLabel.textContent = `⚡ Velocidade: ${speed}x`;
        
        if (conectado) {
            try {
                await fetch(`${PYTHON_SERVER}/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speed: speed })
                });
            } catch (error) {
                console.error('Erro ao atualizar velocidade:', error);
            }
        }
    });
    
    startBtn.addEventListener('click', async function() {
        if (!conectado) {
            alert('❌ Servidor Python não está conectado!');
            return;
        }
        
        if (!monitoramentoAtivo) {
            // Ativar monitoramento e digitação
            this.disabled = true;
            this.style.opacity = '0.7';
            
            // Ativar monitoramento no servidor
            try {
                const monitorResponse = await fetch(`${PYTHON_SERVER}/monitoramento`);
                const monitorData = await monitorResponse.json();
                monitoramentoAtivo = monitorData.ativo;
            } catch (error) {
                console.error('Erro ao ativar monitoramento:', error);
            }
            
            // Iniciar monitoramento local
            intervalMonitoramento = setInterval(monitorarTexto, 100); // Ainda mais rápido
            ultimaDeteccao = Date.now();
            
            // Iniciar digitação do texto atual
            try {
                const response = await fetch(`${PYTHON_SERVER}/iniciar`);
                if (response.ok) {
                    this.textContent = '⏹️ Parar Digitação';
                    this.style.background = 'linear-gradient(135deg, #f56565, #e53e3e)';
                    this.disabled = false;
                    this.style.opacity = '1';
                    
                    console.log('Digitação iniciada com monitoramento ativo');
                }
            } catch (error) {
                console.error('Erro ao iniciar digitação:', error);
                alert('❌ Erro ao iniciar digitação!');
                finalizarMonitoramento();
                this.textContent = '🚀 Iniciar Digitação';
                this.disabled = false;
                this.style.opacity = '1';
            }
        } else {
            // Parar monitoramento e digitação
            finalizarMonitoramento();
            this.textContent = '🚀 Iniciar Digitação';
            this.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
            console.log('Digitação e monitoramento parados');
        }
    });
    
    // Testar conexão a cada 3 segundos
    setInterval(testarConexao, 3000);
    testarConexao(); // Teste inicial

    btn.addEventListener('click', async () => {
        if (!conectado) {
            alert('Servidor Python não está conectado!');
            return;
        }

        const frase = extrairTexto();
        if (!frase) {
            alert('Não achei o container #words na página!');
            return;
        }

        // Enviar texto para o servidor Python
        try {
            btn.textContent = 'Enviando...';
            btn.disabled = true;
            
            const sucesso = await enviarTexto(frase);
            
            if (sucesso) {
                // Mostrar sucesso
                btn.textContent = '✓ Texto enviado!';
                btn.style.backgroundColor = '#28a745';
                
                // Habilitar botão de digitação
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.style.cursor = 'pointer';
                
                // Criar painel de confirmação
                let painel = document.querySelector('#painel-status');
                if (!painel) {
                    painel = document.createElement('div');
                    painel.id = 'painel-status';
                    Object.assign(painel.style, {
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        padding: '15px',
                        fontSize: '14px',
                        zIndex: 10000,
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        border: '1px solid #c3e6cb',
                        borderRadius: '8px',
                        maxWidth: '300px',
                        wordWrap: 'break-word'
                    });
                    document.body.appendChild(painel);
                }
                
                painel.innerHTML = `
                    <strong>✅ Conectado com Python!</strong><br>
                    <small>Texto: ${frase.substring(0, 50)}${frase.length > 50 ? '...' : ''}</small><br>
                    <small>Status: Recebido</small>
                `;
                
                // Remover painel após 5 segundos
                setTimeout(() => {
                    if (painel && painel.parentNode) {
                        painel.parentNode.removeChild(painel);
                    }
                }, 5000);
                
            } else {
                throw new Error('Falha ao enviar texto');
            }
            
        } catch (error) {
            console.error('Erro ao enviar texto:', error);
            alert('Erro ao enviar texto para o servidor Python!');
            btn.style.backgroundColor = '#dc3545';
            btn.textContent = 'Erro no envio';
        } finally {
            // Resetar botão após 3 segundos
            setTimeout(() => {
                btn.textContent = '📝 Extrair Texto';
                btn.style.backgroundColor = '#007bff';
                btn.disabled = false;
            }, 3000);
        }

    });
})();
