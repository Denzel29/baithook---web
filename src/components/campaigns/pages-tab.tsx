"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Globe, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, EmptyState, Panel, Spinner, StatusBadge, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useBulkApprovePages, useCreatePagesFromPattern, useEmails, usePageReview, usePagePatterns, usePages } from "@/lib/hooks/use-campaigns";
import { blockActions, describeAction } from "@/lib/sandbox";
import { PAGE_KIND_LABELS, type Campaign, type SandboxPage } from "@/types/campaigns";
import { PageEditor } from "./page-editor";
import { PagePreview } from "./sandbox-frame";

export function PagesTab({ campaign, editable }: { campaign: Campaign; editable: boolean }) {
  const pages = usePages(campaign.id, campaign.status === "generating");
  const emails = useEmails(campaign.id);
  const [editing, setEditing] = useState<SandboxPage | "new" | null>(null);
  const [patternOpen, setPatternOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulk = useBulkApprovePages(campaign.id);

  const list = pages.data ?? [];
  const allSelected = list.length > 0 && list.every((p) => selected.has(p.id));
  const pendingCount = list.filter((p) => p.reviewStatus === "pending").length;

  const approve = (ids: string[] | undefined) =>
    bulk.mutate(ids, {
      onSuccess: ({ approved, skipped }) => {
        setSelected(new Set());
        if (skipped.length === 0) toast.success(`${approved} page${approved === 1 ? "" : "s"} approved`);
        else toast.warning(`${approved} approved, ${skipped.length} skipped: ${skipped[0].key || "a page"} ${skipped[0].reason}`);
      },
      onError: (e) => toast.error(e.message),
    });

  if (editing) return <PageEditor campaignId={campaign.id} page={editing === "new" ? undefined : editing} allPages={list} onDone={() => setEditing(null)} />;

  // Which emails open each page, so authors can see what is in use
  const openedBy = (key: string) =>
    (emails.data ?? []).filter((e) => [...e.links.map((l) => l.pageKey), ...e.attachments.map((a) => a.pageKey), ...(e.cta ? [e.cta.pageKey] : [])].includes(key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Every link and attachment opens one of these pages inside the sandbox. {campaign.counts.pages.approved} of {campaign.counts.pages.total - campaign.counts.pages.rejected} approved.
        </p>
        {editable && (
          <div className="flex gap-2">
            <button className={secondaryButton} onClick={() => setPatternOpen(true)}>
              <Sparkles className="h-4 w-4" /> Start from a pattern
            </button>
            <button className={primaryButton} onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Add page
            </button>
          </div>
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
              onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((p) => p.id)))}
            />
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={secondaryButton} disabled={selected.size === 0 || bulk.isPending} onClick={() => approve([...selected])}>
              {bulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve selected{selected.size ? ` (${selected.size})` : ""}
            </button>
            <button className={primaryButton} disabled={pendingCount === 0 || bulk.isPending} onClick={() => approve(undefined)}>
              <Check className="h-4 w-4" /> Approve all pending{pendingCount ? ` (${pendingCount})` : ""}
            </button>
          </div>
        </div>
      )}

      {pages.isLoading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Panel flush>
          <EmptyState icon={Globe} title="No pages yet">
            Start from a pattern, like a fake sign-in that asks for a code and then ends quietly, or build a page block by block.
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <PageCard
              key={p.id}
              page={p}
              all={list}
              campaignId={campaign.id}
              editable={editable}
              usedBy={openedBy(p.key).length}
              selected={selected.has(p.id)}
              onToggle={() => setSelected((s) => { const next = new Set(s); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; })}
              onEdit={() => setEditing(p)}
            />
          ))}
        </div>
      )}

      <PatternDialog campaignId={campaign.id} open={patternOpen} onClose={() => setPatternOpen(false)} />
    </div>
  );
}

