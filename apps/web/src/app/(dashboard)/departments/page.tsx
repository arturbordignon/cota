"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretDown, CaretLeft, Plus, SquaresFour, Trash } from "@phosphor-icons/react";
import Link from "next/link";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
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
  const tNav = useTranslations("navigation");

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
        <Notice tone="neutral">{t("restricted.callout")}</Notice>
      </section>
    );
  }

  const presetOptions: { value: Exclude<DepartmentPreset, "custom">; label: string }[] = [
    { value: "none", label: t("presets.options.none") },
    { value: "view", label: t("presets.options.view") },
    { value: "all", label: t("presets.options.all") },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <>
            <Button asChild variant="ghost">
              <Link href="/team">
                <CaretLeft size={14} weight="bold" />
                {tNav("team")}
              </Link>
            </Button>
            <Button onClick={() => handleDialogOpenChange(true)}>
              <Plus size={16} weight="bold" />
              {t("actions.new")}
            </Button>
          </>
        }
      />

      <Notice tone="neutral">{t("infoCard")}</Notice>

      {pageError ? <Notice tone="danger">{pageError}</Notice> : null}

      {loadError ? (
        <Notice tone="danger">
          {t("states.loadError")}: {loadError.message}
        </Notice>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={<SquaresFour size={24} weight="bold" />}
          title={t("states.empty")}
          action={
            <Button onClick={() => handleDialogOpenChange(true)}>
              <Plus size={16} weight="bold" />
              {t("actions.new")}
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {departments.map((department) => {
            const isSaving = savingDepartmentId === department.id;
            const isExpanded = expanded[department.id] ?? false;
            const toggleExpanded = () =>
              setExpanded((prev) => ({ ...prev, [department.id]: !isExpanded }));
            const isDeleting =
              deleteDepartmentMutation.isPending && departmentToDelete?.id === department.id;

            return (
              <Card key={department.id}>
                <div className="flex items-start gap-3 p-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-sans text-[15px] font-semibold text-ink">{department.name}</h3>
                      <Badge tone="brand">{t(`presets.badge.${department.permissionPreset}`)}</Badge>
                    </div>
                    {department.description ? (
                      <p className="text-sm leading-relaxed text-muted">{department.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={toggleExpanded} aria-expanded={isExpanded}>
                      {isExpanded ? t("list.hideDetails") : t("list.showDetails")}
                      <CaretDown
                        size={12}
                        weight="bold"
                        className={cn("transition-transform", isExpanded && "rotate-180")}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setDepartmentToDelete(department);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={isDeleting}
                      aria-label={t("list.delete")}
                      title={t("list.delete")}
                      className="hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>

                <div className={cn("space-y-5 border-t border-border p-5", !isExpanded && "hidden")}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("fields.name")} htmlFor={`department-name-${department.id}`}>
                      <Input
                        id={`department-name-${department.id}`}
                        value={department.name}
                        onChange={(event) => updateDepartmentField(department.id, "name", event.target.value)}
                        onBlur={() => handleFieldBlur(department.id, "name")}
                        disabled={isSaving || isUpdatingDepartment}
                      />
                    </Field>
                    <Field label={t("fields.description")} htmlFor={`department-description-${department.id}`}>
                      <Textarea
                        id={`department-description-${department.id}`}
                        value={department.description ?? ""}
                        onChange={(event) => updateDepartmentField(department.id, "description", event.target.value)}
                        onBlur={() => handleFieldBlur(department.id, "description")}
                        rows={2}
                        className="min-h-[40px]"
                        disabled={isSaving || isUpdatingDepartment}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="meta-label">{t("presets.applyLabel")}</p>
                    <Segmented
                      options={presetOptions}
                      value={department.permissionPreset as Exclude<DepartmentPreset, "custom">}
                      onChange={(preset) => applyPreset(department.id, preset)}
                      disabled={isSaving || isUpdatingDepartment}
                      ariaLabel={t("presets.applyLabel")}
                      size="sm"
                    />
                  </div>

                  <PermissionMatrix
                    permissions={department.permissions}
                    onToggle={(module, field) => togglePermission(department.id, module, field)}
                    disabled={isSaving || isUpdatingDepartment}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        title={t("dialog.title")}
        description={t("dialog.description")}
        closeLabel={t("dialog.close")}
        size="lg"
        onSubmit={(event) => {
          event.preventDefault();
          handleCreateDepartment();
        }}
      >
        <ModalBody>
          <Field label={t("fields.name")} htmlFor="department-name">
            <Input
              id="department-name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={t("placeholders.name")}
              autoFocus
              disabled={isCreatingDepartment}
            />
          </Field>
          <Field label={t("fields.description")} htmlFor="department-description">
            <Textarea
              id="department-description"
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              rows={2}
              placeholder={t("placeholders.description")}
              disabled={isCreatingDepartment}
            />
          </Field>
          <div className="space-y-2">
            <Label>{t("fields.preset")}</Label>
            <Segmented
              options={presetOptions}
              value={draft.preset as Exclude<DepartmentPreset, "custom">}
              onChange={(preset) =>
                setDraft((prev) => ({
                  ...prev,
                  preset,
                  permissions: createPermissionMap(preset),
                }))
              }
              disabled={isCreatingDepartment}
              ariaLabel={t("fields.preset")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("fields.permissions")}</Label>
            <PermissionMatrix
              permissions={draft.permissions}
              onToggle={handleToggleDraftPermission}
              disabled={isCreatingDepartment}
            />
          </div>

          {dialogError ? <Notice tone="danger">{dialogError}</Notice> : null}
        </ModalBody>
        <ModalFooter>
          <ModalClose asChild>
            <Button type="button" variant="ghost">
              {t("dialog.actions.cancel")}
            </Button>
          </ModalClose>
          <Button type="submit" loading={isCreatingDepartment} loadingText={t("dialog.actions.saving")}>
            {t("dialog.actions.submit")}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDepartmentToDelete(null);
            setDeleteError(null);
          }
          setDeleteDialogOpen(open);
        }}
        size="sm"
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description", { name: departmentToDelete?.name ?? "" })}
      >
        {deleteError ? (
          <ModalBody>
            <Notice tone="danger">{deleteError}</Notice>
          </ModalBody>
        ) : null}
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="ghost" disabled={deleteDepartmentMutation.isPending}>
              {t("deleteDialog.cancel")}
            </Button>
          </ModalClose>
          <Button
            variant="danger"
            onClick={() =>
              departmentToDelete && deleteDepartmentMutation.mutate(departmentToDelete.id)
            }
            loading={deleteDepartmentMutation.isPending}
            loadingText={t("deleteDialog.deleting")}
          >
            {t("deleteDialog.confirm")}
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
}

function PermissionMatrix({
  permissions,
  onToggle,
  disabled,
}: {
  permissions: DepartmentPermissionMap;
  onToggle: (module: PermissionModuleKey, field: "view" | "edit") => void;
  disabled?: boolean;
}) {
  const tModules = useTranslations("common.permissionModules");
  const tPermissions = useTranslations("common.permissions");

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {permissionModules.map((module) => {
        const ability = permissions[module] ?? { view: false, edit: false };
        return (
          <li key={module} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{tModules(`${module}.label`)}</p>
              <p className="text-xs text-muted">{tModules(`${module}.description`)}</p>
            </div>
            <div className="flex gap-1.5">
              <Toggle pressed={ability.view} onPressedChange={() => onToggle(module, "view")} disabled={disabled}>
                {tPermissions("actions.view")}
              </Toggle>
              <Toggle
                pressed={ability.edit}
                onPressedChange={() => onToggle(module, "edit")}
                disabled={!ability.view || disabled}
              >
                {tPermissions("actions.edit")}
              </Toggle>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
