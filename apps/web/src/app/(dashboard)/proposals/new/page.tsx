"use client";

import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
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

function buscarVariante(selecionado: boolean) {
  if (selecionado) {
    return "primary" as const;
  }
  return "secondary" as const;
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
      <section className="space-y-8">
        <PageHeader title="Nova Proposta" />
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Seu departamento não tem permissão para criar propostas.
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title="Nova Proposta"
        description="Escolha um modelo, detalhe a operação, defina os valores e gere o PDF para enviar ao cliente."
      />

      <Card className="space-y-6 p-6">
        <Stepper steps={steps} activeStep={stepIndex} />

        {stepIndex === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="flex flex-col justify-between gap-3 border border-outline/60 bg-[var(--color-surface-muted)] p-5 shadow-none">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-ink">Começar do zero</h3>
                <p className="text-sm text-muted">
                  Usa o layout padrão com todos os campos em branco para você preencher.
                </p>
              </div>
              <Button variant={buscarVariante(emBranco)} onClick={selecionarEmBranco}>
                Usar proposta em branco
              </Button>
            </Card>

            {templatesQuery.isLoading && <p className="text-sm text-muted">Carregando modelos...</p>}

            {modelos.map((modelo) => {
              const selecionado = modeloId === modelo.id && !emBranco;
              return (
                <Card
                  key={modelo.id}
                  onClick={() => selecionarModelo(modelo)}
                  className={cn(
                    "flex cursor-pointer flex-col gap-3 border border-outline/60 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg",
                    selecionado && "border-primary bg-[var(--color-surface-muted)]/60 ring-2 ring-primary/20",
                  )}
                >
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {modelo.category && <Badge tone="info">{modelo.category}</Badge>}
                    <span>{buscarCategoriaModelo(modelo)}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-ink">{modelo.name}</h3>
                    <p className="text-sm text-muted">{modelo.description}</p>
                  </div>
                  <div className="mt-auto">
                    <Button
                      variant={buscarVariante(selecionado)}
                      onClick={(event) => {
                        event.stopPropagation();
                        selecionarModelo(modelo);
                      }}
                    >
                      {buscarRotuloModelo(selecionado)}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {stepIndex === 1 && (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
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
                    <Button variant="ghost" size="sm" onClick={() => setAddClientOpen(true)}>
                      Adicionar
                    </Button>
                  )}
                </div>

                <Dialog.Root open={addClientOpen} onOpenChange={setAddClientOpen}>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
                    <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center px-4 py-10">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newClient.name.trim()) return;
                          createClient.mutate({
                            name: newClient.name.trim(),
                            companyName: newClient.companyName.trim() || undefined,
                          });
                        }}
                        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
                      >
                        <div className="flex items-center justify-between border-b border-outline/20 px-6 py-4">
                          <div>
                            <Dialog.Title className="text-lg font-semibold text-ink">Adicionar cliente</Dialog.Title>
                            <Dialog.Description className="text-xs text-muted">
                              Cadastre um cliente sem sair da criação da proposta
                            </Dialog.Description>
                          </div>
                          <Dialog.Close asChild>
                            <button
                              type="button"
                              className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                              aria-label="Fechar"
                            >
                              ×
                            </button>
                          </Dialog.Close>
                        </div>
                        <div className="space-y-4 px-6 py-6">
                          <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={newClient.name} onChange={(e) => setNewClient((s) => ({ ...s, name: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Empresa</Label>
                            <Input
                              value={newClient.companyName}
                              onChange={(e) => setNewClient((s) => ({ ...s, companyName: e.target.value }))}
                            />
                          </div>
                          {createClient.isError && (
                            <p className="text-sm text-danger">{createClient.error.message}</p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
                          <Dialog.Close asChild>
                            <Button variant="ghost">Cancelar</Button>
                          </Dialog.Close>
                          <Button type="submit" loading={createClient.isPending}>
                            Cadastrar
                          </Button>
                        </div>
                      </form>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título / nome do projeto</Label>
                  <Input
                    id="titulo"
                    placeholder="Montagem de estrutura metálica - Galpão X"
                    value={formulario.titulo}
                    onChange={(event) => atualizarCampo("titulo", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localOperacao">Local da operação</Label>
                  <Input
                    id="localOperacao"
                    placeholder="Porto de Santos, SP"
                    value={formulario.localOperacao}
                    onChange={(event) => atualizarCampo("localOperacao", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Data de início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={formulario.dataInicio}
                    onChange={(event) => atualizarData("dataInicio", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">Data de término</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={formulario.dataFim}
                    onChange={(event) => atualizarData("dataFim", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="escopo">Escopo do serviço (um item por linha)</Label>
                <Textarea
                  id="escopo"
                  rows={4}
                  placeholder={"Içamento e posicionamento de treliças\nSupervisor técnico durante o turno"}
                  value={formulario.escopo}
                  onChange={(event) => atualizarCampo("escopo", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Equipamentos</Label>
                {catalogo.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {catalogo.map((equipamento) => (
                      <label
                        key={equipamento.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline/60 bg-white px-3 py-2 text-sm text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={formulario.equipamentosIds.includes(equipamento.id)}
                          onChange={() => alternarEquipamento(equipamento.id)}
                        />
                        <span>{equipamento.name}</span>
                        <span className="ml-auto text-xs text-muted">{descreverCapacidade(equipamento)}</span>
                      </label>
                    ))}
                  </div>
                )}
                <Textarea
                  rows={2}
                  placeholder="Outros equipamentos (um por linha)"
                  value={formulario.equipamentosExtras}
                  onChange={(event) => atualizarCampo("equipamentosExtras", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipe">Equipe e certificações (um item por linha)</Label>
                <Textarea
                  id="equipe"
                  rows={3}
                  placeholder={"Operador de guindaste certificado\nRigger responsável com ART"}
                  value={formulario.equipe}
                  onChange={(event) => atualizarCampo("equipe", event.target.value)}
                />
              </div>
            </div>

            <Card className="space-y-4 border border-outline/50 bg-[var(--color-surface-muted)]/70 p-5 shadow-none">
              <h3 className="text-sm font-semibold text-ink">Resumo rápido</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted">Cliente:</span> {clienteSelecionado?.name || "–"}
                </p>
                <p>
                  <span className="text-muted">Modelo:</span> {modeloAtivo?.name || "–"}
                </p>
                <p>
                  <span className="text-muted">Período:</span> {montarPeriodo(formulario) || "–"}
                </p>
              </div>
            </Card>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="mobilizacao">Mobilização / desmobilização (R$)</Label>
                  <Input
                    id="mobilizacao"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.mobilizacao}
                    onChange={(event) => atualizarCampo("mobilizacao", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diaria">Diária operacional (R$)</Label>
                  <Input
                    id="diaria"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.diaria}
                    onChange={(event) => atualizarCampo("diaria", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dias">Dias de operação</Label>
                  <Input
                    id="dias"
                    type="number"
                    min="0"
                    step="1"
                    value={formulario.dias}
                    onChange={(event) => atualizarCampo("dias", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor="validadeDias">Validade da proposta (dias)</Label>
                <Input
                  id="validadeDias"
                  type="number"
                  min="0"
                  step="1"
                  value={formulario.validadeDias}
                  onChange={(event) => atualizarCampo("validadeDias", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condicoes">Condições gerais (uma por linha)</Label>
                <Textarea
                  id="condicoes"
                  rows={5}
                  placeholder={"Pagamento: 40% na confirmação + 60% após a conclusão\nOperação sujeita a condições climáticas"}
                  value={formulario.condicoes}
                  onChange={(event) => atualizarCampo("condicoes", event.target.value)}
                />
              </div>
            </div>

            <Card className="space-y-3 border border-outline/50 bg-white p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-ink">Investimento</h3>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between gap-3">
                  <span className="text-muted">Mobilização</span>
                  <span className="text-ink">{formatarMoeda(totais.mobilization)}</span>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-muted">
                    Diária × {totais.days} dia(s)
                  </span>
                  <span className="text-ink">{formatarMoeda(totais.dailyRate * totais.days)}</span>
                </p>
              </div>
              <div className="border-t border-outline/40 pt-3">
                <p className="text-xs uppercase tracking-wide text-muted">Total</p>
                <p className="text-2xl font-semibold text-primary">{formatarMoeda(total)}</p>
              </div>
            </Card>
          </div>
        )}

        {stepIndex === 3 && (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Fotos da operação (máx. 5)</Label>
                <UploadArea
                  hint="Formatos aceitos: JPG, PNG – tamanho máximo 5MB por foto"
                  onFilesSelected={selecionarFotos}
                  accept="image/png,image/jpeg"
                />
                {avisoFotos && <p className="text-xs text-warning">{avisoFotos}</p>}
                {fotos.length > 0 && (
                  <ul className="space-y-2 rounded-lg border border-outline/40 bg-white px-4 py-3 text-sm text-muted">
                    {fotos.map((foto) => (
                      <li key={`${foto.name}-${foto.lastModified}`} className="flex items-center justify-between gap-3">
                        <span className="truncate">{foto.name}</span>
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {formatarTamanhoArquivo(foto.size)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {fotos.length === 0 && <p className="text-xs text-muted">Nenhuma foto selecionada.</p>}
              </div>
              <div className="space-y-3 rounded-xl border border-outline bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">Checklist antes de gerar</h3>
                <ul className="space-y-2 text-sm text-muted">
                  <li>• Revisar escopo e valores</li>
                  <li>• Confirmar equipamentos e datas</li>
                  <li>• Conferir os dados da empresa em Minha Conta</li>
                </ul>
              </div>
            </div>
            <Card className="space-y-4 border border-outline/50 bg-white p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-ink">Resumo</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted">Cliente</p>
                  <p className="font-medium text-ink">{clienteSelecionado?.name || "Sem cliente"}</p>
                </div>
                <div>
                  <p className="text-muted">Projeto</p>
                  <p className="font-medium text-ink">{formulario.titulo || "Sem título"}</p>
                </div>
                <div>
                  <p className="text-muted">Local e período</p>
                  <p className="font-medium text-ink">
                    {formulario.localOperacao || "–"} · {montarPeriodo(formulario) || "–"}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Total</p>
                  <p className="font-medium text-ink">{formatarMoeda(total)}</p>
                </div>
                <div>
                  <p className="text-muted">Fotos</p>
                  <p className="font-medium text-ink">{fotos.length} arquivo(s)</p>
                </div>
              </div>
              <Button
                className="w-full"
                loading={createProposalFlow.isPending}
                loadingText="Gerando..."
                onClick={() => createProposalFlow.mutate({ gerarPdf: true })}
              >
                Gerar proposta e PDF
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                loading={createProposalFlow.isPending}
                loadingText="Salvando..."
                onClick={() => createProposalFlow.mutate({ gerarPdf: false })}
              >
                Salvar rascunho
              </Button>
            </Card>
          </div>
        )}

        {submissionError && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft/40 px-4 py-3 text-sm text-danger">
            {submissionError}
          </div>
        )}

        <div className="flex justify-between border-t border-outline/60 pt-4">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={stepIndex === 0 || createProposalFlow.isPending}
          >
            Voltar
          </Button>
          {stepIndex < steps.length - 1 && (
            <Button onClick={handleNext} disabled={!modeloId || createProposalFlow.isPending}>
              Continuar
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}
