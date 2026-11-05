# PSI — Catálogo de Rotas e Endpoints da Aplicação

Este documento relaciona todas as páginas e rotas de API disponíveis no sistema **PSI**, seus respectivos métodos, permissões de acesso e finalidades.

---

## 1. Rotas Web Públicas

| Rota | Descrição | Controle de Acesso |
| :--- | :--- | :--- |
| `/` | MiniSite do consultório (apresentação, serviços, depoimentos, localização) | Público |
| `/site` | Alias de rota reescrito diretamente para `/` via Next.js rewrites | Público |
| `/agendar` | Fluxo guiado em 3 etapas de agendamento online de consultas | Público |
| `/login` | Página de autenticação para profissional (Admin) e pacientes | Público |
| `/cadastro` | Formulário público de autocadastro para novos pacientes | Público |
| `/recuperar-senha` | Solicitação de redefinição de senha com token de expiração | Público |
| `/consulta-virtual/[token]` | Sala de espera e entrada para teleconsulta | Autenticado (Gated) |
| `/privacidade` | Política de Privacidade do consultório | Público |
| `/termos` | Termos e Condições de Uso | Público |
| `/cookies` | Política de Cookies | Público |
| `/lgpd` | Informações sobre a Lei Geral de Proteção de Dados Pessoais | Público |

---

## 2. Rotas Web Administrativas (`/admin`)
*Todas as páginas abaixo exigem sessão ativa com papel `ADMIN`.*

| Rota | Descrição |
| :--- | :--- |
| `/admin` | Painel de controle executivo com métricas financeiras, taxa de no-show e agendamentos |
| `/admin/agenda` | Calendário de atendimentos, alteração de status, faltas e cancelamentos |
| `/admin/servicos` | Gestão dos serviços oferecidos, modalidades, durações, preços e tempos de buffer |
| `/admin/pacientes` | Gestão de pacientes cadastrados, responsáveis de menores e aprovação de alterações |
| `/admin/pacientes/[id]` | Ficha detalhada do paciente, gestão privativa de prontuários clínicos (criação, edição e histórico auditado de revisões), agendamentos e finanças |
| `/admin/prontuarios` | Redirecionamento de segurança para `/admin/pacientes` (prontuários clínicos são privativos e geridos na ficha do paciente) |
| `/admin/financeiro` | Balanço financeiro, confirmação de pagamentos manuais e estornos |
| `/admin/pacotes` | Criação e monitoramento de propostas de pacotes de sessões |
| `/admin/minisite` | Editor de conteúdo do MiniSite (biografia, endereço, cores, redes sociais) |
| `/admin/arquivos` | Monitor de uso de disco e rotina de geração de backup com checksum SHA-256 |
| `/admin/integracoes` | Central independente de integrações: E-mail (SMTP) e WhatsApp com testes de conexão |
| `/admin/notificacoes` | Central administrativa de notificações internas e histórico |
| `/admin/configuracoes` | Parâmetros do consultório, identidade visual, templates de notificação, teleconsulta e logs |

---

## 3. Rotas Web do Paciente (`/paciente`)
*Todas as páginas abaixo exigem sessão ativa com papel `PATIENT`.*

| Rota | Descrição |
| :--- | :--- |
| `/paciente` | Painel do paciente: próximas consultas, status e atalho para consulta virtual |
| `/paciente/perfil` | Visualização e atualização direta de dados pessoais, contatos e alteração segura de e-mail |
| `/paciente/verificar-email` | Validação de token de alteração de e-mail com migração segura de credenciais |
| `/paciente/notificacoes` | Histórico e central de notificações internas do paciente |
| `/paciente/anamnese` | Formulário estruturado de anamnese para resposta do paciente |
| `/paciente/financeiro` | Histórico de pagamentos e painel de aceite/rejeição de pacotes propostos |
| `/paciente/documentos` | Arquivos, recibos e declarações compartilhados pelo profissional |

---

## 4. Endpoints de API REST (`/api/*`)

### 4.1 Autenticação e Conta (`/api/auth/*`)
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Público | Autenticação via e-mail e senha com emissão de cookie JWT |
| `POST` | `/api/auth/logout` | Autenticado | Revogação da sessão e limpeza do cookie de autenticação |
| `GET` | `/api/auth/me` | Autenticado | Retorna os dados do usuário autenticado na sessão atual |
| `POST` | `/api/auth/register-patient` | Público | Cadastro de novo paciente (inclui validação de menor de idade) |
| `POST` | `/api/auth/recover-password` | Público | Geração de token seguro para recuperação de senha |
| `POST` | `/api/auth/change-password` | Autenticado | Alteração de senha do usuário autenticado |
| `GET`  | `/api/patient/profile` | Paciente | Consulta dados do perfil do paciente e status de conectividade de e-mail |
| `PATCH`| `/api/patient/profile` | Paciente | Atualização direta de perfil (nome, CPF, nascimento, telefone, endereço) |
| `POST` | `/api/patient/email-change/request` | Paciente | Solicitação segura de alteração de e-mail com token SHA-256 e rate limit |
| `POST` | `/api/patient/email-change/verify` | Público/Autenticado | Verificação de token de uso único, expiração e migração segura do e-mail |

