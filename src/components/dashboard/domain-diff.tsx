import { ArrowRight, Minus, Plus } from "lucide-react";

export interface DomainSet {
  primaryDomain: string | null;
  allowedDomains: string[];
}

export function diffDomains(from: DomainSet, to: DomainSet) {
  return {
    primaryChanged: (from.primaryDomain ?? null) !== (to.primaryDomain ?? null),
    added: to.allowedDomains.filter((d) => !from.allowedDomains.includes(d)),
    removed: from.allowedDomains.filter((d) => !to.allowedDomains.includes(d)),
    kept: to.allowedDomains.filter((d) => from.allowedDomains.includes(d)),
  };
}

export const hasDomainChanges = (from: DomainSet, to: DomainSet) => {
  const d = diffDomains(from, to);
  return d.primaryChanged || d.added.length > 0 || d.removed.length > 0;
};

const chip = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs";

// What a domain change request would do, in plain terms
export function DomainDiff({ from, to }: { from: DomainSet; to: DomainSet }) {
  const d = diffDomains(from, to);

  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-gray-500">Primary domain</dt>
        <dd className="mt-1 flex flex-wrap items-center gap-2">
          {d.primaryChanged ? (
            <>
              <span className={`${chip} bg-red-50 text-red-700 line-through`}>{from.primaryDomain ?? "none"}</span>
              <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              <span className={`${chip} bg-emerald-50 text-emerald-700`}>{to.primaryDomain ?? "none"}</span>
            </>
          ) : (
            <span className={`${chip} bg-gray-100 text-gray-700`}>{to.primaryDomain ?? "none"}</span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-gray-500">Additional domains</dt>
        <dd className="mt-1 flex flex-wrap gap-2">
          {d.added.map((x) => (
            <span key={`+${x}`} className={`${chip} bg-emerald-50 text-emerald-700`}>
              <Plus className="h-3 w-3" />
              {x}
            </span>
          ))}
          {d.removed.map((x) => (
            <span key={`-${x}`} className={`${chip} bg-red-50 text-red-700 line-through`}>
              <Minus className="h-3 w-3" />
              {x}
            </span>
          ))}
          {d.kept.map((x) => (
            <span key={x} className={`${chip} bg-gray-100 text-gray-700`}>
              {x}
            </span>
          ))}
          {!d.added.length && !d.removed.length && !d.kept.length && <span className="text-gray-400">None</span>}
        </dd>
      </div>
    </dl>
  );
}
