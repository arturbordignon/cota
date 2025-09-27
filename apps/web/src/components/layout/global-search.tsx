"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlass, SlidersHorizontal, ClockCounterClockwise } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";

const searchScopes = ["all", "proposals", "clients", "templates", "prospects"] as const;
type SearchScope = (typeof searchScopes)[number];

interface GlobalSearchProps {
  onSearch?: (query: string, scope: SearchScope) => void;
  autoFocus?: boolean;
}

export function GlobalSearch({ onSearch, autoFocus = false }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const tSearch = useTranslations("search");
  const tScopes = useTranslations("search.scopes");
  const tQuick = useTranslations("search.quick");

  const placeholder = useMemo(
    () => tSearch("placeholderPrefix", { scope: tScopes(scope) }),
    [scope, tSearch, tScopes]
  );

  const quickFilters = useMemo(() => searchScopes.filter((item) => item !== "all"), []);

  const recentSearches = useMemo(() => tSearch.raw("recentSamples") as string[], [tSearch]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearch?.(trimmed, scope);
    if (process.env.NODE_ENV !== "production") {
      console.info("Global search", { query: trimmed, scope });
    }
  }

  return (
    <div className="w-full space-y-2 rounded-2xl border border-outline/40 bg-white/95 p-3 shadow-sm">
      <form className="flex flex-wrap items-center gap-3" onSubmit={handleSubmit}>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-[var(--color-surface-muted)]/80 px-3 py-2">
          <MagnifyingGlass size={18} className="text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="h-9 flex-1 border-none bg-transparent px-0 text-sm focus-visible:ring-0"
            autoFocus={autoFocus}
          />
        </div>
        <div className="min-w-[160px] flex-1 md:max-w-[200px]">
          <Select value={scope} onValueChange={(next) => setScope(next as SearchScope)}>
            {searchScopes.map((item) => (
              <SelectItem key={item} value={item}>
                {tScopes(item)}
              </SelectItem>
            ))}
          </Select>
        </div>
        <Button type="submit" className="flex items-center gap-2 whitespace-nowrap">
          <SlidersHorizontal size={16} />
          {tSearch("action")}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setScope(filter)}
              className="rounded-full border border-outline/40 bg-[var(--color-surface-muted)] px-3 py-1 font-medium text-ink transition hover:border-primary hover:text-primary"
            >
              {tQuick(filter)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ClockCounterClockwise size={14} className="text-muted" />
          <div className="flex flex-wrap items-center gap-1">
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  onSearch?.(item, scope);
                }}
                className="rounded-full bg-white/80 px-2 py-1 font-medium text-ink shadow-sm transition hover:text-primary"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
