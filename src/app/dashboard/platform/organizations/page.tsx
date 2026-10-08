"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, Circle, Loader2, Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import {
  Detail,
  EmptyState,
  FilterTabs,
  Panel,
  PlatformShell,
  StatusBadge,
  countryName,
  dangerButton,
  formatDate,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  Spinner,
} from "@/components/platform/platform-shell";
import { OnboardingRequestsTab } from "@/components/platform/onboarding-requests";
import { DomainRequestsTab } from "@/components/platform/domain-requests";
import {
  useActivateOrganization,
  useOrganization,
  useOrganizationChecklist,
  useOrganizationUsage,
  useOwnerInvite,
  useResendOwnerInvite,
  useDomainRequests,
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
type CompaniesTab = "companies" | "requests" | "domains";

function CompaniesView() {
  const param = useSearchParams().get("tab");
  const tab: CompaniesTab = param === "requests" || param === "domains" ? param : "companies";
  const pendingCompanies = useOnboardingRequests(OnboardingRequestStatus.PENDING).data?.total ?? 0;
  const pendingDomains = useDomainRequests("pending").data?.length ?? 0;

  const tabs: { key: CompaniesTab; label: string; href: string; count: number }[] = [
    { key: "companies", label: "Companies", href: "/dashboard/platform/organizations", count: 0 },
    { key: "requests", label: "Join requests", href: "/dashboard/platform/organizations?tab=requests", count: pendingCompanies },
    { key: "domains", label: "Domain requests", href: "/dashboard/platform/organizations?tab=domains", count: pendingDomains },
  ];

  return (
    <div className="space-y-6">
      <nav className="flex overflow-x-auto overflow-y-hidden border-b border-gray-200" aria-label="Companies sections">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key ? "border-[#2016a9] text-[#2016a9]" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="rounded-full bg-[#2016a9] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{t.count}</span>
            )}
          </Link>
        ))}
      </nav>
      {tab === "requests" ? <OnboardingRequestsTab /> : tab === "domains" ? <DomainRequestsTab /> : <OrganizationsView />}
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
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
          <input className={`${inputClass} pl-9`} placeholder="Search name or domain" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Panel flush>
        {orgs.isLoading ? (
          <div className="py-12">
            <Spinner />
          </div>
        ) : orgs.isError ? (
          <p className="p-6 text-sm text-red-600">{(orgs.error as Error).message}</p>
        ) : !orgs.data?.data.length ? (
          search.trim() || filter !== "all" ? (
            <EmptyState icon={SearchX} title="No matching companies">
              Try a different search or status filter.
            </EmptyState>
          ) : (
            <EmptyState icon={Building2} title="No companies yet">
              Companies appear here once you approve their request in the Requests tab.
            </EmptyState>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Domain</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgs.data.data.map((o) => (
                  <tr key={o.id} onClick={() => select(o.id)} className="cursor-pointer transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-[#2016a9]">
                          {o.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-gray-900">{o.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-600 capitalize">
                      {o.planTier}
                      {o.seatLimit ? <span className="text-gray-400"> · {o.seatLimit} seats</span> : null}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{o.primaryDomain ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(o.createdAt)}</td>
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

  if (org.isLoading) return <Spinner />;
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
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
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
            <Spinner />
          ) : (
            <ul className="space-y-2">
              {checklist.data?.steps.map((s) => (
                <li key={s.step} className="flex items-center gap-2 text-sm">
                  {s.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-gray-300" />}
                  <span className={s.done ? "text-gray-700" : "text-gray-500"}>{STEP_LABELS[s.step] ?? s.step}</span>
                  {!s.required && <span className="text-xs text-gray-400">optional</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {!o.ownerUserId && <OwnerInvitePanel org={o} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <StatusActions org={o} />
        <PlanEditor key={`plan-${o.id}-${o.planTier}-${o.seatLimit}`} org={o} />
        <Panel title="Usage this month">
          {usage.isLoading ? (
            <Spinner />
          ) : (
            <ul className="space-y-3">
              {usage.data?.limits.map((l) => {
                const pct = l.max ? Math.min(100, Math.round((l.current / l.max) * 100)) : 0;
                return (
                  <li key={l.limit} className="text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>{LIMIT_LABELS[l.limit] ?? l.limit}</span>
                      <span className="font-medium text-gray-800">
                        {l.current} / {l.max ?? "∞"}
                      </span>
                    </div>
                    {l.max !== null && (
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                        <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-red-600" : "bg-[#2016a9]"}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
              {usage.data && !usage.data.enforced && (
                <li className="text-xs text-gray-400">Limits are tracked but not enforced yet.</li>
              )}
            </ul>
          )}
        </Panel>
      </div>

      <EmailPolicyEditor key={`policy-${o.id}-${o.primaryDomain}-${o.allowedDomains.join()}-${o.allowedEmails.join()}`} org={o} />
    </div>
  );
}

// Until the owner accepts, nobody can log in to the company; let platform
// admins see where the invite stands and send a fresh link
function OwnerInvitePanel({ org }: { org: OrganizationRecord }) {
  const invite = useOwnerInvite(org.id, true);
  const resend = useResendOwnerInvite();
  const expired = invite.data?.status === "expired";

  return (
    <Panel
      title="Owner hasn't joined yet"
      description="Nobody can sign in to this company until the owner accepts their invitation."
      className={expired ? "border-amber-300" : ""}
    >
      {invite.isLoading ? (
        <Spinner />
      ) : invite.data ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <dl className="grid flex-1 gap-5 sm:grid-cols-3">
            <Detail label="Sent to">{invite.data.email}</Detail>
            <Detail label="Status">
              <StatusBadge status={invite.data.status} label={invite.data.status === "pending" ? "Waiting" : undefined} />
            </Detail>
            <Detail label={expired ? "Expired" : "Expires"}>{formatDate(invite.data.expiresAt)}</Detail>
          </dl>
          <button
            className={expired ? primaryButton : secondaryButton}
            disabled={resend.isPending}
            onClick={() =>
              resend.mutate(
                { id: org.id },
                {
                  onSuccess: () => toast.success(`New invitation sent to ${invite.data?.email}`),
                  onError: (e) => toast.error(e.message),
                }
              )
            }
          >
            {resend.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Resend invitation
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No owner invitation found for this company.</p>
      )}
    </Panel>
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
        <div className="space-y-3 text-sm text-gray-600">
          <p>Members can&apos;t log in while the organization is suspended. Their data is kept.</p>
          <button className={primaryButton} onClick={onActivate} disabled={activate.isPending}>
            {activate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reactivate
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-gray-600">
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
            <span className={labelClass}>Suspension reason</span>
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
          <span className={labelClass}>Plan tier</span>
          <select className={inputClass} value={planTier} onChange={(e) => setPlanTier(e.target.value as PlanTier)}>
            {Object.values(PlanTier).map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Seat limit override</span>
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
      <p className="mb-4 text-sm text-gray-500">
        When a domain is set, invites must go to that domain (or a subdomain). Extra addresses can be allowed individually.
        With no domain, any address can be invited one by one.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">
          <span className={labelClass}>Primary domain</span>
          <input className={inputClass} value={primaryDomain} onChange={(e) => setPrimaryDomain(e.target.value)} placeholder="acme.com" />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Extra domains (one per line)</span>
          <textarea className={`${inputClass} resize-y`} rows={3} value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)} placeholder="acme.co.uk" />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Allowed addresses (one per line)</span>
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
    <PlatformShell title="Companies" description="Companies on the platform, requests to join, and requests to change email domains.">
      <Suspense fallback={<Spinner />}>
        <CompaniesView />
      </Suspense>
    </PlatformShell>
  );
}
