# PSI — Sistema de Gestão de Consultórios

> **PSI** é uma solução completa, integrada e *single-tenant* desenvolvida sob medida para a prática clínica de **psicólogos e psiquiatras**. O sistema combina um MiniSite público de alta conversão, agendamento online inteligente com prevenção matemática de colisões de horário, prontuário eletrônico confidencial com escala visual de humor, teleconsulta segura integrada ao Jitsi Meet, gestão financeira com pacotes atômicos e rotinas de governança clínica.

---

## 🌟 Principais Recursos e Funcionalidades

### 🩺 Prática Clínica e Sigilo Ético
- **Prontuário Restrito:** Registros de evolução clínica de sessão (`ClinicalRecord`) estritamente inacessíveis por qualquer usuário que não seja o profissional de saúde (`ADMIN`).
- **Escala Visual de Humor (10 Pontos):** Marcador visual intuitivo de estado emocional por sessão para acompanhamento da evolução terapêutica.
- **Histórico de Revisões Auditado:** Versionamento automático a cada edição de notas clínicas (`ClinicalRecordRevision`).
- **Anamnese Estruturada:** Envio de questionário inicial pelo paciente e painel de análise e aprovação pelo profissional.
- **Compartilhamento Seguro de Documentos:** Envio de recibos, laudos e atestados em diretório privado fora da raiz pública da web (`storage/uploads/`), com controle de permissão e prazo de validade personalizável (15, 30, 60, 90 dias ou indeterminado).

### 📅 Agenda Inteligente e Concorrência Atômica
- **Prevenção Concorrente de Conflitos:** Validação matemática de sobreposição considerando horário de início, duração do atendimento e tempos de intervalo (*buffer* de preparação).
- **Reservas Temporárias (*Draft Holds*):** Bloqueio atômico de slots por 15 minutos durante o fluxo de agendamento online público para evitar reservas duplicadas simultâneas.
- **Política de Cancelamento Tardio:** Detecção automática de cancelamentos realizados com menos de 72 horas (3 dias), com registro de violação de política no histórico sem impedir a liberação do horário.
- **Controle de Assiduidade e Faltas (*No-Show*):** Registro de faltas e atualização automática de métricas de comparecimento.

### 🌐 MiniSite Público e Agendamento em 3 Etapas
- **Landing Page Completa (`/` e `/site`):** Apresentação do profissional, biografia, serviços oferecidos, endereço do consultório, depoimentos e links sociais, totalmente personalizável pelo painel administrativo.
- **Agendamento Guiado em 3 Etapas (`/agendar`):** Escolha de serviço $\to$ Seleção de dia e horário livre $\to$ Identificação do paciente e confirmação.
- **Canal WhatsApp Sem Falsa Reserva:** Botão público de contato via WhatsApp gera a conversa sem criar agendamentos fictícios na agenda.
- **Proteção Contra XSS:** Motor de sanitização estrita de HTML (`src/lib/sanitize.ts`) que neutraliza scripts, iframes ou tags executáveis.

### 💰 Financeiro e Pacotes de Sessões
- **Precisão Financeira:** Armazenamento rigoroso de valores monetários como **centavos inteiros de Real (`Int` BRL cents)**, prevenindo imprecisões de arredondamento.
- **Pacotes Atômicos ("Tudo ou Nada"):** Proposta de pacotes de sessões com datas pré-definidas. O aceite do paciente confirma todos os horários simultaneamente; a recusa ou expiração libera todos os horários atômica e imediatamente.
- **Simulador de Pagamento (`FakePaymentProvider`):** Máquina de estados financeira com suporte a chave de idempotência (`idempotencyKey`), prevenindo cobranças duplicadas, e suporte a confirmação manual de pagamentos presenciais/PIX.

### 🎥 Teleconsulta Segura (Jitsi Meet)
- **Gating de Acesso:** O paciente só é autorizado a ingressar na sala virtual 15 minutos antes do início previsto até o término da sessão.
- **Acesso Irrestrito ao Profissional:** O psicólogo/psiquiatra pode entrar antecipadamente para testes de áudio/vídeo e preparação.
- **Privacidade de Sala:** Geração de identificadores de sala com alta entropia e token temporário de sessão.

