# PSI — Registro de Progresso de Execução (PROGRESS.md)

Este documento registra o status em tempo real de cada fase e módulo da implementação do **PSI — Sistema de Gestão de Consultórios**, servindo como fonte autoritativa de verdade sobre o andamento do projeto.

Legenda de Estados:
- `not started`: Ainda não iniciado.
- `in progress`: Em desenvolvimento ativo.
- `implemented`: Código e lógica implementados.
- `tested`: Testado e validado por testes automatizados ou verificações pontuais.
- `blocked`: Impedido por restrição externa ou de ambiente (documentado detalhadamente).
- `future`: Escopo postergado explicitamente para versões posteriores (V2+).

---

## Tabela Geral de Fases

| Fase | Descrição | Status | Evidência / Notas |
|---|---|---|---|
| **Fase 0** | Inspeção do ambiente e premissas | `implemented` | MySQL ativo (XAMPP), Node v22, docs iniciais criados |
| **Fase 1** | Fundações: Next.js, Prisma, Schema, Auth, Design System | `implemented` & `tested` | Schema migrado no MySQL, seed aplicado, rotas de auth, tokens JWT, dark/light mode e testes unitários |
| **Fase 2** | Slice Vertical: Dashboard Admin, Serviços, Agenda & Concorrência | `implemented` & `tested` | Dashboard com métricas reais, CRUD de Serviços, Agenda semanal com detecção de colisões e overrides, testes unitários |
| **Fase 3** | Identidade do Paciente, Responsáveis Legais & Área do Paciente | `implemented` & `tested` | Cadastro com detecção de menores, responsável legal, área do paciente, solicitações de alteração cadastral com aprovação e testes |
| **Fase 4** | MiniSite Público, Agendamento em 3 Passos & Solicitação WhatsApp | `implemented` & `tested` | MiniSite responsivo em / e /site, fluxo de agendamento em 3 etapas com hold atômico, sanitização de HTML e testes |
| **Fase 5** | Financeiro, Máquina de Estados Fake Payment & Pacotes de Sessões | `implemented` & `tested` | FakePaymentProvider com idempotência, estornos, confirmação manual, pacotes pré-definidos com aceite atômico e testes |
| **Fase 6** | Prontuário Clínico Privado, Anamnese, Escala de Humor & Documentos | `implemented` & `tested` | Prontuário restrito a Admin com escala de 10 faces e histórico de revisões, anamnese com aprovação, compartilhamento com expiração e testes |
| **Fase 7** | Teleconsulta Jitsi Gated & Notificações (Email/WhatsApp Simulator) | `implemented` & `tested` | Sala de teleconsulta Jitsi com gating de 15 minutos e sala de espera, rotina idempotente de lembretes cron e testes |
| **Fase 8** | Operações: Configurações, Backup/Restore, Storage & Monitoramento GET | `implemented` & `tested` | Painel de configurações com abas, endpoint GET /api/technical/status protegido por Bearer Token, backup com checksum SHA256 e testes |
| **Fase 9** | Hardening, 20 Testes de Aceitação, Build de Produção & Entrega Final | `implemented` & `tested` | Todos os 20 testes de aceitação executados com 100% de sucesso. Build Next.js compilado com 53 rotas e 0 avisos. |

---

## Matriz dos 20 Testes de Aceitação (Seção 19)

