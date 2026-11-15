import Link from "next/link";
import { notFound } from "next/navigation";
import { utcIsoToMadridLocal } from "@/features/events/time";
import { updatePost } from "@/features/posts/actions";
import { PostForm } from "@/features/posts/components/post-form";
import { getPost } from "@/features/posts/queries";
import { listEventOptions } from "@/features/tasks/queries";

export default async function EditPostPage({ params }: PageProps<"/panel/publicaciones/[id]/editar">) {
  const { id } = await params;
  const [post, events] = await Promise.all([getPost(id), listEventOptions()]);
  if (!post) notFound();
  const back = `/panel/publicaciones/${post.id}`;

  if (post.status === "approved" || post.status === "published") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Editar publicación</h1>
        <p className="text-sm text-muted-foreground">
          Una publicación aprobada o publicada no se puede editar. Retira la aprobación desde{" "}
          <Link href={back} className="underline underline-offset-4">su ficha</Link> para volver a borrador.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar publicación</h1>
      <PostForm
        action={updatePost.bind(null, post.id)}
        initialValues={{
          title: post.title,
          slug: post.slug,
          body: post.body,
          targets: post.targets,
          scheduled_at: post.scheduled_at ? utcIsoToMadridLocal(post.scheduled_at) : "",
          event_id: post.event_id ?? "",
          image_path: post.image_path ?? "",
        }}
        events={events}
        submitLabel="Guardar cambios"
        cancelHref={back}
      />
    </div>
  );
}
