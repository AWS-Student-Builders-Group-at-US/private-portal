# UX improvements (round 2)

Locator: `odd/tasks/ux-mejoras.md` · Engram mirror: `odd/ux-mejoras/tasks` (pending: auto mode cannot
review engram saves in this session).

## Objective

Apply the Core Team feedback of 2026-11-15 to the member panel: simpler navigation, a simpler calendar
with shared notes, per-event check-in forms, file previews, vault secrets and a sectioned settings page.

## Problem and why

The "Más" tab hides half of the app, the calendar mixes three sources of manual availability nobody
uses, and the check-in form is global although events need different questions.

## Scope and constraints

- Branch `feat/ux-mejoras` from `trunk`; PR into `trunk`, then `trunk` → `main` (CI enforces it).
- Visual style is owned by José (PR #9): keep using the existing components and tokens, no restyle.
- UI text in Spanish; code, comments and identifiers in English.
- Migrations: new files only, backward compatible (add columns with defaults, never drop/rename in
  the same release). Existing `availability_template`/`availability_overrides` tables stay (unused).
- Out of scope now: posts auto-publishing settings (depends on PR #10), public web (PR #11).

## Tasks

- [x] T1 Navigation and settings: remove "Más"; Recursos, Sugerencias, Bóveda and Ajustes in the
      main nav (desktop sidebar; mobile: 5 fixed items + drawer for the rest); sign-out inside
      Ajustes; Ajustes split into sections (Cuentas, Bóveda, Google Drive, Web pública placeholder,
      Publicaciones placeholder); drop the calendars and form link cards.
- [x] T2 Calendar: remove "Semana habitual" and "Cambios por fecha" from the UI and from the
      occupation math; shared notes over a selected range of cells (title + content) shown in the
      team view.
- [ ] T3 Per-event check-in form: named forms with versions; event picks a form (null → active
      default); form editor moves under Eventos; check-in and `/privacidad` use the event's form.
- [ ] T4 Drive file preview modal in Recursos; vault "Secret / API key" item type with `.env`
      import/export.

## Delivery strategy

`ask-on-risk`. Forecast ~1,200–1,600 authored lines across four tasks: one work-unit commit per task,
one PR into `trunk` unless the user asks for slices.

## Progress and evidence

- T1 done. Route: delegated direct (writer trigger: 2+ non-trivial files). Nav split into
  `BOTTOM_NAV_ITEMS` + `MENU_ITEMS` (Base UI Dialog drawer on mobile); `isActive` now matches
  `href` or `href/…` only. Test-first: `src/components/app-shell/nav-items.test.ts` RED (4 failed)
  then GREEN. Form editor moved to `/panel/eventos/formularios`; Ajustes sectioned with anchors.
  Checks: `npm run lint`: pass (no output); `npm test`: 37 files, 288 tests passed;
  `npm run build` (placeholder env): pass. Commit: see `git log` (feat(panel) flat navigation).

- T2 done. Route: delegated direct (writer trigger: 2+ non-trivial files). "Semana habitual" and
  "Cambios por fecha" removed (TemplatePainter, OverridesPanel, their actions/schemas/slot helpers
  deleted); occupation is Google-only (`MemberDayData = { busy }`, `SlotOccupation` without
  `manual`); legacy tables untouched. New `availability_notes` table (migration
  `20261126000000_availability_notes.sql`, RLS: members read all, write own) and pure helpers in
  `notes.ts` (`rectFromCorners`, `notesInWeek`, `noteCoversCell`, `notesForCell`,
  `formatNoteRange`). "Tu semana" has an «Añadir nota» mode (click/drag, two taps, or arrows +
  Enter) and lists own notes with edit/delete; the team view marks note cells and lists "Notas del
  equipo" for the selected people. Test-first: `notes.test.ts` RED (module missing),
  `schema.test.ts` RED (9 failed), `occupation.test.ts` RED (8 failed), then GREEN.
  Checks: `npm run lint`: pass (no output); `npm test`: 38 files, 297 tests passed;
  `npm run build` (placeholder env): pass. Commit: see `git log` (feat(calendar) google-only week).

## Next step

T3 (per-event check-in form).
