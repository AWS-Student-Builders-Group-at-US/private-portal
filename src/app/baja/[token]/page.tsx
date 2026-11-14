import type { Metadata } from "next";
import { Suspense } from "react";
import { UnsubscribeForm } from "@/features/emails/components/unsubscribe-form";
import { confirmUnsubscribe } from "@/features/emails/unsubscribe-actions";

// Public unsubscribe page (outside the member gate; the proxy matcher skips
// /baja/). GET never unsubscribes, because mail scanners prefetch links; the
// visitor confirms with a POST. Any token gets the same page and answer.
export const metadata: Metadata = {
  title: "Darse de baja",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function UnsubscribePage({ params }: PageProps<"/baja/[token]">) {
  return (
    <main className="flex flex-1 justify-center p-4 sm:p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <p className="text-sm font-medium text-muted-foreground">
          AWS Student Builder Group · Universidad de Sevilla
        </p>
        <h1 className="text-2xl font-semibold">Darse de baja</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
          <UnsubscribeContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function UnsubscribeContent({ params }: Pick<PageProps<"/baja/[token]">, "params">) {
  const { token } = await params;
  return <UnsubscribeForm action={confirmUnsubscribe.bind(null, token)} />;
}
