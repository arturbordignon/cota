"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, DownloadSimple, Plus, Printer, Trash } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectItem } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";

const BLOCK_TYPES = [
  { type: "heading", label: "Título" },
  { type: "paragraph", label: "Parágrafo" },
  { type: "image", label: "Imagem" },
  { type: "divider", label: "Divisor" },
  { type: "pricing", label: "Tabela de preços" },
  { type: "button", label: "Botão CTA" },
  { type: "signature", label: "Assinatura" },
] as const;

type BlockType = (typeof BLOCK_TYPES)[number]["type"];

type BuilderBlock = {
  id: string;
  type: BlockType;
  content?: string;
  url?: string;
  items?: Array<{ label: string; value: string }>;
  button?: { label: string; link: string };
};

function createDefaultBlock(type: BlockType): BuilderBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading":
      return { id, type, content: "Título principal" };
    case "paragraph":
      return { id, type, content: "Escreva aqui o parágrafo da proposta." };
    case "image":
      return { id, type, url: "https://placehold.co/900x450?text=Imagem" };
    case "divider":
      return { id, type };
    case "pricing":
      return {
        id,
        type,
        items: [
          { label: "Serviço", value: "R$ 5.000,00" },
          { label: "Deslocamento", value: "R$ 1.000,00" },
        ],
      };
    case "button":
      return { id, type, button: { label: "Assinar proposta", link: "https://" } };
    case "signature":
      return { id, type, content: "Assinado digitalmente por Nome da Empresa" };
    default:
      return { id, type };
  }
}

