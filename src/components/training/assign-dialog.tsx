"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, FilterTabs, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useDepartments, useMembers } from "@/lib/hooks/use-company";
import { useAssign } from "@/lib/hooks/use-training";
import { SKIP_REASON_TEXT, type AssignResult } from "@/types/training";

type Target = "organization" | "departments" | "users";

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

// Assigning a campaign to everyone, to departments, or to chosen people. After
// submitting it shows who got an attempt and who was skipped, and why.
export function AssignDialog({ campaignId, campaignName, open, onClose }: { campaignId: string; campaignName: string; open: boolean; onClose: () => void }) {
  const departments = useDepartments();
  const members = useMembers({});
  const assign = useAssign(campaignId);
  const [target, setTarget] = useState<Target>("organization");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [due, setDue] = useState("");
  const [includeExposed, setIncludeExposed] = useState(false);
  const [result, setResult] = useState<AssignResult | null>(null);

  const people = (members.data?.data ?? []).filter((m) => m.status === "active");
  const q = search.trim().toLowerCase();
  const shown = people.filter((m) => !q || `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q));

  const valid = target === "organization" || (target === "departments" && departmentIds.length > 0) || (target === "users" && userIds.length > 0);

  const close = () => {
    setResult(null);
    onClose();
  };

  const submit = () =>
    assign.mutate(
      {
        targetType: target,
        ...(target === "departments" ? { departmentIds } : {}),
        ...(target === "users" ? { userIds } : {}),
        // Due at the end of the chosen day, in the person's own time zone
        dueAt: due ? new Date(`${due}T23:59:00`).toISOString() : null,
        includeExposed,
      },
      { onSuccess: setResult, onError: (e) => toast.error(e.message) }
    );

  return (
    <Dialog open={open} onClose={close} icon={result ? <CheckCircle2 /> : <Users />} title={result ? "Assigned" : `Assign "${campaignName}"`} description={result ? undefined : "Choose who should take this campaign."} wide>
      {result ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-gray-800">
            <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${result.created ? "text-emerald-600" : "text-gray-400"}`} />
            {result.created ? `${result.created} ${result.created === 1 ? "person has" : "people have"} been assigned this campaign.` : "Nobody was assigned."}
          </p>
          {result.skipped.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900">Skipped ({result.skipped.length})</p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-gray-600">
                {result.skipped.map((s) => (
                  <li key={s.userId}>
                    <span className="font-medium text-gray-900">{s.name}</span> {SKIP_REASON_TEXT[s.reason]}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.hint && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{result.hint}</p>}
          <div className="flex justify-end">
            <button className={primaryButton} onClick={close}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <FilterTabs<Target>
            value={target}
            onChange={setTarget}
            options={[
              { value: "organization", label: "Everyone" },
              { value: "departments", label: "Departments" },
              { value: "users", label: "Specific people" },
            ]}
          />

          {target === "organization" && <p className="text-sm text-gray-600">Everyone in your company who is active gets an attempt, administrators included. They are employees too.</p>}

          {target === "departments" && (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {(departments.data ?? []).length === 0 && <p className="p-2 text-sm text-gray-500">No departments yet. Create some under Departments.</p>}
              {(departments.data ?? []).map((d) => (
                <label key={d.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input type="checkbox" className="h-4 w-4 accent-[#2016a9]" checked={departmentIds.includes(d.id)} onChange={() => setDepartmentIds(toggle(departmentIds, d.id))} />
                  <span className="flex-1 text-gray-900">{d.name}</span>
                  <span className="text-gray-400">{d.memberCount} member{d.memberCount === 1 ? "" : "s"}</span>
                </label>
              ))}
            </div>
          )}

          {target === "users" && (
            <div className="space-y-2">
              <input className={inputClass} placeholder="Search people" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {members.isLoading && <p className="p-2 text-sm text-gray-500">Loading…</p>}
                {shown.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50">
                    <input type="checkbox" className="h-4 w-4 accent-[#2016a9]" checked={userIds.includes(m.id)} onChange={() => setUserIds(toggle(userIds, m.id))} />
                    <span className="flex-1 text-gray-900">
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="truncate text-gray-400">{m.department?.name ?? m.email}</span>
                  </label>
                ))}
                {!members.isLoading && shown.length === 0 && <p className="p-2 text-sm text-gray-500">No active people match.</p>}
              </div>
              <p className="text-xs text-gray-500">{userIds.length} selected</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="due">
                Due date (optional)
              </label>
              <input id="due" type="date" className={inputClass} value={due} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>

          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer font-medium text-gray-700">Advanced</summary>
            <label className="mt-3 flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#2016a9]" checked={includeExposed} onChange={(e) => setIncludeExposed(e.target.checked)} />
              <span>
                Include people who wrote or reviewed this campaign. They have seen the answers, so by default they are skipped. If included, their results stay private to them and are left out of
                reports.
              </span>
            </label>
          </details>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button className={secondaryButton} onClick={close}>
              Cancel
            </button>
            <button className={primaryButton} disabled={!valid || assign.isPending} onClick={submit}>
              {assign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
