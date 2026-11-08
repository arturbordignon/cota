"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CaretLeft, DotsSixVertical, DownloadSimple, PencilSimple, Plus, Printer, SquaresFour, Trash } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useCurrentUser } from "@/components/providers/user-provider";
import { cn } from "@/lib/utils";

const BLOCK_TYPES = [
  { type: "heading" },
  { type: "paragraph" },
  { type: "image" },
  { type: "divider" },
  { type: "pricing" },
  { type: "button" },
  { type: "signature" },
] as const;

type BlockType = (typeof BLOCK_TYPES)[number]["type"];

type IdiomaDocumento = "pt-BR" | "en";

// Starting text of new blocks goes into the document, so it follows the
// template's language chosen in the builder.
const TEXTO_INICIAL: Record<
  IdiomaDocumento,
  {
    heading: string;
    paragraph: string;
    image: string;
    items: Array<{ label: string; value: string }>;
    button: string;
    signature: string;
    newItem: string;
    newItemValue: string;
  }
> = {
  "pt-BR": {
    heading: "Título principal",
    paragraph: "Escreva aqui o parágrafo da proposta.",
    image: "https://placehold.co/900x450?text=Imagem",
    items: [
      { label: "Serviço", value: "R$ 5.000,00" },
      { label: "Deslocamento", value: "R$ 1.000,00" },
    ],
    button: "Assinar proposta",
    signature: "Assinado digitalmente por Nome da Empresa",
    newItem: "Novo item",
    newItemValue: "R$ 0,00",
  },
  en: {
    heading: "Main heading",
    paragraph: "Write the proposal paragraph here.",
    image: "https://placehold.co/900x450?text=Image",
    items: [
      { label: "Service", value: "$5,000.00" },
      { label: "Travel", value: "$1,000.00" },
    ],
    button: "Sign proposal",
    signature: "Digitally signed by Company Name",
    newItem: "New item",
    newItemValue: "$0.00",
  },
};

type BuilderBlock = {
  id: string;
  type: BlockType;
  content?: string;
  url?: string;
  items?: Array<{ label: string; value: string }>;
  button?: { label: string; link: string };
};

function createDefaultBlock(type: BlockType, idioma: IdiomaDocumento): BuilderBlock {
  const id = crypto.randomUUID();
  const texto = TEXTO_INICIAL[idioma];
  switch (type) {
    case "heading":
      return { id, type, content: texto.heading };
    case "paragraph":
      return { id, type, content: texto.paragraph };
    case "image":
      return { id, type, url: texto.image };
    case "divider":
      return { id, type };
    case "pricing":
      return { id, type, items: texto.items.map((item) => ({ ...item })) };
    case "button":
      return { id, type, button: { label: texto.button, link: "https://" } };
    case "signature":
      return { id, type, content: texto.signature };
    default:
      return { id, type };
  }
}

