# PSI — Relatório de Auditoria de Segurança e Teste de Invasão

**Plataforma Auditada:** PSI — Sistema de Gestão de Consultórios para Psicólogos e Psiquiatras  
**Versão:** 1.0.0 (Next.js 16, React 19, TypeScript, Prisma ORM 6, MySQL/MariaDB)  
**Data da Auditoria:** 13 de Novembro de 2026  
**Classificação:** Confidencial / Relatório Técnico de Segurança  
**Padrões de Referência:** OWASP Top 10:2021, OWASP API Security Top 10:2023, LGPD (Lei Federal 13.709/2018), Código de Ética Profissional (CFP/CFM)  
**Status da Remediação:** AUDITORIA CONCLUÍDA — AGUARDANDO AUTORIZAÇÃO PARA REMEDIAÇÃO

---

## A. SUMÁRIO EXECUTIVO

Foi realizada uma avaliação abrangente e controlada de segurança da informação, análise estática de código-fonte (SAST) e testes de intrusão autorizados na aplicação PSI. A plataforma gerencia ativos altamente sensíveis, incluindo prontuários clínicos psicológicos/psiquiátricos, registros de anamnese, histórico de sessões, gravações e links de teleconsulta, dados cadastrais de pacientes (inclusive menores de idade), propostas financeiras e backups integrais.

### Visão Geral da Postura de Segurança

A arquitetura do PSI demonstra decisões de engenharia muito sólidas em diversos módulos centrais:
- **Sigilo Clínico Estrito:** Todos os prontuários e notas de evolução (`ClinicalRecord`) estão blindados sob autorização exclusiva do papel `ADMIN`. Nenhuma rota do portal do paciente expõe anotações clínicas.
- **Armazenamento Privado de Documentos:** Os arquivos de pacientes residem fora do diretório público (`storage/uploads/`), com controle de permissão por paciente, verificação de expiração e revogação.
- **Motor de Backup Seguro:** O módulo de restauração de backup implementa defesas avançadas contra *ZipSlip* e *ZipBombs*, validação de hashes SHA-256 e snapshots de rollback automático.
- **Prevenção de Injeção SQL:** Utilização consistente do Prisma ORM com queries parametrizadas.

Entretanto, a auditoria identificou **1 vulnerabilidade CRÍTICA**, **4 vulnerabilidades de ALTA severidade**, **5 vulnerabilidades de MÉDIA severidade**, **2 vulnerabilidades de BAIXA severidade** e **2 itens INFORMATIVOS**. O principal risco crítico reside no **armazenamento em texto puro e exposição de credenciais/hashes de pacientes em respostas de API**, acompanhado por ausência de limitação de tentativas no login de pacientes e inconsistências no fluxo de recuperação de senhas.

> [!IMPORTANT]
> **Conclusão para Implantação:** A aplicação **NÃO deve ser colocada em produção aberta com pacientes reais** até que as vulnerabilidades Crítica e de Alta severidade (VULN-01 a VULN-05) sejam formalmente corrigidas.

---

## B. RESUMO DE VULNERABILIDADES

| ID | Severidade | Vulnerabilidade | Área Afetada | Status |
|:---|:---|:---|:---|:---|
| **PSI-SEC-01** | **CRÍTICA** | Armazenamento em texto puro e exposição de credenciais/hashes em APIs | Autenticação & Pacientes | Confirmada |
| **PSI-SEC-02** | **ALTA** | Fluxo de recuperação de senha inoperante (rota 404 e token não persistido) | Autenticação & Recuperação | Confirmada |
| **PSI-SEC-03** | **ALTA** | Webhook de mensageria sem autenticação obrigatória (falha aberta) | Integrações & Webhooks | Confirmada |
| **PSI-SEC-04** | **ALTA** | Disparo de lembretes não autenticado via bypass de cabeçalho Host | Notificações & Cron | Confirmada |
| **PSI-SEC-05** | **ALTA** | Ausência de rate limiting e bloqueio contra força bruta em pacientes | Autenticação & Agenda | Confirmada |
| **PSI-SEC-06** | **MÉDIA** | Bypass de sanitização HTML no filtro customizado (XSS Armazenado) | Páginas Informativas & Legal | Confirmada |
| **PSI-SEC-07** | **MÉDIA** | Ausência de cabeçalhos de segurança HTTP globais e CSP | Infraestrutura & Middleware | Confirmada |
| **PSI-SEC-08** | **MÉDIA** | Sessões JWT puramente stateless sem revogação no servidor e logout real | Gerenciamento de Sessões | Confirmada |
| **PSI-SEC-09** | **MÉDIA** | Exposição do segredo mestre do servidor TURN ao cliente WebRTC | Teleconsulta (PeerJS/WebRTC) | Confirmada |
| **PSI-SEC-10** | **MÉDIA** | Segredo JWT padrão estático (fallback) codificado no código-fonte | Criptografia & Configuração | Confirmada |
| **PSI-SEC-11** | **BAIXA** | Enumeração de contas de pacientes por discrepância de mensagens de erro | Autenticação & LGPD | Confirmada |
| **PSI-SEC-12** | **BAIXA** | Requisito de senha fraco (mínimo de 6 caracteres sem complexidade) | Políticas de Credenciais | Confirmada |
| **PSI-SEC-13** | **INFO** | Método de pagamento simulado aceito sem restrição de ambiente | Financeiro & Agendamento | Confirmada |
| **PSI-SEC-14** | **INFO** | Avisos de dependências desatualizadas no npm audit (Zod / Prisma) | Dependências Externas | Confirmada |

