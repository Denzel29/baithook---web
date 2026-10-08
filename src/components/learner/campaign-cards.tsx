"use client";

import { CalendarClock, CheckCircle2, Clock, Mail, Sparkles, Users, XCircle } from "lucide-react";
import {
  DIFFICULTY_LABELS,
  INDICATOR_LABELS,
  catalogById,
  type CatalogCampaign,
  type Difficulty,
  type MyCampaign,
} from "@/lib/campaign-preview";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  obvious: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  moderate: "bg-amber-50 text-amber-700 ring-amber-600/20",
  subtle: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${DIFFICULTY_STYLES[difficulty]}`}>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

export function IndicatorTags({ ids }: { ids: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span key={id} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {INDICATOR_LABELS[id] ?? id}
        </span>
      ))}
    </div>
  );
}

// Shown on every learner page until campaigns are real
export function PreviewBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-indigo-900">
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#2016a9]" />
      <p>
        <span className="font-semibold">Campaigns are coming soon.</span>{" "}The campaigns below are examples of what you&apos;ll see here
        once training launches. Nothing on this page is live yet.
      </p>
    </div>
  );
}

const comingSoon =
  "inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#2016a9]/50 px-4 py-2 text-sm font-semibold text-white";

export function CatalogCard({ campaign, enrolled = false }: { campaign: CatalogCampaign; enrolled?: boolean }) {
  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <Mail className="h-5 w-5 text-[#2016a9]" />
        </span>
        <DifficultyBadge difficulty={campaign.difficulty} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{campaign.title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-600">{campaign.description}</p>
      <div className="mt-4">
        <IndicatorTags ids={campaign.indicators} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-4 w-4" /> {campaign.emails} emails
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> ~{campaign.minutes} min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4" /> {campaign.enrolled.toLocaleString()} learners
        </span>
      </div>
      <div className="mt-5 border-t border-gray-100 pt-4">
        {enrolled ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Enrolled
          </span>
        ) : (
          <button className={`${comingSoon} w-full`} disabled title="Available when campaigns launch">
            Enroll · coming soon
          </button>
        )}
      </div>
    </article>
  );
}

function formatDue(iso: string) {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const date = new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return days <= 0 ? `Overdue (${date})` : days === 1 ? `Due tomorrow` : `Due in ${days} days · ${date}`;
}

export function MyCampaignCard({ item, assignedBy }: { item: MyCampaign; assignedBy: string | null }) {
  const campaign = catalogById(item.campaignId);
  const pct = Math.round((item.answered / item.total) * 100);
  const action = { not_started: "Start", in_progress: "Continue", completed: "View results" }[item.status];

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{campaign.title}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{assignedBy ? `Assigned by ${assignedBy}` : "Enrolled from the catalog"}</p>
        </div>
        <DifficultyBadge difficulty={campaign.difficulty} />
      </div>

      {item.status === "completed" ? (
        <div className="mt-5 flex items-center gap-4">
          <div className={`text-3xl font-bold tracking-tight ${item.passed ? "text-emerald-600" : "text-red-600"}`}>{item.scorePercent}%</div>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${item.passed ? "text-emerald-700" : "text-red-700"}`}>
            {item.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {item.passed ? "Passed" : "Not passed. Review the lessons, then request a retake"}
          </span>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {item.answered} of {item.total} emails reviewed
            </span>
            <span className="font-semibold text-gray-900">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-[#2016a9]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        {/* Deadlines only exist on training a company assigns */}
        {assignedBy && item.dueAt && item.status !== "completed" ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
            <CalendarClock className="h-4 w-4" /> {formatDue(item.dueAt)}
          </span>
        ) : (
          <span />
        )}
        <button className={comingSoon} disabled title="Available when campaigns launch">
          {action}
        </button>
      </div>
    </article>
  );
}
