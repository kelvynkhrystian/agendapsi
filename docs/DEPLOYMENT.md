# PSI — Guia de Implantação em Produção e Operações

Este documento fornece as instruções completas para instalação, configuração e manutenção do **PSI** em servidores dedicados/VPS ou em hospedagens compartilhadas compatíveis com processos persistentes Node.js.

---

## 1. Requisitos do Sistema

- **Runtime:** Node.js v18.17.0+ ou v20+ (Recomendado Node v20 LTS ou v22 LTS).
- **Banco de Dados:** MySQL 8.0+ ou MariaDB 10.5+ com suporte a transações ACID (`InnoDB`).
- **Armazenamento:** Disco local persistente com permissão de escrita fora do diretório público (`./storage/uploads` e `./storage/backups`).
- **Servidor Web / Proxy Reverso:** Nginx, Apache ou Caddy configurado com terminação SSL/TLS (HTTPS obrigatório para cookies seguros e WebRTC da teleconsulta).
- **Processos Persistentes:** PM2, systemd ou Application Manager do cPanel (Node.js Selector / Passenger).

---

## 2. Preparação do Ambiente e Variáveis

1. Clone o repositório ou transfira o pacote da aplicação para o diretório de destino no servidor:
   ```bash
   cd /var/www/agendapsi
   ```
2. Crie o arquivo `.env` a partir do modelo `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Configure as variáveis essenciais:
   - `DATABASE_URL`: String de conexão segura com o MySQL (ex: `mysql://usuario:senha_forte@localhost:3306/agendapsi`).
   - `JWT_SECRET`: Chave secreta de alta entropia com no mínimo 32 caracteres gerada aleatoriamente.
   - `TECHNICAL_STATUS_BEARER_TOKEN`: Token secreto utilizado pelo endpoint `/api/technical/status`.
   - `APP_URL`: URL oficial do consultório com `https://` (ex: `https://meuconsultorio.com.br`).
   - `NODE_ENV`: Defina como `production`.
   - `APP_TIMEZONE`: Fuso horário do consultório (ex: `America/Sao_Paulo`).

---

## 3. Instalação e Migração do Banco de Dados

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Aplique as migrações estruturais do Prisma no banco de produção:
   ```bash
   npx prisma migrate deploy
   ```
   > **Atenção:** Em ambiente de produção, **nunca** utilize `prisma db push --force-reset`. Use sempre `prisma migrate deploy`.

3. **Provisionamento Seguro do Administrador Inicial:**
   - O PSI não possui cadastro público de administrador.
   - Para criar o usuário inicial em um servidor novo, execute o script de provisionamento seguro ou defina uma senha forte com bcrypt:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('SuaSenhaForte123!', 10).then(h => console.log('Hash:', h));"
   ```
   Insira o registro diretamente na tabela `AdminAccount` garantindo que a senha seja substituída e que não permaneçam credenciais de desenvolvimento (`adminpsi`).

---

## 4. Compilação e Execução

1. Compile a aplicação para produção:
   ```bash
   npm run build
   ```
2. Inicie o processo com PM2:
   ```bash
   pm2 start npm --name "psi-consultorio" -- start
   pm2 save
   pm2 startup
   ```

---

## 5. Configuração do Proxy Reverso (Nginx)

Exemplo de bloco Nginx com encaminhamento de cabeçalhos e suporte a WebSocket/WebRTC:

```nginx
server {
    server_name meuconsultorio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 25M;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/meuconsultorio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meuconsultorio.com.br/privkey.pem;
}
```

---

## 6. Rotina de Backup e Restauração Segura

### 6.1 Geração de Backup
- O profissional pode acionar o backup manual pela interface em `/admin/arquivos` ou programar a execução via cron.
- Cada arquivo de backup inclui um *manifesto* estruturado com data, versão do esquema e hash SHA-256 do arquivo SQL gerado.

### 6.2 Restauração Assistida (*Runbook*)
Por motivos de integridade e segurança, a substituição integral de um banco de dados em produção não deve ser realizada de forma desprotegida por um clique no navegador. Siga o procedimento seguro:

1. Realize uma cópia de segurança do estado atual antes da restauração:
   ```bash
   mysqldump -u usuario -p agendapsi > backup_emergencial_$(date +%Y%m%d_%H%M%S).sql
   ```
2. Interrompa o serviço Node.js para evitar escritas concorrentes:
   ```bash
   pm2 stop psi-consultorio
   ```
3. Valide o checksum SHA-256 do arquivo de backup contra o valor registrado no manifesto JSON:
   ```bash
   sha256sum backup-agendapsi-2026-11-03.sql
   ```
4. Restaure a base de dados:
   ```bash
   mysql -u usuario -p agendapsi < backup-agendapsi-2026-11-03.sql
   ```
5. Restaure a pasta de arquivos privados correspondente em `./storage/uploads/`.
6. Reinicie a aplicação e verifique a integridade:
   ```bash
   pm2 start psi-consultorio
   ```
