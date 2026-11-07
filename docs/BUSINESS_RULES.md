# PSI — Regras de Negócio e Políticas do Sistema

Este documento detalha as políticas de funcionamento, transições de estado e regras de domínio implementadas no **PSI**.

---

## 1. Agendamento, Disponibilidade e Concorrência

### 1.1 Cálculo de Disponibilidade
- A grade de atendimento é gerada a partir dos registros de `WeeklyAvailability` (dia da semana, horário de início e fim).
- Exceções e bloqueios (`AvailabilityException`) têm precedência sobre a grade semanal, removendo horários bloqueados ou adicionando horários extras.
- O cálculo de conflitos utiliza comparação de intervalos semiabertos:
  $$\text{Conflito} \iff (\text{slotStart} < \text{apptEnd}) \land (\text{slotEnd} > \text{apptStart})$$
- **Buffer de Atendimento:** O intervalo operacional entre atendimentos (`defaultBufferMinutes`) é centralizado nas Configurações Gerais do módulo de Serviços (`SystemSettings`). O motor de agenda garante que o término da consulta mais o buffer não invada o início da próxima sessão.

### 1.2 Separação de Parâmetros de Serviços vs. Configurações Globais
- **Parâmetros Específicos do Serviço:** O formulário de criação/edição de cada serviço em `/admin/servicos` mantém estritamente os campos essenciais do atendimento: Nome, Descrição detalhada, Preço em Reais (com opção de gratuidade), Duração em minutos e visibilidade pública (`isActive`).
- **Políticas Globais de Agendamento:** Fuso horário padrão do consultório (`timezone`), antecedência mínima para reserva (`minBookingNoticeHours`), horizonte máximo de abertura da agenda (`maxBookingHorizonDays`), prazo de cancelamento sem penalidade (`defaultCancellationNoticeDays`), buffer padrão entre sessões (`defaultBufferMinutes`), modalidade padrão (`defaultModality`) e política de confirmação (`defaultConfirmationPolicy`) são centralizados na aba **Configurações Gerais** (`/admin/servicos` -> aba Configurações Gerais) e persistidos na tabela `SystemSettings`. Novos serviços herdam automaticamente esses padrões.

### 1.3 Reserva Temporária (*Draft Hold*)
- Ao selecionar um horário na etapa 2 do agendamento público, o sistema cria um registro `AppointmentHold` com validade de **15 minutos**.
- Enquanto o hold estiver ativo, o slot é considerado ocupado para outros usuários.
- Se a confirmação não for concluída em 15 minutos, o hold expira automaticamente e o horário volta a ficar visível.

### 1.3 Contato via WhatsApp
- O botão "Dúvidas / Agendar via WhatsApp" disponível no MiniSite público gera um link formatado com mensagem descritiva para o aplicativo do WhatsApp.
- **Regra Fundamental:** O contato via WhatsApp **NÃO** cria registro de agendamento (`Appointment`) nem reserva temporária (`AppointmentHold`). O agendamento formal só ocorre através do fluxo de agendamento online ou inserção manual pelo profissional.

---

## 2. Política de Cancelamento e Falta (No-Show)

### 2.1 Cancelamento Tardio (Regra dos 3 Dias)
- O cancelamento solicitado com **menos de 72 horas (3 dias)** de antecedência do início da sessão é classificado como **Cancelamento Tardio** (`LATE_CANCELLED`).
- O sistema permite o cancelamento para desocupar a agenda, mas registra a infração de política nos metadados da consulta e no histórico do paciente.
- Cancelamentos com antecedência igual ou superior a 72 horas são registrados como cancelamentos normais (`CANCELLED`).

### 2.2 Faltas sem Aviso (*No-Show*)
- O profissional pode marcar a consulta como `NO_SHOW` caso o paciente não compareça.
- A ação é registrada em `AuditLog` e atualiza a taxa de assiduidade do paciente no painel administrativo.

---

## 3. Pacotes de Atendimento (Princípio "Tudo ou Nada")

1. **Criação do Pacote:**
   - O profissional propõe um pacote contendo um conjunto de datas/horários pré-definidos e o valor total com desconto em centavos de Real.
   - O sistema reserva todos os horários do pacote em estado pendente.