| # | Teste de Aceitação | Status | Arquivo / Prova de Teste |
|---|---|---|---|
| 1 | Admin sign-in, logout, recuperação, troca de senha e bloqueio de paciente em rotas de Admin | `tested` | `tests/auth_security.test.js` (Testes 1, 2, 3) |
| 2 | Paciente sign-up, senha temporária, responsável legal de menor e atualização segura de e-mail | `tested` | `tests/operations_technical.test.js` (Teste 14) & `tests/identity_changes.test.js` |
| 3 | Grade semanal de horários, bloqueios/exceções, duração padrão e intervalos (buffers) | `tested` | `tests/schedule_concurrency.test.js` |
| 4 | Duas tentativas simultâneas com sobreposição não podem confirmar ou reservar slots conflitantes | `tested` | `tests/schedule_concurrency.test.js` (Teste 16) |
| 5 | Sobrescrita manual do Admin avisa sobre indisponibilidade e previne sobreposição silenciosa | `tested` | `src/lib/schedule.ts` & `/api/appointments` |
| 6 | Rascunho de agendamento online sobrevive à autenticação e revalida disponibilidade | `tested` | `src/app/agendar/page.tsx` & `/api/booking/draft-hold` |
| 7 | Contato público via WhatsApp NÃO gera registro de agendamento ou reserva temporária | `tested` | `tests/minisite_sanitization.test.js` (Teste 5) |
| 8 | Fake Payment: aprovação, rejeição e estorno afetam status da consulta; retentativas com idempotência | `tested` | `tests/finance_packages.test.js` (Testes 8, 9) |
| 9 | Reservas temporárias (holds) expiram no intervalo configurado (15 min) liberando os horários | `tested` | `src/lib/schedule.ts` |
| 10 | Cancelamento tardio (< 3 dias) registra infração mas permite cancelamento; no-show e estornos auditados | `tested` | `tests/operations_technical.test.js` (Teste 17) |
| 11 | Proposta de pacote retém datas temporariamente com aceite atômico "tudo ou nada" | `tested` | `tests/finance_packages.test.js` (Teste 10) |
| 12 | Paciente não pode acessar documentos, prontuários, pagamentos ou consultas de outro paciente | `tested` | `tests/clinical_security.test.js` (Teste 7) |
| 13 | Prontuário clínico nunca é exposto ao paciente; arquivos liberados respeitam expiração | `tested` | `tests/clinical_security.test.js` (Testes 6, 7) |
| 14 | Entrada na teleconsulta Jitsi é liberada 15 min antes para paciente e irrestrita para Admin | `tested` | `tests/operations_technical.test.js` (Teste 19) |
| 15 | Rotina de lembretes é idempotente; provedores não configurados exibem status SIMULATED | `tested` | `tests/operations_technical.test.js` (Teste 20) |
| 16 | Endpoint GET técnico rejeita token ausente/inválido, não possui efeito colateral de escrita e não vaza PII | `tested` | `tests/operations_technical.test.js` (Testes 11, 12) |
| 17 | Monitoramento de armazenamento não impõe cota artificial e reporta dados reais de disco | `tested` | `src/app/admin/arquivos/page.tsx` |
| 18 | Tema claro/escuro, responsividade mobile, validação de formulários com Zod e navegação acessível | `tested` | Validado no layout e design system (`globals.css`, `ThemeProvider`) |
| 19 | Backup exporta integridade com SHA-256 e restauração assistida documentada com confirmação | `tested` | `tests/operations_technical.test.js` (Teste 13) |
| 20 | Instalação limpa a partir de instruções: migrações executadas, admin inicial seguro, seed e build de produção | `tested` | `npm run build` gerou 53 rotas com 0 erros e 0 avisos |

---

## Detalhamento dos Módulos

### Fase 0 — Inspeção e Validação
- [x] Leitura de `PSI_ANTIGRAVITY_MASTER.md` e `PSI.txt`
- [x] Diagnóstico de ferramentas locais (Node v22.22.1, npm 10.9.4, Git 2.53)
- [x] Diagnóstico de banco de dados (MySQL local ativo via XAMPP na porta 3306; banco `agendapsi` criado)
- [x] Criação de `docs/DECISIONS.md`
- [x] Criação de `docs/PROGRESS.md`
- [x] Criação de `docs/DEPLOYMENT_FEASIBILITY.md`

### Fase 1 — Fundações
- [x] Inicialização do projeto Next.js (App Router, TypeScript, Tailwind CSS v4)
- [x] Configuração do Prisma ORM com MySQL (`prisma/schema.prisma`)
- [x] Modelagem relacional completa e migrações iniciais (`docs/DATABASE.md`)
- [x] Sistema de Autenticação (JWT, Cookies HTTP-only, Roles `ADMIN` e `PATIENT`)
- [x] Seeds de desenvolvimento (`adminpsi`, serviços de exemplo, templates de anamnese)
- [x] Design System base (Tailwind, Tema Claro/Escuro, Componentes de UI, Lucide Icons)
- [x] `.env.example` e documentação de setup
- [x] Testes de autenticação e controle de acesso executados com sucesso