### 🛡️ Operações, Governança e Monitoramento Técnico
- **Endpoint GET Técnico (`/api/technical/status`):** Monitoramento *pull-only* protegido por token Bearer de alta entropia. Fornece status operacional e métricas agregadas sem jamais expor dados pessoais de pacientes ou dados clínicos confidenciais.
- **Backup com Checksum SHA-256:** Geração manual de cópias de segurança do banco e arquivos com manifesto estruturado e hash de integridade.
- **Monitor de Armazenamento:** Leitura real dos diretórios em disco sem restrições ou cotas artificiais inventadas.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework Fullstack** | [Next.js](https://nextjs.org/) v16.4.3 (App Router & Route Handlers) |
| **Biblioteca de UI** | [React](https://react.dev/) v19.3.0 |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) v4 |
| **Ícones** | [Lucide React](https://lucide.dev/) |
| **Banco de Dados & ORM** | MySQL / MariaDB via [Prisma ORM](https://www.prisma.io/) v6.19.3 |
| **Autenticação & Criptografia** | [jose](https://github.com/panva/jose) (JWT HS256) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Validação de Dados** | [Zod](https://zod.dev/) v3.24.2 |

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- Node.js v18.17+ ou Node.js v20+ / v22+
- Servidor MySQL ou MariaDB ativo localmente (ex: XAMPP, Docker ou serviço nativo)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd agendapsi
   ```

2. **Configure as Variáveis de Ambiente:**
   Copie o arquivo de exemplo e ajuste as configurações:
   ```bash
   cp .env.example .env
   ```
   *Certifique-se de configurar a variável `DATABASE_URL` com as credenciais do seu banco MySQL local.*

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Execute as Migrações do Banco de Dados:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Popule a Base com os Dados de Demonstração (Seed):**
   ```bash
   node prisma/seed.js
   ```
   *O seed provisiona serviços de psicologia/psiquiatria, grade de horários, modelo de anamnese, páginas legais e o usuário administrador inicial de desenvolvimento.*

6. **Inicie o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:3000`.

---

## 🔑 Credenciais Iniciais de Desenvolvimento

> ⚠️ **Aviso de Segurança:** As credenciais abaixo são destinadas **exclusivamente para testes em ambiente de desenvolvimento local**. Em implantações de produção, crie um novo administrador com senha forte e remova credenciais de demonstração.

- **Perfil:** Administrador (`ADMIN`)
- **E-mail:** `adminpsi@localhost.test` (usuário de login: `adminpsi`)
- **Senha temporária:** `adminpsi`
- **URL de Login:** `http://localhost:3000/login`

---

## 🧪 Testes Automatizados

O sistema conta com 20 testes unitários automatizados cobrindo os requisitos críticos de negócio, segurança, concorrência e autorização. Para executar a suíte:

```bash
node --test tests/**/*.test.js
```

---

## 📦 Build e Execução de Produção

Para compilar a aplicação e validar a integridade de todas as páginas e rotas de API:

```bash
npm run build
npm start
```

---

## 📚 Documentação Técnica Complementar

- [Arquitetura do Sistema e Fluxos (`docs/ARCHITECTURE.md`)](file:///docs/ARCHITECTURE.md)
- [Modelagem de Dados e Dicionário de Tabelas (`docs/DATABASE.md`)](file:///docs/DATABASE.md)
- [Regras de Negócio e Políticas Clínicas (`docs/BUSINESS_RULES.md`)](file:///docs/BUSINESS_RULES.md)
- [Catálogo Completo de Rotas e APIs (`docs/ROUTES.md`)](file:///docs/ROUTES.md)
- [Políticas de Segurança e Sigilo LGPD (`docs/SECURITY.md`)](file:///docs/SECURITY.md)
- [Guia de Implantação e Operações (`docs/DEPLOYMENT.md`)](file:///docs/DEPLOYMENT.md)
- [Viabilidade de Hospedagem (`docs/DEPLOYMENT_FEASIBILITY.md`)](file:///docs/DEPLOYMENT_FEASIBILITY.md)
- [Registro de Decisões Arquiteturais (`docs/DECISIONS.md`)](file:///docs/DECISIONS.md)
- [Relatório e Matriz de Progresso (`docs/PROGRESS.md`)](file:///docs/PROGRESS.md)
- [Instruções Contínuas de Engenharia (`AGENTS.md`)](file:///AGENTS.md)
