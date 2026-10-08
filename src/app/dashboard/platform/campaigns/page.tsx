"use client";

import { Suspense } from "react";
import { CampaignsView } from "@/components/campaigns/campaign-workspace";
import { PlatformShell, Spinner } from "@/components/platform/platform-shell";

export default function PlatformCampaignsPage() {
  return (
    <PlatformShell title="Campaigns" description="Platform campaigns, written and reviewed here, are the ones individuals and companies can later enrol in.">
      <Suspense fallback={<Spinner />}>
        <CampaignsView basePath="/dashboard/platform/campaigns" />
      </Suspense>
    </PlatformShell>
  );
}
