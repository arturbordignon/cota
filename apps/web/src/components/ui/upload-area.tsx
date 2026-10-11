"use client";

import { ChangeEvent } from "react";
import { UploadSimple } from "@phosphor-icons/react";

export interface UploadAreaProps {
  hint?: string;
  onFilesSelected?: (files: FileList) => void;
  accept?: string;
}

export function UploadArea({ hint, accept, onFilesSelected }: UploadAreaProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && onFilesSelected) {
      onFilesSelected(files);
    }
  };

  return (
    <label className="group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline bg-surface-muted/60 px-6 py-9 text-center text-sm text-muted transition-colors hover:border-primary hover:bg-primary-tint focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/25">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary-strong shadow-card transition-colors group-hover:border-primary/40">
        <UploadSimple size={20} weight="bold" />
      </span>
      <span className="font-semibold text-ink">Arraste e solte arquivos ou clique para carregar</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      <input type="file" multiple onChange={handleChange} accept={accept} className="sr-only" />
    </label>
  );
}
