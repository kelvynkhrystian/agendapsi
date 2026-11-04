# PSI — ANTIGRAVITY MASTER SPECIFICATION & EXECUTION CONTRACT

**Product:** PSI — Sistema de Gestão de Consultórios  
**Target:** Functional, integrated V1 for psychologists and psychiatrists  
**Implementation language:** English instructions; all user-facing UI, messages, documentation and examples in **Brazilian Portuguese (pt-BR)**  
**Authority:** This file supersedes conflicting items in `PSI.txt`. Keep `PSI.txt` as the original scope reference.  
**Execution:** Autonomous, incremental, testable, committed development; no routine approval required.

## 0. YOUR JOB — READ THIS FIRST

You are the engineering agent responsible for implementing PSI, not merely designing it. Read **this file and `PSI.txt`** fully. Inspect the actual workspace before creating or altering files. Build a real integrated application in a sequence of completed vertical modules, with working UI, server APIs, database persistence, validation, tests, and documentation.

**Do not stop after scaffolding, planning, a few mock screens, or saying what you would do.** Work through all feasible phases below, updating the progress document and making Git commits. If an external credential or unavailable hosting capability blocks something, implement the safe local adapter or simulation, report the exact blocker, and keep working on independent modules. Do not claim an untested feature is complete.

You may autonomously create/edit/refactor files **inside this workspace**, install appropriate project dependencies, run the local app, run tests, create development migrations, create local test data, and commit finished increments. **Do not bypass platform approval controls**; do not run destructive actions on real databases, delete unrelated files, expose secrets, make external paid charges, or deploy to production without explicit authorization.

### Source-of-truth precedence
1. This specification and any later explicit user instruction.
2. The original `PSI.txt` for initial module names not overridden here.
3. Documented, reasonable implementation defaults for remaining ambiguities.

When defaults are necessary, choose maintainable solutions and document them in `docs/DECISIONS.md`. Never reinterpret a requirement silently. No SuperAdmin, subscriptions, staff accounts, or multi-tenancy: any such items in `PSI.txt` are superseded.

## 1. PRODUCT MODEL AND DEPLOYMENT

- PSI is **sold as a standalone application**. Each customer has **one separate installation**, its own database, its own uploaded files, its own administrator, and its own patients.
- First version targets **psychologists and psychiatrists only**. No generic multi-industry marketplace, subscription plans, superadmin dashboard, central user directory, licensing server, or tenant-discriminator tables.
- Exactly two application roles: `ADMIN` (the professional) and `PATIENT`. No employees/secretaries in V1.
- Public MiniSite uses the installation domain root (`/`) and alias `/site` without creating two independent websites.
- Initial deployment target: shared hosting **only if it supports a persistent, compatible Node.js process**, writable persistent storage, suitable MySQL/MariaDB access, outbound HTTPS, and a reliable mechanism for scheduled jobs. Diagnose and document missing capabilities; don't assert universal shared-hosting compatibility. Keep deployment adaptable to a conventional Node server.
- Admin can view storage usage; **there is no artificial 2 GB or 3 GB PSI quota**. Warn about limited disk availability; protect against failing writes.
- Application updates are manual deployments with versioned migrations and backup/rollback instructions.

## 2. ENGINEERING STACK AND STANDARDS

- Next.js App Router, React, TypeScript strict mode.
- Tailwind CSS and a consistent accessible component system; Lucide icons.
- MySQL/MariaDB with Prisma ORM. **Pin an actually compatible Prisma version** and use that version's documented migration workflow. Avoid destructive schema resets or production `db push` shortcuts.
- Next.js REST Route Handlers; Zod validation; React Hook Form for substantial forms.
- Use server-side authorization for every sensitive read/write, never only middleware or hidden UI.
- A robust session/auth solution compatible with the chosen Next.js version, secure password hashes, CSRF-safe mutations where applicable, session rotation/invalidation, login throttling, and recovery-token expiration.
- Store financial amounts as **integer BRL cents**. Store times as UTC instants plus an **IANA professional timezone** setting; present in the professional's locale and timezone, with pt-BR formatting.
- Prefer a small number of good dependencies over unnecessary packages. Favor maintained, widely compatible tools. No reliance on a proprietary service without a working fallback or a clearly documented configuration requirement.
- Standardize errors, success responses, pagination, authorization failures, audit events, and form validation.

