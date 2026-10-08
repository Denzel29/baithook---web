"use client";

import { useState } from "react";
import { Check, Clock, Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { DomainDiff, hasDomainChanges, type DomainSet } from "@/components/dashboard/domain-diff";
import { Panel, Spinner, StatusBadge, formatDate, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { ApiError } from "@/lib/api";
import { useCancelDomainRequest, useMyDomainRequests, useRequestDomainChange } from "@/lib/hooks/use-company";
import type { OrganizationRecord } from "@/types/onboarding";

const DOMAIN_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const cleanDomain = (v: string) => v.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");

// Who can be invited is decided by the email domains, so companies propose
// changes here and a platform admin approves them.
export function DomainSettings({ org }: { org: OrganizationRecord }) {
  const requests = useMyDomainRequests();
  const [editing, setEditing] = useState(false);
  const current: DomainSet = { primaryDomain: org.primaryDomain, allowedDomains: org.allowedDomains };
  const pending = requests.data?.find((r) => r.status === "pending");
  const history = requests.data?.filter((r) => r.status !== "pending").slice(0, 5) ?? [];

  return (
    <Panel
      title="Email domains"
      description="Only addresses on these domains can be invited. Changes are reviewed by Baitline before they take effect."
      actions={
        !editing &&
        !pending && (
          <button className={`${secondaryButton} shrink-0 whitespace-nowrap`} onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Request a change
          </button>
        )
      }
    >
      {editing ? (
        <DomainRequestForm current={current} onDone={() => setEditing(false)} />
      ) : (
        <div className="space-y-6">
          <DomainDiff from={current} to={current} />
          {!current.primaryDomain && current.allowedDomains.length === 0 && (
            <p className="text-sm text-gray-500">No domains set, so each person must be invited individually by their full address.</p>
          )}

          {requests.isLoading && <Spinner />}

          {pending && <PendingRequest request={pending} current={current} />}

          {history.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Previous requests</h3>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {history.map((r) => (
                  <li key={r.id} className="space-y-2 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-gray-600">
                        {formatDate(r.createdAt)}
                        {r.requester && <span className="text-gray-400"> · {r.requester.name}</span>}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <DomainDiff
                      from={{ primaryDomain: r.currentPrimaryDomain, allowedDomains: r.currentAllowedDomains }}
                      to={{ primaryDomain: r.proposedPrimaryDomain, allowedDomains: r.proposedAllowedDomains }}
                    />
                    {r.reviewNote && <p className="rounded-lg bg-gray-50 px-3 py-2 text-gray-600">Baitline: {r.reviewNote}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function PendingRequest({ request, current }: { request: NonNullable<ReturnType<typeof useMyDomainRequests>["data"]>[number]; current: DomainSet }) {
  const cancel = useCancelDomainRequest();
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-amber-900">
          <Clock className="h-4 w-4" /> Change awaiting review
        </p>
        <button
          className="cursor-pointer text-sm font-medium text-gray-600 hover:text-red-600 disabled:opacity-50"
          disabled={cancel.isPending}
          onClick={() =>
            cancel.mutate({ id: request.id }, { onSuccess: () => toast.success("Request cancelled"), onError: (e) => toast.error(e.message) })
          }
        >
          Cancel request
        </button>
      </div>
      <DomainDiff from={current} to={{ primaryDomain: request.proposedPrimaryDomain, allowedDomains: request.proposedAllowedDomains }} />
      <p className="mt-3 text-sm text-gray-600">
        <span className="font-medium text-gray-700">Reason:</span> {request.reason}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Submitted {formatDate(request.createdAt)}
        {request.requester && ` by ${request.requester.name}`}
      </p>
    </div>
  );
}

function DomainRequestForm({ current, onDone }: { current: DomainSet; onDone: () => void }) {
  const submit = useRequestDomainChange();
  const [primary, setPrimary] = useState(current.primaryDomain ?? "");
  const [domains, setDomains] = useState<string[]>(current.allowedDomains);
  const [newDomain, setNewDomain] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [reason, setReason] = useState("");

  const primaryClean = cleanDomain(primary);
  const proposed: DomainSet = { primaryDomain: primaryClean || null, allowedDomains: domains.filter((d) => d !== primaryClean) };
  const primaryInvalid = !!primaryClean && !DOMAIN_PATTERN.test(primaryClean);
  const changed = hasDomainChanges(current, proposed);

  const addDomain = (raw: string, replaceAt?: number) => {
    const d = cleanDomain(raw);
    if (!DOMAIN_PATTERN.test(d)) {
      toast.error(`"${raw}" isn't a valid domain, e.g. acme.co.uk`);
      return false;
    }
    if (domains.some((x, i) => x === d && i !== replaceAt) || d === primaryClean) {
      toast.error(`${d} is already in the list`);
      return false;
    }
    setDomains((list) => (replaceAt === undefined ? [...list, d] : list.map((x, i) => (i === replaceAt ? d : x))));
    return true;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit.mutate(
      { ...proposed, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success("Domain change sent for review");
          onDone();
        },
        onError: (err) => toast.error(err instanceof ApiError ? (err.fieldErrors[0]?.message ?? err.message) : err.message),
      }
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block text-sm">
        <span className={labelClass}>Primary domain</span>
        <input
          className={`${inputClass} font-mono ${primaryInvalid ? "border-red-400" : ""}`}
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
          placeholder="acme.com (leave empty for no domain)"
        />
        {primaryInvalid && <span className="mt-1 block text-xs text-red-600">Enter a domain like acme.com</span>}
      </label>

      <div className="text-sm">
        <span className={labelClass}>Additional domains</span>
        <ul className="space-y-2">
          {domains.map((d, i) => (
            <li key={`${d}-${i}`} className="flex items-center gap-2">
              {editIndex === i ? (
                <>
                  <input
                    className={`${inputClass} font-mono`}
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (addDomain(editValue, i)) setEditIndex(null);
                      }
                      if (e.key === "Escape") setEditIndex(null);
                    }}
                  />
                  <button type="button" className="cursor-pointer rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" aria-label="Save" onClick={() => addDomain(editValue, i) && setEditIndex(null)}>
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Cancel edit" onClick={() => setEditIndex(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-gray-800">{d}</span>
                  <button
                    type="button"
                    className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[#2016a9]"
                    aria-label={`Edit ${d}`}
                    onClick={() => {
                      setEditIndex(i);
                      setEditValue(d);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${d}`}
                    onClick={() => setDomains((list) => list.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input
            className={`${inputClass} font-mono`}
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Add a domain, e.g. acme.co.uk"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newDomain.trim() && addDomain(newDomain)) setNewDomain("");
              }
            }}
          />
          <button type="button" className={secondaryButton} disabled={!newDomain.trim()} onClick={() => addDomain(newDomain) && setNewDomain("")}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">Subdomains are included automatically. Free email providers like gmail.com can&apos;t be used.</p>
      </div>

      {changed && (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-900">What will change</p>
          <DomainDiff from={current} to={proposed} />
        </div>
      )}

      <label className="block text-sm">
        <span className={labelClass}>
          Why do you need this change? <span className="text-red-500">*</span>
        </span>
        <textarea
          className={`${inputClass} resize-y`}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. We acquired Acme UK and need to invite staff on acme.co.uk"
          maxLength={1000}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButton} onClick={onDone} disabled={submit.isPending}>
          Cancel
        </button>
        <button type="submit" className={primaryButton} disabled={!changed || primaryInvalid || reason.trim().length < 5 || submit.isPending}>
          {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit for review
        </button>
      </div>
    </form>
  );
}
