"use client";

import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { CaretLeft, CaretRight, CheckCircle, FilePlus, ImageSquare, Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateProposalResponse,
  EquipmentResponse,
  EquipmentSummary,
  TemplateDetail,
  TemplatesResponse,
} from "@/types/api";
import { ApiError, useApi } from "@/hooks/use-api";
import { useAccountCurrency } from "@/hooks/use-account-currency";
import { useErrorMessage } from "@/hooks/use-error-message";
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

const STEP_KEYS = ["template", "details", "values", "review"] as const;

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

type IdiomaProposta = "pt-BR" | "en";

// Text the wizard writes into the proposal itself. It follows the language of
// the template (the document the client reads), not the language of the screen.
const TEXTO_DA_PROPOSTA: Record<
  IdiomaProposta,
  {
    aPartirDe: (data: string) => string;
    intervalo: (inicio: string, fim: string) => string;
    capacidade: (toneladas: number) => string;
    validade: (dias: number) => string;
    semTitulo: string;
  }
> = {
  "pt-BR": {
    aPartirDe: (data) => `A partir de ${data}`,
    intervalo: (inicio, fim) => `${inicio} a ${fim}`,
    capacidade: (toneladas) => `Capacidade ${toneladas} t`,
    validade: (dias) => `Valores válidos por ${dias} dias corridos.`,
    semTitulo: "Proposta sem título",
  },
  en: {
    aPartirDe: (data) => `From ${data}`,
    intervalo: (inicio, fim) => `${inicio} to ${fim}`,
    capacidade: (toneladas) => `Capacity ${toneladas} t`,
    validade: (dias) => `Prices valid for ${dias} calendar days.`,
    semTitulo: "Untitled proposal",
  },
};

function idiomaDoModelo(modelo?: { locale?: string | null }): IdiomaProposta {
  return modelo?.locale === "en" ? "en" : "pt-BR";
}

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

function formatarData(data: string, idioma: IdiomaProposta) {
  if (!data) {
    return "";
  }
  return new Date(`${data}T00:00:00`).toLocaleDateString(idioma);
}

function montarPeriodo(formulario: Formulario, idioma: IdiomaProposta) {
  const texto = TEXTO_DA_PROPOSTA[idioma];
  if (!formulario.dataInicio) {
    return "";
  }
  if (!formulario.dataFim) {
    return texto.aPartirDe(formatarData(formulario.dataInicio, idioma));
  }
  return texto.intervalo(formatarData(formulario.dataInicio, idioma), formatarData(formulario.dataFim, idioma));
}

function descreverCapacidade(equipamento: EquipmentSummary, idioma: IdiomaProposta) {
  if (!equipamento.capacityTons) {
    return "";
  }
  return TEXTO_DA_PROPOSTA[idioma].capacidade(equipamento.capacityTons);
}

