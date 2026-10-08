"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, FolderTree, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  CompanyShell,
  EmptyState,
  Panel,
  Spinner,
  inputClass,
  primaryButton,
} from "@/components/company/company-shell";
import { useCreateDepartment, useDeleteDepartment, useDepartments, useRenameDepartment } from "@/lib/hooks/use-company";
import type { Department } from "@/types/onboarding";

export default function DepartmentsPage() {
  const departments = useDepartments();
  const create = useCreateDepartment();
  const [name, setName] = useState("");

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    create.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          toast.success(`${trimmed} created`);
          setName("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <CompanyShell title="Departments" description="Group people by team to assign training and compare results.">
      <Panel>
        <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row">
          <input
            className={`${inputClass} sm:max-w-sm`}
            placeholder="New department, e.g. Finance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            aria-label="Department name"
          />
          <button type="submit" className={primaryButton} disabled={name.trim().length < 2 || create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add department
          </button>
        </form>
      </Panel>

      <Panel flush>
        {departments.isLoading ? (
          <div className="py-12">
            <Spinner />
          </div>
        ) : departments.isError ? (
          <p className="p-6 text-sm text-red-600">{(departments.error as Error).message}</p>
        ) : !departments.data?.length ? (
          <EmptyState icon={FolderTree} title="No departments yet">
            Add your first department above, or let a CSV invite upload create them for you.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100">
            {departments.data.map((d) => (
              <DepartmentRow key={d.id} department={d} />
            ))}
          </ul>
        )}
      </Panel>
    </CompanyShell>
  );
}

function DepartmentRow({ department: d }: { department: Department }) {
  const rename = useRenameDepartment();
  const remove = useDeleteDepartment();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(d.name);

  const save = () => {
    const trimmed = name.trim();
    if (trimmed === d.name) return setEditing(false);
    rename.mutate(
      { id: d.id, name: trimmed },
      {
        onSuccess: () => {
          toast.success("Department renamed");
          setEditing(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <li className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <FolderTree className="h-4 w-4 text-[#2016a9]" />
        </span>
        {editing ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input className={`${inputClass} max-w-xs`} value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={100} />
            <button type="submit" className="cursor-pointer rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" aria-label="Save" disabled={rename.isPending}>
              {rename.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Cancel"
              onClick={() => {
                setName(d.name);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{d.name}</p>
            <Link href={`/dashboard/company/team?department=${d.id}`} className="text-sm text-gray-500 hover:text-[#2016a9]">
              {d.memberCount} {d.memberCount === 1 ? "member" : "members"}
            </Link>
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-4 text-sm">
          <button className="inline-flex cursor-pointer items-center gap-1 font-medium text-gray-600 hover:text-[#2016a9]" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Rename
          </button>
          {confirmDelete ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-gray-500">{d.memberCount ? `${d.memberCount} member(s) will be unassigned.` : "Delete?"}</span>
              <button
                className="cursor-pointer font-semibold text-red-600 hover:underline disabled:opacity-50"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ id: d.id }, { onSuccess: () => toast.success(`${d.name} deleted`), onError: (err) => toast.error(err.message) })
                }
              >
                Delete
              </button>
              <button className="cursor-pointer text-gray-500 hover:underline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button className="inline-flex cursor-pointer items-center gap-1 font-medium text-gray-600 hover:text-red-600" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      )}
    </li>
  );
}
