"use client";

import { useState } from "react";
import { BookOpen, Check, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Panel, Spinner, StatusBadge, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useMaterialReview, useMaterials, useSaveMaterial } from "@/lib/hooks/use-campaigns";
import type { Campaign, MaterialType, TrainingMaterial } from "@/types/campaigns";

const KINDS: { type: MaterialType; label: string; required: boolean; help: string; placeholder: string }[] = [
  {
    type: "briefing",
    label: "Briefing",
    required: true,
    help: "Learners read this before the test. Explain what will be tested and how to approach it, without revealing any specific email.",
    placeholder: "You will review a set of emails. For each one, decide whether it is genuine or phishing, and note the warning signs you spot…",
  },
  {
    type: "quick_reference",
    label: "Quick reference",
    required: false,
    help: "A short checklist built from the tactics this campaign focuses on. Optional, but it helps learners look in the right places.",
    placeholder: "Before you trust an email, check: who is it really from, where does the link really go, is it asking for something it shouldn't…",
  },
];

export function MaterialsTab({ campaign, editable }: { campaign: Campaign; editable: boolean }) {
  const materials = useMaterials(campaign.id);
  if (materials.isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      {KINDS.map((kind) => (
        <MaterialCard key={kind.type} kind={kind} campaignId={campaign.id} material={materials.data?.find((m) => m.type === kind.type)} editable={editable} />
      ))}
    </div>
  );
}

function MaterialCard({ kind, campaignId, material, editable }: { kind: (typeof KINDS)[number]; campaignId: string; material?: TrainingMaterial; editable: boolean }) {
  const save = useSaveMaterial(campaignId);
  const review = useMaterialReview(campaignId);
  const [title, setTitle] = useState(material?.title ?? kind.label);
  const [content, setContent] = useState(material?.content ?? "");
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const dirty = !material || title !== material.title || content !== material.content;
  const busy = save.isPending || review.isPending;

  const run = (action: "approve" | "reject" | "delete", success: string) =>
    review.mutate(
      { id: material!.id, action, note },
      {
        onSuccess: () => {
          toast.success(success);
          setRejecting(false);
          setNote("");
          if (action === "delete") {
            setTitle(kind.label);
            setContent("");
          }
        },
        onError: (e) => toast.error(e.message),
      }
    );

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#2016a9]" /> {kind.label}
          {!kind.required && <span className="text-sm font-normal text-gray-400">optional</span>}
        </span>
      }
      description={kind.help}
      actions={material && <StatusBadge status={material.reviewStatus} />}
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} maxLength={200} />
        </div>
        <div>
          <label className={labelClass}>Content</label>
          <textarea className={`${inputClass} min-h-40`} value={content} onChange={(e) => setContent(e.target.value)} disabled={!editable} maxLength={20000} placeholder={kind.placeholder} />
        </div>

        {material?.reviewStatus === "rejected" && material.reviewerNotes && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Rejected: {material.reviewerNotes}</p>}

        {editable && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
            {rejecting ? (
              <div className="flex w-full flex-wrap items-center gap-2">
                <input className={`${inputClass} min-w-48 flex-1`} placeholder="Why is this being rejected?" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
                <button className={secondaryButton} onClick={() => setRejecting(false)}>
                  Cancel
                </button>
                <button className={primaryButton} disabled={!note.trim() || busy} onClick={() => run("reject", "Rejected")}>
                  Reject
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <button
                    className={primaryButton}
                    disabled={!title.trim() || !content.trim() || !dirty || busy}
                    onClick={() =>
                      save.mutate(
                        { id: material?.id, body: material ? { title, content } : { type: kind.type, title, content } },
                        {
                          onSuccess: () => toast.success(material ? "Saved. It needs approval again." : `${kind.label} added`),
                          onError: (e) => toast.error(e.message),
                        }
                      )
                    }
                  >
                    {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {material ? "Save changes" : `Add ${kind.label.toLowerCase()}`}
                  </button>
                  {material && material.reviewStatus !== "approved" && !dirty && (
                    <button className={secondaryButton} disabled={busy} onClick={() => run("approve", "Approved")}>
                      <Check className="h-4 w-4" /> Approve
                    </button>
                  )}
                  {material && material.reviewStatus !== "rejected" && !dirty && (
                    <button className={secondaryButton} onClick={() => setRejecting(true)}>
                      <X className="h-4 w-4" /> Reject
                    </button>
                  )}
                </div>
                {material && (
                  <button className={`${secondaryButton} hover:border-red-300 hover:text-red-700`} disabled={busy} onClick={() => run("delete", "Deleted")}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