---

## C. DETALHAMENTO DAS VULNERABILIDADES

### PSI-SEC-01: Armazenamento em texto puro e exposição de credenciais/hashes nas APIs de pacientes
- **Severidade:** CRÍTICA (CVSS 9.1 — AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
- **CWE:** CWE-256 (Plaintext Storage of a Password), CWE-312 (Cleartext Storage of Sensitive Information), CWE-200 (Exposure of Sensitive Information)
- **Arquivos Afetados:**
  - `prisma/schema.prisma` (campo `tempPassword` no modelo `Patient`)
  - `src/app/api/patients/route.ts` (linhas 110, 126, 168-169, e GET linha 69)
  - `src/app/api/patients/[id]/route.ts` (GET linha 62)
- **Descrição Técnica:**
  Ao cadastrar um novo paciente no painel administrativo, o sistema gera uma senha temporária utilizando `Math.random().toString(36).substring(2, 10)` e a persiste em texto puro na coluna `tempPassword` da tabela `Patient`. Adicionalmente, as rotas `GET /api/patients` e `GET /api/patients/[id]` realizam chamadas `prisma.patient.findMany` e `prisma.patient.findUnique` sem filtro de campos (`select`). Como consequência, o objeto JSON retornado ao navegador inclui o hash bcrypt (`passwordHash`) e a senha temporária em claro (`tempPassword`).
- **Impacto no Negócio e LGPD:**
  Violação frontal do Art. 46 da LGPD e do sigilo de credenciais. Qualquer interceptação de tráfego, log intermediário ou extensão de navegador na sessão administrativa expõe as senhas de todos os pacientes cadastrados.
- **Causa Raiz:**
  Armazenamento persistente de senhas em claro e omissão de projeção seletiva (`select`) nas consultas do Prisma.
- **Correção Recomendada:**
  1. Remover a coluna `tempPassword` do `schema.prisma`.
  2. Gerar senhas temporárias exclusivamente com `crypto.randomBytes(6).toString("hex")` e nunca persisti-las em texto puro (armazenar apenas o hash bcrypt).
  3. Exibir a senha temporária ao administrador **uma única vez** na resposta da criação (`POST /api/patients`) e nunca mais armazená-la.
  4. Adicionar cláusulas `select` rigorosas ou uma função utilitária `excludeFields(patient, ['passwordHash', 'tempPassword'])` em todas as rotas que retornam entidades de pacientes.

---

### PSI-SEC-02: Fluxo de recuperação de senha inoperante (rota 404 e token não persistido)
- **Severidade:** ALTA (CVSS 7.5 — AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H)
- **CWE:** CWE-640 (Weak Password Recovery Mechanism for Forgotten Password), CWE-306 (Missing Authentication for Critical Function)
- **Arquivos Afetados:**
  - `src/app/api/auth/recover-password/route.ts` (linhas 105-108)
  - Ausência de página e API para redefinição
- **Descrição Técnica:**
  A rota `POST /api/auth/recover-password` gera um token criptográfico via `crypto.randomBytes(24).toString("hex")` e despacha um e-mail/SMS com o link `${baseUrl}/redefinir-senha?token=${resetToken}&email=${normalizedEmail}`. Contudo:
  1. O token `resetToken` **nunca é persistido** no banco de dados, cache ou Redis.
  2. A rota `/redefinir-senha` **não existe** no projeto (retorna status HTTP 404).
  3. A rota existente `POST /api/auth/change-password` exige obrigatoriamente usuário autenticado com sessão e a senha atual (`currentPassword`).
- **Impacto no Negócio:**
  Qualquer paciente ou administrador que esquecer sua senha não consegue recuperá-la de forma autônoma. Usuários recebem mensagens que direcionam para um link quebrado (404), gerando perda de acesso clínico e chamados urgentes de suporte.
- **Causa Raiz:**
  Implementação incompleta da funcionalidade de recuperação de senha.
- **Correção Recomendada:**
  1. Criar o modelo `PasswordResetToken` no Prisma (`tokenHash`, `userId`, `userRole`, `expiresAt`, `usedAt`).
  2. Salvar o hash SHA-256 do token gerado com validade estrita de 15 a 30 minutos.
  3. Implementar a rota de interface `src/app/redefinir-senha/page.tsx` e o endpoint `POST /api/auth/reset-password`.
  4. Invalidar o token imediatamente após o primeiro uso e invalidar quaisquer sessões existentes.

---

### PSI-SEC-03: Webhook de mensageria sem autenticação obrigatória (falha aberta)
- **Severidade:** ALTA (CVSS 8.2 — AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:L)
- **CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-287 (Improper Authentication)
- **Arquivos Afetados:**
  - `src/app/api/webhooks/messages/route.ts` (linhas 201-213)
- **Descrição Técnica:**
  No processamento de webhooks de provedores SMS e WhatsApp genéricos (TextBee / OpenWA), o código verifica a assinatura ou token com a seguinte condicional:
  ```typescript
  const expectedSecret = process.env.MESSAGE_WEBHOOK_SECRET;
  if (expectedSecret) {
    // valida x-webhook-secret ou api-key
  }
  ```
  Como a variável `MESSAGE_WEBHOOK_SECRET` é opcional e não vem configurada por padrão no `.env.example`, o bloco de checagem é completamente ignorado. Qualquer entidade externa na internet pode submeter requisições POST para `/api/webhooks/messages`.
- **Impacto no Negócio:**
  Atacantes podem forjar notificações de entrega de mensagens, marcando confirmações de agendamento ou links de teleconsulta como entregues ou falhos, manipulando os relatórios de auditoria e a comunicação clínica.
- **Causa Raiz:**
  Padrão inseguro de "falha aberta" (*fail-open*) quando a chave de configuração não está preenchida.
- **Correção Recomendada:**
  Adotar comportamento "falha fechada" (*fail-closed*):
  ```typescript
  if (!expectedSecret) {
    return NextResponse.json({ error: "Webhook não configurado no servidor." }, { status: 503 });
  }
  if (!providedSecret || !constantTimeEquals(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  ```

---

### PSI-SEC-04: Disparo não autorizado de lembretes por bypass via cabeçalho Host
- **Severidade:** ALTA (CVSS 7.3 — AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:H)
- **CWE:** CWE-287 (Improper Authentication), CWE-346 (Origin Validation Error)
- **Arquivos Afetados:**
  - `src/app/api/notifications/run-reminders/route.ts` (linhas 13-20)
- **Descrição Técnica:**
  A verificação de autorização do endpoint de execução de lembretes é implementada como:
  ```typescript
  if (secret && authHeader !== `Bearer ${secret}`) {
    const isLocalhost = req.headers.get("host")?.includes("localhost");
    if (!isLocalhost) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }
  ```
  Duas falhas graves convergem:
  1. Se `TECHNICAL_STATUS_BEARER_TOKEN` não estiver no `.env`, a checagem é ignorada.
  2. O cabeçalho HTTP `Host` é controlado pelo atacante. Uma requisição contendo `Host: localhost` faz `isLocalhost` avaliar como `true`, permitindo que qualquer atacante externo acione a rotina remotamente.
- **Impacto no Negócio:**
  Envio repetitivo e em massa de mensagens por WhatsApp, SMS e e-mail para pacientes da clínica, gerando desgaste na relação terapêutica e exaustão de cotas de APIs contratadas.
- **Causa Raiz:**
  Confiança indevida em cabeçalho HTTP de requisição do cliente para validação de privilégio de rede.
- **Correção Recomendada:**
  Exigir incondicionalmente um Bearer Token de alta entropia para qualquer disparo deste endpoint, ou restringir a execução exclusivamente via CLI interno / Node script agendado.

---

### PSI-SEC-05: Ausência de rate limiting e bloqueio contra força bruta em pacientes
- **Severidade:** ALTA (CVSS 7.5 — AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)
- **CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts), CWE-799 (Improper Control of Interaction Frequency), CWE-400 (Uncontrolled Resource Consumption)
- **Arquivos Afetados:**
  - `src/app/api/auth/login/route.ts` (linhas 127-189)
  - `src/app/api/auth/register-patient/route.ts`
  - `src/app/api/booking/draft-hold/route.ts`
