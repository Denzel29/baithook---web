"use client";

import { useRef, useState } from "react";
import { Download, FileUp, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, FilterTabs, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { ApiError } from "@/lib/api";
import { useBulkInvite, useCreateInvite, useDepartments, useRoles } from "@/lib/hooks/use-company";
import { JOB_FUNCTION_LABELS, JobFunction, type BulkInviteResult } from "@/types/onboarding";

const SKIP_REASONS: Record<string, string> = {
  invalid_email: "Not a valid email address",
  duplicate_in_file: "Listed twice in the file",
  domain_not_allowed: "Email domain isn't allowed for your company",
  already_member: "Already a member",
  member_of_other_org: "Belongs to another organization",
  already_invited: "Already has a pending invitation",
  seat_limit_reached: "No seats left on your plan",
  unknown_role: "Role name not recognised",
  unknown_department: "Department doesn't exist",
  invalid_job_function: "Job function not recognised",
};

const CSV_TEMPLATE =
  "email,firstName,lastName,department,jobFunction,role\n" +
  "jane.doe@example.com,Jane,Doe,Finance,finance,\n" +
  "sam.lee@example.com,Sam,Lee,Engineering,it,Employee\n";

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"single" | "csv">("single");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide={mode === "csv"}
      title="Invite people"
      description="Invitees get an email with a link to set their password. Links expire after 7 days."
    >
      <div className="mb-5">
        <FilterTabs
          value={mode}
          onChange={setMode}
          options={[
            { value: "single", label: "One person" },
            { value: "csv", label: "Upload CSV" },
          ]}
        />
      </div>
      {mode === "single" ? <SingleInvite /> : <CsvInvite />}
    </Dialog>
  );
}

function SingleInvite() {
  const departments = useDepartments();
  const roles = useRoles();
  const invite = useCreateInvite();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [jobFunction, setJobFunction] = useState("");
  const [roleId, setRoleId] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    invite.mutate(
      {
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        departmentId: departmentId || null,
        jobFunction: (jobFunction as JobFunction) || null,
        roleId: roleId || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Invitation sent to ${email.trim()}`);
          // Keep department/role so several people from one team can be added in a row
          setEmail("");
          setFirstName("");
          setLastName("");
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? (err.fieldErrors[0]?.message ?? err.message) : err.message),
      }
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className={labelClass}>
          Email <span className="text-red-500">*</span>
        </span>
        <input className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className={labelClass}>First name</span>
          <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Last name</span>
          <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Department</span>
          <select className={inputClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">None</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Job function</span>
          <select className={inputClass} value={jobFunction} onChange={(e) => setJobFunction(e.target.value)}>
            <option value="">Not set</option>
            {Object.entries(JOB_FUNCTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className={labelClass}>Role</span>
          <select className={inputClass} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Employee (default)</option>
            {roles.data
              ?.filter((r) => r.name !== "Employee")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="flex justify-end pt-1">
        <button type="submit" className={primaryButton} disabled={invite.isPending}>
          {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Send invitation
        </button>
      </div>
    </form>
  );
}

function CsvInvite() {
  const bulk = useBulkInvite();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [createDepartments, setCreateDepartments] = useState(true);
  const [result, setResult] = useState<BulkInviteResult | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("The file is larger than 1 MB");
      return;
    }
    setCsv(await file.text());
    setFileName(file.name);
    setResult(null);
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "baitline-invite-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onUpload = () =>
    bulk.mutate(
      { csv, createDepartments },
      {
        onSuccess: (res) => {
          setResult(res);
          toast.success(`${res.created} invitation${res.created === 1 ? "" : "s"} sent`);
        },
        onError: (err) => toast.error(err.message),
      }
    );

  if (result) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-2xl font-bold text-emerald-800">{result.created}</p>
            <p className="text-sm text-emerald-700">invitations sent</p>
          </div>
          <div className={`rounded-xl border p-4 ${result.skipped.length ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"}`}>
            <p className={`text-2xl font-bold ${result.skipped.length ? "text-amber-800" : "text-gray-700"}`}>{result.skipped.length}</p>
            <p className={`text-sm ${result.skipped.length ? "text-amber-700" : "text-gray-500"}`}>rows skipped</p>
          </div>
        </div>
        {result.skipped.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Row</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Why it was skipped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.skipped.map((s) => (
                  <tr key={`${s.row}-${s.email}`}>
                    <td className="px-4 py-2 text-gray-500">{s.row}</td>
                    <td className="px-4 py-2 text-gray-900">{s.email || "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{SKIP_REASONS[s.reason] ?? s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end">
          <button
            className={secondaryButton}
            onClick={() => {
              setResult(null);
              setCsv("");
              setFileName(null);
            }}
          >
            Upload another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        <p>
          Columns: <code className="font-mono text-gray-900">email</code> (required),{" "}
          <code className="font-mono text-gray-900">firstName</code>, <code className="font-mono text-gray-900">lastName</code>,{" "}
          <code className="font-mono text-gray-900">department</code>, <code className="font-mono text-gray-900">jobFunction</code>,{" "}
          <code className="font-mono text-gray-900">role</code>. Up to 1,000 rows. Rows with problems are skipped and listed afterwards; the rest are still sent.
        </p>
        <button onClick={downloadTemplate} className="mt-2 inline-flex cursor-pointer items-center gap-1.5 font-medium text-[#2016a9] hover:underline">
          <Download className="h-4 w-4" /> Download template
        </button>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onFile(e.dataTransfer.files[0]);
        }}
        className="flex w-full cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-8 text-center transition hover:border-[#2016a9] hover:bg-indigo-50/40"
      >
        <FileUp className="h-8 w-8 text-[#2016a9]" />
        <span className="mt-2 font-semibold text-gray-900">{fileName ?? "Choose a CSV file"}</span>
        <span className="text-sm text-gray-500">{fileName ? `${csv.trim().split(/\r?\n/).length - 1} rows` : "or drag it here"}</span>
      </button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" className="h-4 w-4 accent-[#2016a9]" checked={createDepartments} onChange={(e) => setCreateDepartments(e.target.checked)} />
        Create departments that don&apos;t exist yet
      </label>

      <div className="flex justify-end">
        <button className={primaryButton} disabled={!csv || bulk.isPending} onClick={onUpload}>
          {bulk.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send invitations
        </button>
      </div>
    </div>
  );
}
