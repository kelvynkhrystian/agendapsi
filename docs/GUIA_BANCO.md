# PSI — Guia Rápido do Banco de Dados (GUIA_BANCO.md)

Este guia prático foi criado para permitir que desenvolvedores, operadores e profissionais encontrem rapidamente onde qualquer informação do **PSI** está armazenada, sem precisar decifrar arquivos técnicos complexos.

---

## 1. Tabela Resumo: Onde Fica Cada Funcionalidade?

| Funcionalidade | Tabela(s) Física(s) MySQL | Modelo(s) Prisma | Principais Relações | Arquivos de Código de Referência |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador / Titular** | `AdminAccount` | `AdminAccount` | `Session` (1:N) | `src/lib/auth.ts`, `src/app/admin/configuracoes/page.tsx` |
| **Pacientes** | `Patient`, `Guardian` | `Patient`, `Guardian` | `Appointment`, `Payment`, `ClinicalRecord` | `src/lib/patients.ts`, `src/app/admin/pacientes/page.tsx` |
| **Sessões e Login Ativo** | `Session` | `Session` | `AdminAccount`, `Patient` | `src/lib/auth.ts`, `src/app/api/auth/login/route.ts` |
| **Catálogo de Serviços** | `Service` | `Service` | `Appointment` (1:N), `AppointmentHold` (1:N) | `src/app/api/services/route.ts`, `src/app/admin/servicos/page.tsx` |
| **Grade de Horários / Folgas** | `WeeklyAvailability`, `AvailabilityException` | `WeeklyAvailability`, `AvailabilityException` | Isoladas por configuração | `src/lib/availability.ts`, `src/app/admin/agenda/configuracoes/page.tsx` |
| **Consultas Agendadas** | `Appointment` | `Appointment` | `Patient` (N:1), `Service` (N:1), `VideoMeeting` (1:1) | `src/lib/appointments.ts`, `src/app/admin/agenda/page.tsx` |
| **Pré-reservas (Hold 15 min)** | `AppointmentHold` | `AppointmentHold` | `Service` (N:1), `Patient` (N:1) | `src/lib/availability.ts`, `src/app/api/appointments/hold/route.ts` |
| **Pacotes de Sessões** | `AppointmentPackage` | `AppointmentPackage` | `Patient` (N:1), `Appointment` (1:N), `Payment` (1:1) | `src/app/admin/pacotes/page.tsx`, `src/app/paciente/pacotes/page.tsx` |
| **Cobranças e Pagamentos** | `Payment`, `PaymentAttempt`, `Refund` | `Payment`, `PaymentAttempt`, `Refund` | `Appointment` (1:1), `Patient` (N:1) | `src/lib/payments.ts`, `src/app/admin/financeiro/page.tsx` |
| **Anamnese (Fichas e Respostas)** | `AnamnesisTemplate`, `AnamnesisSubmission` | `AnamnesisTemplate`, `AnamnesisSubmission` | `Patient` (N:1), `AnamnesisTemplate` (N:1) | `src/app/admin/anamnese/page.tsx`, `src/app/paciente/anamnese/page.tsx` |
| **Prontuários e Evoluções** | `ClinicalRecord`, `ClinicalRecordRevision` | `ClinicalRecord`, `ClinicalRecordRevision` | `Patient` (N:1), `Appointment` (1:1), `StoredFile` (1:N) | `src/app/admin/prontuarios/page.tsx` (ADMIN EXCLUSIVO) |
| **Arquivos e Anexos (Metadados)**| `StoredFile`, `StoredFileShare` | `StoredFile`, `StoredFileShare` | `ClinicalRecord` (N:1), `Patient` (N:1) | `src/app/api/files/[id]/download/route.ts`, `storage/uploads/` |
| **Salas de Teleconsulta** | `VideoMeeting` | `VideoMeeting` | `Appointment` (1:1) | `src/app/sala-virtual/page.tsx`, `src/lib/video.ts` |
| **Notificações no App (Sininho)**| `Notification` | `Notification` | `recipientId` -> `AdminAccount` ou `Patient` | `src/components/NotificationBell.tsx`, `/api/notifications` |
| **Templates de Mensagens** | `SharedNotificationTemplate`, `NotificationTemplate` | `SharedNotificationTemplate`, `NotificationTemplate` | Isoladas por tipo de evento | `src/app/admin/configuracoes/page.tsx?tab=mensagens` |
| **Configurações da Clínica / Site** | `SiteSettings`, `ProfessionalProfile` | `SiteSettings`, `ProfessionalProfile` | Singleton com `id = "default"` | `src/app/admin/minisite/page.tsx`, `src/app/admin/configuracoes/page.tsx?tab=aparencia` |
| **Configurações Técnicas e SMTP/WhatsApp** | `SystemSettings` | `SystemSettings` | Singleton com `id = "default"` | `src/app/admin/integracoes/page.tsx` |
| **Trilha de Auditoria (LGPD)** | `AuditLog`, `TechnicalAccessLog` | `AuditLog`, `TechnicalAccessLog` | `userId` -> Autor da ação | `src/app/admin/auditoria/page.tsx` |
| **Backups do Sistema** | `BackupJob` | `BackupJob` | Isolada por execução | `src/app/admin/backup/page.tsx`, `storage/backups/` |

