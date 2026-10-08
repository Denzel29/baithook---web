"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, Pencil, Plus, Rocket, Search, SearchX, Archive, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  EmptyState,
  FilterTabs,
  PageTabs,
  Panel,
  Spinner,
  StatusBadge,
  dangerButton,
  formatDate,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/dashboard/ui";
import {
  useCampaign,
  useCampaignAction,
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useIndicators,
  useReadiness,
  useUpdateCampaign,
} from "@/lib/hooks/use-campaigns";
import {
  DIFFICULTY_LABELS,
  STATUS_LABELS,
  type Campaign,
  type CampaignStatus,
} from "@/types/campaigns";
import { CampaignForm } from "./campaign-form";
import { EmailsTab } from "./emails-tab";
import { MaterialsTab } from "./materials-tab";
import { PagesTab } from "./pages-tab";

type Filter = "all" | "draft" | "active" | "archived";

const statusBadge = (c: Pick<Campaign, "status">) => <StatusBadge status={c.status === "active" ? "active" : c.status === "archived" ? "expired" : "pending_setup"} label={STATUS_LABELS[c.status]} />;

// Shared by the company and platform dashboards: the same authoring tools, the
// server decides whose campaigns each admin sees.
export function CampaignsView({ basePath }: { basePath: string }) {
  const selectedId = useSearchParams().get("id");
  return selectedId ? <CampaignDetail id={selectedId} basePath={basePath} /> : <CampaignList basePath={basePath} />;
}

// ── List ─────────────────────────────────────────────────────────────────────

