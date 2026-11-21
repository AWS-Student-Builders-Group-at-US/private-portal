import type { InboxMessage } from "./types";

// Sample emails for local development (INBOX_FIXTURES=1, never in
// production, see `isFixtureMode`). Every address and name is made up:
// example.com / *.example domains only. Dates are relative to `now` so the
// list always shows today, yesterday and older messages.

export type FixtureMessage = InboxMessage & { unread: boolean };

const GROUP = { name: "AWS Student Builder Group", address: "grupo@example.com" };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const NEWSLETTER_HTML = `<!doctype html>
<html>
<head>
  <style>
    body { margin: 0; background: #f4f5f6; font-family: Arial, sans-serif; }
    .wrap { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .hero { background: #232f3e; color: #ffffff; padding: 32px 24px; }
    .hero h1 { margin: 0 0 8px; font-size: 26px; }
    .item { padding: 16px 24px; border-bottom: 1px solid #e3e6e8; }
    .item h2 { font-size: 18px; margin: 0 0 6px; color: #0972d3; }
    .cta { display: inline-block; background: #ff9900; color: #16191f; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="wrap">
    <img src="https://images.newsletter.example/banner.png" width="600" height="160" alt="Banner del boletín (imagen externa, bloqueada)">
    <div class="hero">
      <h1>This Week in AWS</h1>
      <p style="margin:0;color:#d5dbdb">Las novedades de noviembre para comunidades de estudiantes.</p>
    </div>
    <div class="item">
      <h2>Amazon Bedrock para principiantes</h2>
      <p>Una guía paso a paso para crear tu primer asistente con modelos fundacionales, sin salir de la capa gratuita.</p>
      <a class="cta" href="https://newsletter.example/bedrock">Leer la guía</a>
    </div>
    <div class="item">
      <h2>Serverless Days: llamada a ponentes</h2>
      <p>¿Has construido algo con Lambda, Step Functions o EventBridge? Envía tu propuesta antes del 30 de noviembre.</p>
    </div>
    <div class="item">
      <h2>Retos de la semana</h2>
      <ul>
        <li>Despliega una web estática con S3 y CloudFront.</li>
        <li>Crea una API REST con API Gateway y DynamoDB.</li>
        <li>Configura alarmas de facturación con AWS Budgets.</li>
      </ul>
    </div>
    <div class="item" style="font-size:12px;color:#5f6b7a">
      <p>Recibes este boletín porque tu grupo está suscrito. Este correo de ejemplo incluye un script que no debe ejecutarse.</p>
    </div>
  </div>
  <script>document.body.innerHTML = "<h1 style='color:red'>Si ves esto, el sandbox no funciona</h1>";</script>
</body>
</html>`;

