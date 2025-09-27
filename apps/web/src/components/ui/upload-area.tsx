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
    <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline bg-[var(--color-surface-muted)]/60 px-6 py-10 text-center text-sm text-muted transition hover:border-primary hover:bg-primary-soft">
      <UploadSimple size={24} className="text-primary" />
      <span>Arraste e solte arquivos ou clique para carregar</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      <input type="file" multiple onChange={handleChange} accept={accept} className="hidden" />
    </label>
  );
}
