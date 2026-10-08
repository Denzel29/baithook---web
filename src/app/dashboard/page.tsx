"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Award, CheckCircle2, ListChecks, ShieldAlert, Target } from "lucide-react";
import { toast } from "sonner";
import { CatalogCard, MyCampaignCard, takeHref } from "@/components/learner/campaign-cards";
import { EmptyState, LearnerShell, Panel, Spinner, isPersonalAccount } from "@/components/learner/learner-shell";
import { useMyOrganization } from "@/lib/hooks/use-company";
import { useCatalog, useEnroll, useMyAssignments } from "@/lib/hooks/use-training";
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
  const router = useRouter();
  const personal = isPersonalAccount(user);
  const org = useMyOrganization(!personal && !!user);
  const assignments = useMyAssignments();
  const catalog = useCatalog(personal);
  const enroll = useEnroll();
  const [pending, setPending] = useState<string | null>(null);
  const firstName = user?.name.split(" ")[0] ?? "";

  const all = assignments.data ?? [];
  const todo = all.filter((a) => a.status === "assigned" || a.status === "in_progress");
  const overdue = all.filter((a) => a.status === "expired");
  const completed = all.filter((a) => a.status === "submitted");
  const average = completed.length ? Math.round(completed.reduce((sum, a) => sum + (a.scorePercent ?? 0), 0) / completed.length) : null;
  const recommended = (catalog.data ?? []).filter((c) => !c.myStatus).slice(0, 2);

  const join = (campaignId: string) => {
    setPending(campaignId);
    enroll.mutate(campaignId, {
      onSuccess: ({ assignmentId }) => router.push(takeHref(assignmentId)),
      onError: (e) => {
        toast.error(e.message);
        setPending(null);
      },
    });
  };

  return (
    <LearnerShell
      title={`Welcome back, ${firstName}`}
      description={personal ? "Practise spotting phishing in a safe sandbox and track your progress." : `Your security awareness training${org.data ? ` at ${org.data.name}` : ""}.`}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<ListChecks className="h-5 w-5 text-[#2016a9]" />} label={personal ? "Enrolled" : "Assigned"} value={all.length} />
        <Stat icon={<Target className="h-5 w-5 text-[#2016a9]" />} label="To do" value={todo.length} />
        <Stat icon={<CheckCircle2 className="h-5 w-5 text-[#2016a9]" />} label="Completed" value={completed.length} />
        <Stat icon={<Award className="h-5 w-5 text-[#2016a9]" />} label="Average score" value={average === null ? "—" : `${average}%`} />
      </div>

      <section className="space-y-4">
        <SectionHeader title="Continue training" href="/dashboard/campaigns" linkLabel="All my campaigns" />
        {assignments.isLoading ? (
          <Spinner />
        ) : todo.length === 0 ? (
          <Panel>
            <EmptyState icon={CheckCircle2} title={all.length ? "You're all caught up" : "No training yet"}>
              {personal
                ? "Browse the catalog and enroll in a campaign to start practising."
                : overdue.length
                  ? "Some of your training is overdue. Ask your administrator for more time."
                  : "When your organization assigns you training, it will show up here."}
            </EmptyState>
          </Panel>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {todo.slice(0, 4).map((item) => (
              <MyCampaignCard key={item.id} item={item} />
            ))}
          </div>
        )}
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

        <Panel title="Recent results" description="Your latest completed campaigns.">
          {completed.length === 0 ? (
            <p className="text-sm text-gray-500">Your results appear here after you finish a campaign.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {completed.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link href={takeHref(a.id)} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-[#2016a9]">
                    <span className="min-w-0 truncate font-medium text-gray-900">{a.campaignName}</span>
                    <span className={`shrink-0 font-semibold ${a.outcome === "passed" ? "text-emerald-600" : "text-red-600"}`}>{a.scorePercent}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {personal && recommended.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title="Recommended for you" href="/dashboard/catalog" linkLabel="Browse all campaigns" />
          <div className="grid gap-5 md:grid-cols-2">
            {recommended.map((c) => (
              <CatalogCard key={c.id} campaign={c} enrolling={pending === c.id} onEnroll={() => join(c.id)} />
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