2. **Aceite pelo Paciente:**
   - O paciente visualiza a proposta completa em `/paciente/financeiro`.
   - O aceite é atômico: o paciente aceita todos os horários propostos de uma só vez. Todos os agendamentos passam para o status `CONFIRMED`.
3. **Rejeição ou Expiração:**
   - Caso o paciente recuse o pacote ou o prazo expire, **todos** os horários retidos são imediatamente liberados na agenda em uma única transação atômica.

---

## 4. Cadastro de Pacientes e Proteção a Menores

### 4.1 Menores de 18 Anos
- Pacientes com idade inferior a 18 anos exigem obrigatoriamente os dados do **Responsável Legal**:
  - Nome completo do responsável;
  - CPF válido do responsável;
  - Telefone de contato do responsável;
  - Grau de parentesco / relação legal.
- O consentimento para o atendimento deve ser formalizado pelo responsável legal.

### 4.2 Edição de Perfil e Alteração Segura de E-mail
- **Edição Direta do Perfil:** O paciente autenticado pode editar diretamente seus dados cadastrais (nome completo, CPF, data de nascimento, telefone, endereço, gênero e contato de emergência) em `/paciente/perfil` sem necessidade de aprovação pelo Administrador.
- **Validação e Unicidade do CPF:** O CPF informado é validado numericamente e verificado contra duplicidade no banco de dados (rejeitando CPFs já cadastrados para outros pacientes).
- **Alteração Segura de E-mail de Acesso:**
  - Caso o envio de e-mails (SMTP) esteja ativo: o paciente solicita a troca de e-mail, gerando um token de verificação de uso único com expiração curta (15 minutos) e armazenamento de hash seguro SHA-256 (`PatientEmailChangeToken`). O e-mail de login atual permanece ativo até a confirmação via link recebido na nova caixa postal.
  - Caso o serviço de e-mail (SMTP) esteja indisponível: o sistema **não** altera o e-mail silenciosamente nem finge sucesso. Uma mensagem clara instrui o paciente e o e-mail de login vigente permanece totalmente ativo e seguro.
- **Auditoria Interna e Privacidade:** Atualizações cadastrais e solicitações de troca de e-mail são registradas em `AuditLog` de forma anonimizada, sem expor senhas, tokens brutos ou informações médicas privadas.
- **Histórico Legado:** Registros prévios de `PatientProfileChangeRequest` permanecem preservados para histórico e auditoria administrativa.

### 4.3 Inativação e Retenção de Prontuários
- O profissional pode inativar um paciente para impedir novos agendamentos.
- **Sigilo e Retenção Ética:** O prontuário clínico (`ClinicalRecord`) e as evoluções **nunca são deletados em cascata**, preservando o histórico para atendimento a exigências legais e resoluções dos conselhos de classe (CFP/CFM).

---

## 5. Pagamentos e Finanças

- Todos os valores monetários são expressos como inteiros em centavos de Real (`Int` BRL cents), eliminando imprecisões de ponto flutuante:
  $$\text{R\$} 150,00 \implies 15000$$
- **FakePaymentProvider:** Simulador seguro para desenvolvimento e testes com geração de chave de idempotência (`idempotencyKey`). Impede cobranças duplicadas em caso de repetição de requisição.
- **Estorno (*Refund*):** Transiciona o pagamento para `REFUNDED` e cancela a consulta vinculada, registrando data, valor estornado e identificador no log de auditoria.
- **Conciliação Manual:** O profissional pode confirmar pagamentos realizados por meios externos (PIX em conta física, dinheiro ou cartão na maquininha).

---

## 6. Teleconsulta e Controle de Provedores de Vídeo

