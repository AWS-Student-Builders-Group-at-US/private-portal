// Instant skeleton while the calendar segment streams in, shown inside the
// panel shell on client navigation (the panel layout's Suspense only covers
// the first load of the whole member area).
export default function CalendarLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">Cargando el calendario…</span>
      <h1 className="text-2xl font-semibold">Calendario</h1>
      <div aria-hidden className="flex flex-col gap-6 animate-pulse">
        <div className="flex gap-2 border-b pb-2">
          <div className="h-6 w-36 rounded-md bg-muted" />
          <div className="h-6 w-20 rounded-md bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-muted" />
          <div className="h-4 w-40 rounded-md bg-muted" />
          <div className="size-8 rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, day) => (
            <div key={day} className="h-64 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
