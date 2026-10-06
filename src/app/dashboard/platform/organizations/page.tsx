"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Detail,
  FilterTabs,
  Panel,
  PlatformShell,
  StatusBadge,
  countryName,
  dangerButton,
  formatDate,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/platform/platform-shell";
import { OnboardingRequestsTab } from "@/components/platform/onboarding-requests";
import {
  useActivateOrganization,
  useOrganization,
  useOrganizationChecklist,
  useOrganizationUsage,
  useOnboardingRequests,
  useOrganizations,
  useSuspendOrganization,
  useUpdateOrganizationEmailPolicy,
  useUpdateOrganizationPlan,
} from "@/lib/hooks/use-platform";
import {
  COMPANY_SIZE_LABELS,
  INDUSTRY_LABELS,
  OnboardingRequestStatus,
  OrgStatus,
  PlanTier,
  type OrganizationRecord,
} from "@/types/onboarding";

type StatusFilter = OrgStatus | "all";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: OrgStatus.PENDING_SETUP, label: "Setting up" },
  { value: OrgStatus.ACTIVE, label: "Active" },
  { value: OrgStatus.SUSPENDED, label: "Suspended" },
];

const STEP_LABELS: Record<string, string> = {
  brand_profile: "Brand profile",
  departments: "Departments",
  employees_invited: "Employees invited",
  additional_admin: "Second admin",
  templates: "Email templates",
  baseline_assigned: "Baseline campaign assigned",
};

const LIMIT_LABELS: Record<string, string> = {
  seats: "Seats",
  activeCampaigns: "Active campaigns",
  aiGenerationsPerMonth: "AI generations / month",
  departments: "Departments",
};