### 6.1 Seleção Exclusiva de Provedor Padrão de Vídeo (Task 9 / Phase 1, 2 e 3)
- **Um Único Provedor Ativo:** O sistema suporta 3 provedores de teleconsulta arquitetados e totalmente integrados, porém **apenas um provedor é configurado como o padrão ativo** em cada momento:
  1. `JITSI`: **Jitsi Meet** (salas integradas nativas criptografadas, padrão V1);
  2. `PEERJS`: **PeerJS / WebRTC Direto** (chamadas P2P ponta a ponta sem servidores intermediários de mídia, com sinalização STUN/TURN);
  3. `GOOGLE_MEET`: **Google Meet** (salas oficiais geradas automaticamente na Google Agenda do consultório via Google OAuth 2.0 e Google Calendar API).
- **Validação Estrita de Ativação (Gating):**
  - Nenhum provedor incompleto ou não testado pode se tornar o padrão ativo.
  - O PeerJS exige host de sinalização configurado e teste de conectividade aprovado (`testStatus === "SUCCESS"`).
  - O Google Meet exige Client ID, Client Secret e autorização OAuth concluída com refresh token válido (`googleMeetStatus === "CONNECTED"`).
  - Em caso de falha ou credenciais ausentes, a seleção é rejeitada e o provedor anterior (ou Jitsi) é preservado.
- **Imutabilidade e Preservação de Consultas Históricas:**
  - Alterar o provedor padrão afeta **exclusivamente consultas futuras**.
  - Consultas já agendadas preservam permanentemente o provedor, a sala e o token original com os quais foram criadas (`VideoMeeting.provider`).
  - Históricos clínicos, prontuários e links existentes nunca são regravados ou alterados na troca de provedor.
- **Não Fallback Silencioso:** Se o Google Meet estiver ativo e a API falhar no momento do agendamento, o sistema emite erro transparente para intervenção do administrador, sem alternar silenciosamente para outro provedor.

### 6.2 Janela de Acesso e Autorização de Entrada (*Gating*)
- **Autorização Server-Side Estrita:** A rota `/api/virtual-meeting/[token]` exige autenticação. Apenas o profissional (`ADMIN`) ou o paciente titular daquela consulta específica têm permissão de acesso (401/403).
- **Janela de Acesso do Paciente:** O paciente só é liberado para entrar na sala a partir de **15 minutos antes** do horário de início da sessão. Tentativas prévias recebem mensagem com contador regressivo.
- **Acesso do Profissional:** O profissional possui acesso irrestrito para preparação da sala a qualquer momento.

---

## 7. Mensageria, Notificações e Histórico de Entregas

### 7.1 Idempotência e Disparo de Lembretes
- O disparador de lembretes (`/api/notifications/run-reminders`) é idempotente: verifica registros já existentes em `NotificationDelivery` antes de realizar novos disparos para evitar mensagens repetidas a pacientes.

### 7.2 Fidelidade e Ciclo de Vida de Status de Entrega
O sistema rejeita estados falsos ou presumidos de entrega, registrando apenas evidências comprovadas:
- **`QUEUED` / `PROCESSING`:** Mensagem aguardando envio na fila ou em processamento pelo serviço local.
- **`ACCEPTED` (Aceito pelo Servidor):** O servidor SMTP local/remoto aceitou a transação e o handshake de envio. Não equivale a entrega na caixa de entrada do destinatário.
- **`DELIVERED` (Entregue Comprovado):** Status atribuído exclusivamente quando há confirmação formal de entrega recebida via webhook ou recibo de leitura/entrega do provedor de mensageria.
- **`FAILED` (Falha de Envio):** O servidor SMTP, API ou gateway recusou o envio (código de erro e mensagem técnica higienizada são gravados em `errorCode` e `sanitizedErrorMessage`).
- **`SIMULATED` (Simulação):** Quando integrações de mensageria estão desativadas ou em ambiente de desenvolvimento, o envio é simulado para garantir integridade e testes sem impacto externo.
- **`WHATSAPP_OPENED`:** Abertura ou redirecionamento para o link de conversa (`wa.me`). Não comprova que a mensagem foi efetivamente enviada ou lida pelo contato.

### 7.3 Privacidade, LGPD e Mascaramento de Destinatários
- Em todas as telas administrativas e respostas de API de logs (`/admin/lembretes/registros`), os contatos dos destinatários são exibidos com mascaramento protetivo (ex.: `j***@gmail.com` ou `(11) 98***-**12`).
- Dados clínicos sigilosos, senhas ou tokens brutos de autorização **nunca** são persistidos no assunto, categoria ou metadados de entrega da notificação.

