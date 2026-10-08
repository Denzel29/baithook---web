"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Award, CheckCircle2, ListChecks, ShieldAlert, Target } from "lucide-react";
import { CatalogCard, MyCampaignCard, PreviewBanner } from "@/components/learner/campaign-cards";
import { LearnerShell, Panel, isPersonalAccount } from "@/components/learner/learner-shell";
import { SAMPLE_CATALOG, SAMPLE_MY_CAMPAIGNS } from "@/lib/campaign-preview";
import { useMyOrganization } from "@/lib/hooks/use-company";
import { useAuth } from "@/providers/auth-provider";

// Real guidance, independent of campaigns: the red flags every campaign trains
const RED_FLAGS = [
  { title: "Rushed or threatened", body: "\"Act within 24 hours\" or \"your account will be closed\" is pressure, not process." },
  { title: "Sender doesn't add up", body: "Check the actual address, not just the display name. Look for lookalike domains." },
  { title: "Links that hide where they go", body: "Hover before you click. Does the real address match the text and the sender?" },
  { title: "Asks for passwords or codes", body: "Real services never ask for your password, PIN or MFA code by email." },
  { title: "Unusual request", body: "Gift cards, changed bank details, \"keep this between us\"? Verify another way." },
  { title: "Unexpected attachments", body: "Be wary of .zip, .html or Office files asking you to \"enable content\"." },
];

export default function LearnerOverviewPage() {
  const { user } = useAuth();
  const personal = isPersonalAccount(user);
  const org = useMyOrganization(!personal && !!user);
  const firstName = user?.name.split(" ")[0] ?? "";

  const active = SAMPLE_MY_CAMPAIGNS.filter((c) => c.status !== "completed");
  const completed = SAMPLE_MY_CAMPAIGNS.filter((c) => c.status === "completed");
  const enrolledIds = new Set(SAMPLE_MY_CAMPAIGNS.map((c) => c.campaignId));
  const recommended = SAMPLE_CATALOG.filter((c) => !enrolledIds.has(c.id)).slice(0, 2);
  const assignedBy = personal ? null : (org.data?.name ?? "your organization");

  return (
    <LearnerShell
      title={`Welcome back, ${firstName}`}
      description={personal ? "Practise spotting phishing in a safe sandbox and track your progress." : `Your security awareness training${org.data ? ` at ${org.data.name}` : ""}.`}
    >
      <PreviewBanner />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<ListChecks className="h-5 w-5 text-[#2016a9]" />} label={personal ? "Enrolled" : "Assigned"} value={SAMPLE_MY_CAMPAIGNS.length} />
        <Stat icon={<Target className="h-5 w-5 text-[#2016a9]" />} label="In progress" value={active.length} />
        <Stat icon={<CheckCircle2 className="h-5 w-5 text-[#2016a9]" />} label="Completed" value={completed.length} />
        <Stat icon={<Award className="h-5 w-5 text-[#2016a9]" />} label="Average score" value="76%" />
      </div>

      <section className="space-y-4">
        <SectionHeader title="Continue training" href="/dashboard/campaigns" linkLabel="All my campaigns" />
        <div className="grid gap-5 lg:grid-cols-2">
          {active.map((item) => (
            <MyCampaignCard key={item.id} item={item} assignedBy={assignedBy} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#2016a9]" /> Red flags to watch for
            </span>
          }
          description="Every campaign trains you to spot these. Keep them in mind for your real inbox too."
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {RED_FLAGS.map((f) => (
              <li key={f.title} className="rounded-xl bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">{f.title}</p>
                <p className="mt-1 text-sm text-gray-600">{f.body}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Your progress" description="Based on your completed campaigns.">
          <ul className="space-y-4 text-sm">
            {[
              { label: "Phishing caught", value: 82 },
              { label: "Legitimate emails trusted", value: 90 },
              { label: "Red flags spotted", value: 61 },
            ].map((m) => (
              <li key={m.label}>
                <div className="flex justify-between text-gray-600">
                  <span>{m.label}</span>
                  <span className="font-semibold text-gray-900">{m.value}%</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-[#2016a9]" style={{ width: `${m.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-gray-400">Example figures. Your real results appear after your first campaign.</p>
        </Panel>
      </div>

      {personal && recommended.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title="Recommended for you" href="/dashboard/catalog" linkLabel="Browse all campaigns" />
          <div className="grid gap-5 md:grid-cols-2">
            {recommended.map((c) => (
              <CatalogCard key={c.id} campaign={c} />
            ))}
          </div>
        </section>
      )}
    </LearnerShell>
  );
}

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-[#2016a9] hover:underline">
        {linkLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}
