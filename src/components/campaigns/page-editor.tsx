"use client";

import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useSavePage } from "@/lib/hooks/use-campaigns";
import { newBlockId } from "@/lib/sandbox";
import {
  INPUT_TYPE_LABELS,
  PAGE_KIND_LABELS,
  type InputType,
  type PageAction,
  type PageBlock,
  type PageContent,
  type PageKind,
  type SandboxPage,
} from "@/types/campaigns";
import { PagePreview } from "./sandbox-frame";

const small = `${inputClass} py-1.5`;
const iconButton = "cursor-pointer rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30";

const BLANK: PageContent = { key: "", title: "", displayUrl: "", kind: "generic", blocks: [] };

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// Where a button, link or form leads. Branching lets a form send people to
// different pages depending on whether a field was filled in.
function ActionEditor({
  action,
  pageKeys,
  fieldNames,
  onChange,
}: {
  action: PageAction;
  pageKeys: string[];
  fieldNames: string[];
  onChange: (a: PageAction) => void;
}) {
  const mode = "goto" in action ? "goto" : "branches" in action ? "branches" : "end";
  const firstKey = pageKeys[0] ?? "";

  const pageSelect = (value: string, onPick: (v: string) => void) => (
    <select className={small} value={value} onChange={(e) => onPick(e.target.value)}>
      {!pageKeys.includes(value) && <option value={value}>{value || "Choose a page…"}</option>}
      {pageKeys.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase">Then</span>
        <select
          className={`${small} w-auto`}
          value={mode}
          onChange={(e) => {
            const m = e.target.value;
            if (m === "goto") onChange({ goto: firstKey });
            else if (m === "branches" && fieldNames.length > 0) onChange({ branches: [{ if: { field: fieldNames[0], filled: true }, goto: firstKey }], default: firstKey });
            else onChange({ end: "dead_end" });
          }}
        >
          <option value="goto">open another page</option>
          {fieldNames.length > 0 && <option value="branches">branch on a field</option>}
          <option value="end">end here</option>
        </select>

        {"goto" in action && pageSelect(action.goto, (goto) => onChange({ goto }))}
        {"end" in action && (
          <select className={`${small} w-auto`} value={action.end} onChange={(e) => onChange({ end: e.target.value as "dead_end" | "return_to_inbox" })}>
            <option value="dead_end">show a neutral dead end</option>
            <option value="return_to_inbox">return to the email</option>
          </select>
        )}
      </div>

      {"branches" in action && (
        <div className="space-y-2">
          {action.branches.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              If
              <select className={`${small} w-auto`} value={b.if.field} onChange={(e) => onChange({ ...action, branches: action.branches.map((x, idx) => (idx === i ? { ...x, if: { ...x.if, field: e.target.value } } : x)) })}>
                {fieldNames.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <select className={`${small} w-auto`} value={String(b.if.filled)} onChange={(e) => onChange({ ...action, branches: action.branches.map((x, idx) => (idx === i ? { ...x, if: { ...x.if, filled: e.target.value === "true" } } : x)) })}>
                <option value="true">is filled in</option>
                <option value="false">is left empty</option>
              </select>
              go to
              {pageSelect(b.goto, (goto) => onChange({ ...action, branches: action.branches.map((x, idx) => (idx === i ? { ...x, goto } : x)) }))}
              {action.branches.length > 1 && (
                <button className={iconButton} onClick={() => onChange({ ...action, branches: action.branches.filter((_, idx) => idx !== i) })} aria-label="Remove branch">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            Otherwise go to {pageSelect(action.default, (d) => onChange({ ...action, default: d }))}
            {action.branches.length < 6 && (
              <button className="cursor-pointer text-sm font-medium text-[#2016a9] hover:underline" onClick={() => onChange({ ...action, branches: [...action.branches, { if: { field: fieldNames[0], filled: true }, goto: firstKey }] })}>
                + Add a branch
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const BLOCK_LABELS: Record<PageBlock["type"], string> = { heading: "Heading", text: "Text", image: "Image", form: "Form", button: "Button", link: "Link" };

export function PageEditor({ campaignId, page, allPages, onDone }: { campaignId: string; page?: SandboxPage; allPages: SandboxPage[]; onDone: () => void }) {
  const save = useSavePage(campaignId);
  const [v, setV] = useState<PageContent>(page ? { key: page.key, title: page.title, displayUrl: page.displayUrl, kind: page.kind, blocks: page.blocks } : BLANK);
  const set = <K extends keyof PageContent>(key: K, value: PageContent[K]) => setV((s) => ({ ...s, [key]: value }));

  // A page may lead back to itself (e.g. "sign-in failed, try again"), so its own key is a valid target
  const pageKeys = [...new Set([...allPages.map((p) => p.key), ...(v.key ? [v.key] : [])])];
  const setBlock = (id: string, patch: Partial<PageBlock>) => set("blocks", v.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as PageBlock) : b)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...v.blocks];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set("blocks", next);
  };
  const add = (type: "heading" | "text" | "form" | "button" | "link") => {
    const id = newBlockId();
    const end: PageAction = { end: "dead_end" };
    const blocks: Record<typeof type, PageBlock> = {
      heading: { id, type: "heading", text: "Heading", level: 1 },
      text: { id, type: "text", text: "Write something here." },
      form: { id, type: "form", fields: [{ name: "email", label: "Email address", inputType: "email" }], submit: { label: "Continue", action: end } },
      button: { id, type: "button", label: "Continue", action: end },
      link: { id, type: "link", text: "Learn more", displayHref: "https://help.example", action: end },
    };
    set("blocks", [...v.blocks, blocks[type]]);
  };

  const valid = v.key && v.title.trim() && v.displayUrl.trim() && v.blocks.length > 0;

  const submit = () =>
    save.mutate(
      { id: page?.id, body: page ? { title: v.title, displayUrl: v.displayUrl, kind: v.kind, blocks: v.blocks } : v },
      {
        onSuccess: () => {
          toast.success(page ? "Page updated. It needs review again." : "Page added");
          onDone();
        },
        onError: (e) => toast.error(e.message),
      }
    );

  const draftPages = [{ ...v, key: v.key || "draft" }];

  return (
    <div className="space-y-4">
      <button onClick={onDone} className="flex cursor-pointer items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to pages
      </button>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={page ? "Edit page" : "New page"} description="Pages are built from simple blocks. Each button, link or form says where it leads.">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  value={v.title}
                  onChange={(e) => setV((s) => ({ ...s, title: e.target.value, key: page ? s.key : slug(e.target.value) }))}
                  placeholder="Sign in"
                />
              </div>
              <div>
                <label className={labelClass}>Key</label>
                <input className={inputClass} value={v.key} onChange={(e) => set("key", slug(e.target.value))} disabled={!!page} placeholder="signin" />
                {page && <p className="mt-1 text-xs text-gray-500">The key can&apos;t change once created.</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address shown in the browser bar</label>
                <input className={inputClass} value={v.displayUrl} onChange={(e) => set("displayUrl", e.target.value)} placeholder="https://secure-login.example/signin" />
                <p className="mt-1 text-xs text-gray-500">Forced onto a fake .example domain. Learners can inspect it, so make it as convincing (or as suspicious) as the email calls for.</p>
              </div>
              <div>
                <label className={labelClass}>Kind</label>
                <select className={inputClass} value={v.kind} onChange={(e) => set("kind", e.target.value as PageKind)}>
                  {Object.entries(PAGE_KIND_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <p className={labelClass}>Content</p>
              {v.blocks.map((b, i) => (
                <div key={b.id} className="space-y-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{BLOCK_LABELS[b.type]}</span>
                    <div className="flex">
                      <button className={iconButton} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button className={iconButton} disabled={i === v.blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button className={`${iconButton} hover:text-red-600`} onClick={() => set("blocks", v.blocks.filter((x) => x.id !== b.id))} aria-label="Remove block">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {b.type === "heading" && (
                    <div className="flex gap-2">
                      <input className={small} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />
                      <select className={`${small} w-28`} value={b.level} onChange={(e) => setBlock(b.id, { level: Number(e.target.value) as 1 | 2 | 3 })}>
                        <option value={1}>Large</option>
                        <option value={2}>Medium</option>
                        <option value={3}>Small</option>
                      </select>
                    </div>
                  )}
                  {b.type === "text" && <textarea className={`${small} min-h-20`} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
                  {b.type === "image" && <p className="text-sm text-gray-500">Image: {b.alt}</p>}

                  {b.type === "button" && (
                    <>
                      <input className={small} value={b.label} onChange={(e) => setBlock(b.id, { label: e.target.value })} placeholder="Button text" />
                      <ActionEditor action={b.action} pageKeys={pageKeys} fieldNames={[]} onChange={(action) => setBlock(b.id, { action })} />
                    </>
                  )}

                  {b.type === "link" && (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input className={small} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} placeholder="Link text" />
                        <input className={small} value={b.displayHref} onChange={(e) => setBlock(b.id, { displayHref: e.target.value })} placeholder="Address shown on hover" />
                      </div>
                      <ActionEditor action={b.action} pageKeys={pageKeys} fieldNames={[]} onChange={(action) => setBlock(b.id, { action })} />
                    </>
                  )}

                  {b.type === "form" && (
                    <>
                      <div className="space-y-2">
                        {b.fields.map((f, fi) => (
                          <div key={fi} className="grid gap-2 sm:grid-cols-[1fr_1fr_9rem_auto]">
                            <input className={small} value={f.label} onChange={(e) => setBlock(b.id, { fields: b.fields.map((x, idx) => (idx === fi ? { ...x, label: e.target.value } : x)) })} placeholder="Label" />
                            <input className={small} value={f.name} onChange={(e) => setBlock(b.id, { fields: b.fields.map((x, idx) => (idx === fi ? { ...x, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") } : x)) })} placeholder="field_name" />
                            <select className={small} value={f.inputType} onChange={(e) => setBlock(b.id, { fields: b.fields.map((x, idx) => (idx === fi ? { ...x, inputType: e.target.value as InputType } : x)) })}>
                              {Object.entries(INPUT_TYPE_LABELS).map(([k, l]) => (
                                <option key={k} value={k}>
                                  {l}
                                </option>
                              ))}
                            </select>
                            <button className={`${iconButton} hover:text-red-600`} disabled={b.fields.length === 1} onClick={() => setBlock(b.id, { fields: b.fields.filter((_, idx) => idx !== fi) })} aria-label="Remove field">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {b.fields.length < 8 && (
                          <button className="cursor-pointer text-sm font-medium text-[#2016a9] hover:underline" onClick={() => setBlock(b.id, { fields: [...b.fields, { name: `field_${b.fields.length + 1}`, label: "", inputType: "text" }] })}>
                            + Add a field
                          </button>
                        )}
                      </div>
                      <input className={small} value={b.submit.label} onChange={(e) => setBlock(b.id, { submit: { ...b.submit, label: e.target.value } })} placeholder="Submit button text" />
                      <ActionEditor action={b.submit.action} pageKeys={pageKeys} fieldNames={b.fields.map((f) => f.name)} onChange={(action) => setBlock(b.id, { submit: { ...b.submit, action } })} />
                      <p className="text-xs text-gray-500">Whatever a learner types is never sent or stored. Only whether each field was filled in is recorded.</p>
                    </>
                  )}
                </div>
              ))}

              {v.blocks.length < 20 && (
                <div className="flex flex-wrap gap-2">
                  {(["heading", "text", "form", "button", "link"] as const).map((t) => (
                    <button key={t} className={secondaryButton} onClick={() => add(t)}>
                      <Plus className="h-4 w-4" /> {BLOCK_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button className={secondaryButton} onClick={onDone} disabled={save.isPending}>
                Cancel
              </button>
              <button className={primaryButton} onClick={submit} disabled={!valid || save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {page ? "Save changes" : "Add page"}
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
          <p className="text-sm font-medium text-gray-700">Preview (click through it)</p>
          <PagePreview pages={[...allPages.filter((p) => p.key !== v.key), ...draftPages]} startKey={v.key || "draft"} />
        </div>
      </div>
    </div>
  );
}