### 7.4 Travas de Segurança para Reenvio Manual
A ação de reenvio de mensagens (`POST /api/admin/message-logs/[id]/resend`) possui regras estritas de proteção:
- **Agendamentos Inativos:** É estritamente vedado reenviar lembretes ou confirmações associadas a consultas com status `COMPLETED`, `CANCELLED`, `LATE_CANCELLED` ou `NO_SHOW`.
- **Tokens de Senha Expirados:** Notificações de recuperação de senha com tokens já utilizados ou expirados não podem ser reenviadas; o usuário deve iniciar uma nova solicitação.
- **Auditoria Obrigatória:** Todo reenvio manual incrementa `attemptCount`, atualiza `attemptedAt` e gera um registro detalhado em `AuditLog`.

---

## 8. Monitoramento Técnico e Métricas de Instalação (`/api/technical/status`)

- **Objetivo e Governança:** Fornece métricas estruturadas de saúde física e operacional da instância standalone em tempo real, sem necessidade de varreduras pesadas de banco ou disco.
- **Isolamento de Segurança:**
  - O endpoint requer Bearer Token de alta entropia (`TECHNICAL_STATUS_BEARER_TOKEN`) ou sessão administrativa autenticada.
  - Tentativas sem autorização são registradas em `TechnicalAccessLog`.
  - Dados sensíveis como senhas, hashes bcrypt, chaves de API, credenciais SMTP/WhatsApp, anotações de evolução clínica ou listas nominais de pacientes **nunca** são expostos.
  - Dados cadastrais do administrador são isolados no grupo `administrator`, permitindo restrição granular caso o endpoint seja exposto a sistemas externos.
- **Acesso Desautenticado em Desenvolvimento Local (Fase 4):**
  - **Princípio Fail-Closed:** Apenas e tão somente se `NODE_ENV === "development"`, com a flag explícita `PSI_LOCAL_TECHNICAL_STATUS_PUBLIC=true` e requisição recebida estritamente via interface de loopback (`127.0.0.1`, `localhost`, `::1`), sem túneis nem proxies.
  - Se qualquer condição for ambígua ou se executado em produção, o acesso desautenticado é terminantemente rejeitado com `401 Unauthorized`.
  - No modo local não autenticado, a resposta sofre higienização prévia, omitindo todos os dados do administrador e identificadores de instalação, exibindo apenas métricas agregadas operacionais.
- **Veracidade e Integridade dos Dados:**
  - Todos os números correspondem a agregações reais do banco de dados MySQL e do sistema de arquivos.
  - Métricas não mensuráveis pelo ambiente retornam explicitamente `null` (ex.: espaço livre em disco quando não suportado pelo sistema operacional).
  - A configuração de variáveis de integração (como host de e-mail ou API de WhatsApp) não é considerada sinônimo de disponibilidade operacional; o status reflete o histórico real de disparos registrado em `NotificationDelivery`.
- Caso os serviços reais de SMTP ou WhatsApp não estejam configurados no ambiente, o sistema utiliza o modo **Simulador**, registrando o conteúdo na tabela com status `SIMULATED` para validação em desenvolvimento sem falhas de execução.

---

## 10. Sistema de Aparência Global e MiniSite Público (Fases 1 a 5)

### 10.1 Presets de Cores e Tokens Globais
- O sistema oferece 8 paletas pré-definidas (`AMARELO`, `LARANJA`, `VERMELHO`, `ROSA`, `VERDE`, `AZUL`, `ROXO`, `CINZA`) e suporte a tema `PERSONALIZADO`.
- A paleta selecionada injeta variáveis CSS semânticas (`--primary`, `--secondary`, `--accent`, `--button-bg`, `--ring`, `--theme-bg`, `--theme-text`) no elemento `:root`.
- As variáveis controlam os botões, ícones, destaques, links e elementos decorativos no Admin, Paciente e MiniSite.

