"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock, Loader2, Mail, XCircle } from "lucide-react";
import type { Difficulty } from "@/types/campaigns";
import { ASSIGNMENT_STATUS_LABELS, INDICATOR_LABELS, LEARNER_DIFFICULTY_LABELS, type CatalogEntry, type MyAssignment } from "@/types/training";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  obvious: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  moderate: "bg-amber-50 text-amber-700 ring-amber-600/20",
  subtle: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${DIFFICULTY_STYLES[difficulty]}`}>
      {LEARNER_DIFFICULTY_LABELS[difficulty]}
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

const primary =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2016a9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a1290] disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

export const takeHref = (assignmentId: string) => `/dashboard/campaigns/take?id=${assignmentId}`;

export function CatalogCard({ campaign, onEnroll, enrolling }: { campaign: CatalogEntry; onEnroll: () => void; enrolling: boolean }) {
  const open = campaign.myStatus === "assigned" || campaign.myStatus === "in_progress";

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <Mail className="h-5 w-5 text-[#2016a9]" />
        </span>
        <DifficultyBadge difficulty={campaign.difficulty} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{campaign.name}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-600">{campaign.summary || "Practise spotting phishing in a safe sandbox."}</p>
      <div className="mt-4">
        <IndicatorTags ids={campaign.focusIndicators} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-4 w-4" /> {campaign.emails} emails
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> ~{campaign.minutes} min
        </span>
      </div>
      <div className="mt-5 border-t border-gray-100 pt-4">
        {open && campaign.myAssignmentId ? (
          <Link href={takeHref(campaign.myAssignmentId)} className={`${primary} w-full`}>
            {campaign.myStatus === "in_progress" ? "Continue" : "Start"}
          </Link>
        ) : (
          <button className={`${primary} w-full`} onClick={onEnroll} disabled={enrolling}>
            {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
            {campaign.myStatus === "submitted" ? "Take it again" : "Enroll"}
          </button>
        )}
        {campaign.myStatus === "submitted" && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> You have completed this before
          </p>
        )}
      </div>
    </article>
  );
}

function formatDue(iso: string) {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const date = new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return days <= 0 ? `Due today (${date})` : days === 1 ? `Due tomorrow` : `Due in ${days} days · ${date}`;
}

export function MyCampaignCard({ item }: { item: MyAssignment }) {
  const pct = item.total ? Math.round((item.answered / item.total) * 100) : 0;
  const done = item.status === "submitted";
  const expired = item.status === "expired";
  const passed = item.outcome === "passed";

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{item.campaignName}</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {item.assignedBy ? `Assigned by ${item.assignedBy}` : "Enrolled from the catalog"}
            {item.attemptNumber > 1 && ` · Attempt ${item.attemptNumber}`}
          </p>
        </div>
        <DifficultyBadge difficulty={item.difficulty} />
      </div>

      {done ? (
        <div className="mt-5 flex items-center gap-4">
          <div className={`text-3xl font-bold tracking-tight ${passed ? "text-emerald-600" : "text-red-600"}`}>{item.scorePercent}%</div>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${passed ? "text-emerald-700" : "text-red-700"}`}>
            {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {passed ? "Passed" : `Not passed (pass mark ${item.passThreshold}%)`}
          </span>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{expired ? ASSIGNMENT_STATUS_LABELS.expired : `${item.answered} of ${item.total} emails reviewed`}</span>
            <span className="font-semibold text-gray-900">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-gray-100">
            <div className={`h-2 rounded-full ${expired ? "bg-gray-300" : "bg-[#2016a9]"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        {/* Deadlines only exist on training a company assigns */}
        {item.dueAt && !done ? (
          <span className={`inline-flex items-center gap-1.5 text-sm ${expired ? "font-medium text-red-600" : "text-gray-600"}`}>
            <CalendarClock className="h-4 w-4" /> {expired ? "Overdue. Ask your admin for more time." : formatDue(item.dueAt)}
          </span>
        ) : (
          <span />
        )}
        {expired ? null : (
          <Link href={takeHref(item.id)} className={done ? secondary : primary}>
            {done ? "View results" : item.status === "in_progress" ? "Continue" : "Start"}
          </Link>
        )}
      </div>
    </article>
  );
}
