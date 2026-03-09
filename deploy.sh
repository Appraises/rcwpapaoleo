#!/bin/bash

echo "🚀 Iniciando deploy RCW Papa Óleo..."
echo "======================================"

cd /home/app

# 1. Pull das alterações
echo ""
echo "📥 Puxando alterações do GitHub..."
git pull origin main

# 2. Instalar dependências (caso tenha novas)
echo ""
echo "📦 Instalando dependências do server..."
cd /home/app/server && npm install

echo ""
echo "📦 Instalando dependências do client..."
cd /home/app/client && npm install

# 3. Build do frontend
echo ""
echo "🔨 Fazendo build do frontend..."
cd /home/app/client && npm run build

# 4. Reiniciar o server com PM2
echo ""
echo "🔄 Reiniciando servidor..."
cd /home/app/server && pm2 restart rcwpapaoleo

echo ""
echo "======================================"
echo "✅ Deploy concluído com sucesso!"
echo "🌐 https://rcwpapaoleo.com"
echo "======================================"
