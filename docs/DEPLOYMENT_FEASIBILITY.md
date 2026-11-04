# PSI — Análise de Viabilidade de Implantação (DEPLOYMENT_FEASIBILITY.md)

Este documento avalia a viabilidade de implantação da aplicação **PSI — Sistema de Gestão de Consultórios** em diferentes ambientes de hospedagem, analisando os requisitos de execução, persistência, banco de dados e rotinas agendadas.

---

## 1. Requisitos do Sistema

Para operar corretamente e com segurança, o PSI necessita de:
1. **Runtime Node.js:** Node.js v18 LTS ou superior (recomendado v20+ ou v22), com suporte a processos contínuos (daemon via systemd, PM2 ou similar).
2. **Banco de Dados Relacional:** MySQL 8.0+ ou MariaDB 10.5+ com suporte a transações ACID (`InnoDB`), chaves estrangeiras e índices compostos.
3. **Armazenamento Persistente:** Sistema de arquivos com permissão de escrita fora da raiz web pública para armazenamento seguro de prontuários, uploads e backups.
4. **Comunicação de Rede Externa:** Conexões HTTPS de saída para provedores de mensageria, SMTP e videoconferência.
5. **Agendamento de Tarefas:** Capacidade de executar cron jobs ou chamadas periódicas para expiração de reservas (holds), verificação de pagamentos e envio de lembretes.

---

## 2. Análise por Ambiente de Implantação

### 2.1 Hospedagem Compartilhada (Shared Hosting tipo cPanel com Node.js Selector)
- **Status:** **Possível com restrições / Não universal**.
- **Viabilidade:**
  - Muitos planos compartilhados limitam memória (512MB-1GB), matam processos Node.js inativos e não garantem persistência de memória em segundo plano.
  - O suporte a `Prisma` em algumas hospedagens compartilhadas requer atenção especial com o binário `engine` (especialmente em ambientes com musl/Alpine ou glibc antigas).
  - O armazenamento local funciona bem caso o diretório raiz esteja acima do `public_html`.
  - Agendamento de rotinas deve ser delegado estritamente ao cron do cPanel chamando endpoints HTTP protegidos por token secreto ou script CLI (`node scripts/cron.js`), e **nunca** dependente de `setInterval` em memória.
- **Veredito:** Suportado apenas se o provedor oferecer suporte formal a Node.js contínuo, compilação de binários nativos e CronJobs do sistema. Deve ser devidamente documentado no manual do cliente.

### 2.2 VPS / Servidor Dedicado (Ubuntu / Debian / AlmaLinux)
- **Status:** **Altamente Recomendado (Ambiente Ideal)**.
- **Viabilidade:**
  - Total controle sobre o processo Node.js via PM2 ou Systemd.
  - MySQL / MariaDB local ou gerenciado com alta performance e sem limites artificiais de conexões.
  - Diretórios de uploads totalmente privados protegidos pelo sistema de permissões do Linux (`chmod 700`).
  - Execução confiável de CronJobs do sistema para background jobs e rotinas de backup.
  - Suporte a certificados SSL gratuitos via Let's Encrypt / Certbot com renovação automática.

### 2.3 Plataformas Gerenciadas (PaaS como Render, Railway, Vercel)
- **Status:** **Totalmente compatível com banco externo**.
- **Particularidades:**
  - Em plataformas serverless (ex.: Vercel), o sistema de arquivos local é efêmero. Para hospedar no Vercel no futuro, o armazenamento de arquivos precisaria de adapter S3 compatível. Para a V1 com armazenamento local em disco, ambientes com volume persistente (Railway, Render com Persistent Disk, Fly.io ou VPS) são os alvos corretos.

---

## 3. Diretrizes de Empacotamento e Entrega da V1
- A V1 será empacotada com:
  1. Script de inicialização padronizado (`npm start` rodando `next start`).
  2. Scripts de migração do banco (`prisma migrate deploy`).
  3. Script de seed seguro para primeiro acesso.
  4. Script de checagem prévia de ambiente (`preflight check`).
  5. Instruções claras de configuração de cron no `crontab` do servidor.