## 3. DOMAIN ARCHITECTURE — DESIGN BEFORE CODING

Before the first migration, define a coherent relational model with clearly documented relationships and indexes. At minimum, account for:

- `AdminAccount` / authentication credentials and sessions (or equivalent auth-compatible models)
- `Patient`, `Guardian`/legal-responsible-person, `PatientProfileChangeRequest` when approval is required
- `ConsentAcceptance` with policy version, timestamp, context, and appropriate metadata
- `Service` and its price, modality, duration, optional buffer, activity and individual policies
- `WeeklyAvailability`, `AvailabilityException`, `BlockedPeriod`, holiday/special date
- `Appointment` with start/end, status, cancellation/no-show metadata, patient, service, assigned mode, optional payment, and video provider snapshot
- `AppointmentHold` with expiration and explicit ownership/reason
- `AppointmentPackage`, package appointments, patient acceptance, pricing, payment relation
- `Payment`, `PaymentAttempt`, `Refund`, `GatewayConfiguration` (no exposed credentials)
- `AnamnesisTemplate`, versioned questions, patient submission, review decision
- `ClinicalRecord`/`SessionNote`, internal revisions/audit metadata, optional mood marker
- `StoredFile`, private document sharing grant, expiration and allowed operations
- `NotificationTemplate`, `NotificationDelivery` and attempts/status
- `VideoMeeting` provider and opaque meeting identifiers
- `SiteSettings`, `ProfessionalProfile`, `LegalPage`, `SystemSettings`
- `AuditLog`, `BackupJob`, `TechnicalAccessLog` and relevant technical metrics

The precise table names may differ, but the underlying business requirements must be met.

**Important modeling rule:** appointment lifecycle, payment lifecycle, patient acceptance, no-show attendance, file-sharing status, and video provider status are separate concepts. Do not overload one massive status field to represent all of them. Define explicit allowed transitions, create domain services for those transitions, and validate on the server.

Prevent schedule collisions with **database-aware concurrency control**, not only a client check or a `startAt` uniqueness constraint. Variable-length appointments can overlap without having identical start times. Implement a transactional schedule-locking strategy or equivalent and test two concurrent requests for overlapping time ranges. Package acceptance must reserve all relevant slots atomically or fail coherently.

Build a clear API/service boundary, even inside the monolith. Never couple Prisma queries directly to every visual component.

## 4. ACCOUNT SECURITY AND ROUTES

### Roles and onboarding
- Only `ADMIN` and `PATIENT`.
- Administrator is provisioned by the developer/installer; **no public Admin registration**.
- Development-only placeholder requested by the product owner: username `adminpsi`, temporary password `adminpsi`, phone `99999999999`, and an **actually valid non-production email** such as `adminpsi@localhost.test`. The string `adminpsi` alone is not a valid email. Require password replacement, real contact data, and safe setup on any nondevelopment installation. Never expose those credentials in production or source-controlled environment files.
- Patient account created by public registration or by Admin with a temporary password requiring replacement.
- Patient login by email/password; password reset by time-limited email flow. If mail is unconfigured, expose a development-only mail outbox, never pretend mail was delivered.
- Minors may register with a required legal guardian's identifying/contact information and the relevant authorization/consent flow. Never assume the minor can provide all required permissions independently.
- Patients may directly edit noncritical details (name, phone, email with verification). More sensitive data changes go to Admin for approval; preserve both the proposed and current values until approval. Log decisions.
- Admin can deactivate patients. Permanent erasure must be controlled and checked against applicable professional/legal retention obligations; no blind cascade deletion of clinical records.

### Route groups
- Public: `/`, `/site`, `/agendar`, `/login`, `/cadastro`, password recovery, `/privacidade`, `/termos`, `/cookies`, `/lgpd`, 404, and public video-entry page gated by short-lived authorization.
- Admin: `/admin` and modules for calendar, patients, anamnesis, records, files, services, finance, reports, MiniSite, profile, integrations, and settings.
- Patient: `/paciente` and modules for profile, pending changes, appointments, packages, payments, released documents, and settings.
- Use the professional's configurable logo on the patient login/registration pages.
- Keep patient data isolated per installation and enforce ownership checks on every resource ID.

