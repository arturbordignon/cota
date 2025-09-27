"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { UploadArea } from "@/components/ui/upload-area";

const templateCatalog = [
  {
    id: "crane",
    name: "Locação de Guindaste",
    category: "Içamento",
    summary: "Inclui mobilização, operador e checklist de segurança.",
    metrics: "26 utilizações",
  },
  {
    id: "earthworks",
    name: "Terraplanagem Pesada",
    category: "Infraestrutura",
    summary: "Pacote de horas máquina com adicional por combustível.",
    metrics: "Favorito da equipe",
  },
  {
    id: "heavy-cargo",
    name: "Transporte de Cargas Especiais",
    category: "Logística",
    summary: "Cobertura de rota, escolta e seguro integrado.",
    metrics: "Taxa de aceitação 92%",
  },
];

const clients = [
  { id: "1", name: "Construtora Horizonte" },
  { id: "2", name: "Indústria Metal Forte" },
  { id: "3", name: "Logística Integrada" },
];

const steps = [
  { id: 1, title: "Escolher modelo", description: "Inicie com um template ou proposta em branco." },
  { id: 2, title: "Detalhar proposta", description: "Dados do cliente, escopo e condições comerciais." },
  { id: 3, title: "Revisar & anexar", description: "Revisão final, anexos e preparação para envio." },
];

export default function NewProposalPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateCatalog[0]?.id ?? null);
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    scope: "",
    notes: "",
  });

  const activeTemplate = useMemo(
    () => templateCatalog.find((template) => template.id === selectedTemplate) ?? null,
    [selectedTemplate]
  );

  const handleNext = () => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  const handlePrevious = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  return (
    <section className="space-y-8">
      <PageHeader
        title="Nova Proposta"
        description="Personalize a proposta escolhendo um modelo existente ou começando do zero. Você pode salvar rascunhos e continuar depois."
      />

      <Card className="space-y-6 p-6">
        <Stepper steps={steps} activeStep={stepIndex} />

        {stepIndex === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="flex flex-col justify-between gap-3 border border-outline/60 bg-[var(--color-surface-muted)] p-5 shadow-none">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-ink">Começar do zero</h3>
                <p className="text-sm text-muted">Crie uma proposta totalmente personalizada. Ideal para serviços únicos ou contratos complexos.</p>
              </div>
              <Button
                variant={selectedTemplate === null ? "primary" : "secondary"}
                onClick={() => setSelectedTemplate(null)}
              >
                Usar proposta em branco
              </Button>
            </Card>

            {templateCatalog.map((template) => (
              <Card
                key={template.id}
                className="flex flex-col gap-3 border border-outline/60 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Badge tone="info">{template.category}</Badge>
                  <span>{template.metrics}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-ink">{template.name}</h3>
                  <p className="text-sm text-muted">{template.summary}</p>
                </div>
                <Button
                  variant={selectedTemplate === template.id ? "primary" : "secondary"}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  {selectedTemplate === template.id ? "Selecionado" : "Selecionar modelo"}
                </Button>
              </Card>
            ))}
          </div>
        )}

        {stepIndex === 1 && (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.clientId} onValueChange={(value) => setForm((prev) => ({ ...prev, clientId: value }))}>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Título da proposta</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Locação de guindaste telescópico - obra X"
                    value={form.jobTitle}
                    onChange={(event) => setForm((prev) => ({ ...prev, jobTitle: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo selecionado</Label>
                  <div className="rounded-lg border border-outline bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-muted">
                    {activeTemplate ? activeTemplate.name : "Proposta em branco"}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope">Escopo do serviço</Label>
                <Textarea
                  id="scope"
                  placeholder="Descreva o escopo principal, equipamentos incluídos, equipe e requisitos do cliente."
                  value={form.scope}
                  onChange={(event) => setForm((prev) => ({ ...prev, scope: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Condições comerciais, cláusulas especiais ou SLA."
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
            </div>

            <Card className="space-y-4 border border-outline/50 bg-[var(--color-surface-muted)]/70 p-5 shadow-none">
              <h3 className="text-sm font-semibold text-ink">Resumo rápido</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted">Cliente:</span> {clients.find((client) => client.id === form.clientId)?.name}
                </p>
                <p>
                  <span className="text-muted">Modelo:</span> {activeTemplate ? activeTemplate.name : "Proposta em branco"}
                </p>
                <p>
                  <span className="text-muted">Período:</span> {form.startDate || "–"} até {form.endDate || "–"}
                </p>
              </div>
              <Link href="/clients/new" className="text-xs font-semibold text-primary hover:underline">
                Adicionar novo cliente
              </Link>
            </Card>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Anexos visuais (máx. 5 fotos)</Label>
                <UploadArea hint="Formatos aceitos: JPG, PNG – tamanho máximo 5MB" />
              </div>
              <div className="space-y-3 rounded-xl border border-outline bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">Checklist antes de gerar</h3>
                <ul className="space-y-2 text-sm text-muted">
                  <li>• Revisar escopo e valores totais</li>
                  <li>• Confirmar equipamentos alocados e datas</li>
                  <li>• Adicionar termos padrão (ex: SLA, multas, seguros)</li>
                </ul>
              </div>
            </div>
            <Card className="space-y-4 border border-outline/50 bg-white p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-ink">Resumo</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted">Cliente</p>
                  <p className="font-medium text-ink">{clients.find((client) => client.id === form.clientId)?.name}</p>
                </div>
                <div>
                  <p className="text-muted">Modelo</p>
                  <p className="font-medium text-ink">{activeTemplate ? activeTemplate.name : "Proposta em branco"}</p>
                </div>
                <div>
                  <p className="text-muted">Título</p>
                  <p className="font-medium text-ink">{form.jobTitle || "Sem título"}</p>
                </div>
                <div>
                  <p className="text-muted">Período</p>
                  <p className="font-medium text-ink">{form.startDate || "–"} / {form.endDate || "–"}</p>
                </div>
              </div>
              <Button className="w-full">Gerar proposta</Button>
              <Button variant="ghost" className="w-full">
                Salvar rascunho
              </Button>
            </Card>
          </div>
        )}

        <div className="flex justify-between border-t border-outline/60 pt-4">
          <Button variant="ghost" onClick={handlePrevious} disabled={stepIndex === 0}>
            Voltar
          </Button>
          <div className="flex gap-2">
            {stepIndex < steps.length - 1 && (
              <Button onClick={handleNext}>Continuar</Button>
            )}
            {stepIndex === steps.length - 1 && <Button variant="primary">Finalizar geração</Button>}
          </div>
        </div>
      </Card>
    </section>
  );
}
