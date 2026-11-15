# Common account: sole member manager + read-only inbox

Locator: `odd/tasks/bandeja-cuenta-comun.md` · Engram mirror: `odd/bandeja-cuenta-comun/tasks` (pending,
written by the parent).

## Objective

The group's common account (the Gmail address the AWS account is registered with) is hidden from every
people list in the panel and is the only account that can add, edit or remove members (#32). Every panel
member can read that account's inbox, read-only, from `/panel/correo` (#31).

## Decisions (user, 2026-11-15)

- The common account is the address in the server env var `GMAIL_USER` (already used by
  `src/features/emails/mailer.ts`). Its address is never written in the repository (public).
- The inbox is visible to every panel member (no extra permission) and is read-only.
- The address is stored server-side in `public.private_settings` (RLS on, no policies, no grants to
  `anon`/`authenticated`), written only by the admin client from `lower(trim(GMAIL_USER))`.
- When the common account is not configured, today's behaviour stays (any member manages members), so
  nobody is locked out.

## Tasks

- [x] B1 (#32) Common account hidden + only manager of members: migration
      `20261129000000_common_account.sql`, `ensureCommonAccountSetting()` (cron + Ajustes render),
      server-side filtering of people lists, read-only Ajustes → Miembros for everyone else.
- [x] B2 (#31) Read-only inbox: `imapflow` + `mailparser`, `src/features/inbox`, `/panel/correo`
      list + detail, nav item "Correo", docs.

## Acceptance criteria

#32: the common account is not listed; only it can add/edit/remove members, others see the list
read-only; the rule lives in the database; the address is configured without committing it.

#31: panel section with list (from, subject, date) and detail; read-only (nothing sent, deleted or
flagged); visible to every member; credentials server-only; emails not stored in our database.

## Checks

- `npm run lint`, `npm test`, `npx tsc --noEmit` (after `npx next typegen`), `npm run build` with
  placeholder Supabase env vars.
- Test-first (Vitest, node env) for pure helpers: email normalisation/comparison, people filtering,
  uid validation, pagination, CSP-wrapped HTML builder, address formatting.

## Progress

Route for B1 and B2: delegated direct (writer trigger: 2+ non-trivial files).

### B1 (#32)

- Test-first: `src/features/members/common-account.test.ts` written first, RED observed
  (`npx vitest run src/features/members`: module `./common-account-logic` missing), then GREEN;
  error-code test for `not_common_account` RED (1 failed) then GREEN.
- Migration `20261129000000_common_account.sql`: `public.private_settings` (RLS, no policies, all
  privileges revoked from `public`/`anon`/`authenticated`, granted to `service_role`);
  `public.common_account_email()` (internal, not executable by members);
  `public.is_common_account()` (authenticated); `public.assert_member_manager()` (internal guard);
  `add_member`/`update_member`/`remove_member` replaced with the same signatures. Unconfigured →
  any member (unchanged). `remove_member` refuses the common account (`cannot_remove_common_account`).
- Migration exercised on a throwaway local `postgres:17` container with stub `auth.jwt()` and
  Supabase roles: unconfigured add works; configured → non-common gets `not_common_account` on
  all three RPCs, common account can add/update/remove others, cannot remove itself; members get
  `permission denied` on `private_settings` and `common_account_email()`.
- Detection: `GMAIL_USER` (server env) via `getCommonAccountEmail()`; `ensureCommonAccountSetting()`
  upserts it with the admin client from the daily cron and the Ajustes render.
- Hidden on the server (`hideCommonAccount()`) in Ajustes → Miembros, task assignee options (list,
  filters, forms) and the calendar team view (members + their notes). `added_by` is no longer
  selected for the members list.
- Known limitation: emails stored in other columns (e.g. `tasks.created_by`, a pre-existing task
  assigned to the common account) can still show the address; the common account is not expected
  to create tasks.
- Checks: lint clean, `npm test` 52 files / 410 tests passed, `tsc --noEmit` clean, build OK.
- Commit: `832494b` feat(members): common account hidden and sole manager of members.

### B2 (#31)

- Test-first: `nav-items.test.ts` updated ("Correo" before "Ajustes") and
  `src/features/inbox/inbox.test.ts` written first; RED observed (3 nav tests failed, inbox module
  missing), then GREEN (22 tests).
- Dependencies: `imapflow@^2.12.0`, `mailparser@^3.14.4` (both ship types; no `@types/*`).
- `src/features/inbox/imap.ts` (server-only): one connection per request to `imap.gmail.com:993`
  (TLS, 10 s connection/greeting timeouts, logger off, auto-IDLE off), INBOX via
  `getMailboxLock(…, { readOnly: true })` (EXAMINE, verified in imapflow `select.js`), bodies via
  `source` (BODY.PEEK, verified in imapflow `fetch.js`), logout in `finally`. Errors return
  `not_configured` / `unavailable` and log only a generic line.
- `/panel/correo`: 25 per page newest first, "Más antiguos"/"Más recientes", search (IMAP OR
  subject/from), unread dot. `/panel/correo/[uid]`: uid validated (`parseUid`, else 404), headers,
  HTML in `<iframe sandbox="">` with the CSP meta first, else plain text; attachments names + sizes.
- Docs: AGENTS.md (Gmail readers, inbox safety rules), README (inbox section).
- Not verified: a live Gmail IMAP session (no credentials in this environment).
- Checks: lint clean, `npm test` 53 files / 426 tests passed, `tsc --noEmit` clean, build OK
  (`/panel/correo`, `/panel/correo/[uid]` partial prerender).