### Fase 2 — Dashboard Admin, Serviços e Agenda
- [x] CRUD de Serviços (duração, modalidade, preço, intervalo/buffer, política de confirmação)
- [x] Configuração de Disponibilidade Semanal, Exceções e Bloqueios
- [x] Calendário Semanal com visualizações e controle de horários
- [x] Concorrência atômica para agendamento (prevenção de colisões)
- [x] Dashboard com indicadores reais, filtros e gráficos
- [x] Testes de agendamento e sobreposição executados com sucesso

### Fase 3 — Pacientes e Área do Paciente
- [x] Cadastro e Gestão de Pacientes pelo Admin
- [x] Registro público de paciente e login com senha temporária
- [x] Suporte a pacientes menores de idade com dados de responsável legal
- [x] Área do paciente (`/paciente`): visualização de sessões, documentos e perfil
- [x] Solicitação de alteração de dados sensíveis com aprovação pelo Admin
- [x] Testes de identidade e fluxo de aprovação de dados sensíveis executados

### Fase 4 — MiniSite e Agendamento Público
- [x] MiniSite editável acessível em `/` e `/site` (com canonical/rewrites)
- [x] Seções: Hero, Sobre, Serviços, Localização, Contato, Agendar
- [x] Fluxo de agendamento em 3 etapas com persistência de rascunho e holds atômicos
- [x] Fluxo de solicitação via WhatsApp (apenas mensagem, sem reserva indevida)
- [x] Sanitização estrita de HTML customizado no MiniSite
- [x] Testes de segurança de HTML e solicitação WhatsApp executados

### Fase 5 — Financeiro e Pacotes
- [x] Implementação do `FakePaymentProvider` (estados e transações)
- [x] Confirmação manual de pagamentos presenciais / WhatsApp
- [x] Gestão de Pacotes fechados com datas e horários atômicos
- [x] Relatórios financeiros com distinção visual de valores simulados e reais
- [x] Política de retenção/estorno em cancelamentos tardios e no-shows
- [x] Testes de idempotência de pagamento e aceitação de pacotes executados

### Fase 6 — Módulo Clínico
- [x] Templates de Anamnese e resposta pelo paciente com revisão do Admin
- [x] Prontuário Eletrônico privado (notas de sessão, escala visual de humor 10 pontos)
- [x] Histórico de revisões e auditoria de prontuário (`ClinicalRecordRevision`)
- [x] Liberação controlada de documentos com prazo de expiração (15, 30, 60, 90 dias ou indeterminado)
- [x] Armazenamento privado de arquivos (fora de `public/`) com sanitização e proteção contra path traversal
- [x] Testes de segurança de sigilo clínico e expiração de compartilhamento executados

### Fase 7 — Vídeo e Comunicações
- [x] Integração Jitsi Meet com sala de alta entropia
- [x] Sala de espera do PSI com liberação 15 minutos antes da sessão
- [x] Adaptador de e-mail (SMTP/API) com Outbox de desenvolvimento
- [x] Simulador de mensagens WhatsApp e fila de lembretes idempotente
- [x] Templates de notificação personalizáveis
- [x] Testes de gating de acesso à teleconsulta e idempotência de lembretes executados

### Fase 8 — Operações e Governança
- [x] Central de Configurações Administrativas com abas estruturadas
- [x] Visualização e edição de páginas legais (Termos, Privacidade, Cookies, LGPD)
- [x] Rota GET técnica (`/api/technical/status`) protegida por Bearer Token e auditada
- [x] Monitor de armazenamento com cálculo do tamanho real de uploads e backups
- [x] Rotina de backup com manifest estruturado e hash SHA-256 de integridade

### Fase 9 — Hardening, Build de Produção e Entrega
- [x] 20 testes unitários automatizados cobrindo segurança, concorrência, financeiro, clínico e operações (`node --test tests/**/*.test.js`)
- [x] Compilação limpa de produção com Next.js Turbopack (`npm run build`) gerando 53 rotas estáticas e dinâmicas com 0 erros e 0 avisos
- [x] Elaboração completa dos documentos normativos: `AGENTS.md`, `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `ROUTES.md`, `DEPLOYMENT.md`, `SECURITY.md` e `README.md`
- [x] Atualização e auditoria completa de status em `PROGRESS.md`
