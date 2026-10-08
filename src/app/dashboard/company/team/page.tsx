"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailPlus, RotateCw, Search, UserPlus, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  CompanyShell,
  EmptyState,
  Panel,
  PageTabs,
  Spinner,
  StatusBadge,
  formatDate,
  inputClass,
  primaryButton,
} from "@/components/company/company-shell";
import { InviteDialog } from "@/components/company/invite-dialog";
import {
  useDepartments,
  useInvites,
  useMembers,
  useMyOrganization,
  useReactivateMember,
  useResendInvite,
  useRevokeInvite,
  useRoles,
  useSuspendMember,
  useUpdateMember,
} from "@/lib/hooks/use-company";
import { useAuth } from "@/providers/auth-provider";
import type { Member } from "@/types/onboarding";

const compactSelect =
  "w-full min-w-[9rem] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none transition hover:border-gray-300 focus:border-[#2016a9] focus:ring-2 focus:ring-[#2016a9]/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

function TeamView() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "invites" ? "invites" : "members";
  const inviteOpen = params.get("invite") === "1";
  const invites = useInvites();
  const pendingInvites = invites.data?.filter((i) => i.status === "pending").length ?? 0;

  const setInviteOpen = (open: boolean) => {
    const next = new URLSearchParams(params.toString());
    if (open) next.set("invite", "1");
    else next.delete("invite");
    router.replace(`/dashboard/company/team${next.size ? `?${next}` : ""}`);
  };

  return (
    <CompanyShell
      title="Team"
      description="Everyone in your organization and the invitations you've sent."
      actions={
        <button className={primaryButton} onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite people
        </button>
      }
    >
      <PageTabs
        tabs={[
          { href: "/dashboard/company/team", label: "Members", active: tab === "members" },
          { href: "/dashboard/company/team?tab=invites", label: "Invitations", active: tab === "invites", count: pendingInvites },
        ]}
      />
      {tab === "members" ? <MembersTab onInvite={() => setInviteOpen(true)} /> : <InvitesTab onInvite={() => setInviteOpen(true)} />}
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </CompanyShell>
  );
}