- **Descrição Técnica:**
  Enquanto a conta `ADMIN` possui contador de falhas (`failedLogins`) e bloqueio de 15 minutos após 5 erros, a autenticação de `PATIENT` não possui nenhuma restrição de tentativas. Um atacante pode testar milhares de senhas sem bloqueio. Adicionalmente, as rotas de cadastro de paciente e de reserva temporária de horários (`draft-hold`) não possuem limitação de taxa nem verificação anti-bot.
- **Impacto no Negócio:**
  Comprometimento de contas de pacientes via ataques de dicionário; risco de *Slot Hoarding Denial of Service*, onde um script reserva e bloqueia todos os horários da agenda da clínica por 60 minutos consecutivamente sem custo.
- **Causa Raiz:**
  Falta de política unificada de limitação de requisições por IP e identidade.
- **Correção Recomendada:**
  1. Adicionar campos `failedLogins` e `lockedUntil` no modelo `Patient`.
  2. Implementar middleware de Rate Limiting em memória (ou Redis) com janela deslizante (ex: máximo 5 tentativas de login por minuto por IP; máximo 10 pré-reservas por hora por IP).

---

### PSI-SEC-06: Bypass de sanitização HTML no filtro customizado (XSS Armazenado)
- **Severidade:** MÉDIA (CVSS 6.1 — AV:N/AC:L/PR:H/UI:R/S:C/C:L/I:L/A:N)
- **CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation), CWE-184 (Incomplete List of Disallowed Inputs)
- **Arquivos Afetados:**
  - `src/lib/sanitize.ts` (linhas 1-25)
  - `src/components/legal-page-view.tsx` (linhas 34, 101)
  - `src/app/admin/paginas-informativas/[id]/page.tsx` (linha 516)