### 10.2 Isolamento Estrito de Modo Escuro (*Dark Mode Isolation*)
- O modo escuro é permitido e preservado exclusivamente nas rotas autenticadas do sistema (`/admin/*` e `/paciente/*`).
- O MiniSite público e páginas abertas institucionais operam invariavelmente em modo claro, assegurando identidade visual acolhedora conforme os padrões da psicologia clínica.

### 10.3 Slots de Mídia Independentes (Hero & Sobre Mim)
- O MiniSite possui dois slots de mídia completamente isolados:
  1. **Slot 1 (Hero):** Foto principal do profissional ao lado dos botões de agendamento.
  2. **Slot 2 (Sobre Mim):** Apresentação pessoal e ambiente do consultório.
- Cada slot suporta independentemente três formatos: `IMAGE` (JPG, PNG, WebP), `FRAME_ANIMATION` (sequência de frames em ZIP) e `VIDEO` (MP4, WebM).
- Cada slot possui parâmetros próprios de taxa de quadros (10 a 60 FPS), repetição (Loop), reprodução automática (Autoplay), modo (`AUTOMATIC` ou `SCROLL`), direção (`FORWARD` ou `ALTERNATE`) e enquadramento (`cover`, `contain`, `center`, `top`, `bottom`).

### 10.4 Segurança e Processamento de ZIP de Frames
- O arquivo ZIP é validado contra *Path Traversal* (rejeição de caminhos com `..` ou barras iniciais) e contra *ZIP Bomb* (limite de 150MB descompactado e 100MB compactado).
- Requer entre 2 e 150 frames em formatos válidos (WebP, PNG, JPG). Arquivos ocultos e metadados (`__MACOSX`, `.DS_Store`) são descartados.
- Os frames são ordenados por ordenação numérica natural (ex: `001`, `002` ... `040`).

### 10.5 Indicadores de Benefício e Biblioteca de Ícones
- O topo do MiniSite suporta 3 indicadores de benefícios customizáveis com ordenação e visibilidade configurável.
- Ícones nativos da biblioteca Lucide herdam automaticamente a cor do tema selecionado (`text-[var(--primary)]`).
- Ícones personalizados enviados em formato SVG são rigorosamente sanitizados no servidor para neutralização de scripts, handlers `onload`/`onerror` e elementos `<foreignObject>`.

### 10.6 Localização Flexível (Suporte a Atendimento 100% Online)
- Profissionais que realizam atendimentos exclusivamente online podem desativar a seção de localização (`showLocation: false`).
- Quando desativada, a seção física e os links correspondentes nos menus de cabeçalho e rodapé são completamente ocultados do MiniSite público.
- Para atendimento presencial, o sistema disponibiliza o botão "Como chegar" e incorporação segura de mapa sem exposição de credenciais privadas de API.

### 10.7 Ações de WhatsApp e Privacidade Clínica
- O número de WhatsApp é sanitizado com inclusão automática do código de país (+55).
- A mensagem inicial é personalizável e codificada com segurança na URL.
- Nenhuma informação clínica, prontuário, anotação ou diagnóstico de paciente trafega nos parâmetros de contato do WhatsApp.

### 10.8 Integração e Detecção Automática da Cor de Fundo do Hero
- O Hero do MiniSite analisa as bordas e cantos da mídia enviada (imagem, vídeo ou animação ZIP) para identificar a cor de fundo mais representativa via algoritmo de quantização e amostragem de bordas (`heroBgDetectedColor`, `heroBgStatus`, `heroBgMediaRef`).
- A cor detectada ou customizada é injetada exclusivamente na seção Hero via variável CSS escopada `--hero-background-color`, sem alterar a paleta global do sistema.
- O administrador pode alternar entre os modos `AUTO` (detecção automática por amostragem) e `MANUAL` (código HEX personalizado com color picker via `heroBgMode` e `heroBgCustomColor`).
- No mobile, a cor de fundo preenche integralmente a seção acima e abaixo da mídia, criando continuidade visual perfeita sem faixas ou cortes artificiais.
- No desktop, a cor de fundo serve como base para a mídia de fundo e alimenta suavemente a sobreposição gradiente de legibilidade.

