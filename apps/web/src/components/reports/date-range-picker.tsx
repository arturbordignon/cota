'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
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

  return (
    <div className={`grid gap-3 ${className ?? ''}`}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-[11px] text-muted">Início</span>
          <Input
            type="date"
            value={toDateInputValue(value?.from)}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-muted">Fim</span>
          <Input
            type="date"
            value={toDateInputValue(value?.to)}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
      </div>

      {withPresets ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.label}
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => onChange(p.get())}
              type="button"
            >
              {p.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-danger"
            onClick={() => onChange(undefined)}
            type="button"
          >
            Limpar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
