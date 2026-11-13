# PSI — Arquitetura, Segurança e Regras de Backup e Restauração

Este documento detalha o funcionamento técnico, as garantias de integridade, a política de sanitização de segredos e as recomendações de proteção em repouso (*encryption at rest*) para o sistema de **Backup & Restauração** do **PSI — Sistema de Gestão de Consultórios**.

---

## 1. Formato Oficial e Estrutura do Pacote (`.zip`)

Cada backup completo é gerado em formato `.zip` portátil (`psi-backup-v1`, versão de formato `1.0.0`) e armazenado exclusivamente em diretório privado fora do acesso web público (`BACKUP_DIR`, padrão `./storage/backups/`).

Estrutura interna obrigatória do arquivo:

```text
psi-backup/
  manifest.json                  # Metadados do snapshot (versão, migração, digest de esquema, contagens, categorias)
  checksums.json                 # Índice SHA-256 e tamanho exato (em bytes) de todos os arquivos do pacote
  database/
    adminAccounts.json           # Conta administrativa titular (hash bcrypt; sessões ativas omitidas)
    patients.json                # Pacientes (tempPassword sanitizado para null)
    guardians.json               # Responsáveis legais de menores de 18 anos
    patientProfileChangeRequests.json
    consentAcceptances.json
    services.json
    weeklyAvailability.json
    availabilityExceptions.json
    appointmentPackages.json
    appointments.json
    appointmentHolds.json        # Apenas reservas válidas não expiradas no momento do snapshot
    payments.json
    paymentAttempts.json
    refunds.json
    gatewayConfigurations.json   # Credenciais criptografadas sanitizadas (configDataEncrypted = null)
    anamnesisTemplates.json
    anamnesisSubmissions.json
    clinicalRecords.json
    clinicalRecordRevisions.json
    storedFiles.json             # Metadados de documentos privados
    storedFileShares.json        # Permissões e validade de compartilhamento com pacientes
    videoMeetings.json
    notificationTemplates.json
    notificationDeliveries.json
    notifications.json
    sharedNotificationTemplates.json
    siteSettings.json
    professionalProfiles.json
    legalPages.json
    systemSettings.json          # Segredos de SMTP/WhatsApp/Google Meet/TURN sanitizados
    auditLogs.json
  uploads/
    private/                     # Arquivos de STORAGE_DIR (padrão ./storage/uploads/)
    minisite/                    # Mídias, vídeos e quadros de animação do Site (./storage/minisite/)
    public-uploads/              # Logos, favicons e ícones enviados pelo admin (./public/uploads/)
```

### Backups Legados (`.json`)

Registros históricos criados por versões antigas apenas como manifesto JSON parcial são classificados explicitamente como **Legado (Somente Manifesto JSON)**:
- São preservados no histórico para consulta ou exclusão, com opção de **Baixar** e **Excluir**;
- Têm o botão **Restaurar** desabilitado na interface e bloqueado no servidor (`BACKUP_LEGADO_NAO_RESTAURAVEL`), pois não contêm todas as tabelas nem os arquivos físicos de mídia/documentos.

---

## 2. Controle de Acesso, Armazenamento Privado e Auditoria

1. **Acesso Exclusivo do Administrador (`ADMIN`):**
   - Todas as rotas de listagem, geração, download, importação, prévia e restauração (`/api/admin/backup/**`) exigem sessão autenticada com papel `ADMIN` via `requireAdmin()`.
   - Nenhuma rota de paciente ou rota pública do Site possui acesso a arquivos ou metadados de backup.
2. **Isolamento de Diretórios:**
   - Os arquivos `.zip` ficam fora de `public/` (`./storage/backups/`).
   - O download (`/api/admin/backup/[id]/download`) utiliza streaming em chunks (`ReadableStream`), valida contenção de caminho (*Path Traversal*) com `resolveSafeBackupFilePath()` e **nunca** inclui tokens ou credenciais na URL.
   - O sistema **nunca** envia cópias de backup automaticamente para serviços externos ou nuvem de terceiros.
3. **Sigilo de Prontuários em Logs:**
   - Eventos `BACKUP_GENERATED`, `BACKUP_IMPORTED`, `BACKUP_DELETED`, `BACKUP_RESTORED` e `BACKUP_RESTORE_FAILED` são gravados em `AuditLog` contendo apenas identificadores, nomes de arquivo, tamanhos e hashes — **jamais** textos clínicos ou senhas.

---

