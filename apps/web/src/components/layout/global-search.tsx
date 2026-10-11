"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlass, ClockCounterClockwise } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";

export const searchScopes = ["all", "proposals", "clients", "templates"] as const;
export type SearchScope = (typeof searchScopes)[number];

interface GlobalSearchProps {
  onSearch?: (query: string, scope: SearchScope) => void;
  autoFocus?: boolean;
}

export function GlobalSearch({ onSearch, autoFocus = false }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const tSearch = useTranslations("common.search");
  const tScopes = useTranslations("common.search.scopes");

  const placeholder = useMemo(
    () => tSearch("placeholderPrefix", { scope: tScopes(scope).toLowerCase() }),
    [scope, tSearch, tScopes]
  );

  const recentSearches = useMemo(() => {
    const amostras = tSearch.raw("recentSamples");
    if (!Array.isArray(amostras)) {
      return [] as string[];
    }
    return amostras.filter((item) => typeof item === "string");
  }, [tSearch]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearch?.(trimmed, scope);
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-raised">
      <form className="flex items-center gap-3 border-b border-border pl-4 pr-3" onSubmit={handleSubmit}>
        <MagnifyingGlass size={20} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
          autoFocus={autoFocus}
        />
        <Button type="submit" size="sm" disabled={!query.trim()}>
          {tSearch("action")}
        </Button>
      </form>

      <div className="space-y-4 px-4 py-4">
        <Segmented
          options={searchScopes.map((item) => ({ value: item, label: tScopes(item) }))}
          value={scope}
          onChange={setScope}
          ariaLabel={tSearch("action")}
          size="sm"
        />

        {recentSearches.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <ClockCounterClockwise size={14} />
              {tSearch("recentLabel")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="rounded-lg border border-border bg-surface-muted/70 px-2.5 py-1 text-[13px] font-medium text-ink-muted transition-colors hover:border-outline hover:text-ink"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
