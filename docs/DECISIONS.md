# PSI — Registro de Decisões de Arquitetura e Engenharia (ADR / DECISIONS)

Este documento registra as decisões técnicas, escolhas arquiteturais e padrões normativos adotados durante o desenvolvimento do **PSI — Sistema de Gestão de Consultórios**.

---

## 1. Escopo de Produto e Modelo de Implantação
- **Decisão:** Instalação autônoma (Single-Tenant). Cada profissional possui sua própria base de dados MySQL/MariaDB, armazenamento de arquivos e instância da aplicação.
- **Justificativa:** Atende rigorosamente ao requisito de privacidade clínica em psicologia/psiquiatria e elimina complexidade desnecessária de SuperAdmin, cobrança de assinaturas na plataforma ou multi-tenancy com risco de vazamento de dados entre consultórios.
- **Papeis (Roles):** Exclusivamente `ADMIN` (o profissional titular) e `PATIENT` (o paciente). Não há funcionários/secretárias na V1.

---

## 2. Stack Tecnológica
- **Framework:** Next.js (App Router) com React 19 / TypeScript no modo strict.
- **Estilização & Design System:** Tailwind CSS com classes semânticas, suporte a Dark Mode e Light Mode com persistência, e ícones Lucide.
- **ORM & Banco de Dados:** Prisma ORM com MySQL/MariaDB (porta 3306).
- **Validação:** Zod para contratos de API, schemas de entrada/saída e validação de formulários (integrado a React Hook Form).
- **Datas e Horários:** UTC persistido no banco de dados com IANA Timezone configurável (padrão `America/Sao_Paulo`) para exibição e cálculo de disponibilidade no fuso do profissional.
- **Valores Monetários:** Inteiros em centavos de Real (`BRL cents`), eliminando imprecisões de ponto flutuante em cálculos de pagamentos, descontos e estornos.

---

## 3. Segurança e Autenticação
- **Sessões e Tokens:** Autenticação baseada em JWT seguro assinado via `jose` com cookies HTTP-only, SameSite=Lax, Secure em produção.
- **Hash de Senha:** `bcryptjs` (salt rounds 10).
- **Credenciais de Desenvolvimento:** Conforme especificação, provisionamento de seed com `adminpsi`, email de desenvolvimento `adminpsi@localhost.test`, telefone `99999999999`, com bloqueio e exigência de troca imediata em ambiente de produção.
- **Isolamento de Arquivos:** Armazenamento privado fora do diretório `public/`. Todo acesso a documentos, anexos clínicos e relatórios é intermediado por rotas autenticadas que verificam a titularidade e permissões de acesso.
- **Proteção contra Sobrescrita / Concorrência:** Locks e transações atômicas no Prisma para reservas de horários (agendamento público e pacotes).

---

## 4. Pagamentos (V1)
- **FakePaymentProvider:** Provedor local de simulação com máquina de estados completa (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `REFUNDED`).
- **Marcação Visual:** Todo valor gerado pelo simulador é identificado explicitamente como **SIMULADO** em relatórios e dashboard.
- **Meios Suportados:** Online (simulado), Presencial e Combinado via WhatsApp (ambos exigindo confirmação manual do Admin).
- **Slots Futuros:** Arquitetura preparada com interface unificada de Gateway para plugar até 3 provedores reais futuramente sem retrabalho.

---

## 5. Teleconsulta e Vídeo
- **Provedor V1:** Jitsi Meet com geração de ID de sala único de alta entropia.
- **Gating de Acesso:** Página interna do PSI com controle de permissão e liberação de entrada apenas 15 minutos antes da sessão para pacientes.
- **Documentação de Limitações:** Documentado claramente que a confidencialidade clínica total depende de instância Jitsi autenticada/privada do profissional, e não de link público aberto.

---

## 6. Comunicação e Notificações
- **Email:** Adaptador com suporte a SMTP / API e Outbox local em modo desenvolvimento para inspeção sem envio real acidental.
- **WhatsApp:** Interface desacoplada com simulador de disparos de lembretes e confirmações com rastreamento de entregas no banco de dados.

---

## 7. Monitoramento Técnico
- **Endpoint GET `/api/technical/status`:** Read-only, autenticado via Bearer Token armazenado em variável de ambiente (`TECHNICAL_STATUS_BEARER_TOKEN`).
- **Dados:** Métricas de saúde do sistema, armazenamento, contagem agregada de pacientes, status do gateway e WhatsApp sem expor dados clínicos ou credenciais.