## 5. UI/UX CONTRACT

Create a real design system first, then use it consistently across functional screens:

- Premium, clean, modern, reassuring healthcare aesthetic; not a template-looking admin with irrelevant widgets.
- Both light and dark theme, persisted per user where suitable.
- Collapsible sidebar, top toolbar, context breadcrumbs, internal tabs for modules, useful search/filter, responsive dialogs and sheets, consistent typography, forms, states, tables, calendar and charts.
- Dedicated mobile treatment for Admin dashboard and schedule; responsive Patient area and MiniSite.
- Accessibility: keyboard navigation, visible focus, labels, semantic controls, adequate contrast, reduced-motion consideration.
- Every view needs loading, empty, error and success states; real pagination/filtering for sizable lists.
- No static-only dashboards masquerading as completed functionality. Demo information must come from controlled database seed data. Design may be revised later without altering domain logic.
- Admin patient detail uses internal sections such as Overview, Anamnesis, Clinical Records, Documents, Appointments and Payments. Patient must not see Clinical Records.

## 6. ADMIN DASHBOARD + CALENDAR — FIRST VERTICAL SLICE

Build these first with their actual persistence and APIs, not visual mock data:

### Dashboard
- Today's appointments; next appointments; active patients; pending approvals; pending payments; monthly simulated/recorded revenue; recent activity; file usage; notifications.
- Useful date filters, correct aggregate queries, charts distinguishing simulated and real amounts.

### Calendar and availability
- **Default weekly calendar**, days along the top and timeline/time slots vertically; professional can switch to day/month/list views and filter periods/statuses.
- Weekly working hours, breaks, holidays, custom dates, one-off blocks and exceptions.
- Minimum public booking notice configured from: 1h, 6h, 12h, 24h, 2 days, 3 days.
- Maximum future booking horizon: 7/15/30/60/90 days or unlimited.
- Default appointment length 60 minutes; editable per appointment.
- Each service can enable or disable an optional configurable gap/buffer after appointments.
- Admin may override public availability on a manual appointment, with a prominent confirmation warning and distinctive calendar styling. Even with override, prevent accidental overlaps unless a separately explicit, documented override is authorized.
- Schedule calculations must respect timezone and duration; account for buffers in availability and overlap logic.

### Lifecycle and cancellation
- Distinguish temporary holds, pending confirmation/payment, confirmed, completed, cancelled, late-cancelled, no-show and expired holds where applicable.
- Payment hold expiry options: 1h, 2h, 6h, 12h, 24h, 48h; configurable.
- Default cancellation notice: **3 days before appointment**, configurable per service.
- Patients can still request/perform a cancellation after the deadline, but it must be marked late and audited.
- Admin can leave a late cancellation cancelled, organize manual WhatsApp rescheduling, or issue a refund (subject to provider capability and policy).
- Patient self-rescheduling is optional and Admin-configurable; recheck availability atomically.
- Admin manually records a no-show and decides whether to refund or retain payment under the chosen policy.
- Recurrences can be created **only by Admin**, presented to Patient for acceptance/payment, or manually marked paid by Admin. Do not silently mark unresolved repeated appointments as completed.

## 7. SERVICE MANAGEMENT

CRUD with name, description, price, free/paid, default duration, modality (online/in-person), active status, optional interval between visits, custom cancellation policy, and confirmation requirements. Active services only appear publicly.

Per-service confirmation can be:
- Automatic upon valid request, when allowed by payment policy;
- After successful online payment;
- After manual Admin approval;
- After successful payment **and** manual Admin approval.

Admin can make a one-off manually created appointment free even if the underlying service normally costs money. Services may be free by default.

## 8. PUBLIC MINISITE + BOOKING

- Single editable public site at both `/` and `/site` (canonical URL to avoid duplicate content).
- Sections: hero, about professional, active services, location, contact, call to book and footer.
- Admin changes logo, colors, photos, texts, address, contacts, social links, WhatsApp number.
- Optional custom HTML is **sanitized and isolated**: no arbitrary JS, dangerous event attributes, hidden phishing forms or unsafe external embeds. Never let custom MiniSite code execute in the privileged Admin context.
- Legal links in footer. Starter legal texts editable by Admin; they are templates, not a compliance certification.

