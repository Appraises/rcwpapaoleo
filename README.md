# CatÓleo Web Platform

Plataforma moderna para gestão de coleta de óleo reciclável.

## Funcionalidades
- **Dashboard**: Visão geral com gráficos e rankings.
- **Gestão de Clientes**: Cadastro, edição e listagem.
- **Controle de Coletas**: Histórico detalhado por cliente.
- **Autenticação**: Login seguro.

## Tecnologias
- **Frontend**: React, Vite, Recharts, Lucide React.
- **Backend**: Node.js, Express, SQLite, Sequelize.

## Como rodar o projeto

### Pré-requisitos
- Node.js instalado.

### Passo 1: Instalar dependências

No terminal, na pasta raiz:

```bash
# Backend
cd server
npm install

# Frontend (em outro terminal)
cd ../client
npm install
```

### Passo 2: Rodar o servidor (Backend)

Dentro da pasta `server`:

```bash
npm run dev
```
O servidor rodará em `http://localhost:3001`.
O banco de dados `database.sqlite` será criado automaticamente.
**Usuário Admin criado automaticamente:**
- Email: `admin@catoleo.com`
- Senha: `admin123`

### Passo 3: Rodar o cliente (Frontend)

Dentro da pasta `client`:

```bash
npm run dev
```
Acesse `http://localhost:5173` no navegador.

## Estrutura do Projeto
- `/server`: API e Banco de Dados.
- `/client`: Interface do Usuário.
