"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMadridDateTimeShort } from "@/features/events/time";
import { deleteSuggestion, setSuggestionStatus, toggleVote } from "../actions";
import { SUGGESTION_STATUSES, SUGGESTION_STATUS_LABELS } from "../schema";
import type { Suggestion } from "../types";

export function SuggestionItem({ suggestion }: { suggestion: Suggestion }) {
  const [optimistic, setOptimistic] = useOptimistic(
    suggestion,
    (current, patch: Partial<Suggestion>) => ({ ...current, ...patch }),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(patch: Partial<Suggestion>, action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      setOptimistic(patch);
      const result = await action();
      if (!result.ok) setError(result.message ?? "Algo ha fallado.");
    });
  }

  const vote = () =>
    run(
      {
        voted_by_me: !optimistic.voted_by_me,
        votes: optimistic.votes + (optimistic.voted_by_me ? -1 : 1),
      },
      () => toggleVote(suggestion.id, !optimistic.voted_by_me),
    );

  return (
    <li className="flex gap-3 px-4 py-3">
      <Button
        variant={optimistic.voted_by_me ? "default" : "outline"}
        size="sm"
        aria-pressed={optimistic.voted_by_me}
        aria-label={optimistic.voted_by_me ? "Quitar mi voto" : "Votar"}
        onClick={vote}
        className="h-auto shrink-0 flex-col gap-0.5 py-1.5"
      >
        <ThumbsUp />
        <span className="tabular-nums">{optimistic.votes}</span>
      </Button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm whitespace-pre-line break-words">{suggestion.body}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{suggestion.author_name ?? "Anónima"}</span>
          <span>{formatMadridDateTimeShort(suggestion.created_at)}</span>
          <label className="flex items-center gap-1">
            <span className="sr-only">Estado</span>
            <select
              value={optimistic.status}
              onChange={(e) => {
                const status = e.target.value as Suggestion["status"];
                run({ status }, () => setSuggestionStatus(suggestion.id, status));
              }}
              className={cn(
                "rounded-md border border-input bg-background px-1.5 py-0.5 text-xs",
                optimistic.status === "aceptada" && "border-foreground font-medium text-foreground",
              )}
            >
              {SUGGESTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SUGGESTION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          {confirming ? (
            <span className="flex items-center gap-2">
              ¿Eliminar?
              <Button
                variant="destructive"
                size="xs"
                disabled={pending}
                onClick={() => run({}, () => deleteSuggestion(suggestion.id))}
              >
                Sí
              </Button>
              <Button variant="outline" size="xs" onClick={() => setConfirming(false)}>
                No
              </Button>
            </span>
          ) : (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Eliminar sugerencia"
              onClick={() => setConfirming(true)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
