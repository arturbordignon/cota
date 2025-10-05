"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SquaresFour, Trash, X } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { permissionModules, type PermissionModuleKey } from "@/config/permission-modules";
import { useApi } from "@/hooks/use-api";
import {
  clonePermissionMap,
  createPermissionMap,
  normalizePermissionMap,
  type DepartmentPermissionMap,
  type DepartmentPreset,
} from "@/data/mock/departments";
import {
  DepartmentSummary,
  DepartmentPermission,
  DepartmentResponse,
  TeamOverviewResponse,
} from "@/types/api";
import { cn } from "@/lib/utils";

interface DepartmentView
  extends Omit<DepartmentSummary, "permissions" | "permissionPreset"> {
  permissionPreset: DepartmentPreset;
  permissions: DepartmentPermissionMap;
}

interface DepartmentDraft {
  name: string;
  description: string;
  preset: DepartmentPreset;
  permissions: DepartmentPermissionMap;
}

interface DepartmentPayload {
  name?: string;
  description?: string | null;
  permissionPreset?: DepartmentPreset;
  permissions?: DepartmentPermissionMap;
}

interface DepartmentCreatePayload extends DepartmentPayload {
  name: string;
  permissionPreset: DepartmentPreset;
  permissions: DepartmentPermissionMap;
}

function toPreset(value?: string | null): DepartmentPreset {
  if (!value) return "custom";
  const normalized = value.toLowerCase();
  if (normalized === "none" || normalized === "view" || normalized === "all" || normalized === "custom") {
    return normalized;
  }
  return "custom";
}

function enrichDepartment(summary: DepartmentSummary): DepartmentView {
  const preset = toPreset(summary.permissionPreset);
  const fallbackPreset = preset === "custom" ? "none" : preset;
  const normalizedPermissions = normalizePermissionMap(
    summary.permissions as Partial<Record<PermissionModuleKey, Partial<DepartmentPermission>>>,
    fallbackPreset as Exclude<DepartmentPreset, "custom">,
  );

  return {
    ...summary,
    name: summary.name.trim(),
    description: summary.description?.trim() ?? null,
    permissionPreset: preset,
    permissions: normalizedPermissions,
  };
}

function createDraft(preset: DepartmentPreset = "view"): DepartmentDraft {
  const basePreset = preset === "custom" ? "none" : preset;
  return {
    name: "",
    description: "",
    preset,
    permissions: createPermissionMap(basePreset as Exclude<DepartmentPreset, "custom">),
  };
}

type FieldKey = `${string}:${"name" | "description"}`;

