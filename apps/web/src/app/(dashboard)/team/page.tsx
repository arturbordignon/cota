"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { permissionModules, type PermissionModuleKey } from "@/config/permission-modules";
import { useApi } from "@/hooks/use-api";
import {
  DepartmentSummary,
  TeamMemberSummary,
  TeamOverviewResponse,
} from "@/types/api";

interface DepartmentPermissionListProps {
  department: DepartmentSummary;
}

function DepartmentPermissionList({ department }: DepartmentPermissionListProps) {
  const tModules = useTranslations("common.permissionModules");
  const tPermissions = useTranslations("common.permissions");

  return (
    <div className="grid gap-2">
      {permissionModules.map((module) => {
        const key = module as PermissionModuleKey;
        const ability = department.permissions[key] ?? { view: false, edit: false };
        const label = tModules(`${module}.label`);
        const description = tModules(`${module}.description`);

        return (
          <div
            key={module}
            className="grid gap-2 rounded-xl border border-outline/40 bg-[var(--color-surface-muted)]/60 px-4 py-3 md:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="text-xs text-muted">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={ability.view ? "success" : "warning"}>
                {ability.view
                  ? tPermissions("badges.view.enabled")
                  : tPermissions("badges.view.disabled")}
              </Badge>
              <Badge tone={ability.edit ? "info" : "warning"}>
                {ability.edit
                  ? tPermissions("badges.edit.enabled")
                  : tPermissions("badges.edit.disabled")}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AddMemberDraft {
  fullName: string;
  email: string;
  jobTitle: string;
  departmentId: string;
}

interface AddMemberDialogProps {
  open: boolean;
  departments: DepartmentSummary[];
  draft: AddMemberDraft;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (field: keyof AddMemberDraft, value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

function AddMemberDialog({
  open,
  departments,
  draft,
  onOpenChange,
  onDraftChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: AddMemberDialogProps) {
  const t = useTranslations("team.dialog");
  const isValid =
    draft.fullName.trim().length > 2 &&
    draft.email.includes("@") &&
    departments.some((department) => department.id === draft.departmentId);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (isValid && !isSubmitting) onSubmit();
            }}
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-outline/30 bg-[var(--color-surface-muted)]/50 px-6 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-ink">{t('title')}</Dialog.Title>
                <Dialog.Description className="text-xs text-muted">{t('description')}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={t('close')}
                  className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                >
                  <X size={16} weight="bold" />
                </button>
              </Dialog.Close>
            </header>

            <div className="grid gap-4 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="member-name">{t('fields.name')}</Label>
                <Input
                  id="member-name"
                  value={draft.fullName}
                  onChange={(event) => onDraftChange('fullName', event.target.value)}
                  placeholder={t('placeholders.name')}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-email">{t('fields.email')}</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) => onDraftChange('email', event.target.value)}
                  placeholder={t('placeholders.email')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">{t('fields.role')}</Label>
                <Input
                  id="member-role"
                  value={draft.jobTitle}
                  onChange={(event) => onDraftChange('jobTitle', event.target.value)}
                  placeholder={t('placeholders.role')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fields.department')}</Label>
                <Select value={draft.departmentId} onValueChange={(value) => onDraftChange('departmentId', value)}>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
            </div>

            <footer className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  {t('actions.cancel')}
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? t('actions.saving') : t('actions.submit')}
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface MemberRow extends TeamMemberSummary {
  displayName: string;
}

export default function TeamPage() {
  const { isAdmin } = useCurrentUser();
  const t = useTranslations("team");
  const api = useApi();
  const queryClient = useQueryClient();

  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [baselines, setBaselines] = useState<Record<string, string | null>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<AddMemberDraft>({
    fullName: "",
    email: "",
    jobTitle: "",
    departmentId: "",
  });
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ['team', 'overview'],
    queryFn: () => api.get<TeamOverviewResponse>('/team'),
    enabled: isAdmin && Boolean(api.token),
  });

  useEffect(() => {
    if (teamQuery.data) {
      const response = teamQuery.data.data;
      setDepartments(response.departments);

      const mappedMembers: MemberRow[] = response.members.map((member) => ({
        ...member,
        displayName: member.fullName ?? member.email.split('@')[0],
      }));
      setMembers(mappedMembers);

      const nextBaselines: Record<string, string | null> = {};
      mappedMembers.forEach((member) => {
        nextBaselines[member.id] = member.departmentId ?? null;
      });
      setBaselines(nextBaselines);

      if (response.departments.length > 0) {
        setDraft((prev) => ({
          ...prev,
          departmentId: response.departments[0]?.id ?? '',
        }));
      }
    }
  }, [teamQuery.data]);

  const departmentMap = useMemo(
    () => Object.fromEntries(departments.map((department) => [department.id, department])),
    [departments]
  );

  const departmentOptions = useMemo(
    () => departments.map((department) => ({ value: department.id, label: department.name })),
    [departments]
  );

  const handleDraftChange = (field: keyof AddMemberDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const inviteMember = useMutation({
    mutationFn: async () => {
      await api.post('/team/members', {
        fullName: draft.fullName.trim(),
        email: draft.email.trim().toLowerCase(),
        jobTitle: draft.jobTitle.trim() || undefined,
        departmentId: draft.departmentId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'overview'] });
      setDialogOpen(false);
      setDraft({ fullName: '', email: '', jobTitle: '', departmentId: draft.departmentId });
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ memberId, departmentId }: { memberId: string; departmentId: string | null }) => {
      setSavingMemberId(memberId);
      await api.put(`/team/members/${memberId}`, {
        departmentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'overview'] });
    },
    onSettled: () => {
      setSavingMemberId(null);
    },
  });

  const updateDepartment = (memberId: string, departmentId: string) => {
    const nextValue = departmentId === '' ? null : departmentId;
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, departmentId: nextValue } : member
      )
    );
  };

  const revertChanges = (memberId: string) => {
    const baseline = baselines[memberId];
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, departmentId: baseline } : member
      )
    );
  };

  const persistChanges = (memberId: string) => {
    const current = members.find((member) => member.id === memberId);
    if (!current) return;
    const nextDepartmentId = current.departmentId ? current.departmentId : null;
    updateMember.mutate({ memberId, departmentId: nextDepartmentId });
    setBaselines((prev) => ({ ...prev, [memberId]: nextDepartmentId }));
  };

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <PageHeader title={t('restricted.title')} description={t('restricted.description')} />
        <Card className="border border-outline/30 bg-white px-6 py-4 text-sm text-muted">
          <p>{t('restricted.callout')}</p>
        </Card>
      </section>
    );
  }

  const isTokenMissing = !api.token;
  const loadError = teamQuery.error as Error | null;

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para visualizar a equipe real.
        </Card>
      ) : null}

      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/departments">{t('actions.manageDepartments')}</Link>
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2" disabled={departments.length === 0}>
              <UserPlus size={18} weight="bold" />
              {t('actions.addMember')}
            </Button>
          </div>
        }
      />

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          Não foi possível carregar a equipe: {loadError.message}
        </Card>
      ) : null}

      <Card className="border border-outline/40 bg-white px-6 py-4 text-sm text-muted">
        <p>{t('infoCard')}</p>
      </Card>

      {teamQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card
              key={`team-skeleton-${index}`}
              className="h-48 animate-pulse rounded-3xl border border-outline/40 bg-white/70"
            />
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="border border-outline/30 bg-white px-6 py-10 text-center text-sm text-muted">
          {t('states.empty')}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {members.map((member) => {
            const department = member.departmentId ? departmentMap[member.departmentId] : null;
            const baseline = baselines[member.id];
            const hasChanges = (baseline ?? null) !== (member.departmentId ?? null);

            return (
              <Card key={member.id} className="space-y-4 border border-outline/60 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{member.displayName}</h3>
                    <p className="text-sm text-muted">{member.jobTitle ?? t('defaults.role')}</p>
                    <p className="text-xs text-muted">{member.email}</p>
                  </div>
                  <Badge tone="info">{department?.name ?? t('memberCard.badge.noDepartment')}</Badge>
                </div>

                <div className="space-y-2">
                  <Label>{t('memberCard.fields.department')}</Label>
                  <Select
                    value={member.departmentId ?? ''}
                    onValueChange={(value) => updateDepartment(member.id, value)}
                  >
                    <SelectItem value="">{t('memberCard.badge.noDepartment')}</SelectItem>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {department ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-ink">{t('memberCard.sections.permissions')}</p>
                    <DepartmentPermissionList department={department} />
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revertChanges(member.id)}
                    disabled={!hasChanges || savingMemberId === member.id}
                  >
                    {t('memberCard.buttons.revert')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => persistChanges(member.id)}
                    disabled={!hasChanges || savingMemberId === member.id}
                  >
                    {savingMemberId === member.id
                      ? t('memberCard.buttons.saving')
                      : t('memberCard.buttons.save')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        departments={departments}
        draft={draft}
        onDraftChange={handleDraftChange}
        onSubmit={() => inviteMember.mutate()}
        isSubmitting={inviteMember.isPending}
        errorMessage={inviteMember.error instanceof Error ? inviteMember.error.message : undefined}
      />
    </section>
  );
}