function montarEquipamentos(formulario: Formulario, catalogo: EquipmentSummary[], idioma: IdiomaProposta) {
  const selecionados = catalogo
    .filter((equipamento) => formulario.equipamentosIds.includes(equipamento.id))
    .map((equipamento) => {
      const especificacoes = (equipamento.specsJson || {}) as { description?: string; notes?: string };
      return {
        name: equipamento.name,
        capacity: descreverCapacidade(equipamento, idioma),
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

function montarValidade(formulario: Formulario, idioma: IdiomaProposta) {
  const dias = converterNumero(formulario.validadeDias);
  if (!dias) {
    return "";
  }
  return TEXTO_DA_PROPOSTA[idioma].validade(dias);
}

function montarDataExpiracao(formulario: Formulario) {
  const dias = converterNumero(formulario.validadeDias);
  if (!dias) {
    return undefined;
  }
  return new Date(Date.now() + dias * UM_DIA).toISOString();
}

function montarPayload(formulario: Formulario, catalogo: EquipmentSummary[], idioma: IdiomaProposta) {
  return {
    job: {
      projectName: formulario.titulo.trim(),
      siteLocation: formulario.localOperacao.trim(),
      schedule: montarPeriodo(formulario, idioma),
      scope: separarLinhas(formulario.escopo),
    },
    equipment: montarEquipamentos(formulario, catalogo, idioma),
    team: separarLinhas(formulario.equipe),
    terms: separarLinhas(formulario.condicoes),
    pricing: { validity: montarValidade(formulario, idioma) },
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

function formatarTamanhoArquivo(tamanho: number) {
  if (tamanho >= 1024 * 1024) {
    return `${(tamanho / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(tamanho / 1024))} KB`;
}

export default function NewProposalPage() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { temPermissao, user } = useCurrentUser();
  const t = useTranslations("proposals.wizard");
  const tIdiomas = useTranslations("templates.dialog.localeLabels");
  const mensagemDeErro = useErrorMessage();
  const formatador = useFormatter();
  const moeda = useAccountCurrency();
  const formatarMoeda = (valor: number) => formatador.number(valor, { style: "currency", currency: moeda });
  const steps = STEP_KEYS.map((chave, indice) => ({
    id: indice + 1,
    title: t(`steps.${chave}.title`),
    description: t(`steps.${chave}.description`),
  }));

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
  // Templates in the account's language come first.
  const idiomaPreferido = user?.account.locale === "en" ? "en" : "pt-BR";
  const modelos = useMemo(
    () =>
      [...((templatesQuery.data?.data || []) as TemplateDetail[])].sort(
        (a, b) => Number(a.locale !== idiomaPreferido) - Number(b.locale !== idiomaPreferido),
      ),
    [idiomaPreferido, templatesQuery.data],
  );
  // A blank proposal starts from the standard template in the account's language.
  const modeloPadrao =
    modelos.find((modelo) => !modelo.accountId && modelo.locale === idiomaPreferido) ??
    modelos.find((modelo) => !modelo.accountId);
  const modeloAtivo = modelos.find((modelo) => modelo.id === modeloId);
  const totais = montarTotais(formulario);
  const total = calcularTotal(totais);
  const clienteSelecionado = clientes.find((cliente) => cliente.id === formulario.clientId);

  // "Send proposal" on the clients page opens this page with ?clientId=, so that
  // client comes preselected instead of the first one in the list.
  const clienteDaUrl = searchParams.get("clientId");

  useEffect(() => {
    if (formulario.clientId || clientes.length === 0) {
      return;
    }
    const pedido = clientes.find((cliente) => cliente.id === clienteDaUrl);
    setFormulario((anterior) => ({ ...anterior, clientId: (pedido ?? clientes[0]).id }));
  }, [clientes, clienteDaUrl, formulario.clientId]);

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

  // "Use this template" on a template page opens the wizard with ?templateId=,
  // which starts on the details step with that template chosen.
  const modeloDaUrl = searchParams.get("templateId");
  const [modeloDaUrlAplicado, setModeloDaUrlAplicado] = useState(false);
  useEffect(() => {
    if (modeloDaUrlAplicado || !modeloDaUrl) {
      return;
    }
    const modelo = modelos.find((item) => item.id === modeloDaUrl);
    if (modelo) {
      setModeloDaUrlAplicado(true);
      selecionarModelo(modelo);
    }
    // selecionarModelo only sets state; it is safe to leave out of the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeloDaUrl, modeloDaUrlAplicado, modelos]);

  const selecionarEmBranco = () => {
    if (!modeloPadrao) {
      setSubmissionError(t("errors.noTemplate"));
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
      setAvisoFotos(t("photos.tooBig"));
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
        size: arquivo.size,
      });
      const envio = await fetch(destino.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type },
        body: arquivo,
      });
      if (!envio.ok) {
        throw new Error(t("errors.photoUpload", { name: arquivo.name }));
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
        throw new Error(t("errors.selectTemplate"));
      }

      let clientId: string | undefined;
      if (formulario.clientId) {
        clientId = formulario.clientId;
      }

      const response = await api.post<CreateProposalResponse>("/proposals", {
        templateId: modeloId,
        clientId,
        title: formulario.titulo.trim() || modeloAtivo?.name || TEXTO_DA_PROPOSTA[idiomaDoModelo(modeloAtivo)].semTitulo,
        payload: montarPayload(formulario, catalogo, idiomaDoModelo(modeloAtivo)),
        totals: totais,
        expiresAt: montarDataExpiracao(formulario),
      });

      const proposalId = response.data.id;
      let erroFotos: string | null = null;
      try {
        await enviarFotos(proposalId);
      } catch (error) {
        erroFotos = t("errors.photosNotAttached");
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
        window.alert(t("errors.photosNotAttached"));
      }
      let destino = `/proposals/${proposalId}`;
      if (gerarPdf) {
        destino = `${destino}?queued=1`;
      }
      router.push(destino as Route);
    },
    onError: (error: unknown) => {
      setSubmissionError(
        // Errors raised here already carry translated text; API ones are mapped.
        error instanceof ApiError
          ? error.code === "TRIAL_ENDED"
            ? t("errors.trialEnded")
            : mensagemDeErro(error, { 402: t("errors.limit"), padrao: t("errors.finish") })
          : error instanceof Error
            ? error.message
            : t("errors.finish"),
      );
    },
  });

  const handleNext = () => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  const handlePrevious = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  if (!podeCriar) {
    return (
      <section className="space-y-6">
        <PageHeader title={t("title")} />
        <Notice tone="warning">{t("noPermission")}</Notice>
      </section>
    );
  }

  const resumoLinhas = [
    { rotulo: t("summary.client"), valor: clienteSelecionado?.name },
    { rotulo: t("summary.template"), valor: modeloAtivo?.name },
    { rotulo: t("summary.project"), valor: formulario.titulo },
    { rotulo: t("summary.site"), valor: formulario.localOperacao },
    { rotulo: t("summary.period"), valor: montarPeriodo(formulario, idiomaDoModelo(modeloAtivo)) },
  ];

  const resumo = (
    <Card className="p-5">
      <CardTitle>{t("summary.title")}</CardTitle>
      <dl className="mt-4 space-y-3 text-sm">
        {resumoLinhas.map((linha) => (
          <div key={linha.rotulo} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-muted">{linha.rotulo}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-ink">{linha.valor || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-dashed border-outline pt-4">
        <span className="text-sm font-semibold text-ink">{t("summary.total")}</span>
        <span className="tabular font-display text-2xl font-semibold leading-none text-ink">
          {formatarMoeda(total)}
        </span>
      </div>
    </Card>
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
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
              <span className="block text-[15px] font-semibold text-ink">{t("blank.title")}</span>
              <span className="mt-1 block text-sm leading-snug text-muted">
                {t("blank.description")}
              </span>
            </span>
            <span className="mt-auto text-[13px] font-semibold text-primary-strong">{t("blank.action")}</span>
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
                  <Badge tone="neutral">{tIdiomas(modelo.locale === "en" ? "en" : "ptBR")}</Badge>
                  <span className="text-xs font-medium text-muted">{modelo.accountId ? t("templateCard.mine") : t("templateCard.standard")}</span>
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
                  {selecionado ? t("templateCard.selected") : t("templateCard.select")}
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
              <Label htmlFor="cliente">{t("fields.client")}</Label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    id="cliente"
                    value={formulario.clientId}
                    placeholder={t("fields.noClients")}
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
                    {t("fields.addClient")}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("fields.title")} htmlFor="titulo">
                <Input
                  id="titulo"
                  placeholder={t("fields.titlePlaceholder")}
                  value={formulario.titulo}
                  onChange={(event) => atualizarCampo("titulo", event.target.value)}
                />
              </Field>
              <Field label={t("fields.site")} htmlFor="localOperacao">
                <Input
                  id="localOperacao"
                  placeholder={t("fields.sitePlaceholder")}
                  value={formulario.localOperacao}
                  onChange={(event) => atualizarCampo("localOperacao", event.target.value)}
                />
              </Field>
              <Field label={t("fields.start")} htmlFor="dataInicio">
                <Input
                  id="dataInicio"
                  type="date"
                  value={formulario.dataInicio}
                  onChange={(event) => atualizarData("dataInicio", event.target.value)}
                />
              </Field>
              <Field label={t("fields.end")} htmlFor="dataFim">
                <Input
                  id="dataFim"
                  type="date"
                  value={formulario.dataFim}
                  onChange={(event) => atualizarData("dataFim", event.target.value)}
                />
              </Field>
            </div>

            <Field label={t("fields.scope")} htmlFor="escopo" hint={t("fields.onePerLine")}>
              <Textarea
                id="escopo"
                rows={4}
                placeholder={t("fields.scopePlaceholder")}
                value={formulario.escopo}
                onChange={(event) => atualizarCampo("escopo", event.target.value)}
              />
            </Field>

            <div className="space-y-2">
              <Label htmlFor="equipamentosExtras">{t("fields.equipment")}</Label>
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
                        {descreverCapacidade(equipamento, idiomaDoModelo(modeloAtivo))}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <Textarea
                id="equipamentosExtras"
                rows={2}
                placeholder={t("fields.equipmentPlaceholder")}
                value={formulario.equipamentosExtras}
                onChange={(event) => atualizarCampo("equipamentosExtras", event.target.value)}
              />
            </div>

            <Field label={t("fields.team")} htmlFor="equipe" hint={t("fields.onePerLine")}>
              <Textarea
                id="equipe"
                rows={3}
                placeholder={t("fields.teamPlaceholder")}
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
              <Field label={t("fields.mobilization")} htmlFor="mobilizacao" hint={t("fields.mobilizationHint")}>
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
              <Field label={t("fields.dailyRate")} htmlFor="diaria">
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
              <Field label={t("fields.days")} htmlFor="dias">
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

            <Field label={t("fields.validity")} htmlFor="validadeDias" className="sm:max-w-[220px]">
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

            <Field label={t("fields.terms")} htmlFor="condicoes" hint={t("fields.termsHint")}>
              <Textarea
                id="condicoes"
                rows={5}
                placeholder={t("fields.termsPlaceholder")}
                value={formulario.condicoes}
                onChange={(event) => atualizarCampo("condicoes", event.target.value)}
              />
            </Field>
          </Card>

          <Card className="p-5 lg:sticky lg:top-24">
            <CardTitle>{t("investment.title")}</CardTitle>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">{t("investment.mobilization")}</dt>
                <dd className="tabular font-medium text-ink">{formatarMoeda(totais.mobilization)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">{t("investment.daily", { count: totais.days })}</dt>
                <dd className="tabular font-medium text-ink">{formatarMoeda(totais.dailyRate * totais.days)}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-dashed border-outline pt-4">
              <p className="meta-label">{t("investment.total")}</p>
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
                <CardTitle>{t("photos.title")}</CardTitle>
                <CardDescription>{t("photos.description", { max: MAX_ATTACHMENTS })}</CardDescription>
              </div>
              <UploadArea
                hint={t("photos.hint")}
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
                <p className="text-xs text-muted">{t("photos.none")}</p>
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <CardTitle>{t("checklist.title")}</CardTitle>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                {[t("checklist.review"), t("checklist.confirm"), t("checklist.company")].map((item) => (
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
              loadingText={t("actions.generating")}
              disabled={createProposalFlow.isPending}
              onClick={() => createProposalFlow.mutate({ gerarPdf: true })}
            >
              {t("actions.generate")}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              loading={createProposalFlow.isPending && createProposalFlow.variables?.gerarPdf === false}
              loadingText={t("actions.saving")}
              disabled={createProposalFlow.isPending}
              onClick={() => createProposalFlow.mutate({ gerarPdf: false })}
            >
              {t("actions.draft")}
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
          {t("actions.back")}
        </Button>
        <span className="tabular text-[13px] font-medium text-muted">
          {t("actions.step", { current: stepIndex + 1, total: steps.length })}
        </span>
        {stepIndex < steps.length - 1 ? (
          <Button onClick={handleNext} disabled={!modeloId || createProposalFlow.isPending}>
            {t("actions.next")}
            <CaretRight size={14} weight="bold" />
          </Button>
        ) : (
          <span className="w-[104px]" aria-hidden />
        )}
      </div>

      <Modal
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        title={t("addClient.title")}
        description={t("addClient.description")}
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
          <Field label={t("addClient.name")} htmlFor="novo-cliente-nome">
            <Input
              id="novo-cliente-nome"
              autoFocus
              value={newClient.name}
              onChange={(e) => setNewClient((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>
          <Field label={t("addClient.company")} htmlFor="novo-cliente-empresa" optional={t("addClient.optional")}>
            <Input
              id="novo-cliente-empresa"
              value={newClient.companyName}
              onChange={(e) => setNewClient((s) => ({ ...s, companyName: e.target.value }))}
            />
          </Field>
          {createClient.isError && <Notice tone="danger">{mensagemDeErro(createClient.error)}</Notice>}
        </ModalBody>
        <ModalFooter>
          <ModalClose asChild>
            <Button type="button" variant="ghost">
              {t("addClient.cancel")}
            </Button>
          </ModalClose>
          <Button type="submit" loading={createClient.isPending} disabled={!newClient.name.trim()}>
            {t("addClient.submit")}
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