- **Evidência de Reprodução Segura:**
  A função `sanitizeCustomHtml` tenta remover manipuladores de eventos exigindo espaço (`\son\w+`). Testada em ambiente controlado, os seguintes vetores passaram incólumes pelo filtro:
  - `<img/src=x/onerror=alert(1)>` -> **PASSOU INTACTO**
  - `<svg/onload=alert(1)>` -> **PASSOU INTACTO**
  - `<a href="vbscript:alert(1)">click</a>` -> **PASSOU INTACTO**
- **Impacto no Negócio:**
  Se um usuário administrativo copiar e colar conteúdo de terceiros ou se um campo for comprometido, scripts maliciosos serão executados no navegador de visitantes do site e de pacientes ao lerem as páginas de termos de uso e privacidade.
- **Causa Raiz:**
  Uso de expressões regulares para sanitização de HTML em substituição a um parser DOM estruturado.
- **Correção Recomendada:**
  Substituir o regex em `src/lib/sanitize.ts` pela biblioteca `sanitize-html` ou `isomorphic-dompurify`, com whitelist explícita de tags (`p`, `strong`, `em`, `ul`, `ol`, `li`, `a`, `h1`-`h4`, `br`) e atributos permitidos (`href` estritamente HTTP/HTTPS).

---

### PSI-SEC-07: Ausência de cabeçalhos de segurança HTTP globais e CSP
- **Severidade:** MÉDIA (CVSS 5.3 — AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N)
- **CWE:** CWE-1021 (Improper Restriction of Rendered UI Layers or Frames), CWE-693 (Protection Mechanism Failure)
- **Arquivos Afetados:**
  - `next.config.mjs`
  - Ausência de `src/middleware.ts`
