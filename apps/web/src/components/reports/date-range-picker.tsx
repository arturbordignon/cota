'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';

type Range = { from?: Date; to?: Date };

type DateRangePickerProps = {
  value?: Range;
  onChange: (next: Range | undefined) => void;
  withPresets?: boolean;
  className?: string;
};

function toDateInputValue(d?: Date) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromDateInputValue(v: string): Date | undefined {
  if (!v) return undefined;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

export function DateRangePicker({
  value,
  onChange,
  withPresets = true,
  className,
}: DateRangePickerProps) {
  const today = React.useMemo(() => new Date(), []);
  const presets = React.useMemo(
    () => [
      {
        label: 'Últimos 7 dias',
        get: () => ({ from: startOfDay(addDays(today, -6)), to: endOfDay(today) }),
      },
      {
        label: 'Últimos 30 dias',
        get: () => ({ from: startOfDay(addDays(today, -29)), to: endOfDay(today) }),
      },
      {
        label: 'Este mês',
        get: () => ({
          from: startOfDay(startOfMonth(today)),
          to: endOfDay(endOfMonth(today)),
        }),
      },
      {
        label: 'Mês passado',
        get: () => {
          const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          return { from: startOfDay(startOfMonth(prev)), to: endOfDay(endOfMonth(prev)) };
        },
      },
      {
        label: 'Ano até hoje (YTD)',
        get: () => ({ from: startOfDay(startOfYear(today)), to: endOfDay(today) }),
      },
    ],
    [today],
  );

  const onFromChange = (v: string) => {
    const from = fromDateInputValue(v);
    onChange({ from: from ?? undefined, to: value?.to });
  };
  const onToChange = (v: string) => {
    const to = fromDateInputValue(v);
    onChange({ from: value?.from, to: to ?? undefined });
  };

  const presetClass =
    'h-7 rounded-md border border-border bg-white px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:border-outline hover:text-ink';

  return (
    <div className={`grid gap-3 ${className ?? ''}`}>
      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted">Início</span>
          <Input
            type="date"
            value={toDateInputValue(value?.from)}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted">Fim</span>
          <Input
            type="date"
            value={toDateInputValue(value?.to)}
            onChange={(e) => onToChange(e.target.value)}
          />
        </label>
      </div>

      {withPresets ? (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button key={p.label} type="button" className={presetClass} onClick={() => onChange(p.get())}>
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className="h-7 rounded-md px-2 text-xs font-semibold text-muted transition-colors hover:text-danger"
            onClick={() => onChange(undefined)}
          >
            Limpar
          </button>
        </div>
      ) : null}
    </div>
  );
}
