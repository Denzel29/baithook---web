"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Target, UserPlus, Users } from "lucide-react";
import { CompanyShell, Detail, Panel, Spinner, StatusBadge, countryName } from "@/components/company/company-shell";
import { useAnalyticsSummary } from "@/lib/hooks/use-analytics";
import { PlanUsagePanel } from "@/components/company/plan-usage-panel";
import { useMyOnboarding, useMyOrganization } from "@/lib/hooks/use-company";
import { useAuth } from "@/providers/auth-provider";
import { COMPANY_SIZE_LABELS, INDUSTRY_LABELS, OrgStatus, type OnboardingChecklist } from "@/types/onboarding";

const STEPS: Record<string, { title: string; description: string; href?: string }> = {
  brand_profile: {
    title: "Add your branding",
    description: "Your logo and colours, so simulated emails look like they come from your company.",
  },
  departments: {
    title: "Create departments",
    description: "Group people by team so you can assign training and compare results.",
    href: "/dashboard/company/departments",
  },
  employees_invited: {
    title: "Invite your team",
    description: "Send invitations one at a time or upload a CSV.",
    href: "/dashboard/company/team?invite=1",
  },
  additional_admin: {
    title: "Add a second admin",
    description: "Someone else who can manage the team and approve retakes.",
    href: "/dashboard/company/team",
  },
  templates: {
    title: "Customise email templates",
    description: "Adjust the layouts used for simulated emails.",
  },
  baseline_assigned: {
    title: "Assign the baseline assessment",
    description: "Everyone takes it once so you have a starting point to measure progress against.",
  },
};


export default function CompanyDashboardPage() {
  const { user } = useAuth();
  const org = useMyOrganization();
  const onboarding = useMyOnboarding();
  const summary = useAnalyticsSummary();

  const firstName = user?.name.split(" ")[0] ?? "";
  const settingUp = org.data?.status === OrgStatus.PENDING_SETUP;

  return (
    <CompanyShell
      title={`Welcome back, ${firstName}`}
      description={
        org.data ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {org.data.name}
            <StatusBadge status={org.data.status} />
          </span>
        ) : (
          "Manage your organization's phishing simulations and team."
        )
      }
    >
      {org.data?.status === OrgStatus.SUSPENDED && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Your organization is suspended{org.data.suspensionReason ? `: ${org.data.suspensionReason}` : ""}. Contact
          Baitline support to restore access.
        </div>
      )}

      {settingUp && onboarding.data && <SetupChecklist checklist={onboarding.data} />}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-[#2016a9]" />}
          label="Active users"
          value={summary.data?.activeUsers}
          loading={summary.isLoading}
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-[#2016a9]" />}
          label="Campaign activity"
          value={summary.data ? (summary.data.eventsByCategory["campaign"] ?? 0) : undefined}
          loading={summary.isLoading}
        />
        <StatCard
          icon={<UserPlus className="h-5 w-5 text-[#2016a9]" />}
          label="New members"
          value={summary.data?.newRegistrations}
          loading={summary.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Organization">
          {org.isLoading ? (
            <Spinner />
          ) : org.data ? (
            <dl className="grid gap-5 sm:grid-cols-2">
              <Detail label="Industry">{org.data.industry ? INDUSTRY_LABELS[org.data.industry] : null}</Detail>
              <Detail label="Size">{org.data.companySize ? COMPANY_SIZE_LABELS[org.data.companySize] : null}</Detail>
              <Detail label="Country">{countryName(org.data.country)}</Detail>
              <Detail label="Timezone">{org.data.timezone}</Detail>
              <Detail label="Website">{org.data.website}</Detail>
              <Detail label="Email domain">{org.data.primaryDomain ?? "Any address (invited one by one)"}</Detail>
            </dl>
          ) : (
            <p className="text-sm text-red-600">{(org.error as Error)?.message}</p>
          )}
        </Panel>

        <PlanUsagePanel />
      </div>
    </CompanyShell>
  );
}

function SetupChecklist({ checklist }: { checklist: OnboardingChecklist }) {
  const required = checklist.steps.filter((s) => s.required);
  const doneRequired = required.filter((s) => s.done).length;
  const pct = Math.round((doneRequired / Math.max(1, required.length)) * 100);
  // Point at the first step the admin can act on now, not one whose feature isn't built yet
  const nextStep = checklist.steps.find((s) => !s.done && STEPS[s.step]?.href)?.step;

  return (
    <Panel
      title="Finish setting up"
      description="Complete the required steps to activate your organization."
      actions={
        <span className="text-sm font-semibold text-gray-900">
          {doneRequired} of {required.length}
        </span>
      }
    >
      <div className="mb-6 h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-[#2016a9] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ol className="grid gap-4 md:grid-cols-2">
        {checklist.steps.map((s) => {
          const info = STEPS[s.step] ?? { title: s.step, description: "" };
          const isNext = s.step === nextStep;
          return (
            <li
              key={s.step}
              className={`flex gap-3 rounded-xl border p-4 ${
                isNext ? "border-[#2016a9]/40 bg-indigo-50/50" : "border-gray-200"
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className={`mt-0.5 h-5 w-5 shrink-0 ${isNext ? "text-[#2016a9]" : "text-gray-300"}`} />
              )}
              <div>
                <p className={`font-semibold ${s.done ? "text-gray-500 line-through" : "text-gray-900"}`}>
                  {info.title}
                  {!s.required && <span className="ml-2 text-xs font-normal text-gray-400">Optional</span>}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">{info.description}</p>
                {!s.done &&
                  (info.href ? (
                    <Link
                      href={info.href}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#2016a9] hover:underline"
                    >
                      {isNext ? "Start" : "Open"} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-gray-400">Coming soon</p>
                  ))}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function StatCard({ icon, label, value, loading }: { icon: ReactNode; label: string; value?: number; loading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
        {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-100" /> : (value ?? "—")}
      </p>
    </div>
  );
}
