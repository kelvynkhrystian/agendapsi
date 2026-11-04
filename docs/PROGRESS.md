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
| **Fase 1** | Fundações: Next.js, Prisma, Schema, Auth, Design System | `implemented` | Schema migrado no MySQL, seed aplicado, rotas de auth, tokens JWT, dark/light mode e testes unitários |
| **Fase 2** | Slice Vertical: Dashboard Admin, Serviços, Agenda & Concorrência | `in progress` | Iniciando implementação da gestão de serviços, calendário e engine de agendamento atômico |
| **Fase 3** | Identidade do Paciente, Responsáveis Legais & Área do Paciente | `not started` | |
| **Fase 4** | MiniSite Público, Agendamento em 3 Passos & Solicitação WhatsApp | `not started` | |
| **Fase 5** | Financeiro, Máquina de Estados Fake Payment & Pacotes de Sessões | `not started` | |
| **Fase 6** | Prontuário Clínico Privado, Anamnese, Escala de Humor & Documentos | `not started` | |
| **Fase 7** | Teleconsulta Jitsi Gated & Notificações (Email/WhatsApp Simulator) | `not started` | |
| **Fase 8** | Operações: Configurações, Backup/Restore, Storage & Monitoramento GET | `not started` | |
| **Fase 9** | Hardening, 20 Testes de Aceitação, Build de Produção & Entrega Final | `not started` | |

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
- [x] Inicialização do projeto Next.js (App Router, TypeScript, Tailwind CSS)
- [x] Configuração do Prisma ORM com MySQL (`prisma/schema.prisma`)
- [x] Modelagem relacional completa e migrações iniciais (`docs/DATABASE.md`)
- [x] Sistema de Autenticação (JWT, Cookies HTTP-only, Roles `ADMIN` e `PATIENT`)
- [x] Seeds de desenvolvimento (`adminpsi`, serviços de exemplo, templates de anamnese)
- [x] Design System base (Tailwind, Tema Claro/Escuro, Componentes de UI, Lucide Icons)
- [x] `.env.example` e documentação de setup
- [x] Testes de autenticação e controle de acesso executados com sucesso

### Fase 2 — Dashboard Admin, Serviços e Agenda
- [ ] CRUD de Serviços (duração, modalidade, preço, intervalo/buffer, política de confirmação)
- [ ] Configuração de Disponibilidade Semanal, Exceções e Bloqueios
- [ ] Calendário Semanal com visualizações e controle de horários
- [ ] Concorrência atômica para agendamento (prevenção de colisões)
- [ ] Dashboard com indicadores reais, filtros e gráficos
- [ ] Testes de agendamento e sobreposição

### Fase 3 — Pacientes e Área do Paciente
- [ ] Cadastro e Gestão de Pacientes pelo Admin
- [ ] Registro público de paciente e login com senha temporária
- [ ] Suporte a pacientes menores de idade com dados de responsável legal
- [ ] Área do paciente (`/paciente`): visualização de sessões, documentos e perfil
- [ ] Solicitação de alteração de dados sensíveis com aprovação pelo Admin

### Fase 4 — MiniSite e Agendamento Público
- [ ] MiniSite editável acessível em `/` e `/site`
- [ ] Seções: Hero, Sobre, Serviços, Localização, Contato, Agendar
- [ ] Fluxo de agendamento em 3 etapas com persistência de rascunho
- [ ] Fluxo de solicitação via WhatsApp (apenas mensagem, sem reserva indevida)
- [ ] Sanitização estrita de HTML customizado no MiniSite

### Fase 5 — Financeiro e Pacotes
- [ ] Implementação do `FakePaymentProvider` (estados e transações)
- [ ] Confirmação manual de pagamentos presenciais / WhatsApp
- [ ] Gestão de Pacientes: pacotes fechados com datas atômicas
- [ ] Relatórios financeiros com distinção visual de valores simulados e reais
- [ ] Política de retenção/estorno em cancelamentos tardios e no-shows

### Fase 6 — Módulo Clínico
- [ ] Templates de Anamnese e resposta pelo paciente com revisão do Admin
- [ ] Prontuário Eletrônico privado (notas de sessão, escala visual de humor 10 pontos)
- [ ] Exportação de prontuário em PDF com layout profissional
- [ ] Liberação controlada de documentos com prazo de expiração
- [ ] Armazenamento privado de arquivos (fora de `public/`) com sanitização e ACL

### Fase 7 — Vídeo e Comunicações
- [ ] Integração Jitsi Meet com sala de alta entropia
- [ ] Sala de espera do PSI com liberação 15 minutos antes da sessão
- [ ] Adaptador de e-mail (SMTP/API) com Outbox de desenvolvimento
- [ ] Simulador de mensagens WhatsApp e fila de lembretes idempotente
- [ ] Templates de notificação personalizáveis

### Fase 8 — Operações e Governança
- [ ] Telas de configurações completas do Admin (10 abas)
- [ ] Edição de páginas legais (Termos, Privacidade, Cookies, LGPD)
- [ ] Endpoint `GET /api/technical/status` protegido por Bearer Token
- [ ] Métricas de armazenamento local e integridade de disco
- [ ] Auditoria de ações administrativas e de acesso aos dados
- [ ] Rotina de Backup/Exportação e assistente de Restore seguro

### Fase 9 — Hardening e Aceitação
- [ ] Execução dos 20 testes de aceitação requeridos
- [ ] Testes de concorrência e autorização adversarial
- [ ] Build de produção (`npm run build`) validado
- [ ] Documentação completa de entrega (`README.md`, `AGENTS.md`, `ARCHITECTURE.md`, etc.)
