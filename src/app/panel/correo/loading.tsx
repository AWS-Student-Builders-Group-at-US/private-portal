// Instant skeleton while the inbox is read over IMAP, shown inside the panel
// shell on client navigation (the panel layout's Suspense only covers the
// first load of the whole member area). Also covers /panel/correo/[uid].
export default function InboxLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">Cargando el correo…</span>
      <h1 className="text-2xl font-semibold">Correo AWS</h1>
      <div aria-hidden className="flex flex-col gap-6 animate-pulse">
        <div className="h-9 w-full rounded-lg bg-muted" />
        <ul className="divide-y rounded-lg border">
          {Array.from({ length: 8 }, (_, row) => (
            <li key={row} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:gap-4">
              <div className="h-4 w-40 rounded-md bg-muted sm:w-56" />
              <div className="h-4 flex-1 rounded-md bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
