"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Compass, Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import { CatalogCard, takeHref } from "@/components/learner/campaign-cards";
import { EmptyState, FilterTabs, LearnerShell, Panel, Spinner, inputClass, isPersonalAccount } from "@/components/learner/learner-shell";
import { useCatalog, useEnroll } from "@/lib/hooks/use-training";
import { useAuth } from "@/providers/auth-provider";
import type { Difficulty } from "@/types/campaigns";
import { INDICATOR_LABELS, LEARNER_DIFFICULTY_LABELS } from "@/types/training";

type DifficultyFilter = Difficulty | "all";

const DIFFICULTY_FILTERS: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "All levels" },
  ...(Object.entries(LEARNER_DIFFICULTY_LABELS) as [Difficulty, string][]).map(([value, label]) => ({ value, label })),
];

export default function CatalogPage() {
  const { user } = useAuth();
  const router = useRouter();
  const personal = isPersonalAccount(user);
  const catalog = useCatalog(personal);
  const enroll = useEnroll();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [indicator, setIndicator] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  // Employees get their training assigned; the catalog is for personal accounts
  if (user && !personal) {
    return (
      <LearnerShell title="Browse campaigns">
        <Panel>
          <EmptyState icon={Building2} title="Your organization assigns your training">
            Campaigns your company assigns appear under My campaigns.
          </EmptyState>
        </Panel>
      </LearnerShell>
    );
  }

  const q = search.trim().toLowerCase();
  const results = (catalog.data ?? []).filter(
    (c) =>
      (difficulty === "all" || c.difficulty === difficulty) &&
      (!indicator || c.focusIndicators.includes(indicator)) &&
      (!q || c.name.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q))
  );

  const join = (campaignId: string) => {
    setPending(campaignId);
    enroll.mutate(campaignId, {
      onSuccess: ({ assignmentId }) => {
        toast.success("You're enrolled");
        router.push(takeHref(assignmentId));
      },
      onError: (e) => {
        toast.error(e.message);
        setPending(null);
      },
    });
  };

  return (
    <LearnerShell title="Browse campaigns" description="Pick a topic and practise at your own pace. Every email is a safe simulation.">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs value={difficulty} options={DIFFICULTY_FILTERS} onChange={setDifficulty} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <select className={`${inputClass} sm:w-56`} value={indicator} onChange={(e) => setIndicator(e.target.value)} aria-label="Filter by red flag">
            <option value="">Any red flag</option>
            {Object.entries(INDICATOR_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <div className="relative sm:w-72">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <input className={`${inputClass} pl-9`} placeholder="Search campaigns" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {catalog.isLoading ? (
        <Spinner className="mt-12" />
      ) : catalog.isError ? (
        <p className="text-sm text-red-600">{(catalog.error as Error).message}</p>
      ) : (catalog.data ?? []).length === 0 ? (
        <Panel>
          <EmptyState icon={Compass} title="No campaigns are available yet">
            New campaigns appear here as soon as they are published. Check back soon.
          </EmptyState>
        </Panel>
      ) : results.length === 0 ? (
        <Panel>
          <EmptyState icon={SearchX} title="No campaigns match">
            Try another level, red flag or search term.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((c) => (
            <CatalogCard key={c.id} campaign={c} enrolling={pending === c.id} onEnroll={() => join(c.id)} />
          ))}
        </div>
      )}
    </LearnerShell>
  );
}
