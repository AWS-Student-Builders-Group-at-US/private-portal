import type { Metadata } from "next";
import { PRIVACY_NOTICE_VERSION } from "@/features/checkin/schema";

export const metadata: Metadata = { title: "Política de privacidad" };

// Privacy notice for attendee data collected at /checkin/<token>.
// TODO(before the first real event): this text MUST be reviewed and the
// placeholders (data controller, contact email) completed with the faculty.
// Any change to the text requires bumping PRIVACY_NOTICE_VERSION.
const CONTROLLER = "[Responsable pendiente de confirmar con la facultad]";
const CONTACT_EMAIL = "[correo de contacto pendiente]";

const SECTIONS: [string, React.ReactNode][] = [
  ["Responsable del tratamiento", <p key="c">{CONTROLLER}</p>],
  [
    "Qué datos recogemos",
    <p key="d">
      Al registrar tu asistencia a un evento recogemos tu nombre, tu correo
      electrónico, la fecha y hora del registro y tus respuestas a las dos
      casillas de consentimiento (fotos y vídeos; correos sobre próximos
      eventos).
    </p>,
  ],
  [
    "Para qué los usamos",
    <ul key="p" className="list-disc pl-5">
      <li>Controlar la asistencia a nuestros eventos.</li>
      <li>
        Publicar fotos y vídeos en los que aparezcas, solo si has marcado esa
        casilla.
      </li>
      <li>
        Enviarte correos sobre próximos eventos, solo si has marcado esa
        casilla.
      </li>
    </ul>,
  ],
  [
    "Base legal",
    <p key="b">
      Tu consentimiento, que puedes retirar en cualquier momento sin que
      afecte a los tratamientos anteriores.
    </p>,
  ],
  [
    "Cuánto tiempo los guardamos",
    <p key="r">
      Los datos de asistencia se eliminan al terminar cada curso académico.
    </p>,
  ],
  [
    "Quién accede",
    <p key="a">
      Solo los miembros del Core Team del grupo. No cedemos tus datos a
      terceros.
    </p>,
  ],
  [
    "Tus derechos",
    <p key="e">
      Puedes acceder a tus datos, rectificarlos, suprimirlos, oponerte a su
      tratamiento, solicitar su limitación o portabilidad y retirar tu
      consentimiento escribiendo a {CONTACT_EMAIL}. También puedes reclamar
      ante la Agencia Española de Protección de Datos (www.aepd.es).
    </p>,
  ],
];

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 justify-center p-4 sm:p-6">
      <article className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            AWS Student Builder Group · Universidad de Sevilla
          </p>
          <h1 className="text-2xl font-semibold">Política de privacidad</h1>
          <p className="text-sm text-muted-foreground">
            Registro de asistencia a eventos · versión {PRIVACY_NOTICE_VERSION}
          </p>
        </div>
        {SECTIONS.map(([title, body]) => (
          <section key={title} className="flex flex-col gap-2 text-sm">
            <h2 className="text-base font-semibold">{title}</h2>
            {body}
          </section>
        ))}
      </article>
    </main>
  );
}