- **Descrição Técnica:**
  A aplicação Next.js não define cabeçalhos de segurança HTTP. Foram verificadas as ausências de:
  - `X-Frame-Options: SAMEORIGIN` (proteção contra Clickjacking)
  - `Content-Security-Policy` (CSP)
  - `X-Content-Type-Options: nosniff` (mitigação de sniffing MIME)
  - `Strict-Transport-Security` (HSTS)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Impacto no Negócio:**
  Exposição a ataques de interface enganosa (Clickjacking), permitindo que telas do painel sejam inseridas em iframes invisíveis de sites de terceiros para induzir cliques involuntários.
- **Causa Raiz:**
  Configuração padrão do Next.js sem personalização no bloco `headers()` de `next.config.mjs`.
- **Correção Recomendada:**
  Adicionar a propriedade `async headers()` em `next.config.mjs` injetando os cabeçalhos de segurança recomendados pela OWASP.

---

### PSI-SEC-08: Sessões JWT puramente stateless sem revogação no servidor e logout real
- **Severidade:** MÉDIA (CVSS 5.3 — AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:N/A:N)
- **CWE:** CWE-613 (Insufficient Session Expiration)
- **Arquivos Afetados:**
  - `src/lib/auth.ts` (linhas 38-44, 61-66)
  - `src/app/api/auth/logout/route.ts`
  - `src/app/api/auth/change-password/route.ts`
- **Descrição Técnica:**
  A autenticação utiliza tokens JWT (HS256) com validade de 7 dias armazenados em cookie `httpOnly`. O endpoint de logout apenas instrui o navegador a remover o cookie (`maxAge: 0`). Como o backend não mantém controle de revogação de tokens nem consulta a tabela `Session` existente no Prisma, o token JWT continua criptograficamente válido até o término dos 7 dias. Alterações de senha também não invalidam tokens emitidos anteriormente.
- **Impacto no Negócio:**
  Caso o token de um profissional ou paciente seja capturado antes do logout, ele continuará concedendo acesso total à conta por até uma semana, violando o princípio de desautorização imediata.
- **Causa Raiz:**
  Adoção de JWT 100% stateless sem lista de bloqueio ou verificação de versão de token.
- **Correção Recomendada:**
  Adicionar o campo `tokenVersion Int @default(1)` nos modelos `AdminAccount` e `Patient`. No JWT, incluir `tokenVersion`. Na função `verifyToken()`, rejeitar tokens com versão defasada. Ao alterar a senha ou clicar em "Encerrar todas as sessões", incrementar o `tokenVersion`.

---

### PSI-SEC-09: Exposição do segredo mestre do servidor TURN ao cliente WebRTC
- **Severidade:** MÉDIA (CVSS 4.9 — AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N)
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
- **Arquivos Afetados:**
  - `src/app/api/virtual-meeting/[token]/route.ts` (linha 99)
- **Descrição Técnica:**
  Na rota de entrada da sala virtual, o endpoint retorna as configurações de PeerJS/WebRTC incluindo o campo:
  `turnSecret: settings?.peerJsTurnSecret || process.env.PEERJS_TURN_SECRET || null`
  Caso o profissional utilize um servidor TURN próprio (ex: coturn) com segredo compartilhado mestre, esse segredo estático é enviado diretamente em formato texto no payload JSON para o navegador do paciente e do médico.
- **Impacto no Negócio:**
  Qualquer paciente ou interceptador do tráfego obtém a chave mestra do servidor de retransmissão de mídia, podendo utilizá-lo para retransmitir tráfego externo ilícito ou gerar custos elevados de banda.
- **Causa Raiz:**
  Compartilhamento do segredo estático em vez de geração de credenciais temporárias efêmeras.
- **Correção Recomendada:**
  Implementar o mecanismo padrão da RFC 5766 (TURN REST API): gerar credenciais com validade curta (`username = timestamp:usuario`, `credential = HMAC-SHA1(turnSecret, username)`), mantendo o `turnSecret` confidencial no backend.

---

### PSI-SEC-10: Segredo JWT padrão estático (fallback) codificado no código-fonte
- **Severidade:** MÉDIA (CVSS 6.8 — AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N)
- **CWE:** CWE-798 (Use of Hard-coded Credentials), CWE-321 (Use of Hard-coded Cryptographic Key)
- **Arquivos Afetados:**
  - `src/lib/auth.ts` (linhas 7-9)
