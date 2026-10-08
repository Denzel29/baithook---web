"use client";

import { Suspense } from "react";
import { CampaignsView } from "@/components/campaigns/campaign-workspace";
import { CompanyShell, Spinner } from "@/components/company/company-shell";

export default function CompanyCampaignsPage() {
  return (
    <CompanyShell title="Campaigns" description="Write, review and launch the training your people take. Campaigns you launch can then be assigned to teams.">
      <Suspense fallback={<Spinner />}>
        <CampaignsView basePath="/dashboard/company/campaigns" />
      </Suspense>
    </CompanyShell>
  );
}