function PageCard({
  page,
  all,
  campaignId,
  editable,
  usedBy,
  selected,
  onToggle,
  onEdit,
}: {
  page: SandboxPage;
  all: SandboxPage[];
  campaignId: string;
  editable: boolean;
  usedBy: number;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const review = usePageReview(campaignId);
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const leadsTo = page.blocks.flatMap((b) => blockActions(b).map(describeAction));
  const run = (action: "approve" | "reject" | "delete", success: string) =>
    review.mutate(
      { id: page.id, action, note },
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
        {editable && <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#2016a9]" checked={selected} onChange={onToggle} aria-label={`Select ${page.title}`} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{PAGE_KIND_LABELS[page.kind]}</span>
            <StatusBadge status={page.reviewStatus} />
            {usedBy === 0 && <span className="text-xs text-gray-400">Not opened by any email</span>}
            {usedBy > 0 && <span className="text-xs text-gray-500">Opened by {usedBy} email{usedBy === 1 ? "" : "s"}</span>}
          </div>
          <p className="mt-2 font-semibold text-gray-900">
            {page.title} <span className="font-normal text-gray-400">· {page.key}</span>
          </p>
          <p className="truncate text-sm text-gray-500">{page.displayUrl}</p>
          {leadsTo.length > 0 && <p className="mt-1 text-xs text-gray-500">{[...new Set(leadsTo)].join(" · ")}</p>}
        </div>
        <button onClick={() => setOpen(!open)} className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-[#2016a9] hover:underline">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} {open ? "Hide" : "Preview"}
        </button>
      </div>

      {page.reviewStatus === "rejected" && page.reviewerNotes && <p className="mx-5 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Rejected: {page.reviewerNotes}</p>}

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <PagePreview pages={all} startKey={page.key} />
        </div>
      )}

      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
          {rejecting ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              <input className={`${inputClass} min-w-48 flex-1`} placeholder="Why is this being rejected?" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
              <button className={secondaryButton} onClick={() => setRejecting(false)}>
                Cancel
              </button>
              <button className={primaryButton} disabled={!note.trim() || review.isPending} onClick={() => run("reject", "Page rejected")}>
                Reject
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {page.reviewStatus !== "approved" && (
                  <button className={primaryButton} disabled={review.isPending} onClick={() => run("approve", "Page approved")}>
                    <Check className="h-4 w-4" /> Approve
                  </button>
                )}
                {page.reviewStatus !== "rejected" && (
                  <button className={secondaryButton} onClick={() => setRejecting(true)}>
                    <X className="h-4 w-4" /> Reject
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button className={secondaryButton} onClick={onEdit}>
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button className={`${secondaryButton} hover:border-red-300 hover:text-red-700`} disabled={review.isPending} onClick={() => run("delete", "Page deleted")}>
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

function PatternDialog({ campaignId, open, onClose }: { campaignId: string; open: boolean; onClose: () => void }) {
  const patterns = usePagePatterns();
  const create = useCreatePagesFromPattern(campaignId);
  const [pattern, setPattern] = useState("");
  const [prefix, setPrefix] = useState("");
  const [brand, setBrand] = useState("");
  const [domain, setDomain] = useState("");

  const chosen = patterns.data?.find((p) => p.id === pattern);
  const valid = chosen && /^[a-z0-9][a-z0-9-]*$/.test(prefix) && brand.trim() && domain.trim();

  const submit = () =>
    create.mutate(
      { pattern, prefix, brand: brand.trim(), domain: domain.trim().toLowerCase() },
      {
        onSuccess: (pages) => {
          toast.success(`${pages.length} page${pages.length === 1 ? "" : "s"} added. Review and approve them next.`);
          onClose();
        },
        onError: (e) => toast.error(e.message),
      }
    );

  return (
    <Dialog open={open} onClose={onClose} title="Start from a pattern" icon={<Sparkles />} description="Creates a set of linked pages you can then edit." wide>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {(patterns.data ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPattern(p.id);
                if (!prefix) setPrefix(p.id.split("_")[0]);
              }}
              className={`cursor-pointer rounded-xl border p-4 text-left transition ${pattern === p.id ? "border-[#2016a9] bg-indigo-50/50 ring-1 ring-[#2016a9]" : "border-gray-200 hover:border-gray-300"}`}
            >
              <p className="font-semibold text-gray-900">{p.label}</p>
              <p className="mt-1 text-sm text-gray-600">{p.description}</p>
              <p className="mt-2 text-xs text-gray-400">
                {p.pages.length} page{p.pages.length === 1 ? "" : "s"} · {p.phishing ? "for phishing emails" : "for legitimate emails"}
              </p>
            </button>
          ))}
        </div>

        {chosen && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Brand name</label>
              <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Acme" />
            </div>
            <div>
              <label className={labelClass}>Fake domain</label>
              <input className={inputClass} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="secure-acme-login.example" />
            </div>
            <div>
              <label className={labelClass}>Page key prefix</label>
              <input className={inputClass} value={prefix} onChange={(e) => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="acme" />
            </div>
            <p className="text-xs text-gray-500 sm:col-span-3">
              Pages are named {prefix || "prefix"}-{chosen.pages.map((p) => p.key).join(`, ${prefix || "prefix"}-`)}. The first, {prefix || "prefix"}-{chosen.entryKey}, is the one an email link should open.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryButton} disabled={!valid || create.isPending} onClick={submit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create pages
          </button>
        </div>
      </div>
    </Dialog>
  );
}
