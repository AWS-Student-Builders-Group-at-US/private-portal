import { Globe, Heart, MessageCircle, Send, ThumbsUp } from "lucide-react";
import { INSTAGRAM_FOLD, LINKEDIN_FOLD, previewText } from "../content";
import { POST_TARGET_LABELS, type PostTarget } from "../schema";

type PreviewPost = {
  title: string;
  body: string;
  imageUrl: string | null;
  targets: PostTarget[];
};

const GROUP_NAME = "AWS Student Builder Group Sevilla";

// Approximate previews of how the post will look on each selected network.
export function PostPreviews({ post }: { post: PreviewPost }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {post.targets.map((target) => (
        <figure key={target} className="flex flex-col gap-2">
          <figcaption className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {POST_TARGET_LABELS[target]}
          </figcaption>
          {target === "web" && <WebPreview post={post} />}
          {target === "linkedin" && <LinkedInPreview post={post} />}
          {target === "instagram" && <InstagramPreview post={post} />}
        </figure>
      ))}
    </div>
  );
}

function PreviewImage({ url, square = false }: { url: string | null; square?: boolean }) {
  if (!url) {
    return (
      <div
        className={`grid place-items-center bg-muted text-xs text-muted-foreground ${square ? "aspect-square" : "aspect-[1.91/1]"}`}
      >
        Sin imagen
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user image from the public bucket
    <img
      src={url}
      alt=""
      className={`w-full object-cover ${square ? "aspect-square" : "aspect-[1.91/1]"}`}
    />
  );
}

function WebPreview({ post }: { post: PreviewPost }) {
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <PreviewImage url={post.imageUrl} />
      <div className="flex flex-col gap-1 p-4">
        <span className="text-xs font-medium text-[var(--aws-orange-strong)]">Noticias</span>
        <h3 className="font-semibold">{post.title}</h3>
        <p className="text-sm text-muted-foreground">{previewText(post.body, 160)}</p>
      </div>
    </article>
  );
}

function Avatar() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--aws-squid)] text-[0.6rem] font-bold text-[var(--aws-orange)]">
      SBG
    </span>
  );
}

function LinkedInPreview({ post }: { post: PreviewPost }) {
  const folded = post.body.length > LINKEDIN_FOLD;
  return (
    <article className="overflow-hidden rounded-xl border bg-card text-sm">
      <header className="flex items-center gap-2 p-3">
        <Avatar />
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">{GROUP_NAME}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Ahora · <Globe className="size-3" aria-hidden />
          </span>
        </span>
      </header>
      <p className="px-3 pb-3 whitespace-pre-line">
        {folded ? previewText(post.body, LINKEDIN_FOLD) : post.body}
        {folded && <span className="text-muted-foreground"> ver más</span>}
      </p>
      {post.imageUrl && <PreviewImage url={post.imageUrl} />}
      <footer className="flex justify-around border-t py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><ThumbsUp className="size-3.5" aria-hidden />Recomendar</span>
        <span className="flex items-center gap-1"><MessageCircle className="size-3.5" aria-hidden />Comentar</span>
        <span className="flex items-center gap-1"><Send className="size-3.5" aria-hidden />Enviar</span>
      </footer>
    </article>
  );
}

function InstagramPreview({ post }: { post: PreviewPost }) {
  const folded = post.body.length > INSTAGRAM_FOLD;
  return (
    <article className="overflow-hidden rounded-xl border bg-card text-sm">
      <header className="flex items-center gap-2 p-2.5">
        <Avatar />
        <span className="font-semibold">aws.sbg.sevilla</span>
      </header>
      <PreviewImage url={post.imageUrl} square />
      <div className="flex gap-3 px-3 pt-2.5">
        <Heart className="size-5" aria-hidden />
        <MessageCircle className="size-5" aria-hidden />
        <Send className="size-5" aria-hidden />
      </div>
      <p className="p-3 whitespace-pre-line">
        <span className="font-semibold">aws.sbg.sevilla </span>
        {folded ? previewText(post.body, INSTAGRAM_FOLD) : post.body}
        {folded && <span className="text-muted-foreground"> más</span>}
      </p>
    </article>
  );
}