---

## 2. Perguntas e Respostas Frequentes

### 1. Onde os usuários são salvos?
No PSI, os usuários **não** ficam misturados em uma única tabela genérica. Eles são salvos em duas tabelas distintas:
- Administrador do consultório: tabela **`AdminAccount`**
- Pacientes cadastrados: tabela **`Patient`**

### 2. Onde fica o administrador?
Na tabela **`AdminAccount`** (modelo Prisma `AdminAccount`).
- O profissional titular possui um único registro nesta tabela com seu nome (`name`), e-mail de acesso (`email`), registro profissional (`crpCrm`) e hash de senha (`passwordHash`).
- **Arquivo de referência:** `src/lib/auth.ts`, `prisma/schema.prisma`.

### 3. Onde ficam os pacientes?
Na tabela **`Patient`** (modelo Prisma `Patient`).
- Cada pessoa que agenda uma consulta ou é cadastrada pelo profissional recebe uma linha nessa tabela.
- Se o paciente for menor de 18 anos (`isMinor = true`), os dados de seu responsável legal são salvos na tabela vinculada **`Guardian`**.
- **Arquivo de referência:** `src/app/admin/pacientes/page.tsx`, `src/lib/patients.ts`.

### 4. Onde ficam as senhas?
As senhas em texto puro **nunca são armazenadas**. O que fica gravado no banco é o **hash criptográfico seguro gerado pelo algoritmo bcrypt (10 rounds)**:
- Para o profissional: campo `passwordHash` na tabela `AdminAccount`.
- Para o paciente: campo `passwordHash` na tabela `Patient`.
- Para o primeiro acesso do paciente via agendamento público: pode existir temporariamente uma senha inicial no campo `tempPassword` até a definição da senha definitiva.
- **Arquivo de referência:** `src/lib/auth.ts` (funções `hashPassword` e `verifyPassword`).

### 5. Como identificar se uma conta é Admin ou Paciente?
Pelo papel (*role*) associado:
1. No login (`src/app/api/auth/login/route.ts`), o sistema busca primeiro na tabela `AdminAccount`. Se encontrar, define o papel como `ADMIN`. Se não encontrar, busca na tabela `Patient` e define como `PATIENT`.
2. A sessão ativa na tabela **`Session`** possui a coluna **`userRole`**, cujo valor é `ADMIN` ou `PATIENT`.
3. O token JWT assinado (`psi_auth_token`) contém a propriedade `role: "ADMIN" | "PATIENT"` em seu payload.

### 6. Onde ficam os agendamentos?
Na tabela **`Appointment`** (modelo Prisma `Appointment`).
- Cada linha representa uma consulta, com data/hora de início (`startAt`), término (`endAt`), modalidade (`modality`: `PRESENTIAL` ou `ONLINE`) e status (`status`: `PENDING_CONFIRMATION`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, etc.).
- Se estiver no meio do processo de agendamento online, o horário fica temporariamente bloqueado na tabela **`AppointmentHold`** por 15 minutos.
- **Arquivo de referência:** `src/lib/appointments.ts`, `src/app/admin/agenda/page.tsx`.

### 7. Como descobrir a qual paciente uma consulta pertence?
Através do campo **`patientId`** na tabela `Appointment`.
- O campo `Appointment.patientId` referencia diretamente a chave primária `Patient.id`.
- No Prisma, basta incluir a relação: `prisma.appointment.findMany({ include: { patient: true } })`.

### 8. Onde ficam os serviços?
Na tabela **`Service`** (modelo Prisma `Service`).
- Armazena o nome da consulta (`name`), preço em centavos (`priceCents`), duração em minutos (`durationMinutes`), intervalo de respiro (`bufferMinutes`) e modalidade permitida (`modality`: `PRESENTIAL`, `ONLINE` ou `BOTH`).
- **Arquivo de referência:** `src/app/admin/servicos/page.tsx`.

### 9. Onde ficam os pagamentos?
Na tabela **`Payment`** (modelo Prisma `Payment`).
- O valor da cobrança é gravado no campo `amountCents` (inteiro em centavos de Real: R$ 150,00 = 15000).
- Cada pagamento se conecta a uma consulta avulsa (`appointmentId`) ou a um pacote de sessões (`packageId`).
- As tentativas de processamento ficam em **`PaymentAttempt`** e eventuais estornos em **`Refund`**.
- **Arquivo de referência:** `src/lib/payments.ts`, `src/app/admin/financeiro/page.tsx`.

