# Zernio social publishing

Locator: `odd/tasks/zernio.md` · Engram mirror: `odd/zernio/tasks` (pending).

## Objective

Cristina plans Instagram and LinkedIn posts in Zernio (formerly Late / GetLate). Every planned post
is stored in our `posts` table and, once published, appears on the public website automatically as a
new news card, with links to the live Instagram/LinkedIn post. Members can hide any post from the site.

## Decisions (2026-11-15)

- Display: option A (our own cards, same layout as the news section) plus the live platform URL as
  "Ver en Instagram / LinkedIn" buttons. No third-party embeds (no Meta/LinkedIn scripts or cookies).
- Shown on the site by default (`show_on_site = true`); members can switch it off in the panel.
- Zernio posts skip the internal "another member approves" flow: they are approved in Zernio.
- "New event" means a new news entry on the website, not a row in the Events calendar.
- Secrets `ZERNIO_API_KEY` and `ZERNIO_WEBHOOK_SECRET` live only in Vercel env vars (server-only).
- Inbox of the AWS account mailbox: later, separate PR; visible to every panel member (user decision).

## Zernio facts (docs.zernio.com, read 2026-11-15)

- Base URL `https://zernio.com/api/v1`, `Authorization: Bearer sk_…`.
- `GET /v1/posts` (filters `status`, `updatedSince`, `fromDate`, `toDate`, `limit`, `cursor`),
  posts carry `content`, `mediaItems`, `scheduledFor`, `platforms[]` with `platform`,
  `platformPostUrl`, `publishedAt`.
- Webhooks: `post.scheduled`, `post.published`, `post.partial`, `post.failed`, `post.cancelled`,
  `post.platform.published`…; headers `X-Zernio-Event`, `X-Zernio-Event-Id`, `X-Zernio-Signature`
  (lowercase hex HMAC-SHA256 of the raw body with our secret); retries up to 7 times, dedupe on `id`;
  must answer 2xx within 5 s. Per-event payload shape not verified: fetch the post from the API.
- Free: first 2 connected accounts, unlimited posts. Instagram needs a Business/Creator account.

## Tasks

- [x] Z1 Data + webhook + sync: migration (posts columns, webhook event log, public news filter),
      `/api/webhooks/zernio` with signature check and dedupe, Zernio client, mapping, image copy to
      `public-media`, daily cron fallback sync.
- [x] Z2 Panel: Zernio badge, read-only content, "Mostrar en la web" toggle, platform links;
      Ajustes → Publicaciones (connection status, accounts, last event, webhook URL, sync now).
- [x] Z3 Site: news cards with "Ver en Instagram / LinkedIn"; team photo links to LinkedIn.

## Progress (2026-11-15)

Route for Z1–Z3: delegated direct (writer trigger: 2+ non-trivial files).

- Test-first: `src/features/zernio/{signature,envelope,mapping}.test.ts` written first; RED observed
  (`npx vitest run src/features/zernio`: 3 files failed, modules missing), then GREEN (32 tests).
- Migration `20261128000000_zernio_posts.sql`: posts gain `source` ('panel'|'zernio'),
  `zernio_post_id` (unique), `platform_urls` (jsonb object), `show_on_site` (default true);
  `posts_enforce_workflow` trusts JWT-less writes on Zernio rows, resets source/zernio fields on
  member inserts, pins them on member updates and only lets members change `show_on_site` on
  Zernio rows; `grant update (show_on_site)`; members cannot delete Zernio rows (hide instead);
  `zernio_webhook_events` (RLS, member select only); `public_news`/`public_news_item` recreated
  (return `platform_urls`): panel rule unchanged (approved/published + web + date passed),
  Zernio rule published + date passed, both require `show_on_site`.
- Status mapping: scheduled/publishing/pending → approved; published/partial with ≥1 live
  platform → published; failed (or partial with none) → draft + `publish_error`; draft/cancelled
  → draft. Rows are never deleted by the sync. Posts without Instagram/LinkedIn are skipped.
  Slug is kept on updates (stable URLs); `show_on_site` is never overwritten by the sync.
- Images: JPEG/PNG/WebP up to 5 MB (the `public-media` bucket limit, not 10 MB).
- Webhook: signature → envelope → dedupe insert → `after()` sync. If the sync fails after the
  event was recorded, the daily cron (last 48 h) or "Sincronizar ahora" recovers it.
- Checks: `npm run lint` clean; `npm test` 51 files / 400 tests passed; `npx tsc --noEmit` clean;
  `npm run build` (placeholder env) compiled, `/api/webhooks/zernio` dynamic.

## Not verified

- Zernio response shapes (`GET /posts/{id}` wrapper, list pagination cursor, accounts fields) and
  webhook payload are read defensively but not confirmed against the live API.
- Migration not applied to a database here; trigger/grant behaviour checked by reading only.
- Bucket upload with the secret key and the UI were not exercised in a browser.

## Not done yet / open

- Real end-to-end test needs the group's Instagram (professional) and LinkedIn page connected in
  Zernio, plus both env vars in Vercel and the webhook URL registered in Zernio.
