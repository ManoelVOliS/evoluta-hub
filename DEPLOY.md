# Deploy — eVOLUTA Hub

## Pré-requisitos no servidor

- Ubuntu 20.04+ (ou Debian equivalente)
- Acesso SSH com sudo
- MongoDB já rodando e acessível
- Porta 3000 aberta no firewall

---

## 1. Conectar ao servidor

```bash
ssh usuario@ip-do-servidor
```

---

## 2. Instalar Docker (se ainda não tiver)

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y ca-certificates curl gnupg

# Adicionar chave GPG do Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Adicionar repositório
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker + Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Permitir usar docker sem sudo
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalação
docker --version
docker compose version
```

---

## 3. Enviar os arquivos do projeto

No seu computador local, rode:

```bash
# Criar pasta no servidor
ssh usuario@ip-do-servidor "mkdir -p ~/evoluta-hub"

# Enviar os arquivos (exceto node_modules)
rsync -av --exclude='node_modules' --exclude='.git' --exclude='frontend/dist' \
  /caminho/local/evoluta-hub/ usuario@ip-do-servidor:~/evoluta-hub/
```

> Se não tiver rsync, use scp:
> ```bash
> scp -r /caminho/local/evoluta-hub usuario@ip-do-servidor:~/
> ```

---

## 4. Configurar o .env no servidor

```bash
# Entrar na pasta do projeto
cd ~/evoluta-hub

# Criar o .env com os valores reais
nano .env
```

Conteúdo do `.env`:

```
MONGO_URI=mongodb://usuario:senha@host:27017/evoluta-hub
JWT_SECRET=string_longa_e_aleatoria_aqui
ADMIN_PASSWORD=sua_senha_aqui
```

> **JWT_SECRET:** gere uma string segura com:
> ```bash
> openssl rand -hex 32
> ```

---

## 5. Subir o container

```bash
cd ~/evoluta-hub

# Build + subir em background
docker compose up -d --build

# Acompanhar os logs
docker compose logs -f
```

Aguarde aparecer:
```
eVOLUTA Hub rodando na porta 3000
MongoDB conectado
```

---

## 6. Popular o banco (só na primeira vez)

```bash
docker compose exec app node src/seed.js
```

---

## 7. Verificar se está funcionando

```bash
# Ver containers rodando
docker ps

# Testar a API
curl http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"sua_senha_aqui"}'
```

Deve retornar um JSON com `token`.

Acesse no navegador: `http://ip-do-servidor:3000`

---

## Comandos úteis no dia a dia

```bash
# Ver logs em tempo real
docker compose logs -f

# Reiniciar o app
docker compose restart app

# Parar tudo
docker compose down

# Atualizar após mudanças no código
rsync -av --exclude='node_modules' --exclude='.git' --exclude='frontend/dist' \
  /caminho/local/evoluta-hub/ usuario@ip-do-servidor:~/evoluta-hub/

ssh usuario@ip-do-servidor "cd ~/evoluta-hub && docker compose up -d --build"
```

---

## Troubleshooting

**Container não sobe:**
```bash
docker compose logs app
```

**Erro de autenticação no MongoDB:**
- Verifique a `MONGO_URI` no `.env`
- Confirme que o IP do servidor tem permissão de acesso ao MongoDB

**Porta 3000 não acessível externamente:**
```bash
sudo ufw allow 3000
```