// Text typed in a block is shown as text: "<" or "&" must not turn into markup.
function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(blocks: BuilderBlock[], idioma: IdiomaDocumento) {
  const blockHtml = blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h2 style="font-size:28px;margin:0 0 16px;color:#0f172a;">${escaparHtml(block.content ?? "")}</h2>`;
        case "paragraph":
          return `<p style="margin:0 0 16px;color:#334155;line-height:1.6;">${escaparHtml(block.content ?? "")}</p>`;
        case "image":
          return `<img src="${escaparHtml(block.url ?? "")}" alt="" style="max-width:100%;border-radius:16px;margin:24px 0;" />`;
        case "divider":
          return `<hr style="margin:36px 0;border:none;border-top:1px solid #e2e8f0;" />`;
        case "pricing":
          return `
            <table style="width:100%;margin:24px 0;border-collapse:collapse;font-size:15px;color:#0f172a;">
              <tbody>
                ${(block.items ?? [])
                  .map(
                    (item) => `
                    <tr>
                      <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">${escaparHtml(item.label)}</td>
                      <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${escaparHtml(item.value)}</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>`;
        case "button":
          return `<a href="${escaparHtml(block.button?.link ?? "#")}" style="display:inline-block;margin:16px 0;padding:14px 28px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;">${escaparHtml(block.button?.label ?? "")}</a>`;
        case "signature":
          return `<div style="margin-top:40px;padding:18px;border-radius:16px;background:#f8fafc;border:1px dashed #cbd5f5;text-align:center;font-size:14px;color:#0f172a;">${escaparHtml(block.content ?? "")}</div>`;
        default:
          return "";
      }
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${idioma}">
  <head>
    <meta charset="utf-8" />
    <title>Template</title>
    <style>
      body { font-family: 'Inter', Arial, sans-serif; background: #f1f5f9; padding: 40px; }
      main { max-width: 1024px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 56px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08); }
    </style>
  </head>
  <body>
    <main>
      ${blockHtml}
    </main>
  </body>
</html>`;
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openPrintPreview(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export default function TemplateBuilderPage() {
  const tCommon = useTranslations("common");
  const t = useTranslations("templates.builder");
  const api = useApi();
  const router = useRouter();

  const [blocks, setBlocks] = useState<BuilderBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const { user } = useCurrentUser();
  // New templates are written in the account's language unless chosen otherwise.
  const [locale, setLocale] = useState<"pt-BR" | "en">(user?.account.locale === "en" ? "en" : "pt-BR");
  const [feedback, setFeedback] = useState<string | null>(null);

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const htmlBody = renderHtml(blocks, locale);
      return api.post("/templates", {
        name: name.trim(),
        description: description.trim() || undefined,
        locale,
        category: category.trim() || undefined,
        htmlBody,
        inputSchemaJson: { builderVersion: 1 },
        defaultDataJson: { builderBlocks: blocks },
        pdfLayoutOptionsJson: {},
        isActive: true,
      });
    },
    onSuccess: () => {
      setFeedback(t("saved"));
      setTimeout(() => {
        router.push("/templates?scope=custom");
      }, 1000);
    },
    onError: () => setFeedback(t("saveError")),
  });

  const selectedBlockData = useMemo(() => blocks.find((block) => block.id === selectedBlock), [blocks, selectedBlock]);

  const addBlock = (type: BlockType) => {
    setBlocks((prev) => [...prev, createDefaultBlock(type, locale)]);
    setSelectedBlock(null);
  };

  const updateBlock = useCallback(
    (id: string, updater: (block: BuilderBlock) => BuilderBlock) => {
      setBlocks((prev) => prev.map((block) => (block.id === id ? updater(block) : block)));
    },
    []
  );

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    if (selectedBlock === id) {
      setSelectedBlock(null);
    }
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleBlockDragStart = (id: string) => {
    setDraggingBlock(id);
  };

  const handleBlockDragEnd = () => {
    setDraggingBlock(null);
  };

  const handleBlockDrop = (targetId: string) => {
    if (!draggingBlock || draggingBlock === targetId) return;
    setBlocks((prev) => {
      const sourceIndex = prev.findIndex((block) => block.id === draggingBlock);
      const targetIndex = prev.findIndex((block) => block.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
    setDraggingBlock(null);
  };

  const handleExportHtml = () => {
    downloadFile(`${name || "template"}.html`, renderHtml(blocks, locale));
  };

  const handleExportPdf = () => {
    openPrintPreview(renderHtml(blocks, locale));
  };

  const canSave = name.trim().length > 2 && blocks.length > 0 && !saveTemplate.isPending;

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button variant="ghost" asChild>
            <Link href="/templates">
              <CaretLeft size={14} weight="bold" />
              {t("back")}
            </Link>
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <Card className="space-y-4 p-4 lg:sticky lg:top-24">
          <div className="space-y-1">
            <CardTitle>{t("blocksTitle")}</CardTitle>
            <p className="text-xs text-muted">{t("blocksHint")}</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {BLOCK_TYPES.map((block) => (
              <button
                key={block.type}
                type="button"
                onClick={() => addBlock(block.type)}
                className="flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-left text-[13px] font-semibold text-ink-muted transition-colors hover:border-primary/60 hover:bg-primary-tint hover:text-ink"
              >
                <Plus size={12} weight="bold" className="shrink-0 text-primary-strong" />
                {t(`blocks.${block.type}`)}
              </button>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <p className="meta-label">{t("export.title")}</p>
            <div className="flex flex-col gap-1.5">
              <Button variant="secondary" size="sm" className="justify-start" disabled={blocks.length === 0} onClick={handleExportHtml}>
                <DownloadSimple size={14} /> {t("export.html")}
              </Button>
              <Button variant="secondary" size="sm" className="justify-start" disabled={blocks.length === 0} onClick={handleExportPdf}>
                <Printer size={14} /> {t("export.pdf")}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="min-h-[420px] bg-surface-muted/60 p-4 sm:p-6">
          {blocks.length === 0 ? (
            <EmptyState
              className="h-full min-h-[372px]"
              icon={<SquaresFour size={24} weight="bold" />}
              title={t("empty.title")}
              description={t("empty.description")}
            />
          ) : (
            <div className="space-y-3">
              {blocks.map((block, index) => {
                const isDropTarget = Boolean(draggingBlock && draggingBlock !== block.id);
                return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => handleBlockDragStart(block.id)}
                  onDragEnd={handleBlockDragEnd}
                  onDragOver={(event) => {
                    if (draggingBlock && draggingBlock !== block.id) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={() => handleBlockDrop(block.id)}
                  className={cn(
                    "group rounded-xl border bg-white p-3 shadow-card transition-colors",
                    selectedBlock === block.id ? "border-primary ring-[3px] ring-primary/20" : "border-border hover:border-outline",
                    isDropTarget && "border-dashed border-primary bg-primary-tint",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 pl-1">
                      <DotsSixVertical size={16} className="shrink-0 cursor-grab text-muted" />
                      <span className="tabular text-xs font-semibold text-muted">{index + 1}</span>
                      <span className="truncate text-sm font-semibold text-ink">{t(`blocks.${block.type}`)}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => moveBlock(block.id, -1)} disabled={index === 0} aria-label={t("blockActions.moveUp")}>
                        <ArrowUp size={14} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => moveBlock(block.id, 1)} disabled={index === blocks.length - 1} aria-label={t("blockActions.moveDown")}>
                        <ArrowDown size={14} />
                      </Button>
                      <Button variant={selectedBlock === block.id ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedBlock(block.id)}>
                        <PencilSimple size={14} />
                        {t("blockActions.edit")}
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => removeBlock(block.id)} aria-label={t("blockActions.remove")} className="hover:bg-danger-soft hover:text-danger">
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-surface-muted/70 p-4 text-sm text-muted">
                    {block.type === "heading" && <h2 className="text-lg font-semibold text-ink">{block.content}</h2>}
                    {block.type === "paragraph" && <p className="text-sm text-ink">{block.content}</p>}
                    {block.type === "image" && <img src={block.url ?? ""} alt={t("previewAlt")} className="h-auto w-full max-w-[420px] rounded-xl" />}
                    {block.type === "divider" && <hr className="border-outline" />}
                    {block.type === "pricing" && (
                      <ul className="space-y-2 text-ink">
                        {(block.items ?? []).map((item, itemIndex) => (
                          <li key={`${block.id}-${itemIndex}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                            <span>{item.label}</span>
                            <span className="tabular font-semibold text-ink">{item.value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {block.type === "button" && (
                      <Button className="mt-2" disabled>
                        {block.button?.label}
                      </Button>
                    )}
                    {block.type === "signature" && (
                      <div className="rounded-lg border border-dashed border-outline bg-white px-4 py-3 text-left text-sm text-ink">
                        {block.content}
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-4 lg:col-span-2 xl:sticky xl:top-24 xl:col-span-1">
          <div className="space-y-1">
            <CardTitle>{t("details.title")}</CardTitle>
            <p className="text-xs text-muted">{t("details.hint")}</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="template-name">{t("details.name")}</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("details.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">{t("details.description")}</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("details.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-category">{t("details.category")}</Label>
              <Input
                id="template-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder={t("details.categoryPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("details.language")}</Label>
              <Select value={locale} onValueChange={(value) => setLocale(value as "pt-BR" | "en") }>
                <SelectItem value="pt-BR">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </Select>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <CardTitle>{t("editor.title")}</CardTitle>
            {selectedBlockData ? (
              <div className="space-y-3 text-sm">
                {(selectedBlockData.type === "heading" || selectedBlockData.type === "paragraph" || selectedBlockData.type === "signature") && (
                  <div className="space-y-2">
                    <Label>{t("editor.content")}</Label>
                    <Textarea
                      value={selectedBlockData.content ?? ""}
                      onChange={(event) =>
                        updateBlock(selectedBlockData.id, (block) => ({ ...block, content: event.target.value }))
                      }
                      rows={selectedBlockData.type === "paragraph" ? 4 : 2}
                    />
                  </div>
                )}
                {selectedBlockData.type === "image" && (
                  <div className="space-y-2">
                    <Label>{t("editor.imageUrl")}</Label>
                    <Input
                      value={selectedBlockData.url ?? ""}
                      onChange={(event) =>
                        updateBlock(selectedBlockData.id, (block) => ({ ...block, url: event.target.value }))
                      }
                    />
                  </div>
                )}
                {selectedBlockData.type === "pricing" && (
                  <div className="space-y-2">
                    <Label>{t("editor.items")}</Label>
                    {(selectedBlockData.items ?? []).map((item, itemIndex) => (
                      <div key={`${selectedBlockData.id}-${itemIndex}`} className="grid grid-cols-2 gap-2">
                        <Input
                          value={item.label}
                          onChange={(event) =>
                            updateBlock(selectedBlockData.id, (block) => {
                              const items = [...(block.items ?? [])];
                              items[itemIndex] = { ...items[itemIndex], label: event.target.value };
                              return { ...block, items };
                            })
                          }
                          placeholder={t("editor.itemLabel")}
                        />
                        <Input
                          value={item.value}
                          onChange={(event) =>
                            updateBlock(selectedBlockData.id, (block) => {
                              const items = [...(block.items ?? [])];
                              items[itemIndex] = { ...items[itemIndex], value: event.target.value };
                              return { ...block, items };
                            })
                          }
                          placeholder={t("editor.itemValue")}
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateBlock(selectedBlockData.id, (block) => ({
                          ...block,
                          items: [...(block.items ?? []), { label: TEXTO_INICIAL[locale].newItem, value: TEXTO_INICIAL[locale].newItemValue }],
                        }))
                      }
                    >
                      {t("editor.addItem")}
                    </Button>
                  </div>
                )}
                {selectedBlockData.type === "button" && (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label>{t("editor.buttonText")}</Label>
                      <Input
                        value={selectedBlockData.button?.label ?? ""}
                        onChange={(event) =>
                          updateBlock(selectedBlockData.id, (block) => ({
                            ...block,
                            button: {
                              label: event.target.value,
                              link: block.button?.link ?? "https://",
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("editor.buttonLink")}</Label>
                      <Input
                        value={selectedBlockData.button?.link ?? ""}
                        onChange={(event) =>
                          updateBlock(selectedBlockData.id, (block) => ({
                            ...block,
                            button: {
                              label: block.button?.label ?? TEXTO_INICIAL[locale].button,
                              link: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedBlock(null)}>
                  {t("editor.done")}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted">{t("editor.noSelection")}</p>
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Button
              className="w-full"
              onClick={() => {
                if (!saveTemplate.isPending) {
                  void saveTemplate.mutateAsync();
                }
              }}
              disabled={!canSave}
              loading={saveTemplate.isPending}
              loadingText={tCommon("loading.saving")}
            >
              {t("save")}
            </Button>
            {feedback ? <p className="text-xs text-muted">{feedback}</p> : null}
          </div>
        </Card>
      </div>
    </section>
  );
}
