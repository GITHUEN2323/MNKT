#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor Python para receber texto extraído do Tampermonkey
e controlar a digitação automática no MonkeyType - Versão Clean
"""

import json
import time
import random
import threading
import webbrowser
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from pynput.keyboard import Controller
from pynput.keyboard import GlobalHotKeys

# Configurações
HOST = 'localhost'
PORT = 8080

# Variáveis globais
texto_recebido = None
texto_acumulado = ''
conectado_tampermonkey = False
digitando = False
keyboard = Controller()
speed_multiplier = 1.0
monitoramento_ativo = False
texto_digitado = ''

# Configurações de digitação otimizada
typo_chance = 0  # Sem erros para 100% precisão
character_entry_time_min = 0.01  # Tempo mínimo muito baixo
character_entry_time_max = 0.03  # Tempo máximo reduzido
outlier_chance = 0  # Sem delays anômalos

class MonkeyTypeHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type='application/json'):
        """Define cabeçalhos HTTP com CORS"""
        self.send_response(status)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self._set_headers()

    def do_GET(self):
        """Handle GET requests"""
        global conectado_tampermonkey, texto_recebido, digitando, monitoramento_ativo
        
        path = urlparse(self.path).path
        
        if path in ('/', '/painel'):
            try:
                with open('painel.html', 'r', encoding='utf-8') as f:
                    html_content = f.read()
                self._set_headers(200, 'text/html')
                self.wfile.write(html_content.encode('utf-8'))
                return
            except FileNotFoundError:
                self._set_headers(404, 'text/html')
                self.wfile.write(b'<h1>Painel nao encontrado</h1>')
                return
                
        elif path == '/status':
            conectado_tampermonkey = True
            self._set_headers()
            response = {
                'status': 'conectado',
                'texto_recebido': texto_recebido is not None,
                'texto': texto_recebido if texto_recebido else None,
                'texto_acumulado': texto_acumulado if texto_acumulado else None,
                'digitando': digitando,
                'monitoramento_ativo': monitoramento_ativo,
                'timestamp': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        elif path == '/iniciar':
            if texto_recebido:
                self._set_headers()
                response = {'status': 'iniciando_digitacao'}
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                # Iniciar digitação em thread separada
                threading.Thread(target=iniciar_digitacao, daemon=True).start()
            else:
                self._set_headers(400)
                response = {'error': 'Nenhum texto recebido'}
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
        elif path == '/monitoramento':
            monitoramento_ativo = not monitoramento_ativo
            self._set_headers()
            response = {
                'status': 'monitoramento_ativo' if monitoramento_ativo else 'monitoramento_inativo',
                'ativo': monitoramento_ativo
            }
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Monitoramento {'ATIVADO' if monitoramento_ativo else 'DESATIVADO'}")
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            self._set_headers(404)
            response = {'error': 'Endpoint não encontrado'}
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))

    def do_POST(self):
        """Handle POST requests"""
        global texto_recebido, conectado_tampermonkey, speed_multiplier, texto_acumulado, monitoramento_ativo
        
        path = urlparse(self.path).path
        
        if path == '/texto':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                novo_texto = data.get('texto', '')
                
                # Se é um novo texto diferente, acumular
                if novo_texto and novo_texto != texto_recebido:
                    texto_recebido = novo_texto
                    
                    # Se o novo texto é maior que o anterior, é uma extensão
                    if len(novo_texto) > len(texto_acumulado) and novo_texto.startswith(texto_acumulado):
                        texto_novo_apenas = novo_texto[len(texto_acumulado):]
                        texto_acumulado = novo_texto
                        
                        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Texto NOVO detectado:")
                        print(f"Novo texto: '{texto_novo_apenas}'")
                        print(f"Texto completo: {len(texto_acumulado)} caracteres")
                        
                        # Apenas acumular texto, não digitar automaticamente
                        print(f"Texto acumulado: {len(texto_acumulado)} caracteres totais")
                    else:
                        # Texto completamente novo
                        texto_acumulado = novo_texto
                        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Texto recebido do Tampermonkey:")
                        print(f"Tamanho: {len(texto_recebido)} caracteres")
                        print(f"Preview: {texto_recebido[:100]}{'...' if len(texto_recebido) > 100 else ''}")
                
                # Não auto-iniciar digitação - apenas manual
                
                self._set_headers()
                response = {
                    'status': 'sucesso',
                    'mensagem': 'Texto recebido com sucesso',
                    'tamanho': len(texto_recebido)
                }
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
            except json.JSONDecodeError:
                self._set_headers(400)
                response = {'error': 'JSON inválido'}
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
        elif path == '/config':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                if 'speed' in data:
                    speed_multiplier = float(data['speed'])
                    print(f"Velocidade alterada para: {speed_multiplier}x")
                
                self._set_headers()
                response = {'status': 'configuracao_atualizada', 'speed': speed_multiplier}
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
            except (json.JSONDecodeError, ValueError):
                self._set_headers(400)
                response = {'error': 'Dados inválidos'}
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            self._set_headers(404)
            response = {'error': 'Endpoint não encontrado'}
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        """Suprimir logs padrão do servidor"""
        pass

def type_string_with_delay(string):
    """Digita string otimizada para velocidade e precisão"""
    global digitando
    digitando = True
    
    try:
        print("\nINICIANDO DIGITACAO OTIMIZADA...")
        print(f"Texto: {string[:50]}...")
        print("Aguarde 2 segundos para posicionar o cursor...")
        time.sleep(2)
        
        start_time = time.time()
        chars_typed = 0
        
        for i, char in enumerate(string):
            if not digitando:  # Permite parar a digitação
                break
                
            # Calcula delay baseado na velocidade
            base_delay = random.uniform(character_entry_time_min, character_entry_time_max)
            delay = base_delay / speed_multiplier
            
            # Digita o caractere
            keyboard.type(char)
            time.sleep(delay)
            chars_typed += 1
            
            # Progresso a cada 10%
            if i % max(1, len(string) // 10) == 0:
                elapsed = time.time() - start_time
                chars_per_sec = chars_typed / elapsed if elapsed > 0 else 0
                progress = (i / len(string)) * 100
                print(f"Progresso: {progress:.1f}% | {chars_per_sec:.1f} chars/s")
        
        # Estatísticas finais
        total_time = time.time() - start_time
        chars_per_minute = (chars_typed / total_time) * 60 if total_time > 0 else 0
        words_per_minute = chars_per_minute / 5  # Média de 5 chars por palavra
        
        print(f"\nDIGITACAO CONCLUIDA COM SUCESSO!")
        print(f"Tempo total: {total_time:.2f}s")
        print(f"Velocidade: {words_per_minute:.1f} WPM")
        print(f"Caracteres/min: {chars_per_minute:.0f}")
        print(f"Total caracteres: {chars_typed}")
        print(f"Precisao: 100% (sem erros)")
    
    finally:
        # Garantir que digitando seja redefinido como False
        digitando = False
    
    digitando = False

def iniciar_digitacao():
    """Iniciar digitação com delay"""
    global texto_recebido
    if texto_recebido:
        type_string_with_delay(texto_recebido)
    else:
        print("Nenhum texto disponível!")

# Função removida - apenas digitação manual

def toggle_menu():
    """Abre painel web no navegador"""
    url = f"http://{HOST}:{PORT}/painel"
    print(f"\nAbrindo painel web: {url}")
    webbrowser.open(url)

def main():
    print("MonkeyType Cheat - Servidor Clean")
    print("=" * 40)
    print(f"Servidor: http://{HOST}:{PORT}")
    print(f"Painel Web: http://{HOST}:{PORT}/painel")
    print("Hotkey: Ctrl+Shift+M para abrir painel")
    print("Digitacao manual ativada")
    print("\nAguardando conexoes...\n")
    
    # Configurar hotkeys
    hotkeys = GlobalHotKeys({
        '<ctrl>+<shift>+m': toggle_menu
    })
    hotkeys.start()
    
    # Iniciar servidor HTTP
    try:
        server = HTTPServer((HOST, PORT), MonkeyTypeHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor interrompido pelo usuário")
    except Exception as e:
        print(f"Erro no servidor: {e}")
    finally:
        hotkeys.stop()
        print("Servidor finalizado!")

if __name__ == "__main__":
    main()