Create a 3-step booking flow:
1. Select service.
2. Select date/time.
3. Identify/login/register and choose permitted payment route.

**Online/demo payment:** authentication is required. Save only non-sensitive draft choices temporarily in browser storage; restore after authentication; revalidate slot and pricing on the server before creating the hold and accepting payment.

**WhatsApp public request:** create a well-formatted message with service/date/time and contact information, open Admin's WhatsApp, and explicitly say it is **only a request**. **Do not create an appointment, block a time slot, or claim confirmation.** Do not place clinical details in WhatsApp message content.

**In-person or WhatsApp-arranged payment for a real appointment created inside the platform:** these are different from a public WhatsApp inquiry; they may have a pending appointment and require explicit manual Admin payment confirmation and appointment rules.

## 9. PATIENTS, ANAMNESIS AND RECORDS

- Patient profile, future/past appointments, packages, payments, and documents explicitly shared by Admin.
- Patient cannot upload files in V1.
- Anamnesis: editable baseline form, patient fills it, Admin reviews and approves; preserve submission/review history and template version.
- Clinical records: restricted to Admin; organized per appointment/session; rich-text note or summary, optional 10-face mood scale, attachments, reusable note templates, export PDF, internal version history/audit even when editing remains easy.
- Clinical note access is **never** granted by default to Patient. Admin may explicitly export a PDF and share a selected document.
- Released documents: date issued, date shared, view/download permission, configurable sharing expiration of 15/30/60/90 days or indefinite. Expiration revokes the patient's access but **does not automatically destroy the underlying required clinical record**.
- Files are private: outside `public/`, restricted with authorization and ownership checks, nonpredictable stored filenames, filename/path sanitization, MIME and size validation, safe download headers, and protection against path traversal.
- No unrestricted patient deletion if professional retention requirements apply. Make retention rules visible and require legal/professional review before production use.

## 10. PACKAGES AND RECURRING APPOINTMENTS

- Admin creates packages with **predefined appointment dates and times** (not generic self-booked credit bundles in V1).
- Price may be defined for the package; Admin associates an existing Patient or creates one.
- Submit package proposal for patient review and acceptance, with optional simulated online payment or manual 'paid' marking by Admin.
- Protect every proposed appointment slot from other bookings with a **documented temporary reservation and expiration policy**. A pending proposal must not block a schedule forever. When accepted/paid, transition to the proper committed state atomically; on rejection or expiration, release holds safely.
- Admin-created recurring series follows the same acceptance/payment/availability rules; package payments, appointment amounts and refunds must not double-count revenue.

## 11. PAYMENT SYSTEM — WORKING FAKE PROVIDER IN V1

Build a provider interface, a local **FakePaymentProvider**, and configuration slots for up to three future real gateway accounts per installation. Do **not** select or invent actual providers now.

Fake provider needs working test transitions for:
- pending;
- approved;
- rejected;
- cancelled;
- refunded.

Simulate payment callbacks internally with a controlled Admin/development action, or a local sandbox flow; never charge money or represent a simulated charge as real.

- Support online, in-person, and 'arranged by WhatsApp' methods, enabled/disabled in Admin settings.
- In-person/WhatsApp-arranged payments require explicit manual Admin confirmation.
- Implement pending holds, expiry, confirmation rules, refunds and financial history.
- Store monetary values and payment state on the server; use idempotency to prevent duplicates when requests are retried.
- `Payment`, `Appointment`, `Package`, and `Refund` should have separate status histories and correct audit trail.
- Dashboard/reporting must label **SIMULADO** data clearly; do not imply actual earnings have been collected.
- Store future gateway secrets only on the server, encrypted at rest if stored in DB, never returned by API.

## 12. VIRTUAL CONSULTATIONS — JITSI ONLY AS V1 PROVIDER

