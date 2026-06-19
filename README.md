# eVOLUTA Hub

Painel interno de operação da eVOLUTA: backlog, plano de 30 dias, análise TRL e notas em markdown.

## Setup

```bash
# 1. Clone e entre na pasta
cd evoluta-hub

# 2. Copie o .env e configure
cp .env.example .env
# edite o .env com sua senha e JWT secret

# 3. Suba os containers
docker compose up -d

# 4. Popule o banco com os dados iniciais (só na primeira vez)
docker compose exec app node src/seed.js
```

## Acesso

http://seu-servidor:3000

## Volumes

Os arquivos `.md` ficam em `./content/` — editáveis pelo app ou diretamente pelo VSCode/Obsidian via Tailscale.

## Stack

- Backend: Node.js + Express + Mongoose
- Frontend: React + Vite
- Banco: MongoDB
- Deploy: Docker Compose
