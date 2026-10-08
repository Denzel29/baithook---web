"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2, Mail, Pencil, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Panel, Spinner, StatusBadge, inputClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useBulkApproveEmails, useEmailReview, useEmails, useIndicators, useRegenerateEmail } from "@/lib/hooks/use-campaigns";
import type { Campaign, CampaignEmail, Indicator, ScanWarning } from "@/types/campaigns";
import { fillSample } from "@/lib/placeholders";
import { EmailEditor } from "./email-editor";
import { EmailView } from "./email-view";

export function describeWarning(w: ScanWarning, indicators: Indicator[]): string {
  const label = (id: string) => indicators.find((i) => i.id === id)?.label ?? id;
  switch (w.code) {
    case "CLAIMED_NOT_FOUND":
      return `You listed "${label(w.indicatorId)}" but the scanner can't find it in the text`;
    case "BENIGN_TOO_PHISHY":
      return `This legitimate email trips ${w.indicatorIds.length} phishing tells (${w.indicatorIds.map(label).join(", ")})`;
    case "UNSAFE_LINK":
      return `A real address was replaced with a sandbox one (${w.original})`;
    case "PHISHING_TOO_FEW":
      return `Only ${w.count} tell(s) detected, fewer than this difficulty calls for`;
    case "PHISHING_TOO_MANY":
      return `${w.count} tells detected, more than this difficulty calls for`;
    case "MISSING_PAGE":
      return `It links to page "${w.pageKey}", which doesn't exist yet`;
  }
}

