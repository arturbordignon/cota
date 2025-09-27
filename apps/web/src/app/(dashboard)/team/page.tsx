"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { UserPlus, X } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";

const departmentOptions = [
  { value: "comercial", label: "Comercial" },
  { value: "operacoes", label: "Operações" },
  { value: "financeiro", label: "Financeiro" },
  { value: "engenharia", label: "Engenharia" }
];

const pageDefinitions = [
  { key: "dashboard", label: "Painel", description: "Resumo geral de desempenho." },
  { key: "proposals", label: "Propostas", description: "Criação, edição e envio de propostas." },
  { key: "templates", label: "Modelos", description: "Biblioteca de templates personalizados." },
  { key: "prospects", label: "Prospects", description: "Pesquisa de clientes potenciais." },
  { key: "crm", label: "Pipeline", description: "Kanban para funil comercial." },
  { key: "reports", label: "Relatórios", description: "Consultas dinâmicas e métricas." },
  { key: "plan", label: "Planos", description: "Gestão de assinatura e cobrança." }
] as const;

type PageKey = (typeof pageDefinitions)[number]["key"];
type PermissionField = "view" | "edit";

type PermissionMap = Record<PageKey, { view: boolean; edit: boolean }>;

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  department: string;
  permissions: PermissionMap;
}

type CreateMemberPayload = Omit<TeamMember, "id">;

const defaultDepartment = departmentOptions[0]?.value ?? "comercial";

function createPermissionMap(preset: "none" | "view" | "all" = "none"): PermissionMap {
  return pageDefinitions.reduce((acc, page) => {
    if (preset === "all") {
      acc[page.key] = { view: true, edit: true };
      return acc;
    }
    if (preset === "view") {
      acc[page.key] = { view: true, edit: false };
      return acc;
    }
    acc[page.key] = { view: page.key === "dashboard", edit: false };
    return acc;
  }, {} as PermissionMap);
}

function clonePermissions(permissions: PermissionMap): PermissionMap {
  return Object.fromEntries(
    Object.entries(permissions).map(([key, value]) => [key, { ...value }])
  ) as PermissionMap;
}

function cloneMember(member: TeamMember): TeamMember {
  return {
    ...member,
    permissions: clonePermissions(member.permissions),
  };
}

function togglePermissionState(
  permissions: PermissionMap,
  pageKey: PageKey,
  field: PermissionField
): PermissionMap {
  const next = clonePermissions(permissions);
  const entry = next[pageKey];
  if (!entry) return next;

  entry[field] = !entry[field];

  if (field === "view" && !entry.view) {
    entry.edit = false;
  }
  if (field === "edit" && entry.edit && !entry.view) {
    entry.view = true;
  }

  return next;
}

function areMembersEquivalent(a: TeamMember, b: TeamMember) {
  if (a.department !== b.department) return false;
  return pageDefinitions.every((page) => {
    const current = a.permissions[page.key];
    const base = b.permissions[page.key];
    return current?.view === base?.view && current?.edit === base?.edit;
  });
}

function createMemberId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const seedMembers: TeamMember[] = [
  {
    id: "1",
    name: "Marcos Dias",
    role: "Diretor Comercial",
    email: "marcos@empresa.com",
    department: "comercial",
    permissions: {
      dashboard: { view: true, edit: true },
      proposals: { view: true, edit: true },
      templates: { view: true, edit: true },
      prospects: { view: true, edit: true },
      crm: { view: true, edit: true },
      reports: { view: true, edit: true },
      plan: { view: true, edit: true },
    },
  },
  {
    id: "2",
    name: "Fernanda Alves",
    role: "Coordenadora de Operações",
    email: "fernanda@empresa.com",
    department: "operacoes",
    permissions: {
      dashboard: { view: true, edit: false },
      proposals: { view: true, edit: true },
      templates: { view: true, edit: true },
      prospects: { view: true, edit: false },
      crm: { view: true, edit: true },
      reports: { view: true, edit: false },
      plan: { view: false, edit: false },
    },
  },
];

const initialMembers = seedMembers.map(cloneMember);

