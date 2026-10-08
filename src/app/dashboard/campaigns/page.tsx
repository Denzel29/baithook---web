"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox } from "lucide-react";
import { MyCampaignCard } from "@/components/learner/campaign-cards";
import { EmptyState, LearnerShell, PageTabs, Panel, Spinner, isPersonalAccount } from "@/components/learner/learner-shell";
import { useMyAssignments } from "@/lib/hooks/use-training";
import { useAuth } from "@/providers/auth-provider";
import type { MyAssignment } from "@/types/training";

const TABS = [
  { key: "todo", label: "To do", match: (a: MyAssignment) => a.status === "assigned" || a.status === "in_progress" },
  { key: "completed", label: "Completed", match: (a: MyAssignment) => a.status === "submitted" },
  { key: "overdue", label: "Overdue", match: (a: MyAssignment) => a.status === "expired" },
] as const;

function MyCampaignsView() {
  const { user } = useAuth();
  const personal = isPersonalAccount(user);
  const assignments = useMyAssignments();
  const param = useSearchParams().get("tab");
  const tab = TABS.find((t) => t.key === param) ?? TABS[0];
  const all = assignments.data ?? [];
  const items = all.filter(tab.match);

  return (
    <LearnerShell
      title="My campaigns"
      description={personal ? "Campaigns you've enrolled in from the catalog." : "Training your organization has assigned to you."}
    >
      <PageTabs
        tabs={TABS.map((t) => ({
          href: `/dashboard/campaigns?tab=${t.key}`,
          label: t.label,
          active: t.key === tab.key,
          count: all.filter(t.match).length,
        }))}
      />
      {assignments.isLoading ? (
        <Spinner className="mt-12" />
      ) : assignments.isError ? (
        <p className="text-sm text-red-600">{(assignments.error as Error).message}</p>
      ) : items.length === 0 ? (
        <Panel>
          <EmptyState icon={Inbox} title="Nothing here yet">
            {tab.key === "completed"
              ? "Campaigns you finish will show up here with your score."
              : tab.key === "overdue"
                ? "Nothing is overdue."
                : personal
                  ? "Enroll in a campaign from Browse to get started."
                  : "You have no training waiting. New assignments from your organization appear here."}
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => (
            <MyCampaignCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </LearnerShell>
  );
}

export default function MyCampaignsPage() {
  return (
    <Suspense fallback={<Spinner className="mt-24" />}>
      <MyCampaignsView />
    </Suspense>
  );
}
