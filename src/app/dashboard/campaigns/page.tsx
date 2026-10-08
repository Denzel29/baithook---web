"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox } from "lucide-react";
import { MyCampaignCard, PreviewBanner } from "@/components/learner/campaign-cards";
import { EmptyState, LearnerShell, PageTabs, Panel, Spinner, isPersonalAccount } from "@/components/learner/learner-shell";
import { SAMPLE_MY_CAMPAIGNS, type MyCampaignStatus } from "@/lib/campaign-preview";
import { useMyOrganization } from "@/lib/hooks/use-company";
import { useAuth } from "@/providers/auth-provider";

const TABS: { key: MyCampaignStatus; label: string }[] = [
  { key: "in_progress", label: "In progress" },
  { key: "not_started", label: "Not started" },
  { key: "completed", label: "Completed" },
];

function MyCampaignsView() {
  const { user } = useAuth();
  const personal = isPersonalAccount(user);
  const org = useMyOrganization(!personal && !!user);
  const param = useSearchParams().get("tab");
  const tab = TABS.find((t) => t.key === param)?.key ?? "in_progress";
  const items = SAMPLE_MY_CAMPAIGNS.filter((c) => c.status === tab);
  const assignedBy = personal ? null : (org.data?.name ?? "your organization");

  return (
    <LearnerShell
      title="My campaigns"
      description={personal ? "Campaigns you've enrolled in from the catalog." : "Training your organization has assigned to you."}
    >
      <PreviewBanner />
      <PageTabs
        tabs={TABS.map((t) => ({
          href: `/dashboard/campaigns?tab=${t.key}`,
          label: t.label,
          active: t.key === tab,
          count: SAMPLE_MY_CAMPAIGNS.filter((c) => c.status === t.key).length,
        }))}
      />
      {items.length === 0 ? (
        <Panel>
          <EmptyState icon={Inbox} title="Nothing here yet">
            {tab === "completed" ? "Campaigns you finish will show up here with your score." : "You have no campaigns in this state."}
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => (
            <MyCampaignCard key={item.id} item={item} assignedBy={assignedBy} />
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
