"use client";

import { useState } from "react";
import { Building2, Search, SearchX } from "lucide-react";
import { CatalogCard, PreviewBanner } from "@/components/learner/campaign-cards";
import { EmptyState, FilterTabs, LearnerShell, Panel, inputClass, isPersonalAccount } from "@/components/learner/learner-shell";
import { DIFFICULTY_LABELS, INDICATOR_LABELS, SAMPLE_CATALOG, SAMPLE_MY_CAMPAIGNS, type Difficulty } from "@/lib/campaign-preview";
import { useAuth } from "@/providers/auth-provider";

type DifficultyFilter = Difficulty | "all";

const DIFFICULTY_FILTERS: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "All levels" },
  ...(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([value, label]) => ({ value, label })),
];

export default function CatalogPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [indicator, setIndicator] = useState("");

  // Employees get their training assigned; the catalog is for personal accounts
  if (user && !isPersonalAccount(user)) {
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

  const enrolledIds = new Set(SAMPLE_MY_CAMPAIGNS.map((c) => c.campaignId));
  const q = search.trim().toLowerCase();
  const results = SAMPLE_CATALOG.filter(
    (c) =>
      (difficulty === "all" || c.difficulty === difficulty) &&
      (!indicator || c.indicators.includes(indicator)) &&
      (!q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
  );

  return (
    <LearnerShell title="Browse campaigns" description="Pick a topic and practise at your own pace. Every email is a safe simulation.">
      <PreviewBanner />

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

      {results.length === 0 ? (
        <Panel>
          <EmptyState icon={SearchX} title="No campaigns match">
            Try another level, red flag or search term.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((c) => (
            <CatalogCard key={c.id} campaign={c} enrolled={enrolledIds.has(c.id)} />
          ))}
        </div>
      )}
    </LearnerShell>
  );
}