- Admin can choose a single active video provider per installation; the current V1 provider is **Jitsi**. Future provider choices (PeerJS/WebRTC, Google Meet) must be represented by an extension interface but **not fake working buttons**.
- Changes to the active provider affect only future appointments; existing appointments retain their provider/link snapshot.
- Create a **high-entropy, unique meeting room ID** per virtual appointment. Use an Admin-configurable Jitsi deployment domain and provider settings.
- Patient access begins **15 minutes before** the consultation; Admin can enter based on explicit permissions. The public-facing PSI entry page must validate a patient session or short-lived, scoped access token. If patient arrives first, show an in-app waiting state until they can proceed.
- Put the **PSI entry URL** (not an early unrestricted raw meeting URL) into notifications when access-time restrictions are intended. Note: if the Jitsi provider's raw URL leaks, PSI gating alone cannot enforce confidentiality. Document and enforce what the configured Jitsi service actually supports.
- For local prototype, a public Jitsi test instance may be used under its service terms. Do **not** treat `meet.jit.si` as an approved production clinical backend. Production readiness must require a properly configured/private or contractually suitable Jitsi deployment/provider, appropriate authentication/privacy assessment, and verification of hosting constraints.
- No recording in V1. Avoid storing audio/video streams in the PSI backend.
- Future PeerJS can use a simple two-party waiting experience with secure session signaling; future Google Meet can use authenticated API creation when configured. Neither is required to work in V1.

## 13. NOTIFICATIONS AND INTEGRATIONS

Create customizable templates for booking created/confirmed/cancelled/rescheduled, payment events, package proposal, virtual meeting access, and configurable reminders. Template variables include patient/professional name, service, date, time, and appropriate PSI entry link.

- Email: adapter supports SMTP or API provider; development outbox records messages without claiming delivery.
- WhatsApp: one real provider configuration slot per installation; provider integration can remain unconfigured until credentials are supplied. Support a **development simulator** for reminder and notification behavior, visibly marked undelivered/simulated.
- Reminder timing may include several configurable offsets.
- Use durable notification jobs or a documented, host-supported scheduler (e.g. cron). No assumption of always-on in-process timers on shared hosting. Include retries with backoff and duplicate suppression.
- Do not send sensitive clinical notes in email/WhatsApp. Use secure deep links when necessary.
- AI-based automatic WhatsApp assistance is **future scope**, not a required V1 module.

## 14. FINANCE AND REPORTS

- Lists and filters for paid/pending/rejected/refunded manual and simulated payments.
- Aggregates of appointments, packages, revenue, pending balances, no-shows and cancellations.
- Report views with filters and basic export where appropriate.
- Clearly distinguish demo/simulated amounts, pending receivables and recorded manual payments.
- Do not overbuild accounting, tax issuance or bank reconciliation not yet requested.

## 15. STORAGE, TECHNICAL GET API AND AUDIT

### Storage
- Persistent local file storage with usage breakdown for PDFs/images/other files, file count, warnings, and free space **when measurable**; otherwise show honest 'not available' state.
- No arbitrary 2GB/3GB quota, and no silent overflow; reject writes when technically unsafe.
- Admin storage panel with current upload usage and friendly indicators.

### Remote technical status API
Create **GET `/api/technical/status`** as a read-only endpoint for the developer's separate, external monitoring dashboard. **Do not build the external monitoring dashboard here.**

- Protect with a high-entropy per-installation bearer secret stored in server environment variables, not in browser source and not in URL query strings.
- Serve only over HTTPS outside development. Restrict requests, log technical access, and permit token rotation by environment configuration. No GET endpoint mutation or admin data-changing operations.
- Return an explicit documented JSON schema with installation ID, version, timestamp, Admin **name/email/phone** (only as permitted/disclosed), number of patients (aggregate only), uploaded file bytes/count, disk availability if obtainable, WhatsApp configuration/health status, gateway configuration status, and **aggregate** payment subsystem status.
- Never expose passwords, access tokens, raw provider secrets, clinical content, identifiable patient information, individual payments, or backup archives.
- Admin 'technical' settings should show endpoint availability, masked credential status, and a copyable URL. Explain that the external dashboard must send the bearer token separately; do not put the token into a copyable URL.
- This V1 is **PULL only**: external dashboard calls GET. Do not implement scheduled PUSH telemetry or remote control.
- Include transparency about personal information sent to the independent monitoring service; make the collected contact fields and intended purpose explicit.

### Audit
- Audit Admin logins and important actions, patient profile changes, payment state changes, booking changes, record access/edits, data exports and privileged technical access.
- Make an Admin 'activity history' view useful for recalling what was changed.
- Avoid writing secrets or sensitive record bodies into logs. Protect audit data from routine tampering.

