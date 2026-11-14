import Link from "next/link";

// Public placeholder for the future landing page. Outside the access gate:
// it must not read the session.
export default function PublicHomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 text-center">
        <h1 className="text-2xl font-semibold">
          AWS Student Builder Group · Universidad de Sevilla
        </h1>
        <p className="text-muted-foreground">Próximamente</p>
        <Link
          href="/panel"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Acceso Core Team
        </Link>
      </div>
    </main>
  );
}
