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
| `/politica-de-privacidade` | Política de Privacidade do consultório e gestão de cookies (alias: `/privacidade`) | Público |
| `/termos-de-uso` | Termos e Condições de Uso e regras de agendamento (alias: `/termos`) | Público |
| `/protecao-de-dados` | Informações sobre a LGPD e direitos do titular (alias: `/lgpd`) | Público |
| `/etica-profissional` | Código de Ética Profissional (CFP) e compromisso de sigilo clínico | Público |
| `/cookies` | Redirecionamento permanente para `/politica-de-privacidade` | Público |

---

## 2. Rotas Web Administrativas (`/admin`)
*Todas as páginas abaixo exigem sessão ativa com papel `ADMIN`.*

| Rota | Descrição |
| :--- | :--- |
| `/admin` | Painel de controle executivo com métricas financeiras, taxa de no-show e agendamentos |
| `/admin/agenda` | Calendário de atendimentos, alteração de status, faltas e cancelamentos |
| `/admin/servicos` | Gestão do catálogo de serviços e configurações gerais de agendamento (fuso horário, prazos, buffer e confirmações) |
| `/admin/pacientes` | Gestão de pacientes cadastrados, responsáveis de menores e aprovação de alterações |
| `/admin/pacientes/novo` | Cadastro manual completo de novos pacientes em página dedicada com geração de credencial |
| `/admin/pacientes/[id]` | Ficha detalhada do paciente, gestão privativa de prontuários clínicos (criação, edição e histórico auditado de revisões), agendamentos e finanças |
| `/admin/pacientes/[id]/editar` | Formulário dedicado de edição de dados cadastrais e status do paciente |
| `/admin/prontuarios` | Redirecionamento de segurança para `/admin/pacientes` (prontuários clínicos são privativos e geridos na ficha do paciente) |
| `/admin/financeiro` | Balanço financeiro, confirmação de pagamentos manuais e estornos |
| `/admin/pacotes` | Criação e monitoramento de propostas de pacotes de sessões |
| `/admin/minisite` | Editor de conteúdo do MiniSite (biografia, endereço, cores, redes sociais) |
| `/admin/paginas-informativas` | Central de gestão das páginas informativas independentes (Termos de Uso, Política de Privacidade, LGPD e Ética Profissional) |
| `/admin/paginas-informativas/[id]` | Editor full-page de página informativa com preview ao vivo, split-view, versionamento e restauração de padrão |
| `/admin/arquivos` | Monitor de uso de disco e rotina de geração de backup com checksum SHA-256 |
| `/admin/integracoes` | Central independente de integrações: E-mail (SMTP) e WhatsApp com testes de conexão |
| `/admin/lembretes` | Gerenciamento de templates e canais de disparo de lembretes e mensagens do consultório |
| `/admin/lembretes/registros` | Central de histórico e monitoramento de entregas de mensagens (e-mail SMTP e WhatsApp) com filtros, busca e métricas |
| `/admin/lembretes/registros/[id]` | Visualização detalhada de entrega de mensagem com timeline técnica, status do provedor, dados higienizados e reenvio seguro |
| `/admin/notificacoes` | Central administrativa de notificações internas e histórico (acessível via sino no cabeçalho) |
| `/admin/configuracoes` | Parâmetros do consultório, identidade visual, teleconsulta, agenda e segurança |

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
| `GET`  | `/api/admin/services/settings` | Admin | Consulta as políticas gerais de agendamento, buffer e confirmações |
| `PUT`  | `/api/admin/services/settings` | Admin | Atualiza as políticas globais de agendamento do consultório |

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
| `GET` | `/api/virtual-meeting/[token]` | Autenticado | Validação de gating temporal, autorização estrita (Admin ou paciente titular) e metadados de acesso (Jitsi, PeerJS ou Google Meet) |
| `POST` | `/api/notifications/run-reminders` | Admin / Cron | Disparo idempotente de lembretes automáticos de consulta |
| `GET` | `/api/notifications` | Autenticado | Listagem de notificações do usuário com contagem de não lidas |
| `PATCH`| `/api/notifications/[id]/read` | Autenticado | Marcação de notificação específica como lida |
| `POST` | `/api/notifications/mark-all-read` | Autenticado | Marcação de todas as notificações do usuário como lidas |
| `GET` | `/api/admin/notification-templates` | Admin | Listagem de templates compartilhados e canais de entrega |
| `PUT` | `/api/admin/notification-templates/[eventType]` | Admin | Atualização de template compartilhado por evento com preview |
| `POST` | `/api/admin/notification-templates/restore-default` | Admin | Restauração do template original padrão do evento |
| `GET` | `/api/admin/message-logs` | Admin | Listagem paginada e filtrada de registros de entrega de mensagens com métricas dos últimos 7 dias |
| `GET` | `/api/admin/message-logs/[id]` | Admin | Detalhamento técnico de registro individual de mensagem e dados do agendamento vinculado |
| `POST` | `/api/admin/message-logs/[id]/resend` | Admin | Reenvio seguro de mensagem com travas de segurança e auditoria |
| `POST` | `/api/webhooks/messages` | Webhook | Endpoint para recepção de status de entrega de mensagens por provedores externos (e-mail/WhatsApp) |

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
| `GET` | `/api/admin/video-providers` | Admin | Consulta do provedor de videoconferência padrão ativo exclusivo (`JITSI`, `PEERJS`, `GOOGLE_MEET`) e status |
| `PUT` | `/api/admin/video-providers` | Admin | Seleção exclusiva do provedor padrão de teleconsulta com validação de pré-requisitos |
| `POST` | `/api/admin/video-providers/jitsi/test` | Admin | Teste de conectividade e verificação SSL do domínio Jitsi Meet configurado |
| `POST` | `/api/admin/video-providers/test` | Admin | Teste de conectividade do servidor de sinalização PeerJS WebRTC |
| `POST` | `/api/admin/video-providers/google/test` | Admin | Teste de emissão e limpeza de sala Google Meet via Google Calendar API |
| `GET` | `/api/admin/integrations/google/auth` | Admin | Início do fluxo OAuth 2.0 com Google Calendar e escopos de teleconsulta |
| `GET` | `/api/admin/integrations/google/callback` | Público/Admin | Callback OAuth do Google para troca de código por tokens e dados da conta |
| `POST` | `/api/admin/integrations/google/disconnect` | Admin | Revogação de acesso e desconexão da conta Google com reversão segura |

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
- **Modo de Desenvolvimento Local Não Autenticado (Fase 4):**
  - Permite acesso via navegador diretamente em `http://localhost:3000/api/technical/status` ou `http://127.0.0.1:3000/api/technical/status` **exclusivamente** quando todas as seguintes condições forem satisfeitas de forma cumulativa:
    1. `NODE_ENV === "development"` (bloqueio total e irrevogável em produção);
    2. Variável de ambiente explícita `PSI_LOCAL_TECHNICAL_STATUS_PUBLIC=true` configurada no ambiente local (`.env.local`);
    3. Host da requisição restrito à interface de loopback (`127.0.0.1`, `localhost`, `::1`);
    4. Ausência de proxies reversos externos, túneis públicos (ngrok, Cloudflare Tunnel) ou IPs não locais.
  - **Diferenciação de Resposta Higienizada:** No modo desautenticado de desenvolvimento local, o grupo `administrator` (nome, e-mail, telefone) e identificadores sensíveis de instalação são **completamente omitidos** da resposta JSON. Apenas métricas seguras agregadas de armazenamento, aplicação, integrações e pagamentos são retornadas.
  - **Como Habilitar:** Adicionar `PSI_LOCAL_TECHNICAL_STATUS_PUBLIC=true` em `.env.local` e iniciar o servidor com `npm run dev -- -H 127.0.0.1`.
  - **Como Desabilitar:** Remover a linha ou definir `PSI_LOCAL_TECHNICAL_STATUS_PUBLIC=false`.
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
| `PUT` | `/api/admin/site/settings` | Admin | Atualização de conteúdo e textos do MiniSite, diferenciais, localização e WhatsApp |
| `POST` | `/api/admin/minisite/media/upload` | Admin | Upload seguro de mídias do MiniSite (imagens, vídeos e frames ZIP) |
| `POST` | `/api/admin/minisite/media/import-local` | Admin | Importação em 1 clique de frames locais existentes em storage/minisite |
| `GET` | `/api/admin/minisite/media/settings` | Admin | Consulta detalhada das configurações dos slots de mídia (Hero e Sobre Mim) |
| `PUT` | `/api/admin/minisite/media/settings` | Admin | Persistência dos parâmetros de reprodução, velocidade, loop e enquadramento de mídia |
| `POST` | `/api/admin/minisite/icons/upload` | Admin | Upload e sanitização de ícones customizados (PNG e SVG sanitizado) |

### 4.7 Páginas Informativas e Conteúdo Legal
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET`  | `/api/admin/information-pages` | Admin | Listagem das 4 páginas informativas (termos, privacidade, lgpd, ética) com auto-inicialização |
| `GET`  | `/api/admin/information-pages/[id]` | Admin | Consulta detalhada do conteúdo e metadados de uma página informativa |
| `PUT`  | `/api/admin/information-pages/[id]` | Admin | Atualização com validação Zod, sanitização HTML e registro em `AuditLog` |
| `POST` | `/api/admin/information-pages/[id]/publish` | Admin | Alternância atômica do status de publicação (`isPublished`) com auditoria |
| `POST` | `/api/admin/information-pages/[id]/restore-default` | Admin | Restauração dos templates padrão recomendados pelo PSI com auditoria |
