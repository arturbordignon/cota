"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash, UserPlus, X } from "@phosphor-icons/react";

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
  TeamRankingPeriod,
  TeamRankingResponse,
} from "@/types/api";
import { cn } from "@/lib/utils";

interface DepartmentPermissionListProps {
  department: DepartmentSummary;
}

const UNASSIGNED_DEPARTMENT_VALUE = "__unassigned__";

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
  inviteLink: string | null;
  onCopyInvite: (link: string) => Promise<void>;
  copySuccess: boolean;
  inviteEmailSent: boolean | null;
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
  inviteLink,
  onCopyInvite,
  copySuccess,
  inviteEmailSent,
}: AddMemberDialogProps) {
  const t = useTranslations("team.dialog");
  const tTeam = useTranslations("team");
  const tInvite = useTranslations("team.invite");
  const hasValidDepartment =
    draft.departmentId === UNASSIGNED_DEPARTMENT_VALUE ||
    departments.some((department) => department.id === draft.departmentId);

  const isValid = draft.email.includes("@") && hasValidDepartment;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:items-center">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (isValid && !isSubmitting) onSubmit();
            }}
            className="flex w-full max-w-xl max-h-[90vh] md:max-h-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
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

            <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="member-name">
                  {t('fields.name')} <span className="text-muted">({t('placeholders.optional')})</span>
                </Label>
                <Input
                  id="member-name"
                  value={draft.fullName}
                  onChange={(event) => onDraftChange('fullName', event.target.value)}
                  placeholder={t('placeholders.name')}
                  autoFocus
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">{t('fields.role')}</Label>
                <Input
                  id="member-role"
                  value={draft.jobTitle}
                  onChange={(event) => onDraftChange('jobTitle', event.target.value)}
                  placeholder={t('placeholders.role')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fields.department')}</Label>
                <Select
                  value={draft.departmentId || UNASSIGNED_DEPARTMENT_VALUE}
                  onValueChange={(value) => onDraftChange('departmentId', value)}
                  disabled={isSubmitting}
                >
                  <SelectItem value={UNASSIGNED_DEPARTMENT_VALUE}>
                    {tTeam('memberCard.badge.noDepartment')}
                  </SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
              {inviteLink ? (
                <div className="space-y-2 rounded-xl border border-success/40 bg-success-soft/20 px-4 py-3 text-sm">
                  <p className="font-semibold text-ink">{tInvite('successTitle')}</p>
                  <p className="text-xs text-muted">{tInvite('successDescription')}</p>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={async () => {
                      await onCopyInvite(inviteLink);
                    }}
                  >
                    {tInvite('copy')}
                  </Button>
                  {copySuccess ? (
                    <p className="text-xs font-medium text-success">{tInvite('copied')}</p>
                  ) : null}
                  {inviteEmailSent === true ? (
                    <p className="text-xs font-medium text-success">{tInvite('emailSent')}</p>
                  ) : inviteEmailSent === false ? (
                    <p className="text-xs text-warning">{tInvite('emailNotSent')}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <footer className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  {t('dialog.actions.cancel')}
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                disabled={!isValid}
                loading={isSubmitting}
                loadingText={t('actions.saving')}
              >
                {t('actions.submit')}
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
  const tRoles = useTranslations("team.roles");
  const tInvite = useTranslations("team.invite");
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
    departmentId: UNASSIGNED_DEPARTMENT_VALUE,
  });
  const [rankingPeriod, setRankingPeriod] = useState<TeamRankingPeriod>("month");
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pendingInviteMemberId, setPendingInviteMemberId] = useState<string | null>(null);
  const [pendingInviteAction, setPendingInviteAction] = useState<'copy' | 'email' | null>(null);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [resentMemberId, setResentMemberId] = useState<string | null>(null);
  const [inviteEmailSent, setInviteEmailSent] = useState<boolean | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ['team', 'overview'],
    queryFn: () => api.get<TeamOverviewResponse>('/team'),
    enabled: isAdmin && Boolean(api.token),
  });

  const rankingQuery = useQuery({
    queryKey: ['team', 'ranking', rankingPeriod],
    queryFn: () => api.get<TeamRankingResponse>(`/team/ranking?period=${rankingPeriod}`),
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

      setDraft((prev) => {
        const current = prev.departmentId;
        const hasCurrent =
          current === UNASSIGNED_DEPARTMENT_VALUE ||
          response.departments.some((department) => department.id === current);
        const fallback =
          response.departments.length > 0
            ? response.departments[0]!.id
            : UNASSIGNED_DEPARTMENT_VALUE;

        return {
          ...prev,
          departmentId: hasCurrent ? current : fallback,
        };
      });
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

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setInviteLink(null);
      setCopySuccess(false);
      setInviteEmailSent(null);
      setDraft({ fullName: '', email: '', jobTitle: '', departmentId: UNASSIGNED_DEPARTMENT_VALUE });
      setPendingInviteMemberId(null);
      setPendingInviteAction(null);
      setCopiedMemberId(null);
      setResentMemberId(null);
    }
    if (open) {
      setInviteEmailSent(null);
    }
  };

  const handleCopyInvite = async (link: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 4000);
    } catch (error) {
      console.error('Failed to copy invite link', error);
      setCopySuccess(false);
    }
  };

  const inviteLinkMutation = useMutation({
    mutationFn: ({ memberId, sendEmail }: { memberId: string; sendEmail?: boolean }) =>
      api.post<{
        data: {
          inviteUrl: string;
          inviteTokenExpiresAt: string | null;
          invitedAt: string | null;
          emailSent: boolean;
        };
      }>(
        `/team/members/${memberId}/invite-link`,
        sendEmail ? { sendEmail } : {},
      ),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => api.del(`/team/members/${memberId}`),
    onSuccess: (_, memberId) => {
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
      setBaselines((prev) => {
        const { [memberId]: _discarded, ...rest } = prev;
        return rest;
      });
      queryClient.invalidateQueries({ queryKey: ['team', 'overview'] });
      setDeleteTarget((current) => (current?.id === memberId ? null : current));
      setDeleteError(null);
    },
    onSettled: () => {
      setDeletingMemberId(null);
    },
  });

  const applyInviteUpdate = useCallback(
    (memberId: string, payload: { inviteUrl: string; inviteTokenExpiresAt: string | null; invitedAt: string | null }) => {
      setMembers((prev) =>
        prev.map((member) =>
          member.id === memberId
            ? {
                ...member,
                inviteUrl: payload.inviteUrl,
                inviteTokenExpiresAt: payload.inviteTokenExpiresAt,
                invitedAt: payload.invitedAt,
              }
            : member,
        ),
      );
    },
    [setMembers],
  );

  const handleCopyMemberInvite = useCallback(
    async (memberId: string) => {
      try {
        setPendingInviteMemberId(memberId);
        setPendingInviteAction('copy');
        const response = await inviteLinkMutation.mutateAsync({ memberId });
        applyInviteUpdate(memberId, response.data);
        await handleCopyInvite(response.data.inviteUrl);
        setCopiedMemberId(memberId);
        setTimeout(() => {
          setCopiedMemberId((prev) => (prev === memberId ? null : prev));
        }, 4000);
      } catch (error) {
        console.error('Failed to copy invite link', error);
      } finally {
        setPendingInviteMemberId(null);
        setPendingInviteAction(null);
      }
    },
    [applyInviteUpdate, handleCopyInvite, inviteLinkMutation],
  );

  const handleResendInvite = useCallback(
    async (memberId: string) => {
      try {
        setPendingInviteMemberId(memberId);
        setPendingInviteAction('email');
        const response = await inviteLinkMutation.mutateAsync({ memberId, sendEmail: true });
        applyInviteUpdate(memberId, response.data);
        setResentMemberId(memberId);
        setTimeout(() => {
          setResentMemberId((prev) => (prev === memberId ? null : prev));
        }, 4000);
      } catch (error) {
        console.error('Failed to resend invite email', error);
      } finally {
        setPendingInviteMemberId(null);
        setPendingInviteAction(null);
      }
    },
    [applyInviteUpdate, inviteLinkMutation],
  );

  const handleDeleteMember = useCallback(
    (member: MemberRow) => {
      setDeleteError(null);
      setDeleteTarget(member);
    },
    [],
  );

  const confirmDeleteMember = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeletingMemberId(deleteTarget.id);
      setDeleteError(null);
      await removeMember.mutateAsync(deleteTarget.id);
    } catch (error) {
      console.error('Failed to delete pending invite', error);
      setDeleteError(error instanceof Error ? error.message : tInvite('deleteError'));
    }
  }, [deleteTarget, removeMember, tInvite]);

  const inviteMember = useMutation({
    mutationFn: async () => {
      return api.post<{
        data: TeamMemberSummary & {
          inviteUrl?: string | null;
          inviteTokenExpiresAt?: string | null;
          invitedAt?: string | null;
          emailSent?: boolean;
        };
      }>('/team/members', {
        fullName: draft.fullName.trim(),
        email: draft.email.trim().toLowerCase(),
        jobTitle: draft.jobTitle.trim() || undefined,
        departmentId:
          draft.departmentId === UNASSIGNED_DEPARTMENT_VALUE ? undefined : draft.departmentId,
      });
    },
    onMutate: () => {
      setInviteEmailSent(null);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['team', 'overview'] });
      setInviteLink(result.data.inviteUrl ?? null);
      setInviteEmailSent(result.data.emailSent ?? null);
      setCopySuccess(false);
      setDraft({ fullName: '', email: '', jobTitle: '', departmentId: draft.departmentId });
    },
    onError: () => {
      setInviteEmailSent(null);
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
    const nextValue = departmentId === UNASSIGNED_DEPARTMENT_VALUE ? null : departmentId;
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

  const isTokenMissing = !api.token;
  const loadError = teamQuery.error as Error | null;
  const rankingLoadError = rankingQuery.isError ? (rankingQuery.error as Error) : null;
  const rankingEntries = rankingQuery.data?.data.entries ?? [];
  const rankingPeriodOptions = useMemo(
    () => [
      { value: 'month' as TeamRankingPeriod, label: t('ranking.period.month') },
      { value: 'quarter' as TeamRankingPeriod, label: t('ranking.period.quarter') },
      { value: 'year' as TeamRankingPeriod, label: t('ranking.period.year') },
    ],
    [t]
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }),
    []
  );

  const formatCurrency = (value: number) => currencyFormatter.format(value);

  const resolveRoleLabel = useCallback(
    (role: string | null | undefined, fallback: string | null | undefined) => {
      if (fallback && fallback.trim().length > 0) {
        return fallback.trim();
      }
      const value = role?.toLowerCase() ?? 'member';
      switch (value) {
        case 'owner':
          return tRoles('owner');
        case 'admin':
          return tRoles('admin');
        case 'manager':
          return tRoles('manager');
        case 'viewer':
          return tRoles('viewer');
        default:
          return tRoles('member');
      }
    },
    [tRoles],
  );

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

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          {t('alerts.missingToken')}
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
            <Button onClick={() => handleDialogOpenChange(true)} className="gap-2">
              <UserPlus size={18} weight="bold" />
              {t('actions.addMember')}
            </Button>
          </div>
        }
      />

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t('alerts.loadError', { message: loadError.message })}
        </Card>
      ) : null}

      <Card className="border border-outline/40 bg-white px-6 py-4 text-sm text-muted">
        <p>{t('infoCard')}</p>
      </Card>

      <Card className="space-y-4 border border-outline/50 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ink">{t('ranking.title')}</h3>
            <p className="text-xs text-muted">{t('ranking.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            {rankingPeriodOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={rankingPeriod === option.value ? 'primary' : 'ghost'}
                onClick={() => setRankingPeriod(option.value)}
                disabled={!isAdmin || isTokenMissing}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {rankingLoadError && !isTokenMissing ? (
          <div className="rounded-xl border border-danger/40 bg-danger-soft/20 px-4 py-3 text-sm text-danger">
            {t('ranking.error', { message: rankingLoadError.message })}
          </div>
        ) : rankingQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={`ranking-skeleton-${index}`}
                className="h-24 animate-pulse rounded-2xl border border-outline/40 bg-white/70"
              />
            ))}
          </div>
        ) : rankingEntries.length === 0 ? (
          <Card className="border border-outline/30 bg-white px-4 py-6 text-center text-sm text-muted">
            {t('ranking.empty')}
          </Card>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {rankingEntries.slice(0, 5).map((entry, index) => (
                <Card
                  key={entry.memberId}
                  className="flex items-center justify-between gap-4 border border-outline/40 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{entry.name}</p>
                      <p className="text-xs text-muted">
                        {entry.department ?? t('memberCard.badge.noDepartment')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink">{formatCurrency(entry.totalValue)}</p>
                    <p className="text-xs text-muted">
                      {t('ranking.metrics.accepted', { count: entry.acceptedProposals })}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-5">
              {rankingEntries.slice(0, 5).map((entry, index) => (
                <Card
                  key={`${entry.memberId}-desktop`}
                  className={cn(
                    'flex flex-col gap-3 border border-outline/40 bg-white p-4',
                    index >= 3 ? 'hidden xl:flex' : 'flex'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-base font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{entry.name}</p>
                      <p className="text-xs text-muted">
                        {entry.department ?? t('memberCard.badge.noDepartment')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="font-semibold text-ink">{formatCurrency(entry.totalValue)}</p>
                    <p className="text-xs text-muted">
                      {t('ranking.metrics.accepted', { count: entry.acceptedProposals })}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
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
                    <p className="text-sm text-muted">
                      {resolveRoleLabel(member.role, member.jobTitle)}
                    </p>
                    <p className="text-xs text-muted">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="info">{department?.name ?? t('memberCard.badge.noDepartment')}</Badge>
                    {!member.isActive ? (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteMember(member)}
                        loading={deletingMemberId === member.id}
                        loadingText={tInvite('deleting')}
                      >
                        <Trash size={14} weight="bold" />
                        {tInvite('delete')}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('memberCard.fields.department')}</Label>
                 <Select
                    value={member.departmentId ?? UNASSIGNED_DEPARTMENT_VALUE}
                    onValueChange={(value) => updateDepartment(member.id, value)}
                    disabled={savingMemberId === member.id}
                  >
                    <SelectItem value={UNASSIGNED_DEPARTMENT_VALUE}>
                      {t('memberCard.badge.noDepartment')}
                    </SelectItem>
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

                {!member.isActive ? (
                  <div className="rounded-lg border border-outline/30 bg-[var(--color-surface-muted)]/50 px-3 py-3 text-xs text-muted">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>{tInvite('pendingNote')}</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResendInvite(member.id)}
                          loading={pendingInviteMemberId === member.id && pendingInviteAction === 'email'}
                          loadingText={tInvite('resending')}
                        >
                          {tInvite('resend')}
                        </Button>
                      </div>
                    </div>
                    {member.inviteUrl ? (
                      <div className="mt-3 space-y-2 text-left">
                        <p className="text-xs font-medium text-ink">{tInvite('linkLabel')}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await handleCopyInvite(member.inviteUrl!);
                              setCopiedMemberId(member.id);
                              setTimeout(() => {
                                setCopiedMemberId((prev) => (prev === member.id ? null : prev));
                              }, 4000);
                            } catch (error) {
                              console.error('Failed to copy invite link', error);
                            }
                          }}
                        >
                          {tInvite('copyExisting')}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyMemberInvite(member.id)}
                          loading={pendingInviteMemberId === member.id && pendingInviteAction === 'copy'}
                          loadingText={tInvite('generating')}
                        >
                          {tInvite('generateLink')}
                        </Button>
                      </div>
                    )}
                    {copiedMemberId === member.id ? (
                      <p className="mt-2 font-medium text-success">{tInvite('copiedExisting')}</p>
                    ) : null}
                    {resentMemberId === member.id ? (
                      <p className="mt-2 font-medium text-success">{tInvite('resent')}</p>
                    ) : null}
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
                    disabled={!hasChanges}
                    loading={savingMemberId === member.id}
                    loadingText={t('memberCard.buttons.saving')}
                  >
                    {t('memberCard.buttons.save')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddMemberDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        departments={departments}
        draft={draft}
        onDraftChange={handleDraftChange}
        onSubmit={() => inviteMember.mutate()}
        isSubmitting={inviteMember.isPending}
        errorMessage={inviteMember.error instanceof Error ? inviteMember.error.message : undefined}
        inviteLink={inviteLink}
        onCopyInvite={handleCopyInvite}
        copySuccess={copySuccess}
        inviteEmailSent={inviteEmailSent}
      />

      <Dialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            if (deleteTarget && deletingMemberId === deleteTarget.id) {
              return;
            }
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-sm rounded-2xl border border-outline/40 bg-white p-6 shadow-2xl">
              <Dialog.Title className="text-lg font-semibold text-ink">
                {tInvite('deleteTitle')}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted">
                {tInvite('deleteConfirm')}
              </Dialog.Description>
              {deleteTarget ? (
                <p className="mt-3 text-xs font-medium text-ink">
                  {deleteTarget.displayName} · {deleteTarget.email}
                </p>
              ) : null}
              {deleteError ? <p className="mt-4 text-sm text-danger">{deleteError}</p> : null}
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (deleteTarget && deletingMemberId === deleteTarget.id) {
                      return;
                    }
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }}
                  disabled={Boolean(deleteTarget && deletingMemberId === deleteTarget.id)}
                >
                  {t('dialog.actions.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={confirmDeleteMember}
                  loading={Boolean(deleteTarget && deletingMemberId === deleteTarget.id)}
                  loadingText={tInvite('deleting')}
                >
                  {tInvite('deleteConfirmButton')}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
