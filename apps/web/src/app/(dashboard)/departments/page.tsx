"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SquaresFour, X } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { permissionModules, type PermissionModuleKey } from "@/config/permission-modules";
import { permissionModuleCopy } from "@/config/permission-module-copy";
import {
  cloneDepartment,
  clonePermissionMap,
  createPermissionMap,
  sampleDepartments,
  type Department,
  type DepartmentPreset,
} from "@/data/mock/departments";

interface DepartmentDraft {
  name: string;
  description: string;
  preset: DepartmentPreset;
  permissions: Record<PermissionModuleKey, { view: boolean; edit: boolean }>;
}

function createDraft(preset: DepartmentPreset = "none"): DepartmentDraft {
  return {
    name: "",
    description: "",
    preset,
    permissions: createPermissionMap(preset),
  };
}

export default function DepartmentsPage() {
  const { isAdmin } = useCurrentUser();
  const [departments, setDepartments] = useState<Department[]>(() => sampleDepartments.map(cloneDepartment));
  const [draft, setDraft] = useState<DepartmentDraft>(() => createDraft("view"));
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <PageHeader
          title="Departamentos"
          description="Somente administradores podem gerenciar departamentos e permissões."
        />
        <Card className="border border-outline/30 bg-white px-6 py-4 text-sm text-muted">
          <p>Solicite acesso administrativo para alterar as regras de permissão.</p>
        </Card>
      </section>
    );
  }

  const togglePermission = (departmentId: string, module: PermissionModuleKey, field: "view" | "edit") => {
    setDepartments((prev) =>
      prev.map((department) => {
        if (department.id !== departmentId) return department;
        const next = cloneDepartment(department);
        const ability = next.permissions[module] ?? { view: false, edit: false };

        if (field === "view") {
          const newView = !ability.view;
          ability.view = newView;
          if (!newView) {
            ability.edit = false;
          }
        } else {
          const newEdit = !ability.edit;
          ability.edit = newEdit;
          if (newEdit) {
            ability.view = true;
          }
        }

        next.permissions[module] = ability;
        return next;
      })
    );
  };

  const updateDepartmentField = (departmentId: string, field: "name" | "description", value: string) => {
    setDepartments((prev) =>
      prev.map((department) =>
        department.id === departmentId ? { ...department, [field]: value } : department
      )
    );
  };

  const applyPreset = (departmentId: string, preset: Exclude<DepartmentPreset, "custom">) => {
    setDepartments((prev) =>
      prev.map((department) =>
        department.id === departmentId
          ? { ...department, permissionPreset: preset, permissions: createPermissionMap(preset) }
          : department
      )
    );
  };

  const handleToggleDraftPermission = (module: PermissionModuleKey, field: "view" | "edit") => {
    setDraft((prev) => {
      const nextPermissions = clonePermissionMap(prev.permissions);
      const ability = nextPermissions[module] ?? { view: false, edit: false };

      if (field === "view") {
        const newView = !ability.view;
        ability.view = newView;
        if (!newView) ability.edit = false;
      } else {
        const newEdit = !ability.edit;
        ability.edit = newEdit;
        if (newEdit) ability.view = true;
      }

      nextPermissions[module] = ability;
      return {
        ...prev,
        permissions: nextPermissions,
        preset: "custom",
      };
    });
  };

  const handleCreateDepartment = () => {
    if (!draft.name.trim()) return;

    const id = `dept-${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    setDepartments((prev) => [
      ...prev,
      {
        id,
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        permissionPreset: draft.preset,
        permissions: clonePermissionMap(draft.permissions),
      },
    ]);

    setDialogOpen(false);
    setDraft(createDraft("view"));
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Departamentos"
        description="Defina funções e permissões por departamento para padronizar o acesso da equipe."
        action={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <SquaresFour size={18} weight="bold" />
            Novo departamento
          </Button>
        }
      />

      <Card className="border border-outline/40 bg-white px-6 py-4 text-sm text-muted">
        <p>
          Cada departamento concentra permissões que serão herdadas pelos membros associados. Utilize presets para agilizar
          a configuração e ajuste módulos individualmente conforme necessário.
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {departments.map((department) => (
          <Card key={department.id} className="space-y-4 border border-outline/60 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={department.name}
                    onChange={(event) => updateDepartmentField(department.id, "name", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={department.description ?? ""}
                    onChange={(event) => updateDepartmentField(department.id, "description", event.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <Badge tone="info">{department.permissionPreset ?? "Custom"}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted">Aplicar preset:</span>
              <Button size="sm" variant="ghost" onClick={() => applyPreset(department.id, "none")}>Nenhum</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset(department.id, "view")}>
                Somente ver
              </Button>
              <Button size="sm" onClick={() => applyPreset(department.id, "all")}>Acesso total</Button>
            </div>

            <div className="space-y-2">
              {permissionModules.map((module) => {
                const ability = department.permissions[module] ?? { view: false, edit: false };
                const copy = permissionModuleCopy[module];
                return (
                  <div
                    key={module}
                    className="rounded-xl border border-outline/40 bg-[var(--color-surface-muted)]/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{copy.label}</p>
                        <p className="text-xs text-muted">{copy.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={ability.view ? "primary" : "outline"}
                          onClick={() => togglePermission(department.id, module, "view")}
                        >
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant={ability.edit ? "primary" : "outline"}
                          onClick={() => togglePermission(department.id, module, "edit")}
                          disabled={!ability.view}
                        >
                          Editar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleCreateDepartment();
              }}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-outline/30 bg-[var(--color-surface-muted)]/50 px-6 py-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-ink">Novo departamento</Dialog.Title>
                  <Dialog.Description className="text-xs text-muted">
                    Defina um nome e escolha um preset para agilizar a configuração das permissões.
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

              <div className="grid gap-4 px-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="department-name">Nome</Label>
                  <Input
                    id="department-name"
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ex.: Comercial"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department-description">Descrição</Label>
                  <Textarea
                    id="department-description"
                    value={draft.description}
                    onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    placeholder="Resumo do propósito desse departamento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preset</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.preset === "none" ? "primary" : "outline"}
                      onClick={() => setDraft(createDraft("none"))}
                    >
                      Nenhum
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.preset === "view" ? "primary" : "outline"}
                      onClick={() => setDraft(createDraft("view"))}
                    >
                      Somente ver
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.preset === "all" ? "primary" : "outline"}
                      onClick={() => setDraft(createDraft("all"))}
                    >
                      Acesso total
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-ink">Permissões</p>
                  {permissionModules.map((module) => {
                    const ability = draft.permissions[module] ?? { view: false, edit: false };
                    const copy = permissionModuleCopy[module];
                    return (
                      <div key={module} className="rounded-xl border border-outline/40 bg-[var(--color-surface-muted)]/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">{copy.label}</p>
                            <p className="text-xs text-muted">{copy.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={ability.view ? "primary" : "outline"}
                              onClick={() => handleToggleDraftPermission(module, "view")}
                            >
                              Ver
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={ability.edit ? "primary" : "outline"}
                              onClick={() => handleToggleDraftPermission(module, "edit")}
                              disabled={!ability.view}
                            >
                              Editar
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <footer className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={!draft.name.trim()}>
                  Salvar departamento
                </Button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