## 3. Segredos Sanitizados e Reconfiguração Pós-Restauração

Para que o arquivo `.zip` portátil possa ser guardado pelo profissional sem expor credenciais operacionais da infraestrutura em texto simples, os seguintes campos sensíveis são zerados (`null`) durante a exportação:

| Entidade / Origem | Campo Omitido no Backup | Comportamento após Restauração |
|---|---|---|
| `SystemSettings` | `smtpPass` | `smtpEnabled` é ajustado para `false` caso esteja sem senha (exceto modo `DEFAULT` sem host customizado); reconfigurar em *Admin → Integrações*. |
| `SystemSettings` | `textbeeApiKey` | `smsEnabled` é ajustado para `false` e `smsHealthStatus` volta para `NOT_CONFIGURED`; reinserir a API Key em *Admin → Integrações*. |
| `SystemSettings` | `whatsappApiToken`, `whatsappMetaAccessToken`, `whatsappMetaAppSecret`, `openWaApiKey` | `whatsappEnabled` é ajustado para `false` e `whatsappHealthStatus` volta para `NOT_CONFIGURED`; reconfigurar em *Admin → Integrações*. |
| `SystemSettings` | `googleMeetClientSecret`, `googleMeetRefreshToken`, `googleMeetAccessToken` | `googleMeetStatus` é limpo quando sem token; reconectar OAuth em *Admin → Configurações → Consultas Virtuais*. |
| `SystemSettings` | `peerJsTurnSecret` | Servidor TURN personalizado exige reinserção do segredo (caso utilizado). |
| `GatewayConfiguration` | `configDataEncrypted` | `isEnabled` é ajustado para `false` até reinserção das credenciais do gateway. |
| `Patient` | `tempPassword` | Senhas definitivas (`passwordHash` em bcrypt) são mantidas; apenas eventuais senhas temporárias em texto puro são zeradas. |
| Variáveis `.env` | `DATABASE_URL`, `JWT_SECRET`, `TECHNICAL_STATUS_BEARER_TOKEN` | Mantidas no servidor de destino (`.env`); nunca incluídas no `.zip`. |
| Tabelas efêmeras | `Session`, `PatientEmailChangeToken` | Limpas na restauração para exigir nova emissão segura quando aplicável (tokens JWT do admin continuam válidos conforme o `JWT_SECRET` do ambiente). |

---

## 4. Defesas na Importação e Validação do Pacote

Ao enviar um arquivo por `"Importar Backup"` (`POST /api/admin/backup/import`), **nenhuma alteração é aplicada automaticamente**. O servidor executa todas as verificações abaixo antes de registrar o arquivo no histórico:

