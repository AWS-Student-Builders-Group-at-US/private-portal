import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { StatusBanner } from "@/components/status-banner";
import { buttonVariants } from "@/components/ui/button";
import { formatMadridDateTime } from "@/features/events/time";
import { networkWarnings } from "@/features/posts/content";
import { publicMediaUrl } from "@/features/posts/media";
import { PostPreviews } from "@/features/posts/components/post-previews";
import { DeletePostButton, PostStatusActions } from "@/features/posts/components/post-status-actions";
import { SiteVisibilityToggle } from "@/features/posts/components/site-visibility-toggle";
import { PostStatusBadge } from "@/features/posts/components/status-badge";
import { PlatformLinks, ZernioBadge } from "@/features/posts/components/zernio-bits";
import { getPost } from "@/features/posts/queries";
import { POST_TARGET_LABELS } from "@/features/posts/schema";
import { availableActions } from "@/features/posts/workflow";
import { getCurrentMember } from "@/lib/auth/member";

const MESSAGES = { creada: "Borrador guardado.", guardada: "Cambios guardados." };

export default async function PostDetailPage({ params, searchParams }: PageProps<"/panel/publicaciones/[id]">) {
  const [{ id }, { estado }, member] = await Promise.all([params, searchParams, getCurrentMember()]);
  const post = await getPost(id);
  if (!post) notFound();

  const fromZernio = post.source === "zernio";
  const actions = fromZernio ? [] : availableActions(post, member.email);
  const editable = !fromZernio && (post.status === "draft" || post.status === "review");
  const warnings = networkWarnings({ body: post.body, hasImage: !!post.image_path, targets: post.targets });
  const manual = fromZernio ? [] : post.targets.filter((t) => t !== "web");

  const details: [string, React.ReactNode][] = [
    ["Fecha", post.scheduled_at ? formatMadridDateTime(post.scheduled_at) : "Sin fecha"],
    ["Destinos", post.targets.map((t) => POST_TARGET_LABELS[t]).join(", ")],
    ["Enlace web", `/noticias/${post.slug}`],
    ...(fromZernio
      ? ([["En redes", <PlatformLinks key="links" urls={post.platform_urls} />]] as [string, React.ReactNode][])
      : []),
    ["Evento", post.event_id ? <Link href={`/panel/eventos/${post.event_id}`} className="underline underline-offset-4">{post.event_title}</Link> : "—"],
    ["Creada por", fromZernio ? "Zernio" : post.created_by],
    ["Aprobada por", post.approved_by ?? "—"],
    ["Publicada", post.published_at ? formatMadridDateTime(post.published_at) : "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/panel/publicaciones" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Publicaciones
      </Link>
      <StatusBanner status={estado} messages={MESSAGES} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="flex flex-wrap gap-2">
            <PostStatusBadge status={post.status} />
            {fromZernio && <ZernioBadge />}
          </span>
          <h1 className="text-2xl font-semibold">{post.title}</h1>
        </div>
        {editable && (
          <Link href={`/panel/publicaciones/${post.id}/editar`} className={buttonVariants({ variant: "outline" })}>
            <Pencil />
            Editar
          </Link>
        )}
      </div>

      {fromZernio && (
        <p className="rounded-lg border bg-muted px-4 py-2 text-sm">
          Planificada en Zernio: el contenido y la fecha se gestionan allí y se sincronizan solos.
          {post.status === "published" && Object.keys(post.platform_urls).length === 0 &&
            " Todavía no tenemos el enlace a la publicación en redes."}
        </p>
      )}
      <SiteVisibilityToggle postId={post.id} shown={post.show_on_site} />

      <PostStatusActions
        postId={post.id}
        actions={actions}
        isAuthorInReview={post.status === "review" && post.created_by === member.email}
      />
      {post.status === "approved" && manual.length > 0 && (
        <p className="rounded-lg border bg-muted px-4 py-2 text-sm">
          Mientras no esté conectada la publicación automática, publícala a mano en{" "}
          {manual.map((t) => POST_TARGET_LABELS[t]).join(" y ")} y después pulsa «Marcar como publicada».
        </p>
      )}
      {post.publish_error && (
        <p role="alert" className="rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive">
          Error al publicar: {post.publish_error}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-[var(--aws-orange)]/50 bg-accent px-4 py-2 text-sm text-accent-foreground">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        {details.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-sm font-medium">{label}</dt>
            <dd className="text-sm break-all text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Vista previa</h2>
        <PostPreviews
          post={{ title: post.title, body: post.body, targets: post.targets, imageUrl: post.image_path ? publicMediaUrl(post.image_path) : null }}
        />
      </section>

      {!fromZernio && <DeletePostButton postId={post.id} />}
    </div>
  );
}
