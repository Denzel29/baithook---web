"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Inbox, Loader2, MousePointerClick, X } from "lucide-react";
import { toast } from "sonner";
import {
  Detail,
  EmptyState,
  FilterTabs,
  Panel,
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
import { useApproveRequest, useOnboardingRequest, useOnboardingRequests, useRejectRequest } from "@/lib/hooks/use-platform";
import {
  COMPANY_SIZE_LABELS,
  GOAL_LABELS,
  INDUSTRY_LABELS,
  OnboardingRequestStatus,
  PLAN_LABELS,
  PlanTier,
  REFERRAL_LABELS,
  type OnboardingRequestDetail,
} from "@/types/onboarding";

type StatusFilter = OnboardingRequestStatus | "all";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: OnboardingRequestStatus.PENDING, label: "Awaiting review" },
  { value: OnboardingRequestStatus.UNVERIFIED, label: "Unverified" },
  { value: OnboardingRequestStatus.APPROVED, label: "Approved" },
  { value: OnboardingRequestStatus.REJECTED, label: "Rejected" },
  { value: "all", label: "All" },
];

// The "Requests" tab of the Companies page: companies asking to join the platform
export function OnboardingRequestsTab() {
  const router = useRouter();
  const selectedId = useSearchParams().get("id");
  const [filter, setFilter] = useState<StatusFilter>(OnboardingRequestStatus.PENDING);
  const requests = useOnboardingRequests(filter === "all" ? undefined : filter);

  const select = (id: string | null) =>
    router.push(id ? `/dashboard/platform/organizations?tab=requests&id=${id}` : "/dashboard/platform/organizations?tab=requests");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* On small screens the detail replaces the list */}
      <div className={`space-y-4 ${selectedId ? "hidden lg:block" : ""}`}>
        <FilterTabs value={filter} options={FILTERS} onChange={setFilter} />
        <Panel>
          {requests.isLoading ? (
            <Spinner />
          ) : requests.isError ? (
            <p className="text-sm text-red-600">{(requests.error as Error).message}</p>
          ) : !requests.data?.data.length ? (
            <EmptyState icon={Inbox} title="Nothing here">
              {filter === OnboardingRequestStatus.PENDING
                ? "No companies are waiting for review. New requests appear here once the contact verifies their email."
                : "No requests with this status."}
            </EmptyState>
          ) : (
            <ul className="-my-2 divide-y divide-gray-100">
              {requests.data.data.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => select(r.id)}
                    className={`flex w-full items-start justify-between gap-3 rounded-md px-2 py-3 text-left transition hover:bg-gray-50 ${
                      r.id === selectedId ? "bg-indigo-50/60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800">{r.companyName}</p>
                      <p className="truncate text-xs text-gray-500">
                        {r.contactFirstName} {r.contactLastName} · {r.contactEmail}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={r.status} />
                      {(r.isFreeEmailDomain || r.possibleDuplicateOrgId) && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Has review flags" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className={selectedId ? "" : "hidden lg:block"}>
        {selectedId ? (
          <RequestDetail id={selectedId} onBack={() => select(null)} />
        ) : (
          <Panel>
            <EmptyState icon={MousePointerClick} title="Select a request">
              Pick a company on the left to see its details and approve or reject it.
            </EmptyState>
          </Panel>
        )}
      </div>
    </div>
  );
}

function RequestDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const request = useOnboardingRequest(id);

  if (request.isLoading) {
    return (
      <Panel>
        <Spinner />
      </Panel>
    );
  }
  if (request.isError || !request.data) {
    return (
      <Panel>
        <p className="text-sm text-red-600">{(request.error as Error)?.message ?? "Request not found"}</p>
      </Panel>
    );
  }

  const r = request.data;
  const flags = [
    r.isFreeEmailDomain && "The contact uses a free email provider, so the company domain can't be confirmed from it.",
    r.possibleDuplicateOrg &&
      `Possible duplicate of "${r.possibleDuplicateOrg.name}"${r.possibleDuplicateOrg.primaryDomain ? ` (${r.possibleDuplicateOrg.primaryDomain})` : ""}.`,
    r.contactAccount.exists && !r.contactAccount.organizationId && "The contact already has a personal account; approving will link it to the new organization.",
    r.contactAccount.organizationId && "The contact already belongs to another organization. Approval will be refused.",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 lg:hidden">
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </button>

      <Panel
        title={r.companyName}
        actions={<StatusBadge status={r.status} />}
      >
        {flags.length > 0 && (
          <div className="mb-5 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {flags.map((f) => (
              <p key={f} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {f}
              </p>
            ))}
          </div>
        )}

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Industry">{INDUSTRY_LABELS[r.industry]}</Detail>
          <Detail label="Size">{COMPANY_SIZE_LABELS[r.companySize]}</Detail>
          <Detail label="Country">{countryName(r.country)}</Detail>
          <Detail label="Timezone">{r.timezone}</Detail>
          <Detail label="Website">
            {r.website ? (
              <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer" className="text-[#2016a9] hover:underline">
                {r.website}
              </a>
            ) : null}
          </Detail>
          <Detail label="Company domain">{r.primaryDomain}</Detail>
          <Detail label="People to train">{r.expectedSeats}</Detail>
          <Detail label="Plan interest">{r.interestedPlan ? PLAN_LABELS[r.interestedPlan] : null}</Detail>
        </dl>

        <hr className="my-5 border-gray-100" />

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Contact">
            {r.contactFirstName} {r.contactLastName}
          </Detail>
          <Detail label="Job title">{r.contactJobTitle}</Detail>
          <Detail label="Email">
            {r.contactEmail}
            {r.emailVerifiedAt && <span className="ml-2 text-xs text-emerald-600">verified</span>}
          </Detail>
          <Detail label="Phone">{r.contactPhone}</Detail>
          <Detail label="Goals">{r.goals.map((g) => GOAL_LABELS[g]).join(", ")}</Detail>
          <Detail label="Heard about us">{r.referralSource ? REFERRAL_LABELS[r.referralSource] : null}</Detail>
          <Detail label="Submitted">{formatDate(r.createdAt)}</Detail>
          <Detail label="Marketing opt-in">{r.marketingOptIn ? "Yes" : "No"}</Detail>
        </dl>

        {r.message && (
          <div className="mt-5 rounded-md bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-700">{r.message}</div>
        )}

        {r.reviewedAt && (
          <div className="mt-5 text-sm text-gray-600">
            Reviewed {formatDate(r.reviewedAt)}
            {r.reviewNote && <p className="mt-1 italic">&ldquo;{r.reviewNote}&rdquo;</p>}
            {r.organizationId && (
              <Link href={`/dashboard/platform/organizations?id=${r.organizationId}`} className="mt-2 block w-fit font-medium text-[#2016a9] hover:underline">
                Open organization →
              </Link>
            )}
          </div>
        )}
      </Panel>

      {/* keyed so the form resets when switching requests */}
      {r.status === OnboardingRequestStatus.PENDING && <ReviewActions key={r.id} request={r} />}
      {r.status === OnboardingRequestStatus.UNVERIFIED && (
        <Panel>
          <p className="text-sm text-gray-600">
            Waiting for the contact to verify their email. Requests can only be reviewed once verified.
          </p>
        </Panel>
      )}
    </div>
  );
}

function ReviewActions({ request }: { request: OnboardingRequestDetail }) {
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  const [planTier, setPlanTier] = useState<PlanTier>(request.interestedPlan ?? PlanTier.FREE);
  const [seatLimit, setSeatLimit] = useState(request.expectedSeats ? String(request.expectedSeats) : "");
  const [primaryDomain, setPrimaryDomain] = useState(request.primaryDomain ?? "");
  const [note, setNote] = useState("");
  const busy = approve.isPending || reject.isPending;

  const onApprove = () =>
    approve.mutate(
      {
        id: request.id,
        planTier,
        seatLimit: seatLimit ? Number(seatLimit) : null,
        primaryDomain: primaryDomain.trim() || null,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => toast.success(`${request.companyName} approved. The owner invite has been emailed.`),
        onError: (e) => toast.error(e.message),
      }
    );

  const onReject = () => {
    if (note.trim().length < 3) {
      toast.error("Add a short reason; it is emailed to the requester.");
      return;
    }
    reject.mutate(
      { id: request.id, note: note.trim() },
      {
        onSuccess: () => toast.success("Request rejected"),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Panel title="Decision">
      <div className="mb-4 flex gap-2">
        <button className={mode === "approve" ? primaryButton : secondaryButton} onClick={() => setMode("approve")}>
          <Check className="h-4 w-4" /> Approve
        </button>
        <button className={mode === "reject" ? dangerButton : secondaryButton} onClick={() => setMode("reject")}>
          <X className="h-4 w-4" /> Reject
        </button>
      </div>

      {mode === "approve" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className={labelClass}>Plan</span>
            <select className={inputClass} value={planTier} onChange={(e) => setPlanTier(e.target.value as PlanTier)} disabled={busy}>
              {Object.values(PlanTier).map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={labelClass}>Seat limit</span>
            <input className={inputClass} inputMode="numeric" placeholder="Plan default" value={seatLimit} onChange={(e) => setSeatLimit(e.target.value.replace(/\D/g, ""))} disabled={busy} />
          </label>
          <label className="text-sm">
            <span className={labelClass}>Company domain</span>
            <input className={inputClass} placeholder="none (per-address invites)" value={primaryDomain} onChange={(e) => setPrimaryDomain(e.target.value)} disabled={busy} />
          </label>
        </div>
      )}

      <label className="mt-4 block text-sm">
        <span className={labelClass}>
          {mode === "approve" ? "Note to the requester (optional)" : "Reason (emailed to the requester)"}
        </span>
        <textarea className={`${inputClass} resize-y`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} maxLength={1000} />
      </label>

      <div className="mt-4 flex justify-end">
        {mode === "approve" ? (
          <button className={primaryButton} onClick={onApprove} disabled={busy}>
            {approve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Approve &amp; send owner invite
          </button>
        ) : (
          <button className={dangerButton} onClick={onReject} disabled={busy}>
            {reject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reject request
          </button>
        )}
      </div>
    </Panel>
  );
}