function renderHtml(blocks: BuilderBlock[]) {
  const blockHtml = blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h2 style=\"font-size:28px;margin:0 0 16px;color:#0f172a;\">${block.content ?? ""}</h2>`;
        case "paragraph":
          return `<p style=\"margin:0 0 16px;color:#334155;line-height:1.6;\">${block.content ?? ""}</p>`;
        case "image":
          return `<img src=\"${block.url ?? ""}\" alt=\"\" style=\"max-width:100%;border-radius:16px;margin:24px 0;\" />`;
        case "divider":
          return `<hr style=\"margin:36px 0;border:none;border-top:1px solid #e2e8f0;\" />`;
        case "pricing":
          return `
            <table style=\"width:100%;margin:24px 0;border-collapse:collapse;font-size:15px;color:#0f172a;\">
              <tbody>
                ${(block.items ?? [])
                  .map(
                    (item) => `
                    <tr>
                      <td style=\"padding:12px 16px;border-bottom:1px solid #e2e8f0;\">${item.label}</td>
                      <td style=\"padding:12px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;\">${item.value}</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>`;
        case "button":
          return `<a href=\"${block.button?.link ?? "#"}\" style=\"display:inline-block;margin:16px 0;padding:14px 28px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;\">${block.button?.label ?? "Saiba mais"}</a>`;
        case "signature":
          return `<div style=\"margin-top:40px;padding:18px;border-radius:16px;background:#f8fafc;border:1px dashed #cbd5f5;text-align:center;font-size:14px;color:#0f172a;\">${
            block.content ?? ""
          }</div>`;
        default:
          return "";
      }
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang=\"pt-BR\">
  <head>
    <meta charset=\"utf-8\" />
    <title>Template visual</title>
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
  const api = useApi();
  const router = useRouter();

  const [blocks, setBlocks] = useState<BuilderBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [locale, setLocale] = useState<"pt-BR" | "en">("pt-BR");
  const [feedback, setFeedback] = useState<string | null>(null);

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const htmlBody = renderHtml(blocks);
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
      setFeedback("Modelo salvo com sucesso!");
      setTimeout(() => {
        router.push("/templates?scope=custom");
      }, 1000);
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        setFeedback(error.message);
      } else {
        setFeedback("Não foi possível salvar o modelo.");
      }
    },
  });

  const selectedBlockData = useMemo(() => blocks.find((block) => block.id === selectedBlock), [blocks, selectedBlock]);

  const addBlock = (type: BlockType) => {
    setBlocks((prev) => [...prev, createDefaultBlock(type)]);
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
    downloadFile(`${name || "modelo"}.html`, renderHtml(blocks));
  };

  const handleExportPdf = () => {
    openPrintPreview(renderHtml(blocks));
  };

  const canSave = name.trim().length > 2 && blocks.length > 0 && !saveTemplate.isLoading;

  return (
    <section className="space-y-8">
      <PageHeader
        title="Editor visual de templates"
        description="Monte layouts para web ou PDF arrastando blocos reutilizáveis."
        action={
          <Button variant="outline" asChild>
            <Link href="/templates">Voltar para templates</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr_320px]">
        <Card className="space-y-4 border border-outline/40 bg-white p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-ink">Blocos</h2>
            <p className="text-xs text-muted">Clique para adicionar um componente ao layout.</p>
          </div>
          <div className="space-y-2">
            {BLOCK_TYPES.map((block) => (
              <Button key={block.type} variant="outline" className="w-full justify-start" onClick={() => addBlock(block.type)}>
                <Plus size={14} className="mr-2" /> {block.label}
              </Button>
            ))}
          </div>
          <div className="space-y-3 border-t border-outline/20 pt-4">
            <h3 className="text-sm font-semibold text-ink">Exportar</h3>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" className="justify-start" disabled={blocks.length === 0} onClick={handleExportHtml}>
                <DownloadSimple size={16} className="mr-2" /> Exportar HTML
              </Button>
              <Button variant="secondary" className="justify-start" disabled={blocks.length === 0} onClick={handleExportPdf}>
                <Printer size={16} className="mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 border border-outline/40 bg-white p-6">
          {blocks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline/40 bg-[var(--color-surface-muted)]/40 p-10 text-center text-sm text-muted">
              <span className="font-medium text-ink">Nenhum conteúdo ainda</span>
              <p>Adicione blocos ao layout para visualizar a prévia.</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                  className={`rounded-2xl border ${selectedBlock === block.id ? "border-primary" : "border-outline/60"} ${
                    isDropTarget ? "border-primary/60 bg-primary-soft/20" : "bg-white/80"
                  } p-4 shadow-sm transition hover:border-primary/60`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge tone="info">#{index + 1}</Badge>
                      <span className="text-sm font-semibold text-ink">{BLOCK_TYPES.find((item) => item.type === block.type)?.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => moveBlock(block.id, -1)} disabled={index === 0}>
                        <ArrowUp size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveBlock(block.id, 1)} disabled={index === blocks.length - 1}>
                        <ArrowDown size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedBlock(block.id)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => removeBlock(block.id)}>
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-outline/20 bg-[var(--color-surface-muted)]/40 p-4 text-sm text-muted">
                    {block.type === "heading" && <h2 className="text-lg font-semibold text-ink">{block.content}</h2>}
                    {block.type === "paragraph" && <p className="text-sm text-ink">{block.content}</p>}
                    {block.type === "image" && <img src={block.url ?? ""} alt="Prévia" className="h-auto w-full max-w-[420px] rounded-xl" />}
                    {block.type === "divider" && <hr className="border-outline/40" />}
                    {block.type === "pricing" && (
                      <ul className="space-y-2 text-ink">
                        {(block.items ?? []).map((item, itemIndex) => (
                          <li key={`${block.id}-${itemIndex}`} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2">
                            <span>{item.label}</span>
                            <span className="font-semibold text-primary">{item.value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {block.type === "button" && (
                      <Button className="mt-2" disabled>
                        {block.button?.label ?? "Chamada"}
                      </Button>
                    )}
                    {block.type === "signature" && (
                      <div className="rounded-lg border border-dashed border-outline/40 bg-white/70 px-4 py-3 text-left text-sm text-ink">
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

        <Card className="space-y-4 border border-outline/40 bg-white p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-ink">Detalhes do modelo</h2>
            <p className="text-xs text-muted">Essas informações serão usadas na listagem de templates.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="template-name">Nome</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Proposta corporativa"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="template-description">Descrição</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Breve resumo do template"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="template-category">Categoria</Label>
              <Input
                id="template-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Ex.: Comercial"
              />
            </div>
            <div className="space-y-1">
              <Label>Idioma</Label>
              <Select value={locale} onValueChange={(value) => setLocale(value as "pt-BR" | "en") }>
                <SelectItem value="pt-BR">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </Select>
            </div>
          </div>

          <div className="space-y-3 border-t border-outline/20 pt-4">
            <h3 className="text-sm font-semibold text-ink">Editar bloco</h3>
            {selectedBlockData ? (
              <div className="space-y-3 text-sm">
                {(selectedBlockData.type === "heading" || selectedBlockData.type === "paragraph" || selectedBlockData.type === "signature") && (
                  <div className="space-y-1">
                    <Label>Conteúdo</Label>
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
                  <div className="space-y-1">
                    <Label>URL da imagem</Label>
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
                    <Label>Itens</Label>
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
                          placeholder="Descrição"
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
                          placeholder="Valor"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateBlock(selectedBlockData.id, (block) => ({
                          ...block,
                          items: [...(block.items ?? []), { label: "Novo item", value: "R$ 0,00" }],
                        }))
                      }
                    >
                      Adicionar item
                    </Button>
                  </div>
                )}
                {selectedBlockData.type === "button" && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label>Texto do botão</Label>
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
                    <div className="space-y-1">
                      <Label>Link</Label>
                      <Input
                        value={selectedBlockData.button?.link ?? ""}
                        onChange={(event) =>
                          updateBlock(selectedBlockData.id, (block) => ({
                            ...block,
                            button: {
                              label: block.button?.label ?? "Saiba mais",
                              link: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedBlock(null)}>
                  Encerrar edição
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted">Selecione um bloco para editar.</p>
            )}
          </div>

          <div className="space-y-2 border-t border-outline/20 pt-4">
            <Button
              className="w-full"
              onClick={() => {
                if (!saveTemplate.isLoading) {
                  void saveTemplate.mutateAsync();
                }
              }}
              disabled={!canSave}
              loading={saveTemplate.isLoading}
              loadingText={tCommon("loading.saving")}
            >
              Salvar modelo
            </Button>
            {feedback ? <p className="text-xs text-muted">{feedback}</p> : null}
          </div>
        </Card>
      </div>
    </section>
  );
}
