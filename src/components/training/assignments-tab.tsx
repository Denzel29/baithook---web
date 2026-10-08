"use client";

import { useState } from "react";
import { ArrowLeft, ClipboardList, Loader2, RefreshCw, Users, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Panel, Spinner, StatusBadge, formatDate, inputClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useBatch, useBatches, useCancelAssignment, useExtendDueDate, useResyncBatch } from "@/lib/hooks/use-training";
import type { Campaign } from "@/types/campaigns";
import { ASSIGNMENT_STATUS_LABELS, type BatchSummary } from "@/types/training";
import { AssignDialog } from "./assign-dialog";

const TARGET_TEXT: Record<BatchSummary["targetType"], string> = {
  organization: "Everyone",
  departments: "Departments",
  users: "Selected people",
  self_enroll: "Self-enrolled",
};

const STATUS_BADGE: Record<string, string> = { assigned: "pending", in_progress: "pending_setup", submitted: "approved", expired: "rejected", cancelled: "expired" };

export function AssignmentsTab({ campaign, canAssign }: { campaign: Campaign; canAssign: boolean }) {
  const batches = useBatches(campaign.id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  if (openId) return <BatchView id={openId} onBack={() => setOpenId(null)} />;
  const list = batches.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">Who has been given this campaign, and how they are getting on.</p>
        {canAssign && campaign.status === "active" && (
          <button className={primaryButton} onClick={() => setAssigning(true)}>
            <Users className="h-4 w-4" /> Assign
          </button>
        )}
      </div>

      <Panel flush>
        {batches.isLoading ? (
          <div className="py-12">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Not assigned yet">
            {campaign.status === "active" ? "Assign this campaign to everyone, a department or chosen people." : "Launch the campaign to assign it."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Assigned</th>
                  <th className="px-6 py-3 font-medium">To</th>
                  <th className="px-6 py-3 font-medium">By</th>
                  <th className="px-6 py-3 font-medium">Due</th>
                  <th className="px-6 py-3 font-medium">Completed</th>
                  <th className="px-6 py-3 font-medium">Average score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((b) => (
                  <tr key={b.id} onClick={() => setOpenId(b.id)} className="cursor-pointer transition hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-700">{formatDate(b.createdAt)}</td>
                    <td className="px-6 py-4 text-gray-900">{TARGET_TEXT[b.targetType]}</td>
                    <td className="px-6 py-4 text-gray-500">{b.assignedByName}</td>
                    <td className="px-6 py-4 text-gray-500">{b.dueAt ? formatDate(b.dueAt) : "No deadline"}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {b.counts.submitted} of {b.counts.total - b.counts.cancelled}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{b.averageScore === null ? "—" : `${b.averageScore}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AssignDialog campaignId={campaign.id} campaignName={campaign.name} open={assigning} onClose={() => setAssigning(false)} />
    </div>
  );
}

function BatchView({ id, onBack }: { id: string; onBack: () => void }) {
  const batch = useBatch(id);
  const resync = useResyncBatch();
  const extend = useExtendDueDate();
  const cancel = useCancelAssignment();
  const [extending, setExtending] = useState<string | null>(null);
  const [date, setDate] = useState("");

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex cursor-pointer items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> All assignments
      </button>

      {batch.isLoading || !batch.data ? (
        <Spinner />
      ) : (
        <Panel
          title={`${TARGET_TEXT[batch.data.targetType]} · ${formatDate(batch.data.createdAt)}`}
          description={batch.data.dueAt ? `Due ${formatDate(batch.data.dueAt)}` : "No deadline"}
          actions={
            (batch.data.targetType === "departments" || batch.data.targetType === "organization") && (
              <button
                className={secondaryButton}
                disabled={resync.isPending}
                title="Gives the campaign to people who joined since this was assigned"
                onClick={() =>
                  resync.mutate(id, {
                    onSuccess: (r) => toast.success(r.created ? `${r.created} new ${r.created === 1 ? "person" : "people"} added` : "Everyone already has it"),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                {resync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Add new joiners
              </button>
            )
          }
          flush
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Person</th>
                  <th className="px-6 py-3 font-medium">Department</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Score</th>
                  <th className="px-6 py-3 font-medium">Due</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batch.data.people.map((p) => (
                  <tr key={p.assignmentId}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-gray-500">{p.email}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{p.department ?? "—"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={STATUS_BADGE[p.status]} label={ASSIGNMENT_STATUS_LABELS[p.status]} />
                      {p.exposed && <span className="ml-2 text-xs text-gray-400" title="Wrote or reviewed this campaign, so the result is left out of reports">saw answers</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {p.scorePercent === null ? "—" : <span className={p.outcome === "passed" ? "text-emerald-600" : "text-red-600"}>{p.scorePercent}%</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{p.dueAt ? formatDate(p.dueAt) : "—"}</td>
                    <td className="px-6 py-4 text-right">
                      {extending === p.assignmentId ? (
                        <div className="flex items-center justify-end gap-2">
                          <input type="date" className={`${inputClass} w-40 py-1.5`} value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
                          <button
                            className={primaryButton}
                            disabled={!date || extend.isPending}
                            onClick={() =>
                              extend.mutate(
                                { assignmentId: p.assignmentId, dueAt: new Date(`${date}T23:59:00`).toISOString() },
                                {
                                  onSuccess: () => {
                                    toast.success("Due date updated");
                                    setExtending(null);
                                    setDate("");
                                  },
                                  onError: (e) => toast.error(e.message),
                                }
                              )
                            }
                          >
                            Save
                          </button>
                          <button className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:bg-gray-100" onClick={() => setExtending(null)} aria-label="Cancel">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        p.status !== "submitted" &&
                        p.status !== "cancelled" && (
                          <div className="flex justify-end gap-3 text-sm font-medium">
                            <button className="cursor-pointer text-[#2016a9] hover:underline" onClick={() => setExtending(p.assignmentId)}>
                              {p.status === "expired" ? "Reopen" : "Extend"}
                            </button>
                            <button
                              className="cursor-pointer text-gray-500 hover:text-red-600"
                              onClick={() =>
                                cancel.mutate(p.assignmentId, {
                                  onSuccess: () => toast.success("Assignment cancelled"),
                                  onError: (e) => toast.error(e.message),
                                })
                              }
                            >
                              Cancel
                            </button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
