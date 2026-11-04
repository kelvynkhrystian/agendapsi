# PSI — Políticas de Segurança da Informação e Privacidade Clínica

Este documento descreve os mecanismos criptográficos, controles de acesso e salvaguardas de conformidade implementados no **PSI**.

---

## 1. Mecanismos Criptográficos e Autenticação

### 1.1 Hash de Senhas
- Todas as senhas de usuários (`AdminAccount` e `Patient`) são protegidas utilizando o algoritmo **bcrypt** com fator de custo (*work factor*) 10.
- Senhas em texto puro jamais são persistidas no banco de dados ou emitidas em logs.

### 1.2 Sessões e Tokens de Acesso
- A autenticação é baseada em tokens **JWT (JSON Web Token)** gerados e verificados com a biblioteca nativa `jose`.
- A assinatura utiliza HMAC SHA-256 (`HS256`) com chave simétrica derivada da variável de ambiente `JWT_SECRET`.
- O token é transportado exclusivamente em cookies HTTP com as seguintes propriedades de proteção:
  - `HttpOnly`: Impede a leitura do token por scripts JavaScript maliciosos no navegador (mitigação contra XSS);
  - `SameSite=Lax`: Mitiga requisições forjadas entre sites (CSRF);
  - `Secure`: Ativado automaticamente em produção para exigir canal criptografado HTTPS.

### 1.3 Proteção Contra Força Bruta
- O sistema mantém contadores de tentativas consecutivas de autenticação sem sucesso (`failedLoginAttempts`).
- Após **5 tentativas incorretas**, a conta é temporariamente bloqueada por um período de **15 minutos**.
- Qualquer tentativa de autenticação bem-sucedida zera imediatamente o contador de falhas.

---

## 2. Sigilo Clínico e Proteção LGPD

### 2.1 Isolamento de Prontuários Eletrônicos
- Por exigência ética dos conselhos de psicologia e psiquiatria (CFP/CFM) e da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), os registros de evolução de sessão (`ClinicalRecord`) constituem documento restrito do profissional de saúde.
- **Barreira de Acesso Rigorosa:** Todas as rotas de prontuário (`/api/clinical-records/*`) exigem validação de sessão no servidor com papel `ADMIN`. Qualquer tentativa de acesso por tokens de pacientes ou usuários não autenticados resulta em erro imediato `403 Forbidden`.

### 2.2 Compartilhamento Controlado de Arquivos
- Arquivos emitidos pelo profissional (recibos, atestados ou laudos) são armazenados em diretório privado fora do alcance da web (`./storage/uploads/`).
- O paciente só pode baixar documentos que possuam uma concessão explícita de compartilhamento (`FileShareGrant`) vinculada ao seu identificador.
- Concessões de compartilhamento possuem data de expiração (`expiresAt`). Tentativas de download após o término do prazo são rejeitadas.
- O endpoint de download previne vulnerabilidades de *Path Traversal* validando rigorosamente que o caminho absoluto do arquivo reside dentro do diretório base permitido.

### 2.3 Sanitização de Conteúdo Público (MiniSite)
- Os textos personalizáveis exibidos na página inicial e nas páginas legais passam pelo motor de sanitização (`src/lib/sanitize.ts`).
- Tags executáveis perigosas (`<script>`, `<iframe>`, `<object>`, `<embed>`) e manipuladores de eventos (`onclick`, `onload`, `javascript:`) são neutralizados antes da renderização.

---

## 3. Trilha de Auditoria (*Audit Trail*)

O sistema registra em tabela imutável `AuditLog` todos os eventos relevantes para segurança e governança:
- Autenticação e saídas de sessão do profissional;
- Criação e revisão de evoluções clínicas de pacientes (com registro de identificador e data, omitindo o texto confidencial da evolução);
- Confirmação manual de pagamentos e estornos financeiros;
- Concessão e revogação de compartilhamento de documentos;
- Geração de backups do banco de dados;
- Acessos privilegiados ao endpoint de monitoramento técnico.

---

## 4. Monitoramento Técnico Seguro (`/api/technical/status`)

- Exclusivamente acessível via requisições HTTP `GET`. Não há endpoints de escrita, alteração remota ou telemetria agressiva (arquitetura *Pull-only*).
- Requer cabeçalho `Authorization: Bearer <TOKEN>` configurado na variável de ambiente `TECHNICAL_STATUS_BEARER_TOKEN`.
- As métricas expostas são estritamente operacionais (versão, uptime, contagem agregada de agendamentos e status da conexão com o banco).
- **Garantia de Privacidade:** O endpoint jamais inclui dados identificadores de pacientes, nomes, telefones, prontuários ou senhas.
