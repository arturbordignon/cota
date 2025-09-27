"use client";

import { useState } from "react";
import { MagnifyingGlass, MapPin, Buildings } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";

const mockProspects = [
  {
    name: "Construtora Atlas",
    segment: "Construção Pesada",
    location: "Campinas, SP",
    opportunity: "Nova usina logística - previsão Q4",
  },
  {
    name: "Porto Leste Operações",
    segment: "Logística Portuária",
    location: "Santos, SP",
    opportunity: "Ampliação de pátio e novos guindastes",
  },
  {
    name: "Terraplanagem Horizonte Norte",
    segment: "Terraplanagem",
    location: "Curitiba, PR",
    opportunity: "Condomínio industrial - 6 meses de obras",
  },
];

export default function ProspectsPage() {
  const [keywords, setKeywords] = useState("");
  const [region, setRegion] = useState("brasil");
  const [segment, setSegment] = useState("todos");

  return (
    <section className="space-y-6">
      <PageHeader
        title="Buscar prospects"
        description="Encontre empresas com potencial de contratação para guindastes, movimentação de carga e apoio a obras."
      />

      <Card className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr]">
          <div className="space-y-2">
            <Label htmlFor="keywords">Palavras-chave</Label>
            <div className="flex items-center gap-2 rounded-lg border border-outline bg-white px-3 py-2">
              <MagnifyingGlass size={18} className="text-muted" />
              <Input
                id="keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="Ex: terraplanagem, porto, guindaste telescópico"
                className="h-9 border-none bg-transparent px-0 focus:ring-0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado/Região</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectItem value="brasil">Brasil inteiro</SelectItem>
              <SelectItem value="sudeste">Sudeste</SelectItem>
              <SelectItem value="sul">Sul</SelectItem>
              <SelectItem value="usa">Estados Unidos</SelectItem>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Segmento</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="construcao">Construção</SelectItem>
              <SelectItem value="logistica">Logística</SelectItem>
              <SelectItem value="industria">Indústria pesada</SelectItem>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Resultados fictícios. Integração futura com provedor de dados B2B ou Google Search/Places API.
          </p>
          <Button variant="primary">Buscar prospects</Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {mockProspects.map((prospect) => (
          <Card key={prospect.name} className="flex flex-col gap-4 border border-outline/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink">{prospect.name}</h3>
                <Badge tone="info">{prospect.segment}</Badge>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                <MapPin size={16} weight="bold" />
                {prospect.location}
              </div>
            </div>
            <div className="rounded-lg border border-outline/60 bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-ink">
              <Buildings size={16} className="mr-2 inline text-primary" />
              {prospect.opportunity}
            </div>
            <div className="mt-auto flex gap-2">
              <Button variant="outline" size="sm">
                Ver detalhes
              </Button>
              <Button variant="ghost" size="sm">
                Adicionar ao CRM
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