export default function DepartmentsPage() {
  const { isOwner } = useCurrentUser();
  const t = useTranslations("departments");
  const tModules = useTranslations("common.permissionModules");
  const tPermissions = useTranslations("common.permissions");

  const api = useApi();
  const queryClient = useQueryClient();

  const [departments, setDepartments] = useState<DepartmentView[]>([]);
  const [baselines, setBaselines] = useState<Record<FieldKey, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DepartmentDraft>(() => createDraft("view"));
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [savingDepartmentId, setSavingDepartmentId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<DepartmentView | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const departmentsQuery = useQuery({
    queryKey: ["team", "departments"],
    queryFn: async () => api.get<TeamOverviewResponse>("/team"),
    enabled: isOwner && Boolean(api.token),
    staleTime: 30 * 1000,
  });

  const departmentsData = useMemo(
    () => departmentsQuery.data?.data.departments ?? [],
    [departmentsQuery.data?.data.departments],
  );

  useEffect(() => {
    if (!departmentsData) return;
    const normalized = departmentsData.map(enrichDepartment);
    setDepartments(normalized);

    const nextBaselines: Record<FieldKey, string> = {};
    for (const department of normalized) {
      nextBaselines[`${department.id}:name`] = department.name.trim();
      nextBaselines[`${department.id}:description`] = (department.description ?? "").trim();
    }
    setBaselines(nextBaselines);
    setExpanded((prev) => {
      const next = { ...prev };
      normalized.forEach((department, index) => {
        if (next[department.id] === undefined) {
          next[department.id] = index < 2;
        }
      });
      return next;
    });
  }, [departmentsData]);

  const invalidateTeamOverview = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["team", "overview"] });
    queryClient.invalidateQueries({ queryKey: ["team", "departments"] });
  }, [queryClient]);

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepartmentPayload }) =>
      api.put<DepartmentResponse>(`/team/departments/${id}`, payload),
    onMutate: ({ id }) => {
      setPageError(null);
      setSavingDepartmentId(id);
    },
    onSuccess: (response) => {
      const normalized = enrichDepartment(response.data);
      setDepartments((prev) =>
        prev.map((department) => (department.id === normalized.id ? normalized : department)),
      );
      setBaselines((prev) => ({
        ...prev,
        [`${normalized.id}:name`]: normalized.name.trim(),
        [`${normalized.id}:description`]: (normalized.description ?? "").trim(),
      }));
      invalidateTeamOverview();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("errors.saveFailed");
      setPageError(message);
    },
    onSettled: () => {
      setSavingDepartmentId(null);
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: (payload: DepartmentCreatePayload) =>
      api.post<DepartmentResponse>("/team/departments", payload),
    onMutate: () => {
      setDialogError(null);
      setPageError(null);
    },
    onSuccess: (response) => {
      const normalized = enrichDepartment(response.data);
      setDepartments((prev) => [...prev, normalized]);
      setBaselines((prev) => ({
        ...prev,
        [`${normalized.id}:name`]: normalized.name.trim(),
        [`${normalized.id}:description`]: (normalized.description ?? "").trim(),
      }));
      invalidateTeamOverview();
      setDialogOpen(false);
      setDraft(createDraft("view"));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("errors.createFailed");
      setDialogError(message);
    },
  });

  const isCreatingDepartment = createDepartmentMutation.isPending;
  const isUpdatingDepartment = updateDepartmentMutation.isPending;

  const persistDepartment = useCallback(
    (id: string, payload: DepartmentPayload) => {
      updateDepartmentMutation.mutate({ id, payload });
    },
    [updateDepartmentMutation],
  );

  const togglePermission = useCallback(
    (departmentId: string, module: PermissionModuleKey, field: "view" | "edit") => {
      let payload: DepartmentPayload | null = null;

      setDepartments((prev) =>
        prev.map((department) => {
          if (department.id !== departmentId) return department;

          const permissions = clonePermissionMap(department.permissions);
          const ability = permissions[module] ?? { view: false, edit: false };

          if (field === "view") {
            const nextView = !ability.view;
            ability.view = nextView;
            if (!nextView) {
              ability.edit = false;
            }
          } else {
            const nextEdit = !ability.edit;
            ability.edit = nextEdit;
            if (nextEdit) {
              ability.view = true;
            }
          }

          permissions[module] = ability;
          payload = { permissionPreset: "custom", permissions: clonePermissionMap(permissions) };

          return {
            ...department,
            permissionPreset: "custom",
            permissions,
          };
        }),
      );

      if (payload) {
        persistDepartment(departmentId, payload);
      }
    },
    [persistDepartment],
  );

  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: string) => api.del(`/team/departments/${id}`),
    onMutate: () => {
      setDeleteError(null);
    },
    onSuccess: (_, id) => {
      setDepartments((prev) => prev.filter((department) => department.id !== id));
      setBaselines((prev) => {
        const next = { ...prev };
        delete next[`${id}:name`];
        delete next[`${id}:description`];
        return next;
      });
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
      invalidateTeamOverview();
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : t("errors.deleteFailed"));
    },
  });

  const applyPreset = useCallback(
    (departmentId: string, preset: Exclude<DepartmentPreset, "custom">) => {
      const permissions = createPermissionMap(preset);
      const payloadPermissions = clonePermissionMap(permissions);

      setDepartments((prev) =>
        prev.map((department) =>
          department.id === departmentId
            ? {
                ...department,
                permissionPreset: preset,
                permissions,
              }
            : department,
        ),
      );

      persistDepartment(departmentId, { permissionPreset: preset, permissions: payloadPermissions });
    },
    [persistDepartment],
  );

  const updateDepartmentField = useCallback(
    (departmentId: string, field: "name" | "description", value: string) => {
      setDepartments((prev) =>
        prev.map((department) =>
          department.id === departmentId
            ? {
                ...department,
                [field]: value,
              }
            : department,
        ),
      );
    },
    [],
  );

  const handleFieldBlur = useCallback(
    (departmentId: string, field: "name" | "description") => {
      const department = departments.find((item) => item.id === departmentId);
      if (!department) return;

      const trimmedValue = field === "name"
        ? department.name.trim()
        : (department.description ?? "").trim();

      setDepartments((prev) =>
        prev.map((item) =>
          item.id === departmentId
            ? {
                ...item,
                [field]: field === "name" ? trimmedValue : trimmedValue || null,
              }
            : item,
        ),
      );

      const key: FieldKey = `${departmentId}:${field}`;
      if ((baselines[key] ?? "") === trimmedValue) {
        return;
      }

      const payload: DepartmentPayload =
        field === "name"
          ? { name: trimmedValue }
          : { description: trimmedValue ? trimmedValue : null };

      persistDepartment(departmentId, payload);
    },
    [departments, baselines, persistDepartment],
  );

  const handleToggleDraftPermission = useCallback(
    (module: PermissionModuleKey, field: "view" | "edit") => {
      setDraft((prev) => {
        const nextPermissions = clonePermissionMap(prev.permissions);
        const ability = nextPermissions[module] ?? { view: false, edit: false };

        if (field === "view") {
          const nextView = !ability.view;
          ability.view = nextView;
          if (!nextView) ability.edit = false;
        } else {
          const nextEdit = !ability.edit;
          ability.edit = nextEdit;
          if (nextEdit) ability.view = true;
        }

        nextPermissions[module] = ability;
        return {
          ...prev,
          preset: "custom",
          permissions: nextPermissions,
        };
      });
    },
    [],
  );

  const handleCreateDepartment = useCallback(() => {
    if (isCreatingDepartment) return;
    const name = draft.name.trim();
    if (!name) {
      setDialogError(t("dialog.errors.nameRequired"));
      return;
    }

    const description = draft.description.trim();

    const payload: DepartmentCreatePayload = {
      name,
      description: description ? description : null,
      permissionPreset: draft.preset,
      permissions: draft.permissions,
    };

    createDepartmentMutation.mutate(payload);
  }, [createDepartmentMutation, draft, isCreatingDepartment, t]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (open) {
      setDraft(createDraft("view"));
      setDialogError(null);
    }
  }, []);

  const isLoading = departmentsQuery.isLoading;
  const loadError = departmentsQuery.error as Error | null;

  if (!isOwner) {
    return (
      <section className="space-y-6">
        <PageHeader title={t("restricted.title")} description={t("restricted.description")} />
        <Card className="border border-outline/30 bg-white px-6 py-4 text-sm text-muted">
          <p>{t("restricted.callout")}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button onClick={() => handleDialogOpenChange(true)} className="gap-2">
            <SquaresFour size={18} weight="bold" />
            {t("actions.new")}
          </Button>
        }
      />

      <Card className="border border-outline/40 bg-white px-6 py-4 text-sm text-muted">
        <p>{t("infoCard")}</p>
      </Card>

      {pageError ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {pageError}
        </Card>
      ) : null}

      {loadError ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t("states.loadError")}: {loadError.message}
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="border border-outline/40 bg-white px-6 py-10 text-center text-sm text-muted">
          {t("states.loading")}
        </Card>
      ) : departments.length === 0 ? (
        <Card className="border border-outline/40 bg-white px-6 py-10 text-center text-sm text-muted">
          {t("states.empty")}
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {departments.map((department) => {
            const isSaving = savingDepartmentId === department.id;
            const isExpanded = expanded[department.id] ?? false;
            const toggleExpanded = () =>
              setExpanded((prev) => ({ ...prev, [department.id]: !isExpanded }));
            const isDeleting =
              deleteDepartmentMutation.isPending && departmentToDelete?.id === department.id;

            return (
              <Card key={department.id} className="space-y-4 border border-outline/60 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-base font-semibold text-ink">{department.name}</h3>
                      {department.description ? (
                        <p className="text-sm text-muted">{department.description}</p>
                      ) : null}
                    </div>
                    <Badge tone="info">
                      {t(`presets.badge.${department.permissionPreset}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={toggleExpanded}>
                      {isExpanded ? t('list.hideDetails') : t('list.showDetails')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setDepartmentToDelete(department);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={isDeleting}
                    >
                      <Trash size={14} />
                      {t('list.delete')}
                    </Button>
                  </div>
                </div>

                <div className={cn('space-y-4 border-t border-outline/20 pt-4', !isExpanded && 'hidden')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted">{t("presets.applyLabel")}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => applyPreset(department.id, "none")}
                      disabled={isSaving || isUpdatingDepartment}
                    >
                      {t("presets.options.none")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset(department.id, "view")}
                      disabled={isSaving || isUpdatingDepartment}
                    >
                      {t("presets.options.view")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => applyPreset(department.id, "all")}
                      disabled={isSaving || isUpdatingDepartment}
                    >
                      {t("presets.options.all")}
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("fields.name")}</Label>
                      <Input
                        value={department.name}
                        onChange={(event) => updateDepartmentField(department.id, "name", event.target.value)}
                        onBlur={() => handleFieldBlur(department.id, "name")}
                        disabled={isSaving || isUpdatingDepartment}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("fields.description")}</Label>
                      <Textarea
                        value={department.description ?? ""}
                        onChange={(event) => updateDepartmentField(department.id, "description", event.target.value)}
                        onBlur={() => handleFieldBlur(department.id, "description")}
                        rows={3}
                        disabled={isSaving || isUpdatingDepartment}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {permissionModules.map((module) => {
                      const ability = department.permissions[module] ?? { view: false, edit: false };
                      return (
                        <div
                          key={module}
                          className="rounded-xl border border-outline/40 bg-[var(--color-surface-muted)]/60 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink">{tModules(`${module}.label`)}</p>
                              <p className="text-xs text-muted">{tModules(`${module}.description`)}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={ability.view ? "primary" : "outline"}
                                onClick={() => togglePermission(department.id, module, "view")}
                                disabled={isSaving || isUpdatingDepartment}
                              >
                                {tPermissions("actions.view")}
                              </Button>
                              <Button
                                size="sm"
                                variant={ability.edit ? "primary" : "outline"}
                                onClick={() => togglePermission(department.id, module, "edit")}
                                disabled={!ability.view || isSaving || isUpdatingDepartment}
                              >
                                {tPermissions("actions.edit")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:items-center">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleCreateDepartment();
              }}
              className="flex w-full max-w-2xl max-h-[90vh] md:max-h-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-outline/30 bg-[var(--color-surface-muted)]/50 px-6 py-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-ink">{t("dialog.title")}</Dialog.Title>
                  <Dialog.Description className="text-xs text-muted">{t("dialog.description")}</Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label={t("dialog.close")}
                    className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </Dialog.Close>
              </header>

              <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="department-name">{t("fields.name")}</Label>
                  <Input
                    id="department-name"
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder={t("placeholders.name")}
                    autoFocus
                    disabled={isCreatingDepartment}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department-description">{t("fields.description")}</Label>
                  <Textarea
                    id="department-description"
                    value={draft.description}
                    onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    placeholder={t("placeholders.description")}
                    disabled={isCreatingDepartment}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("fields.preset")}</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.preset === "none" ? "primary" : "outline"}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          preset: "none",
                          permissions: createPermissionMap("none"),
                        }))
                      }
                      disabled={isCreatingDepartment}
                    >
                      {t("presets.options.none")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.preset === "view" ? "primary" : "outline"}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          preset: "view",
                          permissions: createPermissionMap("view"),
                        }))
                      }
                      disabled={isCreatingDepartment}
                    >
                      {t("presets.options.view")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.preset === "all" ? "primary" : "outline"}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          preset: "all",
                          permissions: createPermissionMap("all"),
                        }))
                      }
                      disabled={isCreatingDepartment}
                    >
                      {t("presets.options.all")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-ink">{t("fields.permissions")}</p>
                  {permissionModules.map((module) => {
                    const ability = draft.permissions[module] ?? { view: false, edit: false };
                    return (
                      <div key={module} className="rounded-xl border border-outline/40 bg-[var(--color-surface-muted)]/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">{tModules(`${module}.label`)}</p>
                            <p className="text-xs text-muted">{tModules(`${module}.description`)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={ability.view ? "primary" : "outline"}
                              onClick={() => handleToggleDraftPermission(module, "view")}
                              disabled={isCreatingDepartment}
                            >
                              {tPermissions("actions.view")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={ability.edit ? "primary" : "outline"}
                              onClick={() => handleToggleDraftPermission(module, "edit")}
                              disabled={!ability.view || isCreatingDepartment}
                            >
                              {tPermissions("actions.edit")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {dialogError ? (
                  <p className="rounded-lg border border-danger/40 bg-danger-soft/20 px-3 py-2 text-sm text-danger">
                    {dialogError}
                  </p>
                ) : null}
              </div>

              <footer className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    {t("dialog.actions.cancel")}
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={isCreatingDepartment}>
                  {isCreatingDepartment
                    ? t("dialog.actions.saving")
                    : t("dialog.actions.submit")}
                </Button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDepartmentToDelete(null);
          setDeleteError(null);
        }
        setDeleteDialogOpen(open);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
            <Card className="w-full max-w-md space-y-4 border border-danger/40 bg-white p-6 shadow-2xl">
              <div className="space-y-1">
                <Dialog.Title className="text-lg font-semibold text-ink">
                  {t('deleteDialog.title')}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted">
                  {t('deleteDialog.description', { name: departmentToDelete?.name ?? '' })}
                </Dialog.Description>
              </div>
              {deleteError ? (
                <p className="rounded-lg border border-danger/40 bg-danger-soft/20 px-3 py-2 text-sm text-danger">
                  {deleteError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="ghost" disabled={deleteDepartmentMutation.isPending}>
                    {t('deleteDialog.cancel')}
                  </Button>
                </Dialog.Close>
                <Button
                  variant="danger"
                  onClick={() =>
                    departmentToDelete && deleteDepartmentMutation.mutate(departmentToDelete.id)
                  }
                  disabled={deleteDepartmentMutation.isPending}
                >
                  {deleteDepartmentMutation.isPending ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
                </Button>
              </div>
            </Card>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
