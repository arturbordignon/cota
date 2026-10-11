"use client";

import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight, CheckCircle, FilePlus, ImageSquare, Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateProposalResponse,
  EquipmentResponse,
  EquipmentSummary,
  TemplateDetail,
  TemplatesResponse,
} from "@/types/api";
import { useApi } from "@/hooks/use-api";
import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { UploadArea } from "@/components/ui/upload-area";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENTS = 5;
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;
const UM_DIA = 24 * 60 * 60 * 1000;

const steps = [
  { id: 1, title: "Escolher modelo", description: "Use um modelo ou comece do zero." },
  { id: 2, title: "Detalhar operação", description: "Cliente, local, período, escopo e recursos." },
  { id: 3, title: "Valores", description: "Mobilização, diária e condições comerciais." },
  { id: 4, title: "Revisar & anexar", description: "Fotos, revisão final e geração do PDF." },
];

type Formulario = {
  clientId: string;
  titulo: string;
  localOperacao: string;
  dataInicio: string;
  dataFim: string;
  escopo: string;
  equipamentosIds: string[];
  equipamentosExtras: string;
  equipe: string;
  condicoes: string;
  mobilizacao: string;
  diaria: string;
  dias: string;
  validadeDias: string;
};

const formularioVazio: Formulario = {
  clientId: "",
  titulo: "",
  localOperacao: "",
  dataInicio: "",
  dataFim: "",
  escopo: "",
  equipamentosIds: [],
  equipamentosExtras: "",
  equipe: "",
  condicoes: "",
  mobilizacao: "",
  diaria: "",
  dias: "",
  validadeDias: "15",
};

type DadosModelo = { job?: { scope?: unknown }; team?: unknown; terms?: unknown };

type Totais = { mobilization: number; dailyRate: number; days: number };

function juntarLinhas(valor: unknown) {
  if (!Array.isArray(valor)) {
    return "";
  }
  return valor.filter((item) => typeof item === "string").join("\n");
}

function separarLinhas(texto: string) {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}

function preencherComModelo(modelo: TemplateDetail) {
  const dados = (modelo.defaultDataJson || {}) as DadosModelo;
  return {
    escopo: juntarLinhas(dados.job?.scope),
    equipe: juntarLinhas(dados.team),
    condicoes: juntarLinhas(dados.terms),
  };
}

function converterNumero(valor: string) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    return 0;
  }
  return numero;
}

function calcularDiasEntreDatas(inicio: string, fim: string) {
  if (!inicio || !fim) {
    return "";
  }
  const diferenca = new Date(`${fim}T00:00:00`).getTime() - new Date(`${inicio}T00:00:00`).getTime();
  if (diferenca < 0) {
    return "";
  }
  return String(Math.round(diferenca / UM_DIA) + 1);
}

