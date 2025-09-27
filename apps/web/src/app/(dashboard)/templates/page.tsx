"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";

const systemTemplates = [
  {
    id: "rent",
    title: "Modelo de Aluguel de Guindaste",
    summary: "Detalhes de locação com itens adicionais e condições de deslocamento.",
  },
  {
    id: "earthworks",
    title: "Modelo de Serviços de Terraplanagem",
    summary: "Pacotes de horas máquina, equipe e mobilização.",
  },
  {
    id: "cargo",
    title: "Modelo de Transporte de Cargas Pesadas",
    summary: "Plano completo para içamento, transporte e montagem.",
  },
];

const customTemplates: typeof systemTemplates = [];

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState("catalog");

  const data = useMemo(() => {
    switch (activeTab) {
      case "mine":
        return customTemplates;
      case "upload":
        return [];
      default:
        return systemTemplates;
    }
  }, [activeTab]);

  const showUpload = activeTab === "upload";

  return (
    <section className="space-y-8">
      <PageHeader
        title="Modelos de Propostas"
        description="Crie propostas com rapidez usando modelos sugeridos ou personalizando layouts para o seu negócio."
        action={<Button className="w-full sm:w-auto">Criar novo modelo</Button>}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          items={[
            { id: "catalog", label: "Modelos Padrão", description: "Biblioteca curada para serviços pesados" },
            { id: "mine", label: "Meus Modelos", description: "Favoritos e templates da sua equipe" },
            { id: "upload", label: "Carregar Modelo", description: "Importe PDF ou DOCX e mapeie campos" },
          ]}
          defaultValue="catalog"
          onChange={setActiveTab}
        />
        <div className="w-full max-w-xs">
          <Select defaultValue="todos">
            <SelectItem value="todos">Todos os segmentos</SelectItem>
            <SelectItem value="icamento">Içamento & Guindastes</SelectItem>
            <SelectItem value="infra">Infraestrutura</SelectItem>
            <SelectItem value="logistica">Logística pesada</SelectItem>
          </Select>
        </div>
      </div>

      {showUpload ? (
        <Card className="flex flex-col items-center justify-center gap-4 rounded-3xl border-dashed border-outline bg-white/90 px-10 py-16 text-center">
          <p className="max-w-lg text-sm text-muted">
            Arraste e solte arquivos PDF ou DOCX para transformar em modelos preenchíveis. Você poderá mapear campos depois do upload.
          </p>
          <Button variant="secondary" size="lg">
            Carregar arquivo
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.length > 0 ? (
            data.map((template) => (
              <Card
                key={template.id}
                className="flex flex-col justify-between gap-4 border border-outline/60 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-center text-lg font-semibold leading-10 text-primary">
                    {template.title.substring(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-ink">{template.title}</h3>
                    <p className="text-sm text-muted">{template.summary}</p>
                  </div>
                </div>
                <Button variant="outline">Usar modelo</Button>
              </Card>
            ))
          ) : (
            <Card className="col-span-full flex flex-col items-center justify-center gap-3 rounded-3xl border-dashed border-outline bg-white/90 px-10 py-16 text-center text-muted">
              <span className="font-medium text-ink">Nenhum modelo personalizado encontrado</span>
              <p className="text-sm">Crie um layout do zero ou faça upload de um arquivo existente para começar.</p>
              <Button>Criar modelo personalizado</Button>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
