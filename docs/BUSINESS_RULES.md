# PSI — Regras de Negócio e Políticas do Sistema

Este documento detalha as políticas de funcionamento, transições de estado e regras de domínio implementadas no **PSI**.

---

## 1. Agendamento, Disponibilidade e Concorrência

### 1.1 Cálculo de Disponibilidade
- A grade de atendimento é gerada a partir dos registros de `WeeklyAvailability` (dia da semana, horário de início e fim).
- Exceções e bloqueios (`AvailabilityException`) têm precedência sobre a grade semanal, removendo horários bloqueados ou adicionando horários extras.
- O cálculo de conflitos utiliza comparação de intervalos semiabertos:
  $$\text{Conflito} \iff (\text{slotStart} < \text{apptEnd}) \land (\text{slotEnd} > \text{apptStart})$$
- **Buffer de Atendimento:** Cada serviço pode definir um tempo de intervalo (`bufferMinutes`). O motor de agenda garante que o término da consulta mais o buffer não invada o início da próxima sessão.

### 1.2 Reserva Temporária (*Draft Hold*)
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

### 4.2 Alteração de Dados Cadastrais Sensíveis
- Dados de contato direto (nome social, telefone) podem ser atualizados imediatamente pelo paciente.
- Alterações em dados sensíveis (nome civil, CPF, e-mail de acesso) geram uma solicitação em `PatientProfileChangeRequest`.
- Os valores atuais permanecem vigentes até que o profissional aprove a alteração no painel `/admin/pacientes`. Em caso de rejeição, a justificativa é registrada.

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

## 6. Teleconsulta e Controle de Sala Virtual

- **Integração Jitsi Meet:** Salas geradas com identificadores pseudoaleatórios protegidos por token interno.
- **Janela de Acesso do Paciente (*Gating*):**
  - O paciente só é autorizado a entrar na sala virtual a partir de **15 minutos antes** do horário de início da sessão até o término previsto.
  - Tentativas fora dessa janela são bloqueadas na interface e na API com mensagem explicativa e cronômetro de espera.
- **Acesso do Profissional:** O profissional possui acesso irrestrito para preparação da sala a qualquer momento.

---

## 7. Mensageria e Notificações

- O disparador de lembretes (`/api/notifications/run-reminders`) é idempotente: verifica registros já existentes em `NotificationDelivery` antes de realizar novos disparos.
- Caso os serviços reais de SMTP ou WhatsApp não estejam configurados no ambiente, o sistema utiliza o modo **Simulador**, registrando o conteúdo na tabela com status `SIMULATED` para validação em desenvolvimento sem falhas de execução.
