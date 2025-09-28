"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { permissionModules } from "@/config/permission-modules";
import { cloneDepartment, sampleDepartments, type Department } from "@/data/mock/departments";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  departmentId: string;
}

type CreateMemberPayload = Omit<TeamMember, "id">;

type DepartmentRecord = Record<string, Department>;

const initialMembers: TeamMember[] = [
  {
    id: "1",
    name: "Marcos Dias",
    role: "Diretor Comercial",
    email: "marcos@empresa.com",
    departmentId: sampleDepartments[0]?.id ?? "",
  },
  {
    id: "2",
    name: "Fernanda Alves",
    role: "Coordenadora de Operações",
    email: "fernanda@empresa.com",
    departmentId: sampleDepartments[1]?.id ?? "",
  },
];

const defaultDepartmentId = sampleDepartments[0]?.id ?? "";

function createMemberId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

interface DepartmentPermissionListProps {
  department: Department;
}

function DepartmentPermissionList({ department }: DepartmentPermissionListProps) {
  const tModules = useTranslations("common.permissionModules");
  const tPermissions = useTranslations("common.permissions");
  return (
    <div className="grid gap-2">
      {permissionModules.map((module) => {
        const ability = department.permissions[module] ?? { view: false, edit: false };
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


interface AddMemberDialogProps {
  open: boolean;
  departments: Department[];
  draft: CreateMemberPayload;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (field: keyof CreateMemberPayload, value: string) => void;
  onSubmit: () => void;
}

function AddMemberDialog({ open, departments, draft, onOpenChange, onDraftChange, onSubmit }: AddMemberDialogProps) {
  const t = useTranslations("team.dialog");
  const isValid =
    draft.name.trim().length > 2 &&
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
              if (isValid) onSubmit();
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
                  value={draft.name}
                  onChange={(event) => onDraftChange("name", event.target.value)}
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
                  onChange={(event) => onDraftChange("email", event.target.value)}
                  placeholder={t('placeholders.email')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">{t('fields.role')}</Label>
                <Input
                  id="member-role"
                  value={draft.role}
                  onChange={(event) => onDraftChange("role", event.target.value)}
                  placeholder={t('placeholders.role')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fields.department')}</Label>
                <Select value={draft.departmentId} onValueChange={(value) => onDraftChange("departmentId", value)}>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  {t('actions.cancel')}
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!isValid}>
                {t('actions.submit')}
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function TeamPage() {
  const { isAdmin } = useCurrentUser();
  const t = useTranslations("team");
  const [departments] = useState<Department[]>(() => sampleDepartments.map(cloneDepartment));
  const departmentMap = useMemo<DepartmentRecord>(
    () => Object.fromEntries(departments.map((department) => [department.id, department])),
    [departments]
  );

  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [baselines, setBaselines] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialMembers.map((member) => [member.id, member.departmentId]))
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CreateMemberPayload>(() => ({
    name: "",
    email: "",
    role: "",
    departmentId: defaultDepartmentId,
  }));

  const departmentOptions = departments.map((department) => ({ value: department.id, label: department.name }));

  const handleDraftChange = (field: keyof CreateMemberPayload, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateMember = () => {
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name || !email.includes("@")) return;

    const newMember: TeamMember = {
      id: createMemberId(),
      name,
      email: email.toLowerCase(),
      role: draft.role.trim() || t('defaults.role'),
      departmentId: draft.departmentId,
    };

    setMembers((prev) => [...prev, newMember]);
    setBaselines((prev) => ({ ...prev, [newMember.id]: newMember.departmentId }));
    setDialogOpen(false);
    setDraft({ name: "", email: "", role: "", departmentId: defaultDepartmentId });
  };

  const updateDepartment = (memberId: string, departmentId: string) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, departmentId } : member))
    );
  };

  const revertChanges = (memberId: string) => {
    const baseline = baselines[memberId];
    if (!baseline) return;
    setMembers((prev) => prev.map((member) => (member.id === memberId ? { ...member, departmentId: baseline } : member)));
  };

  const persistChanges = (memberId: string) => {
    const current = members.find((member) => member.id === memberId);
    if (!current) return;
    setBaselines((prev) => ({ ...prev, [memberId]: current.departmentId }));
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

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/departments">{t('actions.manageDepartments')}</Link>
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <UserPlus size={18} weight="bold" />
              {t('actions.addMember')}
            </Button>
          </div>
        }
      />

      <Card className="border border-outline/40 bg-white px-6 py-4 text-sm text-muted">
        <p>{t('infoCard')}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {members.map((member) => {
          const department = departmentMap[member.departmentId];
          const baseline = baselines[member.id];
          const hasChanges = baseline ? baseline !== member.departmentId : true;

          return (
            <Card key={member.id} className="space-y-4 border border-outline/60 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">{member.name}</h3>
                  <p className="text-sm text-muted">{member.role}</p>
                  <p className="text-xs text-muted">{member.email}</p>
                </div>
                <Badge tone="info">{department?.name ?? t('memberCard.badge.noDepartment')}</Badge>
              </div>

              <div className="space-y-2">
                <Label>{t('memberCard.fields.department')}</Label>
                <Select value={member.departmentId} onValueChange={(value) => updateDepartment(member.id, value)}>
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
                <Button variant="ghost" size="sm" onClick={() => revertChanges(member.id)} disabled={!hasChanges}>
                  {t('memberCard.buttons.revert')}
                </Button>
                <Button size="sm" onClick={() => persistChanges(member.id)} disabled={!hasChanges}>
                  {t('memberCard.buttons.save')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <AddMemberDialog
        open={dialogOpen}
        departments={departments}
        draft={draft}
        onOpenChange={setDialogOpen}
        onDraftChange={handleDraftChange}
        onSubmit={handleCreateMember}
      />
    </section>
  );
}
