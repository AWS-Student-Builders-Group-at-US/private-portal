import { BUILD_INFO } from "@/lib/build-info";
import { cn } from "@/lib/utils";

// Small "v0.2.0 · a56505d · Preview (branch)" line linking to the commit.
export function BuildBadge({ className }: { className?: string }) {
  const { version, commit, commitUrl, environment, ref } = BUILD_INFO;
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {version && <span>{version} · </span>}
      {commit && commitUrl ? (
        <a
          href={commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono underline-offset-4 hover:underline"
          title="Ver el commit en GitHub"
        >
          {commit}
        </a>
      ) : (
        <span>sin commit</span>
      )}
      <span>
        {" "}
        · {environment}
        {ref && environment !== "Producción" ? ` (${ref})` : ""}
      </span>
    </p>
  );
}
