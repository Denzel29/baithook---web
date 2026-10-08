"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CompanyShell, Panel, Spinner, inputClass, labelClass, primaryButton } from "@/components/company/company-shell";
import { DomainSettings } from "@/components/company/domain-settings";
import { PlanUsagePanel } from "@/components/company/plan-usage-panel";
import { getCountryOptions } from "@/components/onboarding/countries";
import { ApiError } from "@/lib/api";
import { useMyOrganization, useUpdateMyOrganization } from "@/lib/hooks/use-company";
import {
  COMPANY_SIZE_LABELS,
  INDUSTRY_LABELS,
  CompanySize,
  Industry,
  type OrganizationRecord,
} from "@/types/onboarding";

// Intl.supportedValuesOf is in every current browser but not in this TS lib target
const TIMEZONES: string[] = (() => {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  // Some browsers already include UTC in the list; a Set keeps it once
  return [...new Set(["UTC", ...(intl.supportedValuesOf?.("timeZone") ?? [])])];
})();

export default function SettingsPage() {
  const org = useMyOrganization();

  return (
    <CompanyShell title="Settings" description="Your organization's profile, email domains and plan.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {org.isLoading ? (
            <Panel>
              <Spinner />
            </Panel>
          ) : org.data ? (
            // Keyed so the form picks up fresh values after a save elsewhere
            <ProfileForm key={org.data.updatedAt} org={org.data} />
          ) : (
            <Panel>
              <p className="text-sm text-red-600">{(org.error as Error)?.message}</p>
            </Panel>
          )}

          {org.data && <DomainSettings org={org.data} />}
        </div>
        <PlanUsagePanel className="self-start" />
      </div>
    </CompanyShell>
  );
}

function ProfileForm({ org }: { org: OrganizationRecord }) {
  const update = useUpdateMyOrganization();
  const countries = useMemo(() => getCountryOptions(), []);
  const [name, setName] = useState(org.name);
  const [website, setWebsite] = useState(org.website ?? "");
  const [industry, setIndustry] = useState<Industry>(org.industry ?? Industry.OTHER);
  const [companySize, setCompanySize] = useState<CompanySize>(org.companySize ?? CompanySize.XS);
  const [country, setCountry] = useState(org.country ?? "");
  const [timezone, setTimezone] = useState(org.timezone);

  const dirty =
    name !== org.name ||
    website !== (org.website ?? "") ||
    industry !== org.industry ||
    companySize !== org.companySize ||
    country !== (org.country ?? "") ||
    timezone !== org.timezone;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { name: name.trim(), website: website.trim() || null, industry, companySize, country, timezone },
      {
        onSuccess: () => toast.success("Organization profile saved"),
        onError: (err) => toast.error(err instanceof ApiError ? (err.fieldErrors[0]?.message ?? err.message) : err.message),
      }
    );
  };

  return (
    <Panel title="Organization profile">
      <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className={labelClass}>Company name</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className={labelClass}>Website</span>
          <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="acme.com" />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Industry</span>
          <select className={inputClass} value={industry} onChange={(e) => setIndustry(e.target.value as Industry)}>
            {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Company size</span>
          <select className={inputClass} value={companySize} onChange={(e) => setCompanySize(e.target.value as CompanySize)}>
            {Object.entries(COMPANY_SIZE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Country</span>
          <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="" disabled>
              Select…
            </option>
            {countries.map((c) => (
              <option key={c.code} value={c.code} suppressHydrationWarning>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Timezone</span>
          <select className={inputClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {!TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" className={primaryButton} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </Panel>
  );
}
