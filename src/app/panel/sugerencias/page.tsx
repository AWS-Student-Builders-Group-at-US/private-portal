import Link from "next/link";
import { cn } from "@/lib/utils";
import { SuggestionForm } from "@/features/suggestions/components/suggestion-form";
import { SuggestionItem } from "@/features/suggestions/components/suggestion-item";
import { parseStatusFilter, sortSuggestions, type StatusFilter } from "@/features/suggestions/logic";
import { listSuggestions } from "@/features/suggestions/queries";
import { getCurrentMember } from "@/lib/auth/member";

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "nueva", label: "Nuevas" },
  { value: "aceptada", label: "Aceptadas" },
  { value: "descartada", label: "Descartadas" },
  { value: "todas", label: "Todas" },
];

export default async function SuggestionsPage({ searchParams }: PageProps<"/panel/sugerencias">) {
  const [{ ver }, member] = await Promise.all([searchParams, getCurrentMember()]);
  const filter = parseStatusFilter(ver);
  const all = await listSuggestions(member.email);
  const visible = sortSuggestions(
    filter === "todas" ? all : all.filter((s) => s.status === filter),
  );
  const count = (value: StatusFilter) =>
    value === "todas" ? all.length : all.filter((s) => s.status === value).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Sugerencias</h1>
      <SuggestionForm />
      <nav className="flex flex-wrap gap-1 border-b" aria-label="Filtrar por estado">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "nueva" ? "/panel/sugerencias" : `/panel/sugerencias?ver=${tab.value}`}
            aria-current={filter === tab.value ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              filter === tab.value
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label} <span className="text-xs text-muted-foreground">{count(tab.value)}</span>
          </Link>
        ))}
      </nav>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay sugerencias aquí.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((suggestion) => (
            <SuggestionItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </ul>
      )}
    </div>
  );
}