### 4.2 Agendamento e Concorrência
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/availability/weekly` | Admin | Consulta e configuração da grade semanal de horários |
| `GET` | `/api/availability/slots` | Público | Consulta horários livres disponíveis para uma data e serviço |
| `POST` | `/api/availability/exceptions` | Admin | Cadastro de bloqueios de horário ou expedientes extraordinários |
| `DELETE`| `/api/availability/exceptions/[id]`| Admin | Remoção de exceção de disponibilidade |
| `POST` | `/api/booking/draft-hold` | Público | Criação de reserva temporária de 15 minutos (*Draft Hold*) |
| `POST` | `/api/booking/confirm` | Público | Confirmação atômica do agendamento a partir de um hold ativo |
| `GET` | `/api/appointments` | Autenticado | Listagem de agendamentos (filtrada por paciente se for `PATIENT`) |
| `PATCH`| `/api/appointments/[id]/status`| Autenticado | Atualização de status (cancelamento, no-show, conclusão) |

### 4.3 Prontuários e Documentos Clínicos
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clinical-records` | **Admin Only** | Consulta evoluções clínicas (pacientes recebem 403 Forbidden) |
| `POST` | `/api/clinical-records` | **Admin Only** | Criação de nova evolução clínica com escala visual de humor |
| `PUT` | `/api/clinical-records/[id]` | **Admin Only** | Atualização com versionamento em `ClinicalRecordRevision` |
| `GET` | `/api/anamnesis` | Autenticado | Consulta modelo de anamnese ou respostas enviadas |
| `POST` | `/api/anamnesis` | Paciente | Submissão das respostas do questionário de anamnese |
| `POST` | `/api/admin/patients/[id]/anamnesis-reset` | Admin | Solicitação de novo preenchimento de anamnese mantendo histórico auditado |
| `POST` | `/api/files/upload` | Admin | Upload de documentos para diretório privado fora da raiz pública |
| `POST` | `/api/files/[id]/share` | Admin | Configuração de compartilhamento privado com prazo de validade |
| `PATCH` | `/api/files/shares/[shareId]` | Admin | Revogação imediata ou reativação com renovação de prazo de documento compartilhado |
| `GET` | `/api/files/[id]/download` | Autenticado | Download/visualização segura validando titularidade, revogação e expiração |

### 4.4 Finanças e Pacotes
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/payments` | Autenticado | Listagem de pagamentos (filtrado por paciente ou visão geral admin) |
| `POST` | `/api/payments/[id]/confirm-manual` | Admin | Confirmação manual de pagamento presencial/PIX |
| `POST` | `/api/payments/[id]/refund` | Admin | Estorno de pagamento com cancelamento de consulta associada |
| `GET` | `/api/packages` | Autenticado | Listagem de pacotes de sessões |
| `POST` | `/api/packages` | Admin | Criação de proposta de pacote com reserva atômica de horários |
| `POST` | `/api/packages/[id]/accept` | Paciente | Aceite integral ("tudo ou nada") da proposta de pacote |
| `POST` | `/api/packages/[id]/reject` | Paciente/Admin| Rejeição e liberação atômica imediata dos horários retidos |

### 4.5 Teleconsulta e Notificações
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/virtual-meeting/[token]` | Autenticado | Validação de gating temporal e geração de sala Jitsi segura |
| `POST` | `/api/notifications/run-reminders` | Admin / Cron | Disparo idempotente de lembretes automáticos de consulta |
| `GET` | `/api/notifications` | Autenticado | Listagem de notificações do usuário com contagem de não lidas |
| `PATCH`| `/api/notifications/[id]/read` | Autenticado | Marcação de notificação específica como lida |
| `POST` | `/api/notifications/mark-all-read` | Autenticado | Marcação de todas as notificações do usuário como lidas |
| `GET` | `/api/admin/notification-templates` | Admin | Listagem de templates compartilhados e canais de entrega |
| `PUT` | `/api/admin/notification-templates/[eventType]` | Admin | Atualização de template compartilhado por evento com preview |
| `POST` | `/api/admin/notification-templates/restore-default` | Admin | Restauração do template original padrão do evento |