### 10. Onde ficam as notificações?
Em duas tabelas, dependendo do tipo:
- **Notificações internas (sininho do cabeçalho):** ficam na tabela **`Notification`** (modelo Prisma `Notification`), com `recipientId`, `title`, `message`, `isRead` e `targetUrl`.
- **Registro de e-mails e WhatsApp externos:** ficam na tabela **`NotificationDelivery`** (modelo Prisma `NotificationDelivery`), que grava para quem foi enviado, o canal e se foi real ou simulado.
- **Arquivo de referência:** `src/components/NotificationBell.tsx`, `src/app/api/notifications/route.ts`.

### 11. Onde ficam as mensagens personalizadas?
Na tabela **`SharedNotificationTemplate`** (modelo Prisma `SharedNotificationTemplate`).
- Contém os modelos editáveis de mensagens para cada evento (ex: `APPOINTMENT_CONFIRMED`, `REMINDER_24H`), com tags dinâmicas como `{nome_paciente}`, `{data}`, `{hora}`, `{servico}` e `{local}`.
- **Arquivo de referência:** `src/app/admin/configuracoes/page.tsx` (aba "Mensagens").

### 12. Onde ficam os prontuários?
Na tabela **`ClinicalRecord`** (modelo Prisma `ClinicalRecord`).
- Contém a anotação de evolução clínica da sessão (`noteRichText`), o resumo (`summary`), a nota de humor (`moodRating`) e a data (`sessionDate`).
- O histórico de alterações anteriores é preservado na tabela **`ClinicalRecordRevision`**.
- **Regra de Sigilo Absoluto:** Apenas o Administrador pode ler esses registros. Nenhuma rota de paciente possui permissão de leitura.
- **Arquivo de referência:** `src/app/admin/prontuarios/page.tsx`.

### 13. Onde ficam os anexos?
Os **metadados** dos anexos (nome original, tamanho em bytes, tipo MIME, data) ficam na tabela **`StoredFile`**.
- As permissões para que um paciente possa baixar um anexo com data de validade ficam na tabela **`StoredFileShare`**.
- **Arquivo de referência:** `src/app/api/files/[id]/download/route.ts`.

### 14. Os arquivos ficam no banco ou no disco?
**No disco físico!**
- Os arquivos físicos (.pdf, .jpg, .png) **NUNCA** são gravados como binários BLOB dentro do MySQL.
- Eles são armazenados de forma criptografada/hasheada no diretório privado local do servidor:
  ```
  storage/uploads/
  ```
- O banco de dados armazena apenas o nome do arquivo gerado no disco (`storedFileName`), o nome original e o tamanho em bytes.

### 15. Onde ficam as configurações de aparência?
Na tabela **`SiteSettings`** (modelo Prisma `SiteSettings`, linha fixa `id = "default"`).
- Guarda os caminhos do logotipo padrão (`logoUrl`), logotipo horizontal (`logoHorizontalUrl`), favicon (`faviconUrl`) e os códigos HEX da paleta de cores:
  - `primaryColor` (cor primária)
  - `secondaryColor` (cor secundária)
  - `accentColor` (cor de destaque)
  - `buttonColor` (cor dos botões)
  - `heroBgMode`, `heroBgDetectedColor`, `heroBgCustomColor`, `heroBgStatus`, `heroBgMediaRef` (detecção automática de cor de fundo do Hero Desktop)
  - `heroMobileMediaType`, `heroMobileMediaUrl`, `heroMobilePlaybackSpeed`, `heroMobileBgDetectedColor`, `heroMobileBgStatus`, `heroMobileBgMediaRef` (mídia independente e cor automática do Hero Mobile, com fallback automático para o Hero Desktop)
  - `heroPlaybackSpeed`, `aboutPlaybackSpeed` (multiplicadores de velocidade `0.5x`, `1x`, `2x` para vídeos e ZIPs)
- **Arquivo de referência:** `src/app/admin/configuracoes/page.tsx` (aba "Aparência").

### 16. Como uma alteração no banco afeta o frontend?
No PSI, a comunicação entre o banco e as telas do frontend segue um fluxo previsível:
1. **Banco MySQL** armazena os dados.
2. **Prisma Client** faz a leitura tipada no servidor Next.js.
3. **Rotas de API (`src/app/api/*`)** serializam os dados em JSON e aplicam regras de autorização (`getCurrentUser()`).
4. **Páginas e Componentes React (`src/app/*`)** consomem essas rotas via `fetch` e renderizam os dados na interface.
- Se você adicionar ou renomear uma coluna no banco:
  - Deve atualizar a consulta Prisma correspondente;
  - Deve atualizar o esquema Zod e a tipagem TypeScript da API;
  - Deve ajustar a tela que exibe aquele campo para ler o novo nome;
  - E executar `npm run docs:db:check` para garantir que a documentação foi atualizada!