- **Descrição Técnica:**
  O segredo de assinatura JWT é inicializado como:
  ```typescript
  const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "psi_dev_jwt_secret_98fbc9823e47a21cd678e012fae84321_secure"
  );
  ```
  Caso um administrador faça o deploy da aplicação em um servidor e esqueça de configurar a variável `JWT_SECRET` no arquivo `.env`, o sistema utilizará a chave padrão pública do código-fonte.
- **Impacto no Negócio:**
  Qualquer agente que conheça o código-fonte poderá forjar tokens JWT válidos com `role: "ADMIN"`, assumindo controle administrativo integral da clínica sem necessidade de senha.
- **Causa Raiz:**
  Fallback estático permissivo em arquivos de segurança criptográfica.
- **Correção Recomendada:**
  Em ambiente de produção (`NODE_ENV === "production"`), se `process.env.JWT_SECRET` não estiver presente ou possuir menos de 32 caracteres, a aplicação deve falhar imediatamente na inicialização (*fail-fast*), impedindo a execução com chaves padrão.

---

### PSI-SEC-11: Enumeração de contas de pacientes por discrepância de respostas
- **Severidade:** BAIXA (CVSS 3.7 — AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N)
- **CWE:** CWE-204 (Observable Response Discrepancy)
- **Arquivos Afetados:**
  - `src/app/api/auth/login/route.ts` (linhas 140-148, 191-194)
  - `src/app/api/auth/register-patient/route.ts` (linhas 68-73)
- **Descrição Técnica:**
  A rota de login diferencia erros: se o e-mail pertencer a uma conta existente sem senha, retorna mensagem específica sobre a ausência de senha; se o e-mail não existir, retorna `"E-mail ou senha incorretos."`. Na rota de cadastro, retorna HTTP 409 explícito com `"Este e-mail já está cadastrado no sistema."`.
- **Impacto no Negócio:**
  Permite a terceiros verificar se determinada pessoa (por e-mail) é paciente de saúde mental cadastrado na clínica, caracterizando vazamento de dado pessoal sensível perante a LGPD.
- **Correção Recomendada:**
  Uniformizar todas as respostas de falha de login para a mensagem genérica `"E-mail ou senha incorretos."`. No fluxo de cadastro, adotar respostas que não confirmem a existência prévia de contas para agentes não autenticados.

---

### PSI-SEC-12: Requisito de senha fraco (mínimo de 6 caracteres sem complexidade)
- **Severidade:** BAIXA (CVSS 3.3 — AV:L/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)
- **CWE:** CWE-521 (Weak Password Requirements)
- **Arquivos Afetados:**
  - `src/app/api/auth/register-patient/route.ts` (linha 11)
  - `src/app/api/auth/change-password/route.ts` (linha 8)
- **Descrição Técnica:**
  A validação Zod aceita senhas de apenas 6 caracteres compostas unicamente por letras minúsculas ou dígitos sequenciais (ex: `123456`).
- **Impacto no Negócio:**
  Maior suscetibilidade a ataques de adivinhação e quebra offline de senhas.
- **Correção Recomendada:**
  Aumentar o requisito mínimo para 8 a 10 caracteres, exigindo a presença de letras e números.

---

### PSI-SEC-13: Método de pagamento simulado disponível sem restrição de ambiente
- **Severidade:** INFORMACIONAL
- **CWE:** CWE-1188 (Insecure Default Initialization of Resource)
- **Arquivos Afetados:**
  - `src/app/api/booking/confirm/route.ts` (linhas 12, 75-80)
- **Descrição Técnica:**
  A confirmação de agendamento aceita `paymentMethod: "ONLINE_SIMULATED"` e aprova o pagamento instantaneamente (`status: "APPROVED"`). Esse modo é útil para homologação, mas se mantido disponível em produção sem um toggle explícito nas configurações da clínica, permite que pacientes agendem consultas sem liquidação financeira prévia.
- **Correção Recomendada:**
  Bloquear a opção `ONLINE_SIMULATED` quando `NODE_ENV === "production"`, a menos que o profissional tenha habilitado expressamente um "Modo de Demonstração" em Configurações.

---

### PSI-SEC-14: Avisos de dependências no npm audit (Zod / Prisma)
- **Severidade:** INFORMACIONAL
- **CWE:** CWE-1395 (Dependency on Vulnerable Third-Party Component)
- **Arquivos Afetados:**
  - `package.json`, `package-lock.json`
