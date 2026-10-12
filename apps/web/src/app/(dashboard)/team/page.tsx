"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, EnvelopeSimple, LinkSimple, SquaresFour, Trash, UserPlus } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
    <ul className="divide-y divide-border rounded-lg border border-border">
      {permissionModules.map((module) => {
        const key = module as PermissionModuleKey;
        const ability = department.permissions[key] ?? { view: false, edit: false };
        const label = tModules(`${module}.label`);
        const description = tModules(`${module}.description`);

        return (
          <li key={module} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="text-xs text-muted">{description}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge tone={ability.view ? "success" : "neutral"}>
                {ability.view
                  ? tPermissions("badges.view.enabled")
                  : tPermissions("badges.view.disabled")}
              </Badge>
              <Badge tone={ability.edit ? "info" : "neutral"}>
                {ability.edit
                  ? tPermissions("badges.edit.enabled")
                  : tPermissions("badges.edit.disabled")}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      closeLabel={t('close')}
      onSubmit={(event) => {
        event.preventDefault();
        if (isValid && !isSubmitting) onSubmit();
      }}
    >
      <ModalBody>
        <Field label={t('fields.name')} htmlFor="member-name" optional={t('placeholders.optional')}>
          <Input
            id="member-name"
            value={draft.fullName}
            onChange={(event) => onDraftChange('fullName', event.target.value)}
            placeholder={t('placeholders.name')}
            autoFocus
            disabled={isSubmitting}
          />
        </Field>
        <Field label={t('fields.email')} htmlFor="member-email">
          <Input
            id="member-email"
            type="email"
            value={draft.email}
            onChange={(event) => onDraftChange('email', event.target.value)}
            placeholder={t('placeholders.email')}
            disabled={isSubmitting}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('fields.role')} htmlFor="member-role">
            <Input
              id="member-role"
              value={draft.jobTitle}
              onChange={(event) => onDraftChange('jobTitle', event.target.value)}
              placeholder={t('placeholders.role')}
              disabled={isSubmitting}
            />
          </Field>
          <Field label={t('fields.department')} htmlFor="member-department">
            <Select
              id="member-department"
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
          </Field>
        </div>
        {errorMessage ? <Notice tone="danger">{errorMessage}</Notice> : null}
        {inviteLink ? (
          <Notice
            tone="success"
            title={tInvite('successTitle')}
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await onCopyInvite(inviteLink);
                }}
              >
                {copySuccess ? <Check size={14} weight="bold" className="text-success" /> : <Copy size={14} />}
                {copySuccess ? tInvite('copied') : tInvite('copy')}
              </Button>
            }
          >
            <p>{tInvite('successDescription')}</p>
            {inviteEmailSent === true ? (
              <p className="mt-1 font-medium text-success">{tInvite('emailSent')}</p>
            ) : inviteEmailSent === false ? (
              <p className="mt-1 font-medium text-warning">{tInvite('emailNotSent')}</p>
            ) : null}
          </Notice>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <ModalClose asChild>
          <Button type="button" variant="ghost">
            {t('dialog.actions.cancel')}
          </Button>
        </ModalClose>
        <Button
          type="submit"
          disabled={!isValid}
          loading={isSubmitting}
          loadingText={t('actions.saving')}
        >
          {t('actions.submit')}
        </Button>
      </ModalFooter>
    </Modal>
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
        <Notice tone="neutral">{t('restricted.callout')}</Notice>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          <>
            <Button asChild variant="secondary">
              <Link href="/departments">
                <SquaresFour size={16} weight="bold" />
                {t('actions.manageDepartments')}
              </Link>
            </Button>
            <Button onClick={() => handleDialogOpenChange(true)}>
              <UserPlus size={16} weight="bold" />
              {t('actions.addMember')}
            </Button>
          </>
        }
      />

      {isTokenMissing ? <Notice tone="warning">{t('alerts.missingToken')}</Notice> : null}

      {loadError && !isTokenMissing ? (
        <Notice tone="danger">{t('alerts.loadError', { message: loadError.message })}</Notice>
      ) : null}

      <Notice tone="neutral">{t('infoCard')}</Notice>

      <Card className="p-5 sm:p-6">
        <CardHeader>
          <div>
            <CardTitle>{t('ranking.title')}</CardTitle>
            <CardDescription>{t('ranking.description')}</CardDescription>
          </div>
          <Segmented
            options={rankingPeriodOptions}
            value={rankingPeriod}
            onChange={setRankingPeriod}
            disabled={!isAdmin || isTokenMissing}
            ariaLabel={t('ranking.title')}
            size="sm"
          />
        </CardHeader>

        <div className="mt-5">
          {rankingLoadError && !isTokenMissing ? (
            <Notice tone="danger">{t('ranking.error', { message: rankingLoadError.message })}</Notice>
          ) : rankingQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`ranking-skeleton-${index}`} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : rankingEntries.length === 0 ? (
            <p className="rounded-lg bg-surface-muted px-4 py-6 text-center text-sm text-muted">
              {t('ranking.empty')}
            </p>
          ) : (
            <ol className="divide-y divide-border rounded-lg border border-border">
              {rankingEntries.slice(0, 5).map((entry, index) => (
                <li key={entry.memberId} className="flex items-center gap-4 px-4 py-3">
                  <span
                    className={cn(
                      'tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold',
                      index === 0
                        ? 'bg-primary text-white'
                        : 'bg-surface-sunken text-ink-muted',
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{entry.name}</p>
                    <p className="truncate text-xs text-muted">
                      {entry.department ?? t('memberCard.badge.noDepartment')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-semibold text-ink">{formatCurrency(entry.totalValue)}</p>
                    <p className="text-xs text-muted">
                      {t('ranking.metrics.accepted', { count: entry.acceptedProposals })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>

      {teamQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={`team-skeleton-${index}`} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={24} weight="bold" />}
          title={t('states.empty')}
          action={
            <Button onClick={() => handleDialogOpenChange(true)}>
              <UserPlus size={16} weight="bold" />
              {t('actions.addMember')}
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {members.map((member) => {
            const department = member.departmentId ? departmentMap[member.departmentId] : null;
            const baseline = baselines[member.id];
            const hasChanges = (baseline ?? null) !== (member.departmentId ?? null);

            return (
              <Card key={member.id} className="flex flex-col">
                <div className="flex items-start gap-3 p-5 pb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                    {member.displayName.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-sans text-[15px] font-semibold text-ink">{member.displayName}</h3>
                      {!member.isActive ? <Badge tone="warning">{tInvite('pendingBadge')}</Badge> : null}
                    </div>
                    <p className="truncate text-sm text-muted">
                      {resolveRoleLabel(member.role, member.jobTitle)} · {member.email}
                    </p>
                  </div>
                  {!member.isActive ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleDeleteMember(member)}
                      loading={deletingMemberId === member.id}
                      loadingText=""
                      aria-label={tInvite('delete')}
                      title={tInvite('delete')}
                      className="hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash size={16} />
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-4 border-t border-border p-5">
                  <Field label={t('memberCard.fields.department')} htmlFor={`department-${member.id}`}>
                    <Select
                      id={`department-${member.id}`}
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
                  </Field>

                  {department ? (
                    <div className="space-y-2">
                      <p className="meta-label">{t('memberCard.sections.permissions')}</p>
                      <DepartmentPermissionList department={department} />
                    </div>
                  ) : null}

                  {!member.isActive ? (
                    <div className="space-y-3 rounded-lg bg-surface-muted px-4 py-3 text-sm">
                      <p className="text-ink-muted">{tInvite('pendingNote')}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResendInvite(member.id)}
                          loading={pendingInviteMemberId === member.id && pendingInviteAction === 'email'}
                          loadingText={tInvite('resending')}
                        >
                          <EnvelopeSimple size={14} />
                          {tInvite('resend')}
                        </Button>
                        {member.inviteUrl ? (
                          <Button
                            size="sm"
                            variant="secondary"
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
                            <Copy size={14} />
                            {tInvite('copyExisting')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCopyMemberInvite(member.id)}
                            loading={pendingInviteMemberId === member.id && pendingInviteAction === 'copy'}
                            loadingText={tInvite('generating')}
                          >
                            <LinkSimple size={14} />
                            {tInvite('generateLink')}
                          </Button>
                        )}
                      </div>
                      {copiedMemberId === member.id ? (
                        <p className="text-xs font-semibold text-success">{tInvite('copiedExisting')}</p>
                      ) : null}
                      {resentMemberId === member.id ? (
                        <p className="text-xs font-semibold text-success">{tInvite('resent')}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {hasChanges ? (
                  <div className="flex items-center justify-end gap-2 border-t border-border bg-primary-tint px-5 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revertChanges(member.id)}
                      disabled={savingMemberId === member.id}
                    >
                      {t('memberCard.buttons.revert')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => persistChanges(member.id)}
                      loading={savingMemberId === member.id}
                      loadingText={t('memberCard.buttons.saving')}
                    >
                      {t('memberCard.buttons.save')}
                    </Button>
                  </div>
                ) : null}
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

      <Modal
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
        size="sm"
        title={tInvite('deleteTitle')}
        description={tInvite('deleteConfirm')}
      >
        <ModalBody>
          {deleteTarget ? (
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium text-ink">
              {deleteTarget.displayName} · {deleteTarget.email}
            </p>
          ) : null}
          {deleteError ? <Notice tone="danger">{deleteError}</Notice> : null}
        </ModalBody>
        <ModalFooter>
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
        </ModalFooter>
      </Modal>
    </section>
  );
}