function CampaignList({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const create = useCreateCampaign();
  const campaigns = useCampaigns({ status: filter === "all" ? undefined : (filter as CampaignStatus), search: search.trim() || undefined });
  const list = campaigns.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <FilterTabs<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "draft", label: "Drafts" },
              { value: "active", label: "Live" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <div className="relative w-56">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <input className={`${inputClass} pl-9`} placeholder="Search campaigns" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <button className={primaryButton} onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New campaign
        </button>
      </div>

      <Panel flush>
        {campaigns.isLoading ? (
          <div className="py-12">
            <Spinner />
          </div>
        ) : campaigns.isError ? (
          <p className="p-6 text-sm text-red-600">{(campaigns.error as Error).message}</p>
        ) : list.length === 0 ? (
          search || filter !== "all" ? (
            <EmptyState icon={SearchX} title="No matching campaigns">
              Try a different search or filter.
            </EmptyState>
          ) : (
            <EmptyState icon={Megaphone} title="No campaigns yet">
              A campaign is a set of emails learners sort into phishing and legitimate, with the pages their links open. Create the first one.
            </EmptyState>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Difficulty</th>
                  <th className="px-6 py-3 font-medium">Emails approved</th>
                  <th className="px-6 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((c) => {
                  const needed = (c.phishingPerAttempt + c.benignPerAttempt) * c.poolMultiplier;
                  return (
                    <tr key={c.id} onClick={() => router.push(`${basePath}?id=${c.id}`)} className="cursor-pointer transition hover:bg-gray-50">
                      <td className="max-w-xs px-6 py-4">
                        <p className="truncate font-semibold text-gray-900">{c.name}</p>
                        <p className="truncate text-gray-500">{c.description || "No brief yet"}</p>
                      </td>
                      <td className="px-6 py-4">{statusBadge(c)}</td>
                      <td className="px-6 py-4 text-gray-700">{DIFFICULTY_LABELS[c.difficulty]}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {c.counts.emails.approved} of {needed}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(c.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog open={creating} onClose={() => setCreating(false)} title="New campaign" description="Describe what the campaign should cover. You can write the emails by hand now." wide>
        <CampaignForm
          submitLabel="Create campaign"
          pending={create.isPending}
          onCancel={() => setCreating(false)}
          onSubmit={(values) =>
            create.mutate(values, {
              onSuccess: (c) => {
                toast.success("Campaign created");
                setCreating(false);
                router.push(`${basePath}?id=${c.id}`);
              },
              onError: (e) => toast.error(e.message),
            })
          }
        />
      </Dialog>
    </div>
  );
}

// ── Detail ───────────────────────────────────────────────────────────────────

const TABS = ["overview", "emails", "pages", "materials"] as const;
type Tab = (typeof TABS)[number];

function CampaignDetail({ id, basePath }: { id: string; basePath: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : "overview";
  const campaign = useCampaign(id);

  const back = (
    <button onClick={() => router.push(basePath)} className="flex cursor-pointer items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
      <ArrowLeft className="h-4 w-4" /> All campaigns
    </button>
  );

  if (campaign.isLoading) return <Spinner />;
  if (campaign.isError || !campaign.data)
    return (
      <div className="space-y-4">
        {back}
        <Panel>
          <p className="text-sm text-red-600">{(campaign.error as Error)?.message ?? "Campaign not found"}</p>
        </Panel>
      </div>
    );

  const c = campaign.data;
  const editable = c.status === "draft" || c.status === "in_review";
  const href = (t: Tab) => `${pathname}?id=${id}${t === "overview" ? "" : `&tab=${t}`}`;

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">{c.name}</h2>
            {statusBadge(c)}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {DIFFICULTY_LABELS[c.difficulty]} · {c.phishingPerAttempt} phishing and {c.benignPerAttempt} legitimate emails per attempt · pass mark {c.passThreshold}%
          </p>
        </div>
      </div>

      {!editable && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-indigo-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#2016a9]" />
          <p>
            {c.status === "active"
              ? "This campaign is live, so its content is locked and every learner sees exactly what was approved. Archive it to stop it, then copy what you need into a new campaign."
              : "This campaign is archived and can no longer be changed."}
          </p>
        </div>
      )}

      <PageTabs
        tabs={[
          { href: href("overview"), label: "Overview", active: tab === "overview" },
          { href: href("emails"), label: "Emails", active: tab === "emails", count: c.counts.emails.total },
          { href: href("pages"), label: "Pages", active: tab === "pages", count: c.counts.pages.total },
          { href: href("materials"), label: "Materials", active: tab === "materials", count: c.counts.materials.total },
        ]}
      />

      {tab === "overview" && <Overview campaign={c} editable={editable} onDeleted={() => router.push(basePath)} />}
      {tab === "emails" && <EmailsTab campaign={c} editable={editable} />}
      {tab === "pages" && <PagesTab campaign={c} editable={editable} />}
      {tab === "materials" && <MaterialsTab campaign={c} editable={editable} />}
    </div>
  );
}

function Overview({ campaign: c, editable, onDeleted }: { campaign: Campaign; editable: boolean; onDeleted: () => void }) {
  const indicators = useIndicators();
  const readiness = useReadiness(c.id);
  const update = useUpdateCampaign(c.id);
  const act = useCampaignAction(c.id);
  const del = useDeleteCampaign();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"launch" | "archive" | "delete" | null>(null);

  const label = (id: string) => indicators.data?.find((i) => i.id === id)?.label ?? id;
  const r = readiness.data;

  const runAction = (action: "launch" | "archive") =>
    act.mutate(action, {
      onSuccess: () => {
        toast.success(action === "launch" ? "Campaign is live" : "Campaign archived");
        setConfirm(null);
      },
      onError: (e) => {
        toast.error(e.message);
        setConfirm(null);
      },
    });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Panel
          title="Brief"
          actions={
            editable && (
              <button className={secondaryButton} onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )
          }
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{c.description || <span className="text-gray-400">No brief yet. Edit the campaign to describe what it should cover.</span>}</p>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">Tactics in focus</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {c.focusIndicators.map((id) => (
                  <span key={id} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {label(id)}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Attempts</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{c.maxAttempts === null ? "Unlimited" : `Up to ${c.maxAttempts}`}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email pool</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {c.phishingPerAttempt * c.poolMultiplier} phishing · {c.benignPerAttempt * c.poolMultiplier} legitimate
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{c.launchTime ? "Went live" : "Last updated"}</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(c.launchTime ?? c.updatedAt)}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="space-y-6">
        {editable ? (
          <Panel title="Ready to launch?" description={r ? `Needs ${r.needed.phishing} phishing and ${r.needed.benign} legitimate approved emails.` : undefined}>
            {readiness.isLoading || !r ? (
              <Spinner />
            ) : r.ready ? (
              <p className="flex items-start gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Everything is approved. This campaign can go live.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                {r.problems.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> {p}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 space-y-2 border-t border-gray-100 pt-5">
              <button className={`${primaryButton} w-full`} disabled={!r?.ready || act.isPending} onClick={() => setConfirm("launch")}>
                <Rocket className="h-4 w-4" /> Launch campaign
              </button>
              {c.status === "draft" && (
                <button className={`${secondaryButton} w-full hover:border-red-300 hover:text-red-700`} onClick={() => setConfirm("delete")}>
                  <Trash2 className="h-4 w-4" /> Delete draft
                </button>
              )}
            </div>
          </Panel>
        ) : (
          c.status === "active" && (
            <Panel title="Live">
              <p className="text-sm text-gray-600">Archiving stops new attempts. Anyone midway can still finish.</p>
              <button className={`${secondaryButton} mt-4 w-full`} onClick={() => setConfirm("archive")}>
                <Archive className="h-4 w-4" /> Archive campaign
              </button>
            </Panel>
          )
        )}

        <Panel title="Content">
          <dl className="space-y-3 text-sm">
            {[
              ["Emails", `${c.counts.emails.approved} approved · ${c.counts.emails.pending} waiting`],
              ["Pages", `${c.counts.pages.approved} approved · ${c.counts.pages.pending} waiting`],
              ["Materials", `${c.counts.materials.approved} approved · ${c.counts.materials.pending} waiting`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit campaign" wide>
        <CampaignForm
          campaign={c}
          submitLabel="Save changes"
          pending={update.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(values) =>
            update.mutate(values, {
              onSuccess: () => {
                toast.success("Campaign updated");
                setEditing(false);
              },
              onError: (e) => toast.error(e.message),
            })
          }
        />
      </Dialog>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "launch" ? "Launch this campaign?" : confirm === "archive" ? "Archive this campaign?" : "Delete this draft?"}
      >
        <p className="text-sm text-gray-600">
          {confirm === "launch" && "Its content becomes locked so every learner sees exactly what you approved. Nothing is sent to anyone until you assign it."}
          {confirm === "archive" && "No new attempts can start. Anyone already midway can still finish."}
          {confirm === "delete" && "The campaign and everything in it will be removed. This can't be undone."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className={secondaryButton} onClick={() => setConfirm(null)}>
            Cancel
          </button>
          {confirm === "delete" ? (
            <button
              className={dangerButton}
              disabled={del.isPending}
              onClick={() =>
                del.mutate(c.id, {
                  onSuccess: () => {
                    toast.success("Draft deleted");
                    onDeleted();
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              {del.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete
            </button>
          ) : (
            <button className={primaryButton} disabled={act.isPending} onClick={() => runAction(confirm as "launch" | "archive")}>
              {act.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {confirm === "launch" ? "Launch" : "Archive"}
            </button>
          )}
        </div>
      </Dialog>
    </div>
  );
}