function formatarData(data: string) {
  if (!data) {
    return "";
  }
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function montarPeriodo(formulario: Formulario) {
  if (!formulario.dataInicio) {
    return "";
  }
  if (!formulario.dataFim) {
    return `A partir de ${formatarData(formulario.dataInicio)}`;
  }
  return `${formatarData(formulario.dataInicio)} a ${formatarData(formulario.dataFim)}`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function descreverCapacidade(equipamento: EquipmentSummary) {
  if (!equipamento.capacityTons) {
    return "";
  }
  return `Capacidade ${equipamento.capacityTons} t`;
}

function montarEquipamentos(formulario: Formulario, catalogo: EquipmentSummary[]) {
  const selecionados = catalogo
    .filter((equipamento) => formulario.equipamentosIds.includes(equipamento.id))
    .map((equipamento) => {
      const especificacoes = (equipamento.specsJson || {}) as { description?: string; notes?: string };
      return {
        name: equipamento.name,
        capacity: descreverCapacidade(equipamento),
        reach: especificacoes.description || "",
        notes: especificacoes.notes || "",
      };
    });
  const extras = separarLinhas(formulario.equipamentosExtras).map((nome) => ({
    name: nome,
    capacity: "",
    reach: "",
    notes: "",
  }));
  return [...selecionados, ...extras];
}

function montarValidade(formulario: Formulario) {
  const dias = converterNumero(formulario.validadeDias);
  if (!dias) {
    return "";
  }
  return `Valores válidos por ${dias} dias corridos.`;
}

function montarDataExpiracao(formulario: Formulario) {
  const dias = converterNumero(formulario.validadeDias);
  if (!dias) {
    return undefined;
  }
  return new Date(Date.now() + dias * UM_DIA).toISOString();
}

function montarPayload(formulario: Formulario, catalogo: EquipmentSummary[]) {
  return {
    job: {
      projectName: formulario.titulo.trim(),
      siteLocation: formulario.localOperacao.trim(),
      schedule: montarPeriodo(formulario),
      scope: separarLinhas(formulario.escopo),
    },
    equipment: montarEquipamentos(formulario, catalogo),
    team: separarLinhas(formulario.equipe),
    terms: separarLinhas(formulario.condicoes),
    pricing: { validity: montarValidade(formulario) },
  };
}

function montarTotais(formulario: Formulario): Totais {
  return {
    mobilization: converterNumero(formulario.mobilizacao),
    dailyRate: converterNumero(formulario.diaria),
    days: Math.round(converterNumero(formulario.dias)),
  };
}

function calcularTotal(totais: Totais) {
  return totais.mobilization + totais.dailyRate * totais.days;
}

function buscarRotuloModelo(selecionado: boolean) {
  if (selecionado) {
    return "Selecionado";
  }
  return "Selecionar modelo";
}

function buscarCategoriaModelo(modelo: TemplateDetail) {
  if (modelo.accountId) {
    return "Meu modelo";
  }
  return "Modelo padrão";
}

function formatarTamanhoArquivo(tamanho: number) {
  if (tamanho >= 1024 * 1024) {
    return `${(tamanho / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(tamanho / 1024))} KB`;
}

function buscarMensagemErro(error: unknown, mensagemPadrao: string) {
  if (error instanceof Error) {
    return error.message;
  }
  return mensagemPadrao;
}

export default function NewProposalPage() {
  const api = useApi();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { temPermissao } = useCurrentUser();

  const [stepIndex, setStepIndex] = useState(0);
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [emBranco, setEmBranco] = useState(false);
  const [formulario, setFormulario] = useState<Formulario>(formularioVazio);
  const [fotos, setFotos] = useState<File[]>([]);
  const [avisoFotos, setAvisoFotos] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", companyName: "" });

  const podeCriar = temPermissao("proposals", "edit");
  const podeCadastrarCliente = temPermissao("clients", "edit");

  const clientsQuery = useQuery({
    queryKey: ["clients", "summary"],
    queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/clients"),
    enabled: api.isAuthenticated && temPermissao("clients", "view"),
  });

  const templatesQuery = useQuery({
    queryKey: ["templates", "all"],
    queryFn: () => api.get<TemplatesResponse>("/templates?scope=all"),
    enabled: api.isAuthenticated && temPermissao("templates", "view"),
  });

  const equipmentQuery = useQuery({
    queryKey: ["equipment", "list"],
    queryFn: () => api.get<EquipmentResponse>("/equipment"),
    enabled: api.isAuthenticated && temPermissao("services", "view"),
  });

  const clientes = useMemo(() => clientsQuery.data?.data || [], [clientsQuery.data]);
  const catalogo = useMemo(() => equipmentQuery.data?.data || [], [equipmentQuery.data]);
  const modelos = useMemo(
    () => (templatesQuery.data?.data || []) as TemplateDetail[],
    [templatesQuery.data],
  );
  const modeloPadrao = modelos.find((modelo) => !modelo.accountId);
  const modeloAtivo = modelos.find((modelo) => modelo.id === modeloId);
  const totais = montarTotais(formulario);
  const total = calcularTotal(totais);
  const clienteSelecionado = clientes.find((cliente) => cliente.id === formulario.clientId);

  useEffect(() => {
    if (formulario.clientId || clientes.length === 0) {
      return;
    }
    setFormulario((anterior) => ({ ...anterior, clientId: clientes[0].id }));
  }, [clientes, formulario.clientId]);

  const createClient = useMutation({
    mutationFn: (payload: { name: string; companyName?: string }) =>
      api.post<{ data: { id: string; name: string } }>("/clients", payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["clients", "summary"] });
      setFormulario((anterior) => ({ ...anterior, clientId: res.data.id }));
      setNewClient({ name: "", companyName: "" });
      setAddClientOpen(false);
    },
  });

  const atualizarCampo = (campo: keyof Formulario, valor: string) => {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const atualizarData = (campo: "dataInicio" | "dataFim", valor: string) => {
    setFormulario((anterior) => {
      const atualizado = { ...anterior, [campo]: valor };
      const diasCalculados = calcularDiasEntreDatas(atualizado.dataInicio, atualizado.dataFim);
      if (diasCalculados) {
        atualizado.dias = diasCalculados;
      }
      return atualizado;
    });
  };

  const alternarEquipamento = (equipamentoId: string) => {
    setFormulario((anterior) => {
      if (anterior.equipamentosIds.includes(equipamentoId)) {
        return { ...anterior, equipamentosIds: anterior.equipamentosIds.filter((id) => id !== equipamentoId) };
      }
      return { ...anterior, equipamentosIds: [...anterior.equipamentosIds, equipamentoId] };
    });
  };

  const selecionarModelo = (modelo: TemplateDetail) => {
    setModeloId(modelo.id);
    setEmBranco(false);
    setFormulario((anterior) => ({ ...anterior, ...preencherComModelo(modelo) }));
    setStepIndex(1);
  };

  const selecionarEmBranco = () => {
    if (!modeloPadrao) {
      setSubmissionError("Nenhum modelo padrão disponível para começar do zero.");
      return;
    }
    setModeloId(modeloPadrao.id);
    setEmBranco(true);
    setFormulario((anterior) => ({ ...anterior, escopo: "", equipe: "", condicoes: "" }));
    setStepIndex(1);
  };

  const selecionarFotos = (arquivos: FileList) => {
    const imagens = Array.from(arquivos).filter((arquivo) => arquivo.type.startsWith("image/"));
    const permitidas = imagens.filter((arquivo) => arquivo.size <= TAMANHO_MAXIMO_FOTO);
    setAvisoFotos(null);
    if (permitidas.length < imagens.length) {
      setAvisoFotos("Algumas fotos foram ignoradas por passarem de 5MB.");
    }
    setFotos(permitidas.slice(0, MAX_ATTACHMENTS));
  };

  const enviarFotos = async (proposalId: string) => {
    const assets = [];
    for (let posicao = 0; posicao < fotos.length; posicao += 1) {
      const arquivo = fotos[posicao];
      const destino = await api.post<{ key: string; uploadUrl: string }>("/assets/upload-url", {
        proposalId,
        contentType: arquivo.type,
      });
      const envio = await fetch(destino.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type },
        body: arquivo,
      });
      if (!envio.ok) {
        throw new Error(`Falha ao enviar a foto ${arquivo.name}.`);
      }
      assets.push({ s3ObjectKey: destino.key, mimeType: arquivo.type, position: posicao });
    }
    if (assets.length === 0) {
      return;
    }
    await api.patch(`/proposals/${proposalId}`, { assets });
  };

  const createProposalFlow = useMutation({
    mutationFn: async ({ gerarPdf }: { gerarPdf: boolean }) => {
      if (!modeloId) {
        throw new Error("Selecione um modelo antes de continuar.");
      }

      let clientId: string | undefined;
      if (formulario.clientId) {
        clientId = formulario.clientId;
      }

      const response = await api.post<CreateProposalResponse>("/proposals", {
        templateId: modeloId,
        clientId,
        title: formulario.titulo.trim() || modeloAtivo?.name || "Proposta sem título",
        payload: montarPayload(formulario, catalogo),
        totals: totais,
        expiresAt: montarDataExpiracao(formulario),
      });

      const proposalId = response.data.id;
      let erroFotos: string | null = null;
      try {
        await enviarFotos(proposalId);
      } catch (error) {
        erroFotos = buscarMensagemErro(error, "Falha ao enviar as fotos.");
      }

      if (gerarPdf) {
        await api.post(`/proposals/${proposalId}/generate`, {});
      }

      return { proposalId, gerarPdf, erroFotos };
    },
    onMutate: () => {
      setSubmissionError(null);
    },
    onSuccess: async ({ proposalId, gerarPdf, erroFotos }) => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["proposals", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["proposals", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "overview"] }),
      ]);
      if (erroFotos) {
        window.alert(`A proposta foi criada, mas as fotos não foram anexadas: ${erroFotos}`);
      }
      let destino = `/proposals/${proposalId}`;
      if (gerarPdf) {
        destino = `${destino}?queued=1`;
      }
      router.push(destino as Route);
    },
    onError: (error: unknown) => {
      setSubmissionError(buscarMensagemErro(error, "Não foi possível finalizar a proposta."));
    },
  });

  const handleNext = () => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  const handlePrevious = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  if (!podeCriar) {
    return (
      <section className="space-y-6">
        <PageHeader title="Nova proposta" />
        <Notice tone="warning">Seu departamento não tem permissão para criar propostas.</Notice>
      </section>
    );
  }

  const resumoLinhas = [
    { rotulo: "Cliente", valor: clienteSelecionado?.name },
    { rotulo: "Modelo", valor: modeloAtivo?.name },
    { rotulo: "Projeto", valor: formulario.titulo },
    { rotulo: "Local", valor: formulario.localOperacao },
    { rotulo: "Período", valor: montarPeriodo(formulario) },
  ];

  const resumo = (
    <Card className="p-5">
      <CardTitle>Resumo</CardTitle>
      <dl className="mt-4 space-y-3 text-sm">
        {resumoLinhas.map((linha) => (
          <div key={linha.rotulo} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-muted">{linha.rotulo}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-ink">{linha.valor || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-dashed border-outline pt-4">
        <span className="text-sm font-semibold text-ink">Total</span>
        <span className="tabular font-display text-2xl font-semibold leading-none text-ink">
          {formatarMoeda(total)}
        </span>
      </div>
    </Card>
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title="Nova proposta"
        description="Escolha um modelo, detalhe a operação, defina os valores e gere o PDF para enviar ao cliente."
      />

      <Card className="px-5 py-5 sm:px-6">
        <Stepper steps={steps} activeStep={stepIndex} />
      </Card>

      {stepIndex === 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={selecionarEmBranco}
            className={cn(
              "flex min-h-[168px] flex-col items-start gap-3 rounded-xl border border-dashed border-outline bg-white p-5 text-left transition-colors hover:border-primary hover:bg-primary-tint",
              emBranco && "border-solid border-primary bg-primary-tint ring-[3px] ring-primary/20",
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
              <FilePlus size={20} weight="bold" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-ink">Começar do zero</span>
              <span className="mt-1 block text-sm leading-snug text-muted">
                Usa o layout padrão com todos os campos em branco para você preencher.
              </span>
            </span>
            <span className="mt-auto text-[13px] font-semibold text-primary-strong">Usar proposta em branco</span>
          </button>

          {templatesQuery.isLoading &&
            Array.from({ length: 2 }).map((_, indice) => (
              <Skeleton key={indice} className="min-h-[168px] rounded-xl" />
            ))}

          {modelos.map((modelo) => {
            const selecionado = modeloId === modelo.id && !emBranco;
            return (
              <button
                key={modelo.id}
                type="button"
                onClick={() => selecionarModelo(modelo)}
                aria-pressed={selecionado}
                className={cn(
                  "flex min-h-[168px] flex-col items-start gap-3 rounded-xl border border-border bg-white p-5 text-left shadow-card transition-colors hover:border-primary/60",
                  selecionado && "border-primary bg-primary-tint ring-[3px] ring-primary/20",
                )}
              >
                <span className="flex flex-wrap items-center gap-2">
                  {modelo.category && <Badge tone="brand">{modelo.category}</Badge>}
                  <span className="text-xs font-medium text-muted">{buscarCategoriaModelo(modelo)}</span>
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{modelo.name}</span>
                  {modelo.description ? (
                    <span className="mt-1 block text-sm leading-snug text-muted">{modelo.description}</span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-auto inline-flex items-center gap-1.5 text-[13px] font-semibold",
                    selecionado ? "text-ink" : "text-primary-strong",
                  )}
                >
                  {selecionado ? <CheckCircle size={16} weight="fill" className="text-primary" /> : null}
                  {buscarRotuloModelo(selecionado)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {stepIndex === 1 && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="space-y-6 p-5 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    id="cliente"
                    value={formulario.clientId}
                    placeholder="Nenhum cliente cadastrado"
                    onValueChange={(valor) => atualizarCampo("clientId", valor)}
                  >
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                {podeCadastrarCliente && (
                  <Button variant="secondary" onClick={() => setAddClientOpen(true)}>
                    <Plus size={14} weight="bold" />
                    Adicionar
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Título / nome do projeto" htmlFor="titulo">
                <Input
                  id="titulo"
                  placeholder="Montagem de estrutura metálica - Galpão X"
                  value={formulario.titulo}
                  onChange={(event) => atualizarCampo("titulo", event.target.value)}
                />
              </Field>
              <Field label="Local da operação" htmlFor="localOperacao">
                <Input
                  id="localOperacao"
                  placeholder="Porto de Santos, SP"
                  value={formulario.localOperacao}
                  onChange={(event) => atualizarCampo("localOperacao", event.target.value)}
                />
              </Field>
              <Field label="Data de início" htmlFor="dataInicio">
                <Input
                  id="dataInicio"
                  type="date"
                  value={formulario.dataInicio}
                  onChange={(event) => atualizarData("dataInicio", event.target.value)}
                />
              </Field>
              <Field label="Data de término" htmlFor="dataFim">
                <Input
                  id="dataFim"
                  type="date"
                  value={formulario.dataFim}
                  onChange={(event) => atualizarData("dataFim", event.target.value)}
                />
              </Field>
            </div>

            <Field label="Escopo do serviço" htmlFor="escopo" hint="Um item por linha.">
              <Textarea
                id="escopo"
                rows={4}
                placeholder={"Içamento e posicionamento de treliças\nSupervisor técnico durante o turno"}
                value={formulario.escopo}
                onChange={(event) => atualizarCampo("escopo", event.target.value)}
              />
            </Field>

            <div className="space-y-2">
              <Label htmlFor="equipamentosExtras">Equipamentos</Label>
              {catalogo.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {catalogo.map((equipamento) => (
                    <label
                      key={equipamento.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline bg-white px-3 py-2.5 text-sm text-ink transition-colors hover:border-ink/30 has-[:checked]:border-primary has-[:checked]:bg-primary-tint has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary/25"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-primary"
                        checked={formulario.equipamentosIds.includes(equipamento.id)}
                        onChange={() => alternarEquipamento(equipamento.id)}
                      />
                      <span className="min-w-0 truncate font-medium">{equipamento.name}</span>
                      <span className="tabular ml-auto shrink-0 text-xs text-muted">
                        {descreverCapacidade(equipamento)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <Textarea
                id="equipamentosExtras"
                rows={2}
                placeholder="Outros equipamentos (um por linha)"
                value={formulario.equipamentosExtras}
                onChange={(event) => atualizarCampo("equipamentosExtras", event.target.value)}
              />
            </div>

            <Field label="Equipe e certificações" htmlFor="equipe" hint="Um item por linha.">
              <Textarea
                id="equipe"
                rows={3}
                placeholder={"Operador de guindaste certificado\nRigger responsável com ART"}
                value={formulario.equipe}
                onChange={(event) => atualizarCampo("equipe", event.target.value)}
              />
            </Field>
          </Card>

          <div className="lg:sticky lg:top-24">{resumo}</div>
        </div>
      )}

      {stepIndex === 2 && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Mobilização (R$)" htmlFor="mobilizacao" hint="Ida e volta do equipamento.">
                <Input
                  id="mobilizacao"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formulario.mobilizacao}
                  onChange={(event) => atualizarCampo("mobilizacao", event.target.value)}
                />
              </Field>
              <Field label="Diária operacional (R$)" htmlFor="diaria">
                <Input
                  id="diaria"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formulario.diaria}
                  onChange={(event) => atualizarCampo("diaria", event.target.value)}
                />
              </Field>
              <Field label="Dias de operação" htmlFor="dias">
                <Input
                  id="dias"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={formulario.dias}
                  onChange={(event) => atualizarCampo("dias", event.target.value)}
                />
              </Field>
            </div>

            <Field label="Validade da proposta (dias)" htmlFor="validadeDias" className="sm:max-w-[220px]">
              <Input
                id="validadeDias"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={formulario.validadeDias}
                onChange={(event) => atualizarCampo("validadeDias", event.target.value)}
              />
            </Field>

            <Field label="Condições gerais" htmlFor="condicoes" hint="Uma condição por linha.">
              <Textarea
                id="condicoes"
                rows={5}
                placeholder={"Pagamento: 40% na confirmação + 60% após a conclusão\nOperação sujeita a condições climáticas"}
                value={formulario.condicoes}
                onChange={(event) => atualizarCampo("condicoes", event.target.value)}
              />
            </Field>
          </Card>

          <Card className="p-5 lg:sticky lg:top-24">
            <CardTitle>Investimento</CardTitle>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Mobilização</dt>
                <dd className="tabular font-medium text-ink">{formatarMoeda(totais.mobilization)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Diária × {totais.days} dia(s)</dt>
                <dd className="tabular font-medium text-ink">{formatarMoeda(totais.dailyRate * totais.days)}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-dashed border-outline pt-4">
              <p className="meta-label">Total</p>
              <p className="tabular mt-1 font-display text-[32px] font-semibold leading-none text-ink">
                {formatarMoeda(total)}
              </p>
            </div>
          </Card>
        </div>
      )}

      {stepIndex === 3 && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="space-y-3 p-5 sm:p-6">
              <div>
                <CardTitle>Fotos da operação</CardTitle>
                <CardDescription>Até {MAX_ATTACHMENTS} fotos, aparecem no PDF.</CardDescription>
              </div>
              <UploadArea
                hint="JPG ou PNG, até 5 MB por foto"
                onFilesSelected={selecionarFotos}
                accept="image/png,image/jpeg"
              />
              {avisoFotos && <Notice tone="warning">{avisoFotos}</Notice>}
              {fotos.length > 0 ? (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {fotos.map((foto) => (
                    <li
                      key={`${foto.name}-${foto.lastModified}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-ink">
                        <ImageSquare size={16} className="shrink-0 text-muted" />
                        <span className="truncate">{foto.name}</span>
                      </span>
                      <span className="tabular shrink-0 text-xs text-muted">{formatarTamanhoArquivo(foto.size)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">Nenhuma foto selecionada.</p>
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <CardTitle>Antes de gerar</CardTitle>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                {[
                  "Revise escopo e valores",
                  "Confirme equipamentos e datas",
                  "Confira os dados da empresa em Minha conta",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckCircle size={16} weight="fill" className="shrink-0 text-outline" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="space-y-3 lg:sticky lg:top-24">
            {resumo}
            <Button
              size="lg"
              className="w-full"
              loading={createProposalFlow.isPending && createProposalFlow.variables?.gerarPdf === true}
              loadingText="Gerando..."
              disabled={createProposalFlow.isPending}
              onClick={() => createProposalFlow.mutate({ gerarPdf: true })}
            >
              Gerar proposta e PDF
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              loading={createProposalFlow.isPending && createProposalFlow.variables?.gerarPdf === false}
              loadingText="Salvando..."
              disabled={createProposalFlow.isPending}
              onClick={() => createProposalFlow.mutate({ gerarPdf: false })}
            >
              Salvar rascunho
            </Button>
          </div>
        </div>
      )}

      {submissionError && <Notice tone="danger">{submissionError}</Notice>}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={stepIndex === 0 || createProposalFlow.isPending}
        >
          <CaretLeft size={14} weight="bold" />
          Voltar
        </Button>
        <span className="tabular text-[13px] font-medium text-muted">
          Etapa {stepIndex + 1} de {steps.length}
        </span>
        {stepIndex < steps.length - 1 ? (
          <Button onClick={handleNext} disabled={!modeloId || createProposalFlow.isPending}>
            Continuar
            <CaretRight size={14} weight="bold" />
          </Button>
        ) : (
          <span className="w-[104px]" aria-hidden />
        )}
      </div>

      <Modal
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        title="Adicionar cliente"
        description="Cadastre um cliente sem sair da criação da proposta."
        size="sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newClient.name.trim()) return;
          createClient.mutate({
            name: newClient.name.trim(),
            companyName: newClient.companyName.trim() || undefined,
          });
        }}
      >
        <ModalBody>
          <Field label="Nome" htmlFor="novo-cliente-nome">
            <Input
              id="novo-cliente-nome"
              autoFocus
              value={newClient.name}
              onChange={(e) => setNewClient((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>
          <Field label="Empresa" htmlFor="novo-cliente-empresa" optional="opcional">
            <Input
              id="novo-cliente-empresa"
              value={newClient.companyName}
              onChange={(e) => setNewClient((s) => ({ ...s, companyName: e.target.value }))}
            />
          </Field>
          {createClient.isError && <Notice tone="danger">{createClient.error.message}</Notice>}
        </ModalBody>
        <ModalFooter>
          <ModalClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </ModalClose>
          <Button type="submit" loading={createClient.isPending} disabled={!newClient.name.trim()}>
            Cadastrar cliente
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
