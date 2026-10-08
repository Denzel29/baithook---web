"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FilterTabs, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useIndicators } from "@/lib/hooks/use-campaigns";
import {
  DIFFICULTY_HINTS,
  DIFFICULTY_LABELS,
  TEMPLATE_CATEGORY_LABELS,
  type Campaign,
  type CampaignInput,
  type Difficulty,
} from "@/types/campaigns";

const DEFAULTS: CampaignInput = {
  name: "",
  description: "",
  difficulty: "moderate",
  focusIndicators: [],
  templateCategories: [],
  benignPerAttempt: 3,
  phishingPerAttempt: 3,
  poolMultiplier: 2,
  passThreshold: 80,
  maxAttempts: null,
  allowSpoofImperfections: false,
  tailorToAudience: false,
};

const chip = (on: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1 text-sm transition ${
    on ? "border-[#2016a9] bg-indigo-50 font-medium text-[#2016a9]" : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
  }`;

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function CampaignForm({
  campaign,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  campaign?: Campaign;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: CampaignInput) => void;
  onCancel: () => void;
}) {
  const indicators = useIndicators();
  const [values, setValues] = useState<CampaignInput>(campaign ? { ...DEFAULTS, ...campaign } : DEFAULTS);
  const set = <K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) => setValues((v) => ({ ...v, [key]: value }));
  const num = (key: "benignPerAttempt" | "phishingPerAttempt" | "poolMultiplier" | "passThreshold", value: string) => set(key, Number(value) || 0);

  const tooMany = values.benignPerAttempt + values.phishingPerAttempt > 30;
  const valid = values.name.trim().length >= 2 && values.focusIndicators.length > 0 && !tooMany;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() });
      }}
    >
      <div>
        <label className={labelClass} htmlFor="c-name">
          Campaign name
        </label>
        <input id="c-name" className={inputClass} value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Payroll and parcel lures, Q4" maxLength={120} autoFocus />
      </div>

      <div>
        <label className={labelClass} htmlFor="c-brief">
          Brief
        </label>
        <textarea
          id="c-brief"
          className={`${inputClass} min-h-28`}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={4000}
          placeholder="Describe the situations these emails should cover. Every email and page is written from this brief, so be specific about who the learners are and what kinds of requests they would plausibly get."
        />
      </div>

      <div>
        <p className={labelClass}>Difficulty</p>
        <FilterTabs<Difficulty>
          value={values.difficulty}
          onChange={(d) => set("difficulty", d)}
          options={(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
        />
        <p className="mt-1.5 text-sm text-gray-500">{DIFFICULTY_HINTS[values.difficulty]}</p>
      </div>

      <div>
        <p className={labelClass}>Tactics to focus on</p>
        <div className="flex flex-wrap gap-2">
          {(indicators.data ?? []).map((i) => (
            <button type="button" key={i.id} title={i.description} onClick={() => set("focusIndicators", toggle(values.focusIndicators, i.id))} className={chip(values.focusIndicators.includes(i.id))}>
              {i.label}
            </button>
          ))}
        </div>
        {values.focusIndicators.length === 0 && <p className="mt-1.5 text-sm text-gray-500">Pick at least one. Each must show up in at least one phishing email.</p>}
      </div>

      <div>
        <p className={labelClass}>Email themes (optional)</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([id, label]) => (
            <button type="button" key={id} onClick={() => set("templateCategories", toggle(values.templateCategories, id))} className={chip(values.templateCategories.includes(id))}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass} htmlFor="c-phish">
            Phishing emails per attempt
          </label>
          <input id="c-phish" type="number" min={1} max={25} className={inputClass} value={values.phishingPerAttempt} onChange={(e) => num("phishingPerAttempt", e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="c-benign">
            Legitimate emails per attempt
          </label>
          <input id="c-benign" type="number" min={1} max={25} className={inputClass} value={values.benignPerAttempt} onChange={(e) => num("benignPerAttempt", e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="c-pool">
            Pool multiplier
          </label>
          <input id="c-pool" type="number" min={1} max={5} className={inputClass} value={values.poolMultiplier} onChange={(e) => num("poolMultiplier", e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="c-pass">
            Pass mark (%)
          </label>
          <input id="c-pass" type="number" min={50} max={100} className={inputClass} value={values.passThreshold} onChange={(e) => num("passThreshold", e.target.value)} />
        </div>
      </div>
      <p className="-mt-2 text-sm text-gray-500">
        A learner sees {values.phishingPerAttempt + values.benignPerAttempt} emails per attempt. The pool holds {values.phishingPerAttempt * values.poolMultiplier} phishing and {values.benignPerAttempt * values.poolMultiplier} legitimate
        emails, so retakes show different ones.
        {tooMany && <span className="font-medium text-red-600"> An attempt can have at most 30 emails.</span>}
      </p>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={values.maxAttempts === null} onChange={(e) => set("maxAttempts", e.target.checked ? null : 3)} className="h-4 w-4 accent-[#2016a9]" />
          Unlimited attempts
        </label>
        {values.maxAttempts !== null && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Max attempts
            <input type="number" min={1} max={10} className={`${inputClass} w-20`} value={values.maxAttempts} onChange={(e) => set("maxAttempts", Math.min(10, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" className={secondaryButton} onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className={primaryButton} disabled={!valid || pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
