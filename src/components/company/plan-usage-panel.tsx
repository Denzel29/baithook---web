"use client";

import { Panel, Spinner } from "@/components/dashboard/ui";
import { useMyUsage } from "@/lib/hooks/use-company";

const LIMIT_LABELS: Record<string, string> = {
  seats: "Seats",
  activeCampaigns: "Active campaigns",
  aiGenerationsPerMonth: "AI generations this month",
  departments: "Departments",
};

export function PlanUsagePanel({ className = "" }: { className?: string }) {
  const usage = useMyUsage();

  return (
    <Panel
      className={className}
      title="Your plan"
      description="Seats include pending invitations."
      actions={usage.data && <span className="text-sm font-semibold text-[#2016a9] capitalize">{usage.data.planTier}</span>}
    >
      {usage.isLoading ? (
        <Spinner />
      ) : usage.data ? (
        <ul className="space-y-4">
          {usage.data.limits.map((l) => {
            const pct = l.max ? Math.min(100, Math.round((l.current / l.max) * 100)) : 0;
            return (
              <li key={l.limit} className="text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{LIMIT_LABELS[l.limit] ?? l.limit}</span>
                  <span className="font-semibold text-gray-900">
                    {l.current} / {l.max ?? "Unlimited"}
                  </span>
                </div>
                {l.max !== null && (
                  <div className="mt-1.5 h-2 rounded-full bg-gray-100">
                    <div className={`h-2 rounded-full ${pct >= 100 ? "bg-red-500" : "bg-[#2016a9]"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Plan details are available to organization owners.</p>
      )}
    </Panel>
  );
}
