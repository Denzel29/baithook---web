"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, MailCheck, Search, SearchX, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Detail,
  EmptyState,
  FilterTabs,
  Panel,
  PlatformShell,
  Spinner,
  StatusBadge,
  dangerButton,
  formatDate,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/platform/platform-shell";
import { usePersonalAccount, usePersonalAccountAction, usePersonalAccounts } from "@/lib/hooks/use-platform";
import type { PersonalAccountDetail } from "@/types/onboarding";

type StatusFilter = "all" | "active" | "pending" | "suspended";

const ACTIVITY_LABELS: Record<string, string> = {
  login_success: "Logged in",
  login_failed: "Failed login",
  registered: "Signed up",
  activated: "Activated account",
  password_reset: "Reset password",
  page_visited: "Visited a page",
  suspended: "Account suspended",
  reactivated: "Account reactivated",
};

// Users with a pending (not yet activated) account show this wording
const statusLabel = (status: string) => (status === "pending" ? "Not activated" : undefined);

function UsersView() {
  const router = useRouter();
  const selectedId = useSearchParams().get("id");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const accounts = usePersonalAccounts({ status: filter === "all" ? undefined : filter, search: search.trim() || undefined });
  const counts = accounts.data?.counts;

  if (selectedId) return <UserDetail id={selectedId} onBack={() => router.push("/dashboard/platform/users")} />;

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: `Active${counts ? ` · ${counts.active}` : ""}` },
    { value: "pending", label: `Not activated${counts ? ` · ${counts.pending}` : ""}` },
    { value: "suspended", label: `Suspended${counts ? ` · ${counts.suspended}` : ""}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs value={filter} options={filters} onChange={setFilter} />
        <div className="relative sm:w-72">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
          <input className={`${inputClass} pl-9`} placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Panel flush>
        {accounts.isLoading ? (
          <div className="py-12">
            <Spinner />
          </div>
        ) : accounts.isError ? (
          <p className="p-6 text-sm text-red-600">{(accounts.error as Error).message}</p>
        ) : !accounts.data?.data.length ? (
          search || filter !== "all" ? (
            <EmptyState icon={SearchX} title="No matching accounts">
              Try a different search or status.
            </EmptyState>
          ) : (
            <EmptyState icon={Users} title="No personal accounts yet">
              People who sign up on their own, without a company, appear here.
            </EmptyState>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Person</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Signed up</th>
                  <th className="px-6 py-3 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.data.data.map((u) => (
                  <tr key={u.id} onClick={() => router.push(`/dashboard/platform/users?id=${u.id}`)} className="cursor-pointer transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-[#2016a9]">
                          {(u.firstName[0] ?? "") + (u.lastName[0] ?? "")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="truncate text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={u.status} label={statusLabel(u.status)} />
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-4 text-gray-500">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {accounts.data && accounts.data.total > accounts.data.data.length && (
        <p className="text-sm text-gray-500">
          Showing {accounts.data.data.length} of {accounts.data.total}. Use search to narrow the list.
        </p>
      )}
    </div>
  );
}

function UserDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const account = usePersonalAccount(id);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex cursor-pointer items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> All personal accounts
      </button>
      {account.isLoading ? (
        <Spinner />
      ) : account.isError || !account.data ? (
        <Panel>
          <p className="text-sm text-red-600">{(account.error as Error)?.message ?? "Account not found"}</p>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Panel
              title={`${account.data.firstName} ${account.data.lastName}`}
              description={account.data.email}
              actions={<StatusBadge status={account.data.status} label={statusLabel(account.data.status)} />}
            >
              <dl className="grid gap-5 sm:grid-cols-3">
                <Detail label="Account type">Personal (no company)</Detail>
                <Detail label="Signed up">{formatDate(account.data.createdAt)}</Detail>
                <Detail label="Last login">{account.data.lastLoginAt ? formatDate(account.data.lastLoginAt) : "Never"}</Detail>
              </dl>
            </Panel>
            <Panel title="Recent activity">
              {account.data.activity.length === 0 ? (
                <p className="text-sm text-gray-500">No activity recorded yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {account.data.activity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <span className="text-gray-800">{ACTIVITY_LABELS[a.action] ?? a.action.replace(/_/g, " ")}</span>
                      <span className="shrink-0 text-gray-500">{formatDate(a.occurredAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
          <AccountActions account={account.data} />
        </div>
      )}
    </div>
  );
}

function AccountActions({ account }: { account: PersonalAccountDetail }) {
  const act = usePersonalAccountAction();
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const run = (action: "suspend" | "reactivate" | "resend-activation" | "password-reset", success: string) =>
    act.mutate(
      { id: account.id, action },
      {
        onSuccess: () => {
          toast.success(success);
          setConfirmSuspend(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );

  const busy = act.isPending;

  return (
    <Panel title="Actions" className="self-start">
      <div className="space-y-5 text-sm">
        {account.status === "pending" && (
          <div className="space-y-2">
            <p className="text-gray-600">This person signed up but never activated their account.</p>
            <button className={`${primaryButton} w-full`} disabled={busy} onClick={() => run("resend-activation", `Activation email sent to ${account.email}`)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
              Resend activation email
            </button>
          </div>
        )}

        {account.status === "active" && (
          <div className="space-y-2">
            <p className="text-gray-600">Sends a link so they can choose a new password. Their current password keeps working until then.</p>
            <button className={`${secondaryButton} w-full`} disabled={busy} onClick={() => run("password-reset", `Password reset sent to ${account.email}`)}>
              <KeyRound className="h-4 w-4" /> Send password reset
            </button>
          </div>
        )}

        <div className="space-y-2 border-t border-gray-100 pt-5">
          {account.status === "suspended" ? (
            <>
              <p className="text-gray-600">They can&apos;t sign in while suspended. Their training history is kept.</p>
              <button className={`${primaryButton} w-full`} disabled={busy} onClick={() => run("reactivate", "Account reactivated")}>
                <UserCheck className="h-4 w-4" /> Reactivate account
              </button>
            </>
          ) : confirmSuspend ? (
            <>
              <p className="font-medium text-red-700">They&apos;ll be signed out immediately and can&apos;t sign in until reactivated.</p>
              <div className="flex gap-2">
                <button className={`${secondaryButton} flex-1`} onClick={() => setConfirmSuspend(false)} disabled={busy}>
                  Cancel
                </button>
                <button className={`${dangerButton} flex-1`} disabled={busy} onClick={() => run("suspend", "Account suspended")}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Suspend
                </button>
              </div>
            </>
          ) : (
            <button className={`${secondaryButton} w-full hover:border-red-300 hover:text-red-700`} onClick={() => setConfirmSuspend(true)}>
              <UserX className="h-4 w-4" /> Suspend account
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function PlatformUsersPage() {
  return (
    <PlatformShell title="Personal accounts" description="People using Baitline on their own, without a company. Company members are managed by their company admins.">
      <Suspense fallback={<Spinner />}>
        <UsersView />
      </Suspense>
    </PlatformShell>
  );
}
