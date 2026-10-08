"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Globe, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { DomainDiff, hasDomainChanges } from "@/components/dashboard/domain-diff";
import {
  EmptyState,
  FilterTabs,
  Panel,
  Spinner,
  StatusBadge,
  dangerButton,
  formatDate,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/dashboard/ui";
import { useDomainRequests, useReviewDomainRequest } from "@/lib/hooks/use-platform";
import type { DomainChangeRequestReview } from "@/types/onboarding";

type Filter = "pending" | "approved" | "rejected" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

// The "Domain requests" tab of the Companies page
export function DomainRequestsTab() {
  const [filter, setFilter] = useState<Filter>("pending");
  const requests = useDomainRequests(filter === "all" ? undefined : filter);

  return (
    <div className="space-y-4">
      <FilterTabs value={filter} options={FILTERS} onChange={setFilter} />
      {requests.isLoading ? (
        <Panel>
          <Spinner />
        </Panel>
      ) : requests.isError ? (
        <Panel>
          <p className="text-sm text-red-600">{(requests.error as Error).message}</p>
        </Panel>
      ) : !requests.data?.length ? (
        <Panel>
          <EmptyState icon={Globe} title="Nothing here">
            {filter === "pending" ? "No companies are waiting for a domain change." : "No domain requests with this status."}
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-4">
          {requests.data.map((r) => (
            <DomainRequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function DomainRequestCard({ request: r }: { request: DomainChangeRequestReview }) {
  const review = useReviewDomainRequest();
  const [note, setNote] = useState("");
  const isPending = r.status === "pending";
  const snapshot = { primaryDomain: r.currentPrimaryDomain, allowedDomains: r.currentAllowedDomains };
  const proposed = { primaryDomain: r.proposedPrimaryDomain, allowedDomains: r.proposedAllowedDomains };
  // The company's domains may have been changed (e.g. by another approved
  // request) since this one was submitted; approving replaces them wholesale
  const drifted = isPending && r.currentNow && hasDomainChanges(snapshot, r.currentNow);

  const decide = (decision: "approve" | "reject") => {
    if (decision === "reject" && note.trim().length < 3) {
      toast.error("Add a short reason; it is emailed to the requester.");
      return;
    }
    review.mutate(
      { id: r.id, decision, note: note.trim() || undefined },
      {
        onSuccess: () => toast.success(decision === "approve" ? `Domains updated for ${r.organizationName}` : "Request rejected"),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Panel
      title={
        <Link href={`/dashboard/platform/organizations?id=${r.organizationId}`} className="hover:text-[#2016a9] hover:underline">
          {r.organizationName ?? "Unknown company"}
        </Link>
      }
      description={`Requested ${formatDate(r.createdAt)}${r.requester ? ` by ${r.requester.name} (${r.requester.email})` : ""}`}
      actions={<StatusBadge status={r.status} />}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <DomainDiff from={snapshot} to={proposed} />
          <p className="mt-4 text-sm text-gray-700">
            <span className="font-medium">Reason:</span> {r.reason}
          </p>
          {r.reviewNote && <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">Review note: {r.reviewNote}</p>}
        </div>

        {isPending && (
          <div className="space-y-3">
            {r.conflicts.length > 0 && (
              <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {r.conflicts.map((c) => (
                  <p key={`${c.domain}-${c.organizationId}`} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="font-mono">{c.domain}</span> already belongs to {c.organizationName}. Approval will be refused.
                    </span>
                  </p>
                ))}
              </div>
            )}
            {drifted && (
              <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                This company&apos;s domains changed after the request was made. Approving replaces them with the proposed set above.
              </p>
            )}
            <textarea
              className={`${inputClass} resize-y`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note to the requester (required to reject)"
              maxLength={1000}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button className={dangerButton} disabled={review.isPending} onClick={() => decide("reject")}>
                <X className="h-4 w-4" /> Reject
              </button>
              <button className={r.conflicts.length ? secondaryButton : primaryButton} disabled={review.isPending} onClick={() => decide("approve")}>
                {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve &amp; apply
              </button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