## 16. BACKUP, RECOVERY, LEGAL CONTENT

- Admin-triggered manual backup: database and uploaded files, a manifest/checksums, excluding secrets wherever possible; protected download, retention safeguards, and useful progress/error states.
- Restore assistant with archive inspection, manifest/integrity validation, dry-run/report, explicit confirmation, and rollback/backup-before-restore strategy. If large archives or database privileges prevent safe in-browser restore on shared hosting, implement a **safe, truthful assisted restore path** plus CLI/runbook; don't claim an unsafe one-click restore works.
- Base pages for Privacy, Terms, Cookies, LGPD are Admin-editable and linked in MiniSite footer. Consent acceptance version/date records where appropriate.
- Healthcare-specific document retention, minor consent, privacy notices, and use of third-party video/email services require professional/legal assessment before real clinical deployment. Don't hardcode a guessed retention period or call templates legally sufficient.

## 17. CONFIGURATION SCREEN ORGANIZATION

Admin settings shall include tabs/sections for:
- Professional profile, office/location, logo and visual identity;
- Weekly schedule, exceptions, booking/cancellation policies;
- Service defaults and confirmation policy;
- Payment methods, fake provider and future gateway slots;
- Video provider (Jitsi default, other providers disabled/not implemented);
- Email and WhatsApp;
- Message templates and reminders;
- MiniSite and legal texts;
- Storage, technical monitoring and backup;
- Security and activity logs.

The Admin UI uses a collapsible sidebar with context-specific internal top tabs. Patient-facing login/cadastro reflects the professional's logo and theme where safe.

## 18. ACTUAL IMPLEMENTATION PHASES — EXECUTE, DO NOT JUST PROPOSE

### Phase 0 — Inspect and validate assumptions
- Read both specification files and examine workspace/tools.
- Identify project state, installed Node, package manager, available database, and constraints.
- Create `docs/DECISIONS.md`, `docs/PROGRESS.md` with a module checklist, and `docs/DEPLOYMENT_FEASIBILITY.md`.
- Flag genuine environmental blockers; **continue with unblocked work** rather than waiting for routine decisions.

### Phase 1 — Foundations
- Initialize Next.js/TypeScript, Tailwind, component library, themes, auth, Admin and Patient route groups, permissions and error architecture.
- Design complete initial database relationships and migrations; explain major invariants and indexes in `docs/DATABASE.md`.
- Seed only **development** demo records. Add `.env.example` without secrets and local setup instructions.
- Implement a reliable local dev setup, with an optional local MySQL service/container if permitted and useful.

### Phase 2 — First end-to-end vertical slice: Admin Dashboard, Services, Schedule
- Actual database services, weekly calendar, availability, exceptions, booking CRUD, concurrency-safe reservations, status transitions and real dashboard totals.
- Create relevant tests. Build and commit this as a complete, demonstrable module.

### Phase 3 — Patient and public identity
- Patient CRUD, minors/guardians, account creation/login/recovery, consent, patient area, profile change rules.

### Phase 4 — MiniSite and booking
- Customizable landing page, public services, 3-step online booking, saved draft, WhatsApp request (no reservation), appointment confirmations and notifications.

### Phase 5 — Finance and packages
- Fake payment state machine, manual payment confirmation, financial views, package creation/acceptance/payment and atomic holds.

### Phase 6 — Clinical
- Anamnesis, private records, mood selector, PDF export, private attachments, access-controlled document sharing and expiry.

### Phase 7 — Virtual consultations and communication
- Jitsi test integration, PSI-gated access, waiting experience, provider abstraction, SMTP/API email adapters, WhatsApp configuration, reminders, delivery logs.

### Phase 8 — Operations
- Admin settings, legal editing, technical monitoring GET, storage metrics, audit history, backup/export and safe restore workflow.

### Phase 9 — Hardening and delivery
- End-to-end test critical journeys, adversarial authorization tests, concurrency tests, cancellation/refund tests, mobile review, production build, migration check, API error-handling, security review and deployment runbook.
- Update `docs/PROGRESS.md` with honest implementation states. Commit fixes and report remaining gaps, external credentials and hosting constraints.

## 19. REQUIRED ACCEPTANCE TESTS

At a minimum, demonstrate/tests should cover:

