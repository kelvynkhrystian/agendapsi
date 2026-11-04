# AGENTS.md — Instruções Contínuas de Engenharia para o PSI

Este documento estabelece as diretrizes permanentes de arquitetura, princípios de segurança e padrões de desenvolvimento para quaisquer agentes ou engenheiros que evoluam ou realizem manutenção na base de código do **PSI — Sistema de Gestão de Consultórios**.

---

## 1. Modelo de Produto e Escopo
- **Instalação Standalone Dedicada:** Cada profissional (psicólogo ou psiquiatra) possui sua própria instalação, banco de dados isolado e diretório privado de arquivos.
- **Dois Papéis Estritos:** Apenas `ADMIN` (profissional titular) e `PATIENT` (paciente). Não criar perfis de secretária ou superadmin no V1.
- **Sem Multi-Tenancy:** Não adicionar colunas discriminadoras (`tenantId`) ou marketplace genérico.
- **Idioma:** Todo o código, commits e instruções em inglês/português técnico; toda a interface com o usuário (UI), mensagens de erro, notificações e documentação jurídica estritamente em **Português do Brasil (pt-BR)**.

---

## 2. Princípios de Arquitetura e Engenharia
- **Stack Oficial:** Next.js (App Router), React 19, TypeScript (Strict Mode), Tailwind CSS v4, Prisma ORM 6+, MySQL / MariaDB.
- **Validação e Tipagem:** Sempre usar esquemas Zod em todas as rotas de API (`/api/*`). Não confiar em dados enviados pelo cliente.
- **Autorização em Camadas:** Nunca confiar apenas em layout ou middleware. Todas as rotas de API e Server Actions devem chamar `getCurrentUser()` e validar explicitamente o papel (`role === "ADMIN"` ou validação de titularidade de paciente).
- **Tratamento de Valores Financeiros:** Sempre armazenar e calcular valores financeiros em **centavos inteiros de Real (`Int` BRL cents)**. Nunca usar `Float` para dinheiro.
- **Fuso Horário e Datas:** Armazenar todos os timestamps em **UTC** no banco de dados. Apresentar ao usuário final no fuso horário configurado pelo profissional (padrão `America/Sao_Paulo`).

---

## 3. Segurança Clínica e LGPD
- **Sigilo Absoluto de Prontuários:** Prontuários e anotações de evolução de sessão (`ClinicalRecord`) são acessíveis **única e exclusivamente pelo ADMIN**. Nenhuma rota de paciente pode retornar registros clínicos.
- **Compartilhamento de Documentos Privados:** Arquivos enviados e armazenados em `storage/uploads/` nunca devem ficar acessíveis publicamente via URLs estáticas (`public/`). O download é intermediado por `/api/files/[id]/download`, validando propriedade e prazo de expiração (`expiresAt`).
- **Sanitização de Conteúdo:** O conteúdo customizável do MiniSite deve ser processado pelo motor de sanitização (`src/lib/sanitize.ts`) para prevenir ataques XSS, injeção de scripts e iframes não autorizados.
- **Proteção de Menores de Idade:** Pacientes menores de 18 anos exigem obrigatoriamente nome, CPF e telefone do responsável legal cadastrado.
- **Auditoria:** Registrar em `AuditLog` acessos administrativos, alterações de prontuário, mudanças cadastrais, confirmações financeiras e backups. Nunca registrar senhas ou dados clínicos brutos no log de auditoria.

---

## 4. Concorrência e Agenda
- **Prevenção de Colisões:** Conflitos de horário devem ser verificados considerando intervalos `[startAt, endAt)` e buffers de atendimento. Nunca confiar apenas na igualdade de `startAt`.
- **Reservas Temporárias (Draft Holds):** Slots bloqueados temporariamente devem expirar em 15 minutos se o agendamento não for concluído.
- **Pacotes de Sessões:** O aceite de pacotes segue o princípio atômico "tudo ou nada" — todos os horários são confirmados em conjunto ou a proposta é rejeitada integralmente.

---

## 5. Manutenção de Testes e Migrações
- **Testes Automatizados:** O runner nativo `node --test tests/**/*.test.js` deve ser executado antes de qualquer entrega, garantindo cobertura de segurança, concorrência e regras de negócio.
- **Migrações Seguras:** Utilizar `npx prisma migrate dev` em desenvolvimento. Nunca executar `db push --force-reset` em ambientes de produção.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