function MembersTab({ onInvite }: { onInvite: () => void }) {
  const [search, setSearch] = useState("");
  // Arriving from a department's member count pre-filters the list
  const [departmentId, setDepartmentId] = useState(useSearchParams().get("department") ?? "");
  const members = useMembers({ search: search.trim() || undefined, departmentId: departmentId || undefined });
  const departments = useDepartments();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:w-80">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
          <input className={`${inputClass} pl-9`} placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${inputClass} sm:w-56`} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">All departments</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <Panel flush>
        {members.isLoading ? (
          <div className="py-12">
            <Spinner />
          </div>
        ) : members.isError ? (
          <p className="p-6 text-sm text-red-600">{(members.error as Error).message}</p>
        ) : !members.data?.data.length ? (
          search || departmentId ? (
            <EmptyState icon={Search} title="No matching members">
              Try a different name or department.
            </EmptyState>
          ) : (
            <EmptyState icon={Users} title="No members yet">
              <button onClick={onInvite} className="cursor-pointer font-medium text-[#2016a9] hover:underline">
                Invite your team
              </button>{" "}
              to get started.
            </EmptyState>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Member</th>
                  <th className="px-6 py-3 font-medium">Department</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.data.data.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {members.data && members.data.total > members.data.data.length && (
        <p className="text-sm text-gray-500">
          Showing {members.data.data.length} of {members.data.total}. Use search to narrow the list.
        </p>
      )}
    </div>
  );
}

function MemberRow({ member: m }: { member: Member }) {
  const { user } = useAuth();
  const org = useMyOrganization();
  const departments = useDepartments();
  const roles = useRoles();
  const update = useUpdateMember();
  const suspend = useSuspendMember();
  const reactivate = useReactivateMember();

  const isSelf = m.id === user?.id;
  const isOwner = m.id === org.data?.ownerUserId;
  const roleLocked = isSelf || isOwner;

  const change = (body: { departmentId?: string | null; roleId?: string }, what: string) =>
    update.mutate(
      { id: m.id, ...body },
      { onSuccess: () => toast.success(`${what} updated for ${m.firstName}`), onError: (e) => toast.error(e.message) }
    );

  return (
    <tr className="align-middle">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-[#2016a9]">
            {(m.firstName[0] ?? "") + (m.lastName[0] ?? "")}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">
              {m.firstName} {m.lastName}
              {isSelf && <span className="ml-2 text-xs font-normal text-gray-400">You</span>}
              {isOwner && <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-[#2016a9]">Owner</span>}
            </p>
            <p className="truncate text-gray-500">{m.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <select
          className={compactSelect}
          value={m.department?.id ?? ""}
          disabled={update.isPending}
          onChange={(e) => change({ departmentId: e.target.value || null }, "Department")}
          aria-label={`Department for ${m.firstName}`}
        >
          <option value="">No department</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4">
        <select
          className={compactSelect}
          value={m.role?.id ?? ""}
          disabled={roleLocked || update.isPending}
          title={isOwner ? "The owner's role can't be changed" : isSelf ? "You can't change your own role" : undefined}
          onChange={(e) => change({ roleId: e.target.value }, "Role")}
          aria-label={`Role for ${m.firstName}`}
        >
          {/* Keep the current role selectable even before the roles list loads */}
          {!roles.data?.some((r) => r.id === m.role?.id) && m.role && <option value={m.role.id}>{m.role.name}</option>}
          {roles.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={m.status} label={m.status === "pending" ? "Not activated" : undefined} />
      </td>
      <td className="px-6 py-4 text-right">
        {!isSelf && !isOwner &&
          (m.status === "suspended" ? (
            <button
              className="cursor-pointer text-sm font-medium text-[#2016a9] hover:underline disabled:opacity-50"
              disabled={reactivate.isPending}
              onClick={() =>
                reactivate.mutate(
                  { id: m.id },
                  { onSuccess: () => toast.success(`${m.firstName} reactivated`), onError: (e) => toast.error(e.message) }
                )
              }
            >
              Reactivate
            </button>
          ) : (
            <ConfirmButton
              label="Suspend"
              confirmLabel="Suspend?"
              busy={suspend.isPending}
              onConfirm={() =>
                suspend.mutate(
                  { id: m.id },
                  { onSuccess: () => toast.success(`${m.firstName} suspended`), onError: (e) => toast.error(e.message) }
                )
              }
            />
          ))}
      </td>
    </tr>
  );
}

// Two-step destructive action: first click arms, second click confirms
function ConfirmButton({ label, confirmLabel, busy, onConfirm }: { label: string; confirmLabel: string; busy: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <span className="inline-flex items-center gap-2">
      <button className="cursor-pointer text-sm font-semibold text-red-600 hover:underline disabled:opacity-50" disabled={busy} onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button className="cursor-pointer text-sm text-gray-500 hover:underline" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  ) : (
    <button className="cursor-pointer text-sm font-medium text-gray-600 hover:text-red-600" onClick={() => setArmed(true)}>
      {label}
    </button>
  );
}

function InvitesTab({ onInvite }: { onInvite: () => void }) {
  const invites = useInvites();
  const departments = useDepartments();
  const roles = useRoles();
  const resend = useResendInvite();
  const revoke = useRevokeInvite();

  const departmentName = (id: string | null) => departments.data?.find((d) => d.id === id)?.name ?? "—";
  const roleName = (id: string) => roles.data?.find((r) => r.id === id)?.name ?? "—";

  return (
    <Panel flush>
      {invites.isLoading ? (
        <div className="py-12">
          <Spinner />
        </div>
      ) : invites.isError ? (
        <p className="p-6 text-sm text-red-600">{(invites.error as Error).message}</p>
      ) : !invites.data?.length ? (
        <EmptyState icon={MailPlus} title="No invitations yet">
          <button onClick={onInvite} className="cursor-pointer font-medium text-[#2016a9] hover:underline">
            Invite people
          </button>{" "}
          one at a time or upload a CSV.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Invitee</th>
                <th className="px-6 py-3 font-medium">Department</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Sent</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invites.data.map((i) => {
                const canResend = i.status === "pending" || i.status === "expired";
                return (
                  <tr key={i.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{[i.firstName, i.lastName].filter(Boolean).join(" ") || i.email}</p>
                      {(i.firstName || i.lastName) && <p className="text-gray-500">{i.email}</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{departmentName(i.departmentId)}</td>
                    <td className="px-6 py-4 text-gray-600">{roleName(i.roleId)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={i.status} label={i.status === "pending" ? "Pending" : undefined} />
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(i.createdAt)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {canResend && (
                        <button
                          className="mr-4 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-[#2016a9] hover:underline disabled:opacity-50"
                          disabled={resend.isPending}
                          onClick={() =>
                            resend.mutate(
                              { id: i.id },
                              { onSuccess: () => toast.success(`Invitation resent to ${i.email}`), onError: (e) => toast.error(e.message) }
                            )
                          }
                        >
                          <RotateCw className="h-3.5 w-3.5" /> Resend
                        </button>
                      )}
                      {i.status === "pending" && !i.isOwner && (
                        <button
                          className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-600 disabled:opacity-50"
                          disabled={revoke.isPending}
                          onClick={() =>
                            revoke.mutate(
                              { id: i.id },
                              { onSuccess: () => toast.success("Invitation revoked"), onError: (e) => toast.error(e.message) }
                            )
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<Spinner className="mt-24" />}>
      <TeamView />
    </Suspense>
  );
}
