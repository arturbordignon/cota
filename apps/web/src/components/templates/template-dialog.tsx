"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  category?: string;
  locale: "pt-BR" | "en";
  htmlBody: string;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  errorMessage,
  importado,
  editando,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateTemplatePayload) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
  importado?: { name: string; htmlBody: string } | null;
  /** An existing template: the form starts with its values and saves changes. */
  editando?: CreateTemplatePayload | null;
}) {
  const t = useTranslations("templates.dialog");
  const currentLocale = useLocale();
  // Raw: the starter template is HTML, which next-intl would parse as rich-text tags.
  const defaultHtml = t.raw("defaultHtml") as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [locale, setLocale] = useState<"pt-BR" | "en">(currentLocale === "pt-BR" ? "pt-BR" : "en");
  const [htmlBody, setHtmlBody] = useState(defaultHtml);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setLocale(currentLocale === "pt-BR" ? "pt-BR" : "en");
    setHtmlBody(defaultHtml);
  };

  // A file chosen on the "Upload template" tab fills the form.
  useEffect(() => {
    if (!importado) return;
    setName(importado.name);
    setHtmlBody(importado.htmlBody);
  }, [importado]);

  useEffect(() => {
    if (!editando || !open) return;
    setName(editando.name);
    setDescription(editando.description ?? "");
    setCategory(editando.category ?? "");
    setLocale(editando.locale);
    setHtmlBody(editando.htmlBody);
  }, [editando, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || htmlBody.trim().length < 10) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      locale,
      htmlBody: htmlBody.trim(),
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={editando ? t("editTitle") : t("title")}
      description={editando ? t("editDescription") : t("description")}
      closeLabel={t("close")}
      size="lg"
      onSubmit={handleSubmit}
    >
      <ModalBody>
        <Field label={t("fields.name")} htmlFor="template-name">
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("placeholders.name")}
            required
            disabled={isSubmitting}
            autoFocus
          />
        </Field>
        <Field label={t("fields.description")} htmlFor="template-description">
          <Input
            id="template-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("placeholders.description")}
            disabled={isSubmitting}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("fields.category")} htmlFor="template-category">
            <Input
              id="template-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder={t("placeholders.category")}
              disabled={isSubmitting}
            />
          </Field>
          <Field label={t("fields.locale")} htmlFor="template-locale">
            <Select
              id="template-locale"
              value={locale}
              onValueChange={(value) => setLocale(value as "pt-BR" | "en")}
            >
              <SelectItem value="pt-BR">{t("localeLabels.ptBR")}</SelectItem>
              <SelectItem value="en">{t("localeLabels.en")}</SelectItem>
            </Select>
          </Field>
        </div>
        <Field label={t("fields.html")} htmlFor="template-html" hint={t("fields.htmlHint")}>
          <Textarea
            id="template-html"
            value={htmlBody}
            onChange={(event) => setHtmlBody(event.target.value)}
            rows={8}
            className="font-mono text-[13px]"
            disabled={isSubmitting}
          />
        </Field>
        {errorMessage ? <Notice tone="danger">{errorMessage}</Notice> : null}
      </ModalBody>
      <ModalFooter>
        <ModalClose asChild>
          <Button type="button" variant="ghost" disabled={isSubmitting}>
            {t("actions.cancel")}
          </Button>
        </ModalClose>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || htmlBody.trim().length < 10}
          loading={isSubmitting}
          loadingText={t("actions.saving")}
        >
          {editando ? t("actions.save") : t("actions.submit")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
