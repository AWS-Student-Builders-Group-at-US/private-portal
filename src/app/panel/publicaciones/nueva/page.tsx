import { createPost } from "@/features/posts/actions";
import { PostForm } from "@/features/posts/components/post-form";
import { listEventOptions } from "@/features/tasks/queries";

export default async function NewPostPage() {
  const events = await listEventOptions();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nueva publicación</h1>
      <PostForm action={createPost} events={events} submitLabel="Guardar borrador" cancelHref="/panel/publicaciones" />
    </div>
  );
}