- **Descrição Técnica:**
  O `npm audit` reporta:
  - `zod` < 4.6.6 (CWE-770, GHSA-mrhx-c7xc-m3w5): exaustão de memória em coleções restritas aninhadas.
  - `deepmerge-ts` / `@prisma/config` (< 8.0.0): exaustão de pilha em merge recursivo durante build.
- **Correção Recomendada:**
  Planejar a atualização dessas dependências no próximo ciclo de manutenção de pacotes.

---

## D. ÁREAS VERIFICADAS COMO SEGURAS (SEM VULNERABILIDADES)

Durante a auditoria, as seguintes áreas críticas foram inspecionadas e comprovaram conformidade estrita:

1. **Acesso aos Registros Clínicos (Prontuários e Evoluções):**
   - As rotas `/api/clinical-records`, `/api/clinical-records/[id]` e `/api/patients/[id]/records` exigem incondicionalmente `requireAdmin()`.
   - Nenhuma rota acessível ao papel `PATIENT` retorna anotações de evolução de sessão ou diagnósticos confidenciais.
2. **Download e Compartilhamento de Arquivos Privados:**
   - A rota `/api/files/[id]/download` valida estritamente a titularidade do paciente (`shares.patientId === session.userId`), checa o prazo de expiração (`expiresAt`) e o cancelamento do acesso (`revokedAt`).
   - Todos os arquivos residem em `storage/uploads/` e não possuem exposição estática em `public/`.
   - O código aplica `path.basename` e `startsWith(baseDir)` para impedir qualquer tentativa de *Path Traversal*.
3. **Mecanismo de Descompactação e Restauração de Backups:**
   - O arquivo `src/lib/backup.ts` possui verificação rigorosa contra *ZipSlip* (`validateSafeArchiveEntryPath`), bloqueia links simbólicos (`0o120000`), impõe teto de descompactação de 1 GB e 25.000 entradas (*ZipBomb protection*) e valida hashes SHA-256 de cada item extraído.
4. **Proteção Contra SSRF nas Integrações de Notificação:**
   - A função `validateProviderBaseUrl` em `src/lib/secrets.ts` bloqueia ativamente acessos a metadados de nuvem (`169.254.169.254`, `metadata.google.internal`), rejeita credenciais embutidas e exige protocolo HTTPS para alvos externos.
5. **Prevenção de Injeção SQL:**
   - Uso padronizado de queries parametrizadas pelo Prisma ORM. As poucas chamadas brutas existentes no backup utilizam strings SQL estáticas sem concatenação de dados do usuário.

---

## E. COBERTURA DE TESTES REALIZADOS

| Categoria de Teste | Escopo | Resultado | Observações |
|:---|:---|:---|:---|
| **Auditoria de Dependências** | `npm audit` em 305 pacotes | Reprovado (4 avisos) | Zod e DeepmergeTS identificados |
| **Integridade de Credenciais** | Modelos Prisma e rotas `/api/patients` | Reprovado | `tempPassword` em texto puro e hashes expostos |
| **Recuperação de Senhas** | `/api/auth/recover-password` | Reprovado | Rota inexistente (404) e token não persistido |
| **Validação de Webhooks** | `/api/webhooks/messages` | Reprovado | Falha aberta sem chave configurada |
| **Cron Jobs e Lembretes** | `/api/notifications/run-reminders` | Reprovado | Bypass por cabeçalho `Host: localhost` |
| **Força Bruta e Rate Limit** | `/api/auth/login`, `/api/booking/draft-hold` | Reprovado | Sem limite de tentativas para pacientes |
| **Sanitização de HTML (XSS)** | `src/lib/sanitize.ts` com vetores SVG/IMG | Reprovado | Bypasses confirmados em execução segura |
| **Cabeçalhos de Segurança HTTP** | `next.config.mjs` e middleware | Reprovado | Ausência de CSP, HSTS e X-Frame-Options |
| **Sigilo de Prontuários** | Rotas de `ClinicalRecord` e dados clínicos | **Aprovado** | Acesso estritamente restrito ao `ADMIN` |
| **Download de Arquivos Privados** | `/api/files/[id]/download` | **Aprovado** | IDOR e Path Traversal bloqueados |
| **Descompactação de Backup** | `src/lib/backup.ts` (ZipSlip/ZipBomb) | **Aprovado** | Verificações robustas validadas |
| **Proteção Anti-SSRF** | `validateProviderBaseUrl` | **Aprovado** | Metadados e IPs privados bloqueados |
| **Injeção SQL** | Verificação em todo o repositório `src/` | **Aprovado** | 100% parametrizado via Prisma |

