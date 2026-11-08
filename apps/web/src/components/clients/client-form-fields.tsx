"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const clientFormSchema = z.object({
  name: z.string().trim().min(2),
  companyName: z.string().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const emptyClientForm: ClientFormValues = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  notes: "",
};

// Empty optional fields go out as undefined so the API keeps them unset.
export function toClientPayload(values: ClientFormValues) {
  return {
    name: values.name.trim(),
    companyName: values.companyName?.trim() || undefined,
    email: values.email?.trim() || undefined,
    phone: values.phone?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  };
}

export function ClientFormFields({
  form,
  disabled,
  autoFocus,
}: {
  form: UseFormReturn<ClientFormValues>;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const t = useTranslations("clients.dialog");
  const erros = form.formState.errors;

  return (
    <>
      <Field label={t("fields.name")} htmlFor="client-name" error={erros.name ? t("errors.name") : undefined}>
        <Input
          id="client-name"
          {...form.register("name")}
          placeholder={t("placeholders.name")}
          disabled={disabled}
          aria-invalid={Boolean(erros.name)}
          autoFocus={autoFocus}
        />
      </Field>

      <Field label={t("fields.company")} htmlFor="client-company">
        <Input
          id="client-company"
          {...form.register("companyName")}
          placeholder={t("placeholders.company")}
          disabled={disabled}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("fields.email")} htmlFor="client-email" error={erros.email ? t("errors.email") : undefined}>
          <Input
            id="client-email"
            type="email"
            {...form.register("email")}
            placeholder={t("placeholders.email")}
            disabled={disabled}
            aria-invalid={Boolean(erros.email)}
          />
        </Field>
        <Field label={t("fields.phone")} htmlFor="client-phone">
          <Input id="client-phone" {...form.register("phone")} placeholder={t("placeholders.phone")} disabled={disabled} />
        </Field>
      </div>

      <Field label={t("fields.notes")} htmlFor="client-notes">
        <Textarea
          id="client-notes"
          rows={3}
          {...form.register("notes")}
          placeholder={t("placeholders.notes")}
          disabled={disabled}
        />
      </Field>
    </>
  );
}
