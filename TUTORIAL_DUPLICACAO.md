# 📋 Tutorial: Como Duplicar Este Projeto Para Outra Empresa

> Este documento é um passo a passo completo de tudo que precisa ser configurado
> para clonar este sistema para uma nova empresa de coleta de óleo.

---

## Índice

1. [Clonar o Repositório](#1-clonar-o-repositório)
2. [Trocar o Branding (Nome + Logo)](#2-trocar-o-branding)
3. [Criar o Arquivo .env](#3-criar-o-arquivo-env)
4. [Configurar WhatsApp (Evolution API)](#4-configurar-whatsapp-evolution-api)
5. [Configurar Backup no Telegram](#5-configurar-backup-no-telegram)
6. [Obter Chave do Google Maps](#6-obter-chave-do-google-maps)
7. [Instalar a IA Local (Ollama)](#7-instalar-a-ia-local-ollama)
8. [Instalar e Rodar o Projeto](#8-instalar-e-rodar-o-projeto)
9. [Deploy na VPS (Produção)](#9-deploy-na-vps-produção)
10. [Checklist Final](#10-checklist-final)

---

## 1. Clonar o Repositório

```bash
# Criar um repositório NOVO e PRIVADO no GitHub para a nova empresa
# Depois clonar o projeto original:
git clone https://github.com/SEU_USUARIO/catoleo.git nome-da-nova-empresa
cd nome-da-nova-empresa

# Apagar o remote antigo e apontar pro novo repositório:
git remote remove origin
git remote add origin https://github.com/SEU_USUARIO/nome-da-nova-empresa.git
```

---

## 2. Trocar o Branding

### 2.1. Onde trocar "Cat Óleo" (nome da empresa)

Abrir cada arquivo abaixo e substituir **"Cat Óleo"** pelo nome da nova empresa:

#### Server:

| Arquivo | Linha | O que diz |
|---------|-------|-----------|
| `server/index.js` | 54 | `res.send('Cat Óleo API is running');` |
| `server/services/LlmService.js` | 12 | `...assistente de triagem da empresa Cat Óleo (que recolhe óleo de cozinha usado).` |
| `server/services/QueueService.js` | 114 | `...A equipe Cat Óleo agradece a sua colaboração.` |
| `server/services/ReportService.js` | 110 | `doc...text('Cat Óleo', 50, 35);` |

#### Client:

| Arquivo | Linhas | O que diz |
|---------|--------|-----------|
| `client/index.html` | 8 | `<title>Cat Óleo</title>` |
| `client/src/App.jsx` | 59, 60, 105, 106, 125, 126 | Logo alt text e texto "Cat Óleo" no menu/sidebar |
| `client/src/pages/LoginPage.jsx` | 46 | `alt="Cat Óleo"` na imagem do login |
| `client/src/pages/SettingsPage.jsx` | 566, 621 | Placeholders `"Ex: Sede Cat Óleo"` e `"Ex: Cat Óleo Reciclagem LTDA"` |

### 2.2. Onde trocar "catoleo" (identificador)

| Arquivo | Linha | O que diz | Trocar por |
|---------|-------|-----------|------------|
| `server/seed.js` | 12, 16 | `admin@catoleo.com` | `admin@novaempresa.com` |
| `server/controllers/UserController.js` | 56 | `if (user.email === 'admin@catoleo.com')` | Mesmo email do seed |
| `server/controllers/DashboardController.js` | 104 | `pm2 logs catoleo` | Nome do processo PM2 da nova empresa |
| `server/services/BackupService.js` | 31 | `catoleo_backup_${dateStr}` | `novaempresa_backup_${dateStr}` |
| `client/src/pages/SettingsPage.jsx` | 62-64, 187-189, 233-235 | `localStorage` keys: `catoleo_base_lat`, `catoleo_company_name`, etc. | Trocar prefixo `catoleo_` por `novaempresa_` |
| `client/src/pages/RoutePage.jsx` | 169-183 | `localStorage` keys: `catoleo_base_lat`, `catoleo_base_lng`, `catoleo_base_name` | Mesmo prefixo novo |

### 2.3. Trocar as Logos

Substituir estes 3 arquivos pelas logos da nova empresa (manter os mesmos nomes de arquivo):

| Arquivo | Onde é usado |
|---------|-------------|
| `client/public/logo.png` | Menu/sidebar do sistema (ícone quadrado) |
| `client/public/logoHorizontal.png` | Tela de login |
| `server/public/logoHorizontal.png` | Cabeçalho dos PDFs de relatório |

> **Dica:** Use `Ctrl+Shift+F` no VS Code e busque por `Cat Óleo` e `catoleo` para garantir que não esqueceu nenhum.

---

## 3. Criar o Arquivo .env

Criar o arquivo `server/.env` (ele **não** é commitado no Git):

```env
# ─── Servidor ────────────────────────────────────────
PORT=3001

# ─── Autenticação ────────────────────────────────────
# Gerar uma string aleatória longa (ex: openssl rand -hex 32)
JWT_SECRET=COLOCAR_UMA_STRING_SECRETA_AQUI

# ─── WhatsApp (Evolution API) ────────────────────────
EVOLUTION_API_URL=https://url-da-evolution-api.com
EVOLUTION_API_KEY=sua-api-key-aqui
EVOLUTION_INSTANCE_NAME=nome-da-instancia

# ─── Telegram (Backup Diário) ────────────────────────
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v
TELEGRAM_CHAT_ID=-1001234567890

# ─── Google Maps ─────────────────────────────────────
GOOGLE_MAPS_API_KEY=AIzaSy...sua-chave-aqui
```

> ⚠️ **IMPORTANTE:** Cada empresa DEVE ter suas próprias chaves. Nunca reutilize credenciais.

---

## 4. Configurar WhatsApp (Evolution API)

A Evolution API conecta o sistema ao WhatsApp. É o que permite receber/enviar mensagens automáticas.

### 4.1. Instalar a Evolution API no servidor

```bash
# Opção 1: Docker (recomendado)
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-chave-master \
  atendai/evolution-api:latest

# Opção 2: Instalação manual — consultar:
# https://doc.evolution-api.com/v2/pt/get-started/introduction
```

### 4.2. Criar uma instância

```bash
curl -X POST 'http://localhost:8080/instance/create' \
  -H 'apikey: sua-chave-master' \
  -H 'Content-Type: application/json' \
  -d '{
    "instanceName": "novaempresa",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'
```

### 4.3. Conectar o WhatsApp

1. Acessar: `http://SEU_IP:8080/manager`
2. Clicar na instância criada
3. Escanear o **QR Code** com o WhatsApp do celular da nova empresa
4. Aguardar a conexão ficar como "CONNECTED"

### 4.4. Configurar o Webhook

Na interface do manager (ou via API), configurar:

- **URL do Webhook:** `https://dominio-da-nova-empresa.com/api/webhooks/evolution`
- **Eventos:** Marcar `MESSAGES_UPSERT`

Isso faz com que toda mensagem recebida no WhatsApp seja enviada pro servidor do sistema.

### 4.5. Preencher no .env

```env
EVOLUTION_API_URL=http://localhost:8080   # ou a URL externa
EVOLUTION_API_KEY=sua-chave-master
EVOLUTION_INSTANCE_NAME=novaempresa       # o nome que você escolheu no passo 4.2
```

---

## 5. Configurar Backup no Telegram

O sistema faz backup automático do banco de dados toda noite às 02:00 e envia pro Telegram.

### 5.1. Criar o Bot

1. Abrir o Telegram e procurar **@BotFather**
2. Enviar `/newbot`
3. Escolher um nome para o bot (ex: "Backup NovaEmpresa")
4. Escolher um username (ex: `backup_novaempresa_bot`)
5. O BotFather vai retornar um **token** — copiar e guardar

### 5.2. Criar um Grupo para os Backups

1. Criar um grupo no Telegram (ex: "Backups NovaEmpresa")
2. Adicionar o bot criado ao grupo
3. Enviar qualquer mensagem no grupo

### 5.3. Obter o Chat ID do Grupo

```bash
# Substituir SEU_TOKEN pelo token do passo 5.1
curl https://api.telegram.org/botSEU_TOKEN/getUpdates
```

Na resposta, procurar por `"chat":{"id":-100XXXXXXXXX}` — esse número negativo é o `CHAT_ID`.

### 5.4. Preencher no .env

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v
TELEGRAM_CHAT_ID=-1001234567890
```

### 5.5. Testar

Depois que o servidor estiver rodando, acessar o painel > Configurações > clicar em **"Fazer Backup Agora"**.
O arquivo deve aparecer no grupo do Telegram.

---

## 6. Obter Chave do Google Maps

Usada para geocodificação (transformar endereços em coordenadas no mapa).

### 6.1. Criar projeto no Google Cloud

1. Acessar [console.cloud.google.com](https://console.cloud.google.com/)
2. Clicar em **"Selecionar projeto"** > **"Novo projeto"**
3. Dar um nome (ex: "NovaEmpresa Sistema")
4. Clicar em **"Criar"**

### 6.2. Ativar as APIs necessárias

No menu lateral: **APIs e Serviços** > **Biblioteca**

Ativar estas duas:
- ✅ **Geocoding API**
- ✅ **Maps JavaScript API**

### 6.3. Criar a chave de API

1. Ir em **APIs e Serviços** > **Credenciais**
2. Clicar **"+ Criar credenciais"** > **"Chave de API"**
3. Copiar a chave gerada

### 6.4. Restringir a chave (recomendado)

- **Restrição por HTTP referrer:** Adicionar o domínio do frontend (ex: `https://painel.novaempresa.com/*`)
- **Restrição por API:** Selecionar apenas Geocoding API e Maps JavaScript API

### 6.5. Configurar faturamento

O Google oferece **$200/mês de crédito gratuito**. Para uso normal isso é mais que suficiente.
Mas é bom configurar um **alerta de faturamento** para evitar surpresas.

### 6.6. Preencher no .env

```env
GOOGLE_MAPS_API_KEY=AIzaSy...sua-chave-aqui
```

---

## 7. Instalar a IA Local (Ollama)

O sistema usa IA para interpretar mensagens do WhatsApp e detectar pedidos de coleta automaticamente.

### 7.1. Instalar o Ollama no servidor

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 7.2. Baixar o modelo

```bash
ollama pull llama3.2:3b
```

> Isso vai baixar ~2GB. O modelo precisa de ~4GB de RAM livre para rodar.

### 7.3. Verificar se está funcionando

```bash
curl http://localhost:11434/api/tags
# Deve retornar uma lista com "llama3.2:3b"
```

### 7.4. Configurar para iniciar automaticamente

```bash
# Habilitar o serviço do Ollama (já vem configurado na maioria das instalações)
sudo systemctl enable ollama
sudo systemctl start ollama
```

### 7.5. Se o servidor não suportar IA

Se a VPS tiver pouca RAM (< 4GB), o sistema **continua funcionando normalmente** — ele apenas
não vai detectar pedidos de coleta automaticamente. As mensagens serão ignoradas sem erro.

---

## 8. Instalar e Rodar o Projeto

### 8.1. Instalar dependências

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 8.2. Rodar em desenvolvimento

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

O banco de dados (`server/database.sqlite`) é **criado automaticamente** na primeira execução.
O usuário admin padrão também é criado automaticamente pelo seed.

### 8.3. Primeiro acesso

- Acessar: `http://localhost:5173`
- Login: o email que você definiu no `seed.js` (padrão: `admin@novaempresa.com`)
- Senha: `admin123` (trocar depois!)

---

## 9. Deploy na VPS (Produção)

### 9.1. Requisitos da VPS

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| OS | Ubuntu 22.04 | Ubuntu 24.04 |
| RAM | 2GB (sem IA) / 4GB (com IA) | 4GB+ |
| CPU | 1 vCPU | 2 vCPUs |
| Disco | 10GB | 20GB+ |

### 9.2. Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # deve mostrar v20.x
```

### 9.3. Instalar PM2

```bash
sudo npm install -g pm2
```

### 9.4. Clonar e configurar o projeto

```bash
cd /home
git clone https://github.com/SEU_USUARIO/nome-da-nova-empresa.git app
cd app

# Criar o .env
nano server/.env
# (colar todas as variáveis conforme a seção 3)

# Instalar dependências
cd server && npm install
cd ../client && npm install

# Fazer build do frontend
npm run build
```

### 9.5. Configurar o Nginx

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/novaempresa
```

Colar esta configuração:

```nginx
server {
    listen 80;
    server_name painel.novaempresa.com;  # ou o domínio da nova empresa

    # Frontend (arquivos estáticos do build)
    location / {
        root /home/app/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API (proxy para o Node.js)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/novaempresa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9.6. Iniciar com PM2

```bash
cd /home/app/server
pm2 start index.js --name "novaempresa-api"
pm2 save
pm2 startup
# Executar o comando que o PM2 mostrar na tela
```

> **Lembrar:** O nome do processo PM2 deve ser o mesmo que está no `DashboardController.js`
> no comando `pm2 logs`. Se mudou, atualizar no código.

### 9.7. HTTPS com Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d painel.novaempresa.com
# Seguir as instruções na tela
```

### 9.8. Configurar Timezone

```bash
sudo timedatectl set-timezone America/Sao_Paulo
# Verificar:
timedatectl
```

> Os cron jobs (dispatch, relatórios, backup) dependem do timezone estar correto.

---

## 10. Checklist Final

Depois de tudo configurado, verificar cada item:

- [ ] Nome da empresa trocado em todos os arquivos (buscar "Cat Óleo" e "catoleo")
- [ ] Logos substituídos (3 arquivos: `client/public/logo.png`, `client/public/logoHorizontal.png`, `server/public/logoHorizontal.png`)
- [ ] Arquivo `.env` criado com todas as 7 variáveis
- [ ] Novo `JWT_SECRET` gerado (não reutilizar o da outra empresa!)
- [ ] Seed com email/senha atualizados
- [ ] Email do seed igual ao check do `UserController.js`
- [ ] Evolution API rodando e instância conectada ao WhatsApp
- [ ] Webhook da Evolution apontando para `/api/webhooks/evolution` do novo servidor
- [ ] Bot do Telegram criado e Chat ID correto
- [ ] Testar backup manual pelo painel
- [ ] Google Maps API Key funcionando (testar geocodificação de endereço)
- [ ] Ollama instalado e modelo `llama3.2:3b` baixado (ou decisão de não usar IA)
- [ ] PM2 rodando e configurado para restart automático
- [ ] HTTPS configurado com Certbot
- [ ] Timezone do servidor = `America/Sao_Paulo`
- [ ] Nome do processo PM2 igual ao do `DashboardController.js`
- [ ] Primeiro login feito e senha do admin trocada

---

## ⏰ Cron Jobs Automáticos (referência)

Estes jobs rodam sozinhos, mas é bom saber o horário de cada um:

| Job | Horário | O que faz |
|-----|---------|-----------|
| Dispatch de rotas | Todo dia às 06:00 | Envia rotas otimizadas pros coletadores via WhatsApp |
| Relatório semanal | Sábado às 23:55 | Gera PDF com resumo da semana |
| Relatório mensal | Dia 1 do mês às 00:05 | Gera PDF com resumo do mês anterior |
| Backup do banco | Todo dia às 02:00 | Envia o banco SQLite pro Telegram |

---

> **Última atualização:** Março 2026