### Cenários Não Testados Intencionalmente (Segurança e Integridade)
- **Negação de Serviço Destrutiva (DoS / Stress Testing):** Não foram executadas requisições volumosas destinadas a derrubar o servidor ou travar o MariaDB.
- **Ataque a Infraestruturas de Terceiros:** Não foram disparadas mensagens não solicitadas para APIs da Meta, Google, TextBee ou PeerJS Cloud.
- **Corrupção de Banco de Dados:** Não foram submetidos comandos de injeção destrutivos no banco de dados ativo.

---

## F. PLANO DE REMEDIAÇÃO PRIORIZADO

### Fase 1: Prioridade Imediata (Bloqueadores de Deploy em Produção)
1. **Eliminar `tempPassword` e Exposição de Hashes (PSI-SEC-01):**
   - Remover o campo `tempPassword` do Prisma.
   - Garantir que `POST /api/patients`, `GET /api/patients` e `GET /api/patients/[id]` nunca retornem `passwordHash` ou senhas no JSON.
2. **Corrigir o Fluxo de Recuperação de Senhas (PSI-SEC-02):**
   - Criar modelo `PasswordResetToken` com hash e expiração de 15 minutos.
   - Criar a página `/redefinir-senha` e a rota `POST /api/auth/reset-password`.
3. **Blindar Webhooks e Cron de Lembretes (PSI-SEC-03 e PSI-SEC-04):**
   - Exigir `MESSAGE_WEBHOOK_SECRET` com política *fail-closed* no webhook.
   - Exigir Bearer Token obrigatório em `/api/notifications/run-reminders` e remover a checagem falha do cabeçalho `Host`.
4. **Rate Limiting no Login de Pacientes e Agendamento (PSI-SEC-05):**
   - Aplicar bloqueio temporário após 5 erros no login de pacientes.
   - Limitar taxa de chamadas em `/api/booking/draft-hold` para coibir ataques de esgotamento da agenda.

### Fase 2: Prioridade de Curto Prazo (Hardening de Segurança)
1. **Substituir o Sanitizador de HTML (PSI-SEC-06):**
   - Adotar `DOMPurify` ou `sanitize-html` em `src/lib/sanitize.ts` com lista restritiva de tags e atributos seguros.
2. **Injetar Cabeçalhos HTTP de Segurança Globais (PSI-SEC-07):**
   - Adicionar `headers()` em `next.config.mjs` com `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Content-Security-Policy`.
3. **Proteger Segredo do Servidor TURN (PSI-SEC-09):**
   - Implementar credenciais temporárias efêmeras HMAC-SHA1 para WebRTC em vez de enviar o segredo mestre ao navegador.
4. **Remover Fallback de Chave JWT Hardcoded (PSI-SEC-10):**
   - Forçar encerramento do processo em produção caso `JWT_SECRET` não esteja configurado no `.env`.

### Fase 3: Melhorias Contínuas e Governança
1. **Revogação Ativa de Sessões JWT (PSI-SEC-08):**
   - Adicionar controle de `tokenVersion` no banco para invalidar tokens emitidos antes de alterações de senha ou logouts.
2. **Mitigação de Enumeração de Pacientes (PSI-SEC-11):**
   - Padronizar mensagens de erro em formulários públicos para reforçar a privacidade LGPD.
3. **Elevação da Política de Senhas (PSI-SEC-12):**
   - Estabelecer requisito mínimo de 8 a 10 caracteres com política de complexidade.

---

## G. CONCLUSÃO GERAL DE SEGURANÇA

A arquitetura do **PSI** possui fundações muito bem estruturadas no que tange ao sigilo do prontuário psicológico, isolamento de banco de dados monopaciente/monoprofissional, integridade de backups e armazenamento de documentos. 

Entretanto, devido à presença de **5 vulnerabilidades de severidade Crítica e Alta** — com destaque para o vazamento de hashes e senhas temporárias em texto puro e fragilidades na autenticação de webhooks/cron —, **a versão atual não está pronta para receber dados reais de pacientes em produção**.

A realização de um piloto controlado ou implantação em produção **deve ser precedida pela execução da Fase 1 do Plano de Remediação**.

Após a autorização formal do usuário/administrador, a equipe de engenharia iniciará as correções pontuais e a validação por meio da suíte automatizada de testes.