- **Rejeição de manifestos isolados e formatos inválidos:** bloqueia extensões diferentes de `.zip` (inclusive `.json`) e valida assinatura binária *magic bytes* ZIP (`PK\x03\x04`).
- **Bloqueio total de execução externa:** nunca executa SQL, migrations do pacote, shell scripts ou binários do arquivo enviado. Extensões executáveis/perigosas (`.sql`, `.sh`, `.bash`, `.bat`, `.cmd`, `.ps1`, `.exe`, `.dll`, `.msi`, `.vbs`, `.js`, `.mjs`, `.cjs`, `.ts`, `.php`, `.phtml`, `.py`, `.rb`, `.pl`) são rejeitadas imediatamente durante a inspeção.
- **Proteção contra Path Traversal e Symlinks:** rejeita caminhos absolutos, `..`, `.`, separadores `\` e links simbólicos (`S_IFLNK = 0o120000`), além de validar todos os caminhos de extração contra `resolveContainedPath()`.
- **Proteção contra ZIP Bombs e Arquivos Excessivos:**
  - Limite de upload: `512 MB` (`MAX_BACKUP_IMPORT_BYTES`);
  - Limite máximo descompactado total: `1 GB` (`MAX_EXTRACTED_ARCHIVE_BYTES`);
  - Limite máximo por entrada individual: `200 MB` (`MAX_SINGLE_ENTRY_BYTES`);
  - Limite de quantidade de entradas no ZIP: `25.000` (`MAX_ARCHIVE_ENTRIES`);
  - Bloqueio de taxa de compressão anômala superior a `200:1` em itens acima de `10 MB`.
- **Integridade SHA-256 Recíproca:** cada item dentro do pacote é validado contra `psi-backup/checksums.json` (hash SHA-256 e tamanho em bytes exato). Qualquer alteração de 1 bit ou ausência/inclusão indevida de arquivo aborta a importação.
- **Compatibilidade de Versão e Esquema:** verifica `format === "psi-backup-v1"`, `formatVersion` suportada (`1.0.0`), versão principal (`appVersion`) e compatibilidade de `_prisma_migrations` quando presente. Backups de versões principais futuras são recusados de forma explícita.

---

## 5. Restauração em 5 Fases e Rollback Automático

Como o banco relacional (MySQL/MariaDB via Prisma) e o sistema de arquivos não compartilham uma única transação atômica, a restauração segue um protocolo controlado em cinco fases (`executeStagedBackupRestoration`), exigindo confirmação dupla:

1. **Fase A — Validação e Prévia (`GET /api/admin/backup/[id]/restore`):**
   - Confere se o backup não é legado, verifica o hash SHA-256 do `.zip` em disco, testa conectividade com o banco (`SELECT 1`), permissões de escrita nos diretórios e espaço livre em disco via `fs.statfs()` (`>= 2× tamanho descompactado + 20 MB`, mínimo `25 MB`), gerando o resumo de registros afetados.
2. **Fase B — Confirmação Explícita:**
   - Exibe aviso de substituição completa dos dados e exige que o administrador digite exatamente `RESTAURAR`.
3. **Fase C — Snapshot de Segurança Automático (`PRE_RESTORE_SNAPSHOT`):**
   - Antes de qualquer mutação no banco ou nos arquivos, cria e valida integralmente um `.zip` de recuperação do estado atual da instalação.
   - Ativa o arquivo de trava `.restore.lock`, colocando endpoints de gravação concorrentes em manutenção controlada (HTTP `503` / `409`).
4. **Fase D — Substituição Controlada com Rollback:**
   - **Banco de dados:** em transação Prisma (`db.$transaction`), remove registros na ordem topológica filhos → pais (preservando `BackupJob`) e reinsere pais → filhos mantendo chaves estrangeiras ativas;
   - **Sistema de arquivos:** extrai todos os uploads para diretório temporário em *staging* (`.restore_stage_*`), valida o hash SHA-256 de cada arquivo gravado em disco e realiza a troca atômica/sequencial com cópia prévia (`prev_*`), revertendo os diretórios imediatamente em caso de erro.
   - Em qualquer falha na Fase D ou E, o sistema aciona o **rollback automático** usando o snapshot da Fase C para recuperar o banco e os arquivos ao estado consistente anterior.
5. **Fase E — Verificação Final e Limpeza:**
   - Confere contagens de registros críticos (`Patient`, `Appointment`, `ClinicalRecord`), verifica existência em disco de todos os arquivos referenciados em `StoredFile` e integridade dos vínculos `StoredFileShare`, grava evento em `AuditLog`, remove artefatos temporários de *staging*, libera `.restore.lock` e revalida caches da aplicação.

---

## 6. Criptografia em Repouso e Gestão de Chaves (Infraestrutura)

Como um backup completo contém **dados clínicos sensíveis (LGPD / sigilo profissional)**, recomenda-se que toda implantação em produção adote as seguintes práticas de proteção em repouso (*encryption at rest*) e custódia:

1. **Criptografia no Sistema de Arquivos / Volume:**
   - Armazene os diretórios configurados em `BACKUP_DIR`, `STORAGE_DIR`, `storage/minisite` e o volume do MySQL/MariaDB em partições criptografadas em repouso (ex.: **LUKS/dm-crypt** no Linux, **BitLocker** no Windows Server, ou volumes gerenciados criptografados via **KMS** em provedores de nuvem).
2. **Proteção ao Exportar Cópias Externas:**
   - Ao baixar o arquivo `.zip` para computador local ou mídia externa de guarda fria (*cold storage*), armazene-o dentro de contêiner ou pasta criptografada com senha forte separada (ex.: cofre criptografado / VeraCrypt / arquivo criptografado AES-256 gerenciado pelo profissional) — evitando envio por aplicativos de mensagens ou armazenamento em pastas públicas sincronizadas sem criptografia.
3. **Gestão Separada do `.env` e Chaves:**
   - Guarde uma cópia separada das variáveis de infraestrutura (`JWT_SECRET`, `TECHNICAL_STATUS_BEARER_TOKEN`, credenciais SMTP/WhatsApp/OAuth) em gerenciador de segredos seguro, distinta do arquivo `.zip` do backup, garantindo que o vazamento isolado de um único artefato não comprometa o ambiente inteiro.