export function EmailsTab({ campaign, editable }: { campaign: Campaign; editable: boolean }) {
  const emails = useEmails(campaign.id, campaign.status === "generating");
  const indicators = useIndicators();
  const [editing, setEditing] = useState<CampaignEmail | "new" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulk = useBulkApproveEmails(campaign.id);

  if (editing) return <EmailEditor campaignId={campaign.id} email={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />;

  const list = emails.data ?? [];
  const pending = list.filter((e) => e.reviewStatus === "pending").length;
  const allSelected = list.length > 0 && list.every((e) => selected.has(e.id));

  const approve = (ids: string[] | undefined) =>
    bulk.mutate(ids, {
      onSuccess: ({ approved, skipped }) => {
        setSelected(new Set());
        if (skipped.length === 0) toast.success(`${approved} email${approved === 1 ? "" : "s"} approved`);
        else toast.warning(`${approved} approved, ${skipped.length} skipped: "${skipped[0].subject || "an email"}" ${skipped[0].reason}`);
      },
      onError: (e) => toast.error(e.message),
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {list.length} email{list.length === 1 ? "" : "s"} · {campaign.counts.emails.approved} approved ·{" "}
          {campaign.phishingPerAttempt * campaign.poolMultiplier} phishing and {campaign.benignPerAttempt * campaign.poolMultiplier} legitimate needed to launch
        </p>
        {editable && (
          <button className={primaryButton} onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add email
          </button>
        )}
      </div>

      {editable && list.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#2016a9]"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = selected.size > 0 && !allSelected;
              }}
              onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((e) => e.id)))}
            />
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={secondaryButton} disabled={selected.size === 0 || bulk.isPending} onClick={() => approve([...selected])}>
              {bulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve selected{selected.size ? ` (${selected.size})` : ""}
            </button>
            <button className={primaryButton} disabled={pending === 0 || bulk.isPending} onClick={() => approve(undefined)} title="Approves every email waiting for review, warnings included">
              <Check className="h-4 w-4" /> Approve all pending{pending ? ` (${pending})` : ""}
            </button>
          </div>
        </div>
      )}

      {emails.isLoading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Panel flush>
          <EmptyState icon={Mail} title="No emails yet">
            Write the first email by hand, adding the pages its links open in the Pages tab. Or{" "}
            <Link href={`?id=${campaign.id}`} className="inline-flex items-center gap-1 font-semibold text-[#2016a9] hover:underline">
              <Sparkles className="h-3.5 w-3.5" /> let the AI write them
            </Link>{" "}
            from your brief on the Overview tab.
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <EmailCard
              key={e.id}
              email={e}
              campaignId={campaign.id}
              editable={editable}
              indicators={indicators.data ?? []}
              selected={selected.has(e.id)}
              onToggle={() =>
                setSelected((s) => {
                  const next = new Set(s);
                  if (next.has(e.id)) next.delete(e.id);
                  else next.add(e.id);
                  return next;
                })
              }
              onEdit={() => setEditing(e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmailCard({
  email,
  campaignId,
  editable,
  indicators,
  selected,
  onToggle,
  onEdit,
}: {
  email: CampaignEmail;
  campaignId: string;
  editable: boolean;
  indicators: Indicator[];
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const review = useEmailReview(campaignId);
  const regenerate = useRegenerateEmail(campaignId);
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [note, setNote] = useState("");
  const aiDrafted = !email.editedByHuman || !!email.slot;
  const busy = email.generationStatus === "generating";
  const label = (id: string) => indicators.find((i) => i.id === id)?.label ?? id;
  const warnings = email.scanResult?.warnings ?? [];

  const run = (action: "approve" | "reject" | "delete", success: string) =>
    review.mutate(
      { id: email.id, action, note },
      {
        onSuccess: () => {
          toast.success(success);
          setRejecting(false);
          setNote("");
        },
        onError: (e) => toast.error(e.message),
      }
    );

  return (
    <article className={`rounded-xl border bg-white shadow-sm ${selected ? "border-[#2016a9] ring-1 ring-[#2016a9]" : "border-gray-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        {editable && <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#2016a9]" checked={selected} onChange={onToggle} aria-label={`Select ${email.subject}`} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${email.isPhishing ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {email.isPhishing ? "Phishing" : "Legitimate"}
            </span>
            <StatusBadge status={email.reviewStatus} />
            {aiDrafted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-[#2016a9]">
                <Sparkles className="h-3 w-3" /> {email.editedByHuman ? "AI draft, edited" : "AI draft"}
              </span>
            )}
            {busy && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2016a9]">
                <Loader2 className="h-3 w-3 animate-spin" /> Rewriting…
              </span>
            )}
          </div>
          <p className="mt-2 truncate font-semibold text-gray-900">{email.subject}</p>
          <p className="truncate text-sm text-gray-500">
            {email.senderName} &lt;{email.senderAddress}&gt;
          </p>
        </div>
        <button onClick={() => setOpen(!open)} className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-[#2016a9] hover:underline">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} {open ? "Hide" : "Preview"}
        </button>
      </div>

      {(email.scanResult?.detectedIndicators.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
          <span className="text-xs text-gray-500">Scanner found:</span>
          {email.scanResult!.detectedIndicators.map((id) => (
            <span key={id} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {label(id)}
            </span>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <ul className="mx-5 mb-3 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warnings.map((w, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {describeWarning(w, indicators)}
            </li>
          ))}
        </ul>
      )}

      {email.reviewStatus === "rejected" && email.reviewerNotes && <p className="mx-5 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Rejected: {email.reviewerNotes}</p>}
      {email.generationStatus === "failed" && <p className="mx-5 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">The last rewrite did not work, so this is still the earlier version. Try again.</p>}

      {open && (
        <div className="space-y-4 border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <EmailView email={email} seed={email.id} fill={fillSample} />
          {email.isPhishing ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">What makes it phishing</p>
              {email.indicators.length === 0 && <p className="text-sm text-gray-500">No tells have been listed yet.</p>}
              {email.indicators.map((ind, i) => (
                <p key={i} className="text-sm text-gray-700">
                  <span className="font-medium">{label(ind.indicatorId)}:</span> &ldquo;{ind.excerpt}&rdquo; &mdash; {ind.explanation}
                </p>
              ))}
            </div>
          ) : (
            email.benignRationale && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Why it&apos;s legitimate:</span> {email.benignRationale}
              </p>
            )
          )}
        </div>
      )}

      {editable && !busy && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
          {rewriting ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              <input className={`${inputClass} min-w-48 flex-1`} placeholder="What should change? e.g. make it less pushy" value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={500} autoFocus />
              <button className={secondaryButton} onClick={() => setRewriting(false)}>
                Cancel
              </button>
              <button
                className={primaryButton}
                disabled={feedback.trim().length < 3 || regenerate.isPending}
                onClick={() =>
                  regenerate.mutate(
                    { emailId: email.id, feedback: feedback.trim() },
                    {
                      onSuccess: () => {
                        toast.success("The AI is rewriting it. Review it when it is done.");
                        setRewriting(false);
                        setFeedback("");
                      },
                      onError: (e) => toast.error(e.message),
                    }
                  )
                }
              >
                {regenerate.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Rewrite
              </button>
            </div>
          ) : rejecting ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              <input className={`${inputClass} min-w-48 flex-1`} placeholder="Why is this being rejected?" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
              <button className={secondaryButton} onClick={() => setRejecting(false)}>
                Cancel
              </button>
              <button className={primaryButton} disabled={!note.trim() || review.isPending} onClick={() => run("reject", "Email rejected")}>
                Reject
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {email.reviewStatus !== "approved" && (
                  <button className={primaryButton} disabled={review.isPending} onClick={() => run("approve", "Email approved")}>
                    <Check className="h-4 w-4" /> Approve
                  </button>
                )}
                {email.reviewStatus !== "rejected" && (
                  <button className={secondaryButton} onClick={() => setRejecting(true)}>
                    <X className="h-4 w-4" /> Reject
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {email.slot && (
                  <button className={secondaryButton} onClick={() => setRewriting(true)} title="Ask the AI to rewrite this email with your feedback">
                    <RefreshCw className="h-4 w-4" /> Regenerate
                  </button>
                )}
                <button className={secondaryButton} onClick={onEdit}>
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button className={`${secondaryButton} hover:border-red-300 hover:text-red-700`} disabled={review.isPending} onClick={() => run("delete", "Email deleted")}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
