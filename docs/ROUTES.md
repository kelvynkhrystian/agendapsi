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
| `/admin/pacientes/[id]` | Ficha detalhada do paciente, histórico de consultas e dados cadastrais |
| `/admin/prontuarios` | Registro e histórico de evolução clínica, seletor de humor e versionamento |
| `/admin/financeiro` | Balanço financeiro, confirmação de pagamentos manuais e estornos |
| `/admin/pacotes` | Criação e monitoramento de propostas de pacotes de sessões |
| `/admin/minisite` | Editor de conteúdo do MiniSite (biografia, endereço, cores, redes sociais) |
| `/admin/arquivos` | Monitor de uso de disco e rotina de geração de backup com checksum SHA-256 |
| `/admin/configuracoes` | Parâmetros do consultório, fuso horário, teleconsulta, notificações e logs |

---

## 3. Rotas Web do Paciente (`/paciente`)
*Todas as páginas abaixo exigem sessão ativa com papel `PATIENT`.*

| Rota | Descrição |
| :--- | :--- |
| `/paciente` | Painel do paciente: próximas consultas, status e atalho para consulta virtual |
| `/paciente/perfil` | Visualização e atualização de dados pessoais e contato |
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
| `POST` | `/api/files/upload` | Admin | Upload de documentos para diretório privado fora da raiz pública |
| `POST` | `/api/files/[id]/share` | Admin | Configuração de compartilhamento privado com prazo de validade |
| `GET` | `/api/files/[id]/download` | Autenticado | Download seguro validando permissão de acesso e expiração |

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

### 4.6 Operações e Monitoramento Técnico
| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/technical/status` | Bearer Token | Endpoint técnico protegido por segredo para status e métricas |
| `POST` | `/api/admin/backup` | Admin | Execução de rotina de backup com manifest e checksum SHA-256 |
| `GET` | `/api/admin/dashboard-stats` | Admin | Agregação de estatísticas para o painel principal |
| `GET` | `/api/site/settings` | Público | Consulta parâmetros e customizações do MiniSite |
| `PUT` | `/api/admin/site/settings` | Admin | Atualização de conteúdo e textos do MiniSite e páginas legais |