export function buildFixtureMessages(now: Date = new Date()): FixtureMessage[] {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  return [
    {
      uid: 112,
      unread: true,
      subject: "AWS Budgets: has superado el 80 % de tu presupuesto mensual",
      from: [{ name: "AWS Budgets", address: "no-reply@budgets.aws.example" }],
      to: [GROUP],
      cc: [],
      date: ago(25 * 60 * 1000),
      text: "Tu presupuesto «Cuenta común» ha alcanzado 16,40 USD de 20,00 USD (82 %).",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px">
  <h2 style="color:#232f3e">Alerta de presupuesto</h2>
  <p>Tu presupuesto <strong>Cuenta común</strong> ha superado el umbral configurado.</p>
  <table style="border-collapse:collapse;width:100%">
    <tr><td style="padding:6px;border:1px solid #e3e6e8">Presupuesto</td><td style="padding:6px;border:1px solid #e3e6e8">20,00 USD</td></tr>
    <tr><td style="padding:6px;border:1px solid #e3e6e8">Gasto actual</td><td style="padding:6px;border:1px solid #e3e6e8;color:#d13212"><strong>16,40 USD (82 %)</strong></td></tr>
    <tr><td style="padding:6px;border:1px solid #e3e6e8">Previsión</td><td style="padding:6px;border:1px solid #e3e6e8">23,10 USD</td></tr>
  </table>
  <p style="font-size:12px;color:#5f6b7a">Revisa los servicios activos en la consola de facturación.</p>
</div>`,
      attachments: [],
    },
    {
      uid: 111,
      unread: true,
      subject: "Nueva inscripción: Taller de AWS Lambda (jueves 19:00)",
      from: [{ name: "Meetup", address: "info@meetup.example" }],
      to: [GROUP],
      cc: [],
      date: ago(2 * HOUR),
      text: "Marta R. se ha apuntado a «Taller de AWS Lambda». Plazas: 34 de 40.",
      html: `<div style="font-family:Helvetica,Arial,sans-serif">
  <p><strong>Marta R.</strong> se ha apuntado a tu evento.</p>
  <p style="font-size:18px;margin:12px 0">Taller de AWS Lambda</p>
  <p>Jueves, 19:00 · Aula 2.05 · <span style="color:#037f0c">34 de 40 plazas</span></p>
</div>`,
      attachments: [],
    },
    {
      uid: 110,
      unread: false,
      subject: "Alerta de seguridad: nuevo inicio de sesión en Linux",
      from: [{ name: "Google", address: "no-reply@accounts.google.example" }],
      to: [GROUP],
      cc: [],
      date: ago(5 * HOUR),
      text: "Se ha iniciado sesión en tu cuenta desde un nuevo dispositivo Linux.",
      html: `<div style="font-family:Roboto,Arial,sans-serif;text-align:center;max-width:480px;margin:auto">
  <h2 style="font-weight:400">Nuevo inicio de sesión en Linux</h2>
  <p>Se ha detectado un nuevo inicio de sesión en tu cuenta. Si has sido tú, no tienes que hacer nada.</p>
  <p style="margin-top:20px"><a href="https://accounts.google.example/activity" style="background:#1a73e8;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">Revisar actividad</a></p>
</div>`,
      attachments: [],
    },
    {
      uid: 109,
      unread: false,
      subject: "Reserva de aula confirmada — Aula 2.05, jueves 19:00–21:00",
      from: [{ name: "Servicio de Espacios", address: "espacios@universidad.example" }],
      to: [GROUP, { name: "Delegación de Estudiantes", address: "delegacion@universidad.example" }],
      cc: [
        { name: "Conserjería", address: "conserjeria@universidad.example" },
        { address: "audiovisuales@universidad.example" },
        { name: "Coordinación de Grado", address: "coordinacion@universidad.example" },
      ],
      date: ago(26 * HOUR),
      text: `Hola:

Confirmamos la reserva del Aula 2.05 para el jueves de 19:00 a 21:00.

- Capacidad: 40 personas
- Proyector y micrófono incluidos
- Recordad dejar el aula como la encontrasteis

Un saludo,
Servicio de Espacios`,
      html: null,
      attachments: [],
    },
    {
      uid: 108,
      unread: true,
      subject: "Te damos la bienvenida a AWS Builder Center",
      from: [{ name: "AWS Builder Center", address: "builder-center@aws.example" }],
      to: [GROUP],
      cc: [],
      date: ago(30 * HOUR),
      text: "Tu perfil de AWS Builder Center está listo.",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px">
  <div style="background:#232f3e;color:#fff;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">¡Bienvenida, comunidad!</h1>
  </div>
  <div style="border:1px solid #e3e6e8;border-top:0;padding:24px;border-radius:0 0 8px 8px">
    <p>Tu perfil de <strong>AWS Builder Center</strong> está listo. Desde aquí podrás publicar artículos, seguir a otros builders y apuntarte a retos.</p>
    <p><a href="https://builder.aws.example" style="color:#0972d3">Completar perfil</a></p>
  </div>
</div>`,
      attachments: [],
    },
    {
      uid: 107,
      unread: false,
      subject: "This Week in AWS — Novedades de noviembre para comunidades",
      from: [{ name: "Boletín de la Comunidad", address: "newsletter@community.example" }],
      to: [GROUP],
      cc: [],
      date: ago(3 * DAY),
      text: "This Week in AWS: Bedrock para principiantes, Serverless Days y retos de la semana.",
      html: NEWSLETTER_HTML,
      attachments: [],
    },
    {
      uid: 106,
      unread: true,
      subject: "Presupuesto de catering para el evento de diciembre",
      from: [{ name: "Laura Gómez (Catering)", address: "presupuestos@catering.example" }],
      to: [GROUP],
      cc: [
        { name: "Tesorería", address: "tesoreria@example.com" },
        { name: "Eventos", address: "eventos@example.com" },
      ],
      date: ago(6 * DAY),
      text: "Os adjunto el presupuesto y el menú propuesto para 60 personas.",
      html: `<p style="font-family:Georgia,serif">Hola,</p>
<p style="font-family:Georgia,serif">Os adjunto el presupuesto y el menú propuesto para <strong>60 personas</strong>. Si confirmáis antes del viernes mantenemos el precio.</p>
<p style="font-family:Georgia,serif">Un saludo,<br>Laura</p>`,
      attachments: [
        { filename: "presupuesto-catering-diciembre.pdf", size: 245_760 },
        { filename: "menu-propuesto.xlsx", size: 38_912 },
      ],
    },
    {
      uid: 105,
      unread: false,
      subject: "3 personas se han unido a AWS Student Builder Group",
      from: [{ name: "Meetup", address: "info@meetup.example" }],
      to: [GROUP],
      cc: [],
      date: ago(12 * DAY),
      text: "Tu grupo tiene 3 nuevos miembros esta semana. Ya sois 212.",
      html: `<div style="font-family:Helvetica,Arial,sans-serif"><p>Tu grupo tiene <strong>3 nuevos miembros</strong> esta semana. Ya sois 212.</p></div>`,
      attachments: [],
    },
    {
      uid: 104,
      unread: false,
      subject: "Tu acceso a AWS Educate está listo",
      from: [{ name: "AWS Educate", address: "no-reply@educate.aws.example" }],
      to: [GROUP],
      cc: [],
      date: ago(40 * DAY),
      text: "Ya puedes acceder a los laboratorios y rutas de aprendizaje de AWS Educate.",
      html: `<div style="font-family:Arial,sans-serif"><h2 style="color:#232f3e">AWS Educate</h2><p>Ya puedes acceder a los laboratorios y rutas de aprendizaje.</p></div>`,
      attachments: [],
    },
    {
      uid: 103,
      unread: false,
      subject: "Tu factura de AWS de septiembre está disponible",
      from: [{ name: "Amazon Web Services", address: "aws-billing@aws.example" }],
      to: [GROUP],
      cc: [],
      date: ago(70 * DAY),
      text: "Importe total: 0,00 USD. Puedes consultar el detalle en la consola de facturación.",
      html: `<div style="font-family:Arial,sans-serif"><p>Importe total del periodo: <strong>0,00 USD</strong>.</p><p>Consulta el detalle en la consola de facturación.</p></div>`,
      attachments: [{ filename: "factura-septiembre.pdf", size: 61_440 }],
    },
    {
      uid: 102,
      unread: false,
      subject: "Ideas para el próximo hackathon",
      from: [{ name: "Equipo de Comunicación", address: "comunicacion@example.com" }],
      to: [GROUP],
      cc: [],
      date: ago(400 * DAY),
      text: `Buenas,

Os dejo algunas ideas que salieron en la reunión:

1. Temática: sostenibilidad y datos abiertos.
2. Formato de 24 horas, con mentores por la mañana.
3. Premio a la mejor arquitectura serverless.

¿Lo vemos el martes?`,
      html: null,
      attachments: [],
    },
    {
      uid: 101,
      unread: false,
      subject: "Convocatoria de ayudas a asociaciones de estudiantes",
      from: [{ name: "Vicerrectorado de Estudiantes", address: "estudiantes@universidad.example" }],
      to: [GROUP],
      cc: [],
      date: ago(500 * DAY),
      text: "Se abre la convocatoria anual de ayudas a asociaciones. Plazo: 30 días.",
      html: `<div style="font-family:Arial,sans-serif"><p>Se abre la convocatoria anual de ayudas a asociaciones de estudiantes.</p><p>Plazo de solicitud: <strong>30 días naturales</strong>.</p></div>`,
      attachments: [],
    },
  ];
}