interface MemberPermissionListProps {
  permissions: PermissionMap;
  isAdmin: boolean;
  onToggle?: (pageKey: PageKey, field: PermissionField) => void;
}

function MemberPermissionList({ permissions, isAdmin, onToggle }: MemberPermissionListProps) {
  return (
    <div className="space-y-2">
      {pageDefinitions.map((page) => {
        const ability = permissions[page.key] ?? { view: false, edit: false };
        return (
          <div key={page.key} className="rounded-xl border border-outline/40 bg-[var(--color-surface-muted)]/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{page.label}</p>
                <p className="text-xs text-muted">{page.description}</p>
              </div>
              {isAdmin ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={ability.view ? "primary" : "outline"}
                    onClick={() => onToggle?.(page.key, "view")}
                  >
                    Ver
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={ability.edit ? "primary" : "outline"}
                    onClick={() => onToggle?.(page.key, "edit")}
                    disabled={!ability.view}
                  >
                    Editar
                  </Button>
                </div>
              ) : (
                <Badge tone={ability.view ? "success" : "warning"}>
                  {ability.view ? "Acesso" : "Restrito"}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AddMemberDialogContentProps {
  draft: CreateMemberPayload;
  departmentOptions: typeof departmentOptions;
  onFieldChange: (field: keyof Omit<CreateMemberPayload, "permissions">, value: string) => void;
  onPermissionToggle: (pageKey: PageKey, field: PermissionField) => void;
  onPreset: (preset: "none" | "view" | "all") => void;
  onSubmit: () => void;
  isValid: boolean;
}

function AddMemberDialogContent({
  draft,
  departmentOptions,
  onFieldChange,
  onPermissionToggle,
  onPreset,
  onSubmit,
  isValid,
}: AddMemberDialogContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
      <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-outline/30 bg-[var(--color-surface-muted)]/50 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-ink">Adicionar membro</Dialog.Title>
              <Dialog.Description className="text-xs text-muted">
                Configure o departamento e os níveis de acesso antes de enviar o convite.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
              >
                <X size={16} weight="bold" />
              </button>
            </Dialog.Close>
          </header>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome completo</Label>
              <Input
                id="member-name"
                value={draft.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                placeholder="Ex.: Fernanda Matos"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email corporativo</Label>
              <Input
                id="member-email"
                type="email"
                value={draft.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                placeholder="nome@suaempresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Cargo</Label>
              <Input
                id="member-role"
                value={draft.role}
                onChange={(event) => onFieldChange("role", event.target.value)}
                placeholder="Ex.: Analista Comercial"
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select
                value={draft.department}
                onValueChange={(value) => onFieldChange("department", value)}
              >
                {departmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Permissões por módulo</p>
                  <p className="text-xs text-muted">
                    Selecione as áreas que o membro poderá visualizar ou editar.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => onPreset("none")}>
                    Limpar
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => onPreset("view")}>
                    Somente ver
                  </Button>
                  <Button type="button" size="sm" onClick={() => onPreset("all")}>
                    Acesso total
                  </Button>
                </div>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                <MemberPermissionList permissions={draft.permissions} isAdmin onToggle={onPermissionToggle} />
              </div>
            </div>
          </div>

          <footer className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={!isValid}>
              Convidar membro
            </Button>
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export default function TeamPage() {
  const { isAdmin } = useCurrentUser();
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [baselines, setBaselines] = useState<Record<string, TeamMember>>(() =>
    Object.fromEntries(initialMembers.map((member) => [member.id, cloneMember(member)]))
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CreateMemberPayload>(() => ({
    name: "",
    email: "",
    role: "",
    department: defaultDepartment,
    permissions: createPermissionMap(),
  }));

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setDraft({
        name: "",
        email: "",
        role: "",
        department: defaultDepartment,
        permissions: createPermissionMap(),
      });
    }
  };

  const handleDraftFieldChange = (
    field: keyof Omit<CreateMemberPayload, "permissions">,
    value: string
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleDraftPermissionToggle = (pageKey: PageKey, field: PermissionField) => {
    setDraft((prev) => ({
      ...prev,
      permissions: togglePermissionState(prev.permissions, pageKey, field),
    }));
  };

  const handleDraftPreset = (preset: "none" | "view" | "all") => {
    setDraft((prev) => ({
      ...prev,
      permissions: createPermissionMap(preset),
    }));
  };

  const handleCreateMember = () => {
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name || !email.includes("@")) return;

    const newMember: TeamMember = {
      id: createMemberId(),
      name,
      email: email.toLowerCase(),
      role: draft.role.trim() || "Colaborador",
      department: draft.department,
      permissions: clonePermissions(draft.permissions),
    };

    setMembers((prev) => [...prev, newMember]);
    setBaselines((prev) => ({ ...prev, [newMember.id]: cloneMember(newMember) }));
    handleDialogChange(false);
  };

  const togglePermission = (memberId: string, pageKey: PageKey, field: PermissionField) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId
          ? { ...member, permissions: togglePermissionState(member.permissions, pageKey, field) }
          : member
      )
    );
  };

  const updateDepartment = (memberId: string, value: string) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, department: value } : member))
    );
  };

  const revertChanges = (memberId: string) => {
    const baseline = baselines[memberId];
    if (!baseline) return;
    setMembers((prev) => prev.map((member) => (member.id === memberId ? cloneMember(baseline) : member)));
  };

  const persistChanges = (memberId: string) => {
    const current = members.find((member) => member.id === memberId);
    if (!current) return;
    setBaselines((prev) => ({ ...prev, [memberId]: cloneMember(current) }));
  };

  const isDraftValid =
    draft.name.trim().length > 2 &&
    draft.email.includes("@") &&
    pageDefinitions.some((page) => draft.permissions[page.key]?.view);

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={handleDialogChange}>
      <section className="space-y-6">
        <PageHeader
          title="Equipe e permissões"
          description="Defina o departamento de cada colaborador e controle o que podem visualizar ou editar na plataforma."
          action={
            isAdmin ? (
              <Dialog.Trigger asChild>
                <Button className="w-full gap-2 sm:w-auto">
                  <UserPlus size={18} weight="bold" />
                  Adicionar membro
                </Button>
              </Dialog.Trigger>
            ) : null
          }
        />

        {isAdmin ? (
          <Card className="border border-outline/40 bg-white px-6 py-4 text-sm text-muted">
            <p>
              Esta área é restrita a administradores. Atualize as permissões conforme a política interna antes de sincronizar com o backend.
            </p>
          </Card>
        ) : (
          <Card className="border border-outline/20 bg-white px-6 py-4 text-sm text-muted">
            <p>Você possui acesso em modo leitura. Contate um administrador para solicitar ajustes.</p>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {members.map((member) => {
            const baseline = baselines[member.id];
            const hasChanges = baseline ? !areMembersEquivalent(member, baseline) : true;
            const departmentLabel =
              departmentOptions.find((option) => option.value === member.department)?.label ?? "Departamento";

            return (
              <Card key={member.id} className="space-y-4 border border-outline/60 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{member.name}</h3>
                    <p className="text-sm text-muted">{member.role}</p>
                    <p className="text-xs text-muted">{member.email}</p>
                  </div>
                  <Badge tone="info">{departmentLabel}</Badge>
                </div>

                {isAdmin ? (
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Select value={member.department} onValueChange={(value) => updateDepartment(member.id, value)}>
                      {departmentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-ink">Acessos por módulo</p>
                  <MemberPermissionList
                    permissions={member.permissions}
                    isAdmin={isAdmin}
                    onToggle={(pageKey, field) => togglePermission(member.id, pageKey, field)}
                  />
                </div>

                {isAdmin ? (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => revertChanges(member.id)} disabled={!hasChanges}>
                      Reverter
                    </Button>
                    <Button size="sm" onClick={() => persistChanges(member.id)} disabled={!hasChanges}>
                      Salvar alterações
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      {isAdmin ? (
        <AddMemberDialogContent
          draft={draft}
          departmentOptions={departmentOptions}
          onFieldChange={handleDraftFieldChange}
          onPermissionToggle={handleDraftPermissionToggle}
          onPreset={handleDraftPreset}
          onSubmit={handleCreateMember}
          isValid={isDraftValid}
        />
      ) : null}
    </Dialog.Root>
  );
}