1. Admin sign-in, logout, recovery, password change, and denied patient access to Admin APIs.
2. Patient sign-up, temporary password flow, minor legal guardian fields, and safe email update.
3. Weekly working hours, holiday/blocked periods, 60-minute default, service buffers, booking notice limits.
4. **Two simultaneous overlapping booking attempts** cannot both confirm or hold conflicting slots.
5. Admin override warns on unavailable time; cannot silently overlap existing appointment.
6. Online booking draft survives authentication; availability is revalidated.
7. Public WhatsApp inquiry does **not** write an Appointment or Hold record.
8. Fake payment approval/rejection/refund affects booking state correctly; retries do not create duplicate payments.
9. Payment holds expire at configured interval; expired holds release slots safely.
10. Late cancellation records policy breach but permits cancellation; no-show/refund actions are logged.
11. Package proposal holds dates temporarily, all-or-nothing acceptance, coherent expiration/rejection.
12. Patient API cannot fetch another patient's documents, clinical note, payment, or appointment by changing an ID.
13. Clinical record is never exposed to Patient; only deliberately released file is accessible until expiry.
14. Jitsi test entry is gated by time and authorization; the limitation of external raw room URLs is documented.
15. Reminder jobs are idempotent, unconfigured providers are not represented as delivering messages.
16. Technical GET rejects missing/wrong token, returns only approved fields, and has no write side effects.
17. Storage reporting doesn't enforce a fabricated quota and handles unsupported disk stats honestly.
18. Light/dark mode, mobile Admin and Patient interface, form validation, accessible navigation.
19. Backup export integrity and safe recovery documentation; destructive restore requires explicit confirmation.
20. Clean install from instructions: migrations, safe initial Admin creation, dev seed, production build and smoke tests.

## 20. AUTONOMOUS WORKFLOW AND NON-NEGOTIABLE QUALITY BAR

- **Keep coding, testing and committing** until the V1 is finished, an actual tool/runtime/usage limit prevents continuation, or explicit approval is required for a risky action.
- Work in small vertical increments; do not change the entire architecture every time a screen changes.
- Run formatter/linter, TypeScript checks, appropriate tests and a build at meaningful checkpoints. If tests cannot run due to environment, state the reason exactly.
- Git commit after each working phase/module; do not commit broken builds when avoidable.
- Keep `docs/PROGRESS.md` authoritative: `not started`, `in progress`, `implemented`, `tested`, `blocked`, `future` — with notes and evidence.
- Never substitute a UI prototype for actual API/database functionality without labeling it clearly.
- Never claim the application is production-ready for handling clinical information solely because the happy-path demos pass.
- No secrets in Git or client bundles; no production access without authorization; no irreversible deletion or deployment without approval.
- Do not attempt to disable operating-system safeguards or Antigravity permission prompts.
- Respect hosting and agent/model rate limits; if interrupted, preserve documented progress to resume.

## 21. DELIVERABLES

The workspace should contain:

- Working Next.js application and responsive themes.
- Real MySQL/MariaDB + Prisma data model and reproducible development migrations.
- Real Admin/Patient authentication and route authorization.
- Dashboard, scheduling, services, MiniSite, public booking, patients, clinical modules, simulated payments and packages.
- Jitsi V1 integration with clearly documented test/production boundary.
- Notification adapters, Admin settings, reporting, local file storage, technical GET and backup workflow.
- Automated tests plus demo seed/fixtures.
- `README.md`, `AGENTS.md` (a concise version of these enduring instructions), `.env.example` and docs: `ARCHITECTURE.md`, `DATABASE.md`, `BUSINESS_RULES.md`, `ROUTES.md`, `DECISIONS.md`, `PROGRESS.md`, `DEPLOYMENT.md`, `DEPLOYMENT_FEASIBILITY.md`, `SECURITY.md`.
- Honest final report with **implemented**, **tested**, **simulated**, **requires provider configuration**, **blocked**, and **future** sections.

## START COMMAND

**Read `PSI_ANTIGRAVITY_MASTER.md` and `PSI.txt`. Inspect the project. Create the plan and progress documents, then immediately begin Phase 1 and continue through the remaining phases in order, autonomously implementing, testing and committing one complete vertical module at a time. Do not stop after planning.**