// Companies and the requests from companies waiting to join live on one page
function CompaniesView() {
  const tab = useSearchParams().get("tab") === "requests" ? "requests" : "companies";
  const pending = useOnboardingRequests(OnboardingRequestStatus.PENDING);
  const pendingCount = pending.data?.total ?? 0;

  const tabClass = (active: boolean) =>
    `-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
      active ? "border-[#405189] text-[#405189]" : "border-transparent text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="space-y-6">
      <nav className="flex border-b border-slate-200" aria-label="Companies sections">
        <Link href="/dashboard/platform/organizations" className={tabClass(tab === "companies")}>
          Companies
        </Link>
        <Link href="/dashboard/platform/organizations?tab=requests" className={tabClass(tab === "requests")}>
          Requests
          {pendingCount > 0 && (
            <span className="rounded-full bg-[#f06548] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {pendingCount}
            </span>
          )}
        </Link>
      </nav>
      {tab === "requests" ? <OnboardingRequestsTab /> : <OrganizationsView />}
    </div>
  );
}

function OrganizationsView() {
  const router = useRouter();
  const selectedId = useSearchParams().get("id");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const orgs = useOrganizations({ status: filter === "all" ? undefined : filter, search: search.trim() || undefined });

  const select = (id: string | null) =>
    router.push(id ? `/dashboard/platform/organizations?id=${id}` : "/dashboard/platform/organizations");

  if (selectedId) return <OrganizationDetail id={selectedId} onBack={() => select(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs value={filter} options={FILTERS} onChange={setFilter} />
        <div className="relative sm:w-72">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input className={`${inputClass} pl-9`} placeholder="Search name or domain" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Panel>
        {orgs.isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#405189]" />
        ) : orgs.isError ? (
          <p className="text-sm text-red-600">{(orgs.error as Error).message}</p>
        ) : !orgs.data?.data.length ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No companies yet. Approve a request to create one.
          </p>
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Domain</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgs.data.data.map((o) => (
                  <tr key={o.id} onClick={() => select(o.id)} className="cursor-pointer transition hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{o.name}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-600">
                      {o.planTier}
                      {o.seatLimit ? <span className="text-slate-400"> · {o.seatLimit} seats</span> : null}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{o.primaryDomain ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function OrganizationDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const org = useOrganization(id);
  const checklist = useOrganizationChecklist(id);
  const usage = useOrganizationUsage(id);

  if (org.isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#405189]" />;
  if (org.isError || !org.data) {
    return (
      <Panel>
        <p className="text-sm text-red-600">{(org.error as Error)?.message ?? "Organization not found"}</p>
      </Panel>
    );
  }
  const o = org.data;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> All companies
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={o.name} actions={<StatusBadge status={o.status} />} className="lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-3">
            <Detail label="Industry">{o.industry ? INDUSTRY_LABELS[o.industry] : null}</Detail>
            <Detail label="Size">{o.companySize ? COMPANY_SIZE_LABELS[o.companySize] : null}</Detail>
            <Detail label="Country">{countryName(o.country)}</Detail>
            <Detail label="Website">{o.website}</Detail>
            <Detail label="Timezone">{o.timezone}</Detail>
            <Detail label="Owner">{o.ownerUserId ? "Accepted" : "Invite pending"}</Detail>
            <Detail label="Created">{formatDate(o.createdAt)}</Detail>
            <Detail label="Activated">{formatDate(o.activatedAt)}</Detail>
            {o.status === OrgStatus.SUSPENDED && <Detail label="Suspended">{formatDate(o.suspendedAt)}</Detail>}
          </dl>
          {o.suspensionReason && o.status === OrgStatus.SUSPENDED && (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">Suspended: {o.suspensionReason}</p>
          )}
        </Panel>

        <Panel title="Setup checklist">
          {checklist.isLoading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#405189]" />
          ) : (
            <ul className="space-y-2">
              {checklist.data?.steps.map((s) => (
                <li key={s.step} className="flex items-center gap-2 text-sm">
                  {s.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                  <span className={s.done ? "text-slate-700" : "text-slate-500"}>{STEP_LABELS[s.step] ?? s.step}</span>
                  {!s.required && <span className="text-xs text-slate-400">optional</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <StatusActions org={o} />
        <PlanEditor key={`plan-${o.id}-${o.planTier}-${o.seatLimit}`} org={o} />
        <Panel title="Usage this month">
          {usage.isLoading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#405189]" />
          ) : (
            <ul className="space-y-3">
              {usage.data?.limits.map((l) => {
                const pct = l.max ? Math.min(100, Math.round((l.current / l.max) * 100)) : 0;
                return (
                  <li key={l.limit} className="text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>{LIMIT_LABELS[l.limit] ?? l.limit}</span>
                      <span className="font-medium text-slate-800">
                        {l.current} / {l.max ?? "∞"}
                      </span>
                    </div>
                    {l.max !== null && (
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-[#f06548]" : "bg-[#405189]"}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
              {usage.data && !usage.data.enforced && (
                <li className="text-xs text-slate-400">Limits are tracked but not enforced yet.</li>
              )}
            </ul>
          )}
        </Panel>
      </div>

      <EmailPolicyEditor key={`policy-${o.id}-${o.primaryDomain}-${o.allowedDomains.join()}-${o.allowedEmails.join()}`} org={o} />
    </div>
  );
}

function StatusActions({ org }: { org: OrganizationRecord }) {
  const suspend = useSuspendOrganization();
  const activate = useActivateOrganization();
  const [reason, setReason] = useState("");

  const onSuspend = () => {
    if (reason.trim().length < 3) {
      toast.error("Add a reason for the suspension");
      return;
    }
    suspend.mutate(
      { id: org.id, reason: reason.trim() },
      { onSuccess: () => toast.success(`${org.name} suspended`), onError: (e) => toast.error(e.message) }
    );
  };

  const onActivate = () =>
    activate.mutate(
      { id: org.id },
      { onSuccess: () => toast.success(`${org.name} is active`), onError: (e) => toast.error(e.message) }
    );

  return (
    <Panel title="Status">
      {org.status === OrgStatus.SUSPENDED ? (
        <div className="space-y-3 text-sm text-slate-600">
          <p>Members can&apos;t log in while the organization is suspended. Their data is kept.</p>
          <button className={primaryButton} onClick={onActivate} disabled={activate.isPending}>
            {activate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reactivate
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-slate-600">
          {org.status === OrgStatus.PENDING_SETUP && (
            <div className="space-y-2">
              <p>The organization is still setting up. You can activate it now without waiting for the checklist.</p>
              <button className={secondaryButton} onClick={onActivate} disabled={activate.isPending}>
                {activate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Activate now
              </button>
            </div>
          )}
          <label className="block">
            <span className="mb-1 block font-medium text-slate-700">Suspension reason</span>
            <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Unpaid invoice" />
          </label>
          <button className={dangerButton} onClick={onSuspend} disabled={suspend.isPending}>
            {suspend.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Suspend organization
          </button>
        </div>
      )}
    </Panel>
  );
}

function PlanEditor({ org }: { org: OrganizationRecord }) {
  const update = useUpdateOrganizationPlan();
  const [planTier, setPlanTier] = useState<PlanTier>(org.planTier);
  const [seatLimit, setSeatLimit] = useState(org.seatLimit ? String(org.seatLimit) : "");

  const onSave = () =>
    update.mutate(
      { id: org.id, planTier, seatLimit: seatLimit ? Number(seatLimit) : null },
      { onSuccess: () => toast.success("Plan updated"), onError: (e) => toast.error(e.message) }
    );

  return (
    <Panel title="Plan">
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block font-medium text-slate-700">Plan tier</span>
          <select className={inputClass} value={planTier} onChange={(e) => setPlanTier(e.target.value as PlanTier)}>
            {Object.values(PlanTier).map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-slate-700">Seat limit override</span>
          <input className={inputClass} inputMode="numeric" placeholder="Plan default" value={seatLimit} onChange={(e) => setSeatLimit(e.target.value.replace(/\D/g, ""))} />
        </label>
        <button className={primaryButton} onClick={onSave} disabled={update.isPending}>
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save plan
        </button>
      </div>
    </Panel>
  );
}

const splitList = (value: string) =>
  value
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter(Boolean);

function EmailPolicyEditor({ org }: { org: OrganizationRecord }) {
  const update = useUpdateOrganizationEmailPolicy();
  const [primaryDomain, setPrimaryDomain] = useState(org.primaryDomain ?? "");
  const [allowedDomains, setAllowedDomains] = useState(org.allowedDomains.join("\n"));
  const [allowedEmails, setAllowedEmails] = useState(org.allowedEmails.join("\n"));

  const onSave = () =>
    update.mutate(
      {
        id: org.id,
        primaryDomain: primaryDomain.trim() || null,
        allowedDomains: splitList(allowedDomains),
        allowedEmails: splitList(allowedEmails),
      },
      { onSuccess: () => toast.success("Email policy updated"), onError: (e) => toast.error(e.message) }
    );

  return (
    <Panel title="Who can be invited">
      <p className="mb-4 text-sm text-slate-500">
        When a domain is set, invites must go to that domain (or a subdomain). Extra addresses can be allowed individually.
        With no domain, any address can be invited one by one.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Primary domain</span>
          <input className={inputClass} value={primaryDomain} onChange={(e) => setPrimaryDomain(e.target.value)} placeholder="acme.com" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Extra domains (one per line)</span>
          <textarea className={`${inputClass} resize-y`} rows={3} value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)} placeholder="acme.co.uk" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Allowed addresses (one per line)</span>
          <textarea className={`${inputClass} resize-y`} rows={3} value={allowedEmails} onChange={(e) => setAllowedEmails(e.target.value)} placeholder="contractor@gmail.com" />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button className={primaryButton} onClick={onSave} disabled={update.isPending}>
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save email policy
        </button>
      </div>
    </Panel>
  );
}

export default function OrganizationsPage() {
  return (
    <PlatformShell title="Companies" description="Companies on the platform and requests from companies that want to join.">
      <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-[#405189]" />}>
        <CompaniesView />
      </Suspense>
    </PlatformShell>
  );
}