### 4.6 Integrações e Customização Visual
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/integrations` | Admin | Consulta status e credenciais mascaradas de SMTP e WhatsApp |
| `PUT` | `/api/admin/integrations/email` | Admin | Configuração independente de servidor SMTP e remetente |
| `POST` | `/api/admin/integrations/email/test` | Admin | Envio de e-mail de teste para validação de conectividade |
| `PUT` | `/api/admin/integrations/whatsapp` | Admin | Configuração independente da API/provedor de WhatsApp |
| `POST` | `/api/admin/integrations/whatsapp/test` | Admin | Teste de conectividade e envio de mensagem WhatsApp |
| `GET` | `/api/admin/appearance` | Admin | Consulta configurações de logotipo, favicon e paleta de cores |
| `PUT` | `/api/admin/appearance` | Admin | Atualização de paleta HEX (primária, secundária, destaque, botões) |
| `POST` | `/api/admin/appearance/upload` | Admin | Upload seguro de logotipo padrão, logotipo horizontal e favicon |
| `GET` | `/api/admin/video-providers` | Admin | Consulta do provedor de videoconferência ativo e opções disponíveis |
| `PUT` | `/api/admin/video-providers` | Admin | Seleção de provedor ativo (Jitsi Meet, PeerJS ou Google Meet) |

### 4.6 Operações e Monitoramento Técnico
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/technical/status` | Bearer Token / Admin | Endpoint técnico para diagnóstico e monitoramento estruturado de saúde da instalação |
| `POST` | `/api/admin/backup` | Admin | Execução de rotina de backup com manifest e checksum SHA-256 |
| `GET` | `/api/admin/dashboard-stats` | Admin | Agregação de estatísticas para o painel principal |

#### Detalhamento Técnico: `GET /api/technical/status`
Endpoint de leitura (PULL) para monitoramento da saúde e métricas agregadas da instância standalone.

**Autenticação e Segurança:**
- Exige `Authorization: Bearer <TECHNICAL_STATUS_BEARER_TOKEN>` ou sessão ativa com papel `ADMIN`.
- Todas as tentativas sem autorização são registradas em `TechnicalAccessLog` com IP e User-Agent, retornando `401 Unauthorized`.
- **Sigilo Absoluto:** Nunca expõe senhas, hashes, tokens, chaves de API, credenciais de integração, prontuários clínicos ou identidades individuais de pacientes.

**Grupos de Resposta:**
1. `installation`:
   - `applicationVersion`: Versão do PSI (`package.json`).
   - `installationId`: Identificador da instância standalone (`INSTALLATION_ID`).
   - `timestamp`: Timestamp UTC da coleta (`ISO 8601`).
   - `applicationStatus`: Status da aplicação (`OPERATIONAL`).
2. `administrator`:
   - `name`: Nome do profissional titular (`AdminAccount.name`).
   - `email`: E-mail de contato administrativo (`AdminAccount.email`).
   - `phone`: Telefone profissional (`AdminAccount.phone`).
3. `storage`:
   - `totalFileSizeBytes`: Total acumulado de bytes dos arquivos (`StoredFile._sum.sizeBytes`).
   - `totalFileCount`: Quantidade total de arquivos persistidos (`StoredFile.count()`).
   - `usageMB`: Espaço ocupado em Megabytes com 2 casas decimais.
   - `availableDiskSpaceBytes`: Espaço livre real no disco (`statfsSync`). Retorna `null` caso o host não suporte mensuração.
4. `application`:
   - `totalPatients`: Quantidade total de pacientes cadastrados (`Patient.count()`).
   - `totalAppointments`: Quantidade total de consultas agendadas (`Appointment.count()`).
   - `totalServices`: Quantidade de serviços/procedimentos configurados (`Service.count()`).
5. `integrations`:
   - `emailStatus`: `"OPERATIONAL"`, `"CONFIGURED_UNTESTED"`, `"CONFIGURED_SIMULATED"`, `"DELIVERY_FAILED"`, `"MISCONFIGURED"`, `"DISABLED"`. A mera presença de variáveis não assume operacionalidade; considera o histórico real de envios em `NotificationDelivery`.
   - `whatsappStatus`: `"OPERATIONAL"`, `"CONFIGURED_UNTESTED"`, `"CONFIGURED_SIMULATED"`, `"MISCONFIGURED"`, `"DISABLED"`.
   - `paymentGatewayStatus`: `"SIMULATED_ACTIVE"` ou `"DISABLED"` conforme `SystemSettings.enableOnlinePayment`.
   - `videoProvider`: Provedor ativo de teleconsulta (`"JITSI"`, `"PEERJS"`, `"GOOGLE_MEET"`).
6. `payments`:
   - `totalPayments`: Total de cobranças geradas (`Payment.count()`).
   - `pendingPayments`: Cobranças aguardando quitação (`status === "PENDING"`).
   - `approvedPayments`: Cobranças liquidadas com sucesso (`status === "APPROVED"`).
   - `integrationStatus`: `"ONLINE_SIMULATED"` ou `"MANUAL_IN_PERSON"`.
| `GET` | `/api/site/settings` | Público | Consulta parâmetros e customizações do MiniSite |
| `PUT` | `/api/admin/site/settings` | Admin | Atualização de conteúdo e textos do MiniSite e páginas legais |
