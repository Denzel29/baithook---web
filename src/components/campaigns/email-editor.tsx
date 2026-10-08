"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, inputClass, labelClass, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useIndicators, usePages, useSaveEmail } from "@/lib/hooks/use-campaigns";
import type { CampaignEmail, EmailContent, EmailLink, SandboxPage } from "@/types/campaigns";
import { MERGE_FIELDS, fillSample } from "@/lib/placeholders";
import { EmailView } from "./email-view";

const BLANK: EmailContent = {
  isPhishing: true,
  senderName: "",
  senderAddress: "",
  subject: "",
  greeting: "",
  body: "",
  cta: null,
  links: [],
  attachments: [],
  indicators: [],
  benignRationale: null,
};

const iconButton = "cursor-pointer rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600";
const small = `${inputClass} py-1.5`;

function PageSelect({ value, pages, onChange }: { value: string; pages: SandboxPage[]; onChange: (v: string) => void }) {
  return (
    <select className={small} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose the page it opens…</option>
      {pages.map((p) => (
        <option key={p.id} value={p.key}>
          {p.title} ({p.key})
        </option>
      ))}
    </select>
  );
}

export function EmailEditor({ campaignId, email, onDone }: { campaignId: string; email?: CampaignEmail; onDone: () => void }) {
  const pages = usePages(campaignId);
  const indicators = useIndicators();
  const save = useSaveEmail(campaignId);
  const [v, setV] = useState<EmailContent>(email ? { ...BLANK, ...email } : BLANK);
  const set = <K extends keyof EmailContent>(key: K, value: EmailContent[K]) => setV((s) => ({ ...s, [key]: value }));
  const pageList = pages.data ?? [];

  const setLink = (i: number, patch: Partial<EmailLink>) => set("links", v.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const blankLink = (): EmailLink => ({ text: "", displayHref: "", pageKey: pageList[0]?.key ?? "" });

  const complete =
    v.senderName.trim() && v.senderAddress.includes("@") && v.subject.trim() && v.body.trim() &&
    v.links.every((l) => l.text.trim() && l.displayHref.trim() && l.pageKey) &&
    (!v.cta || (v.cta.text.trim() && v.cta.displayHref.trim() && v.cta.pageKey)) &&
    v.attachments.every((a) => a.filename.trim() && a.pageKey);

  const submit = () =>
    save.mutate(
      {
        id: email?.id,
        body: {
          ...v,
          indicators: v.isPhishing ? v.indicators : [],
          benignRationale: v.isPhishing ? null : v.benignRationale?.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(email ? "Email updated. It needs review again." : "Email added");
          onDone();
        },
        onError: (e) => toast.error(e.message),
      }
    );

  return (
    <div className="space-y-4">
      <button onClick={onDone} className="flex cursor-pointer items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to emails
      </button>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={email ? "Edit email" : "New email"} description="Write what the learner will see. The platform styles it, so only the words and links matter here.">
          <div className="space-y-5">
            <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm">
              {[true, false].map((phishing) => (
                <button
                  key={String(phishing)}
                  onClick={() => set("isPhishing", phishing)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 font-medium ${v.isPhishing === phishing ? "bg-white shadow-sm ring-1 ring-gray-200" : "text-gray-600"}`}
                >
                  {phishing ? "Phishing" : "Legitimate"}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Sender name</label>
                <input className={inputClass} value={v.senderName} onChange={(e) => set("senderName", e.target.value)} placeholder="Acme Payroll Team" />
              </div>
              <div>
                <label className={labelClass}>Sender address</label>
                <input className={inputClass} value={v.senderAddress} onChange={(e) => set("senderAddress", e.target.value)} placeholder="payroll@acme-payroll.example" />
              </div>
            </div>
            <p className="-mt-3 text-xs text-gray-500">Addresses and links are always forced onto fake .example domains, so nothing can point at a real site.</p>

            <div>
              <label className={labelClass}>Subject</label>
              <input className={inputClass} value={v.subject} onChange={(e) => set("subject", e.target.value)} maxLength={200} />
            </div>
            <div>
              <label className={labelClass}>Greeting</label>
              <input className={inputClass} value={v.greeting} onChange={(e) => set("greeting", e.target.value)} placeholder="Hi {{firstName}}," />
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                Greet each learner by name with a merge field:
                {MERGE_FIELDS.map((field) => (
                  <button
                    key={field.token}
                    type="button"
                    title={`Adds ${field.token} to the greeting`}
                    className="cursor-pointer rounded-full bg-indigo-50 px-2.5 py-0.5 font-medium text-[#2016a9] transition hover:bg-indigo-100"
                    onClick={() => set("greeting", `${v.greeting}${v.greeting && !v.greeting.endsWith(" ") ? " " : ""}${field.token}`)}
                  >
                    {field.label}
                  </button>
                ))}
                <span className="basis-full">Works in the subject and body too. The preview shows a sample name; learners see their own.</span>
              </p>
            </div>
            <div>
              <label className={labelClass}>Body</label>
              <textarea className={`${inputClass} min-h-36`} value={v.body} onChange={(e) => set("body", e.target.value)} maxLength={8000} />
            </div>

            <fieldset className="space-y-3">
              <legend className={labelClass}>Button</legend>
              {v.cta ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input className={small} placeholder="Button text" value={v.cta.text} onChange={(e) => set("cta", { ...v.cta!, text: e.target.value })} />
                  <input className={small} placeholder="Address shown on hover" value={v.cta.displayHref} onChange={(e) => set("cta", { ...v.cta!, displayHref: e.target.value })} />
                  <PageSelect value={v.cta.pageKey} pages={pageList} onChange={(pageKey) => set("cta", { ...v.cta!, pageKey })} />
                  <button className={iconButton} onClick={() => set("cta", null)} aria-label="Remove button">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button className={secondaryButton} onClick={() => set("cta", blankLink())}>
                  <Plus className="h-4 w-4" /> Add a button
                </button>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className={labelClass}>Links</legend>
              {v.links.map((l, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input className={small} placeholder="Link text" value={l.text} onChange={(e) => setLink(i, { text: e.target.value })} />
                  <input className={small} placeholder="Address shown on hover" value={l.displayHref} onChange={(e) => setLink(i, { displayHref: e.target.value })} />
                  <PageSelect value={l.pageKey} pages={pageList} onChange={(pageKey) => setLink(i, { pageKey })} />
                  <button className={iconButton} onClick={() => set("links", v.links.filter((_, idx) => idx !== i))} aria-label="Remove link">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {v.links.length < 10 && (
                <button className={secondaryButton} onClick={() => set("links", [...v.links, blankLink()])}>
                  <Plus className="h-4 w-4" /> Add a link
                </button>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className={labelClass}>Attachments</legend>
              {v.attachments.map((a, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_6rem_1fr_auto]">
                  <input className={small} placeholder="invoice.docm" value={a.filename} onChange={(e) => set("attachments", v.attachments.map((x, idx) => (idx === i ? { ...x, filename: e.target.value } : x)))} />
                  <input className={small} type="number" min={1} value={a.sizeKb} onChange={(e) => set("attachments", v.attachments.map((x, idx) => (idx === i ? { ...x, sizeKb: Number(e.target.value) || 1 } : x)))} aria-label="Size in KB" />
                  <PageSelect value={a.pageKey} pages={pageList} onChange={(pageKey) => set("attachments", v.attachments.map((x, idx) => (idx === i ? { ...x, pageKey } : x)))} />
                  <button className={iconButton} onClick={() => set("attachments", v.attachments.filter((_, idx) => idx !== i))} aria-label="Remove attachment">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {v.attachments.length < 5 && (
                <button className={secondaryButton} onClick={() => set("attachments", [...v.attachments, { filename: "", sizeKb: 120, pageKey: pageList[0]?.key ?? "" }])}>
                  <Plus className="h-4 w-4" /> Add an attachment
                </button>
              )}
              <p className="text-xs text-gray-500">Only the file name is shown. No real file exists, and opening one leads to the page you choose.</p>
            </fieldset>

            {(v.links.length > 0 || v.attachments.length > 0 || v.cta) && pageList.length === 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                There are no pages yet. Create the pages these links open in the Pages tab, then come back and choose them.
              </p>
            )}

            {v.isPhishing ? (
              <fieldset className="space-y-3">
                <legend className={labelClass}>What makes it phishing</legend>
                <p className="-mt-1 text-xs text-gray-500">
                  Name each tell and copy the exact words from the email. These highlight the email in the learner&apos;s debrief.
                </p>
                {v.indicators.map((ind, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-gray-200 p-3">
                    <div className="flex gap-2">
                      <select className={small} value={ind.indicatorId} onChange={(e) => set("indicators", v.indicators.map((x, idx) => (idx === i ? { ...x, indicatorId: e.target.value } : x)))}>
                        {(indicators.data ?? []).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <button className={iconButton} onClick={() => set("indicators", v.indicators.filter((_, idx) => idx !== i))} aria-label="Remove tell">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input className={small} placeholder="Exact words from the email" value={ind.excerpt} onChange={(e) => set("indicators", v.indicators.map((x, idx) => (idx === i ? { ...x, excerpt: e.target.value } : x)))} />
                    <input className={small} placeholder="Why this is a warning sign" value={ind.explanation} onChange={(e) => set("indicators", v.indicators.map((x, idx) => (idx === i ? { ...x, explanation: e.target.value } : x)))} />
                  </div>
                ))}
                {v.indicators.length < 8 && (
                  <button className={secondaryButton} onClick={() => set("indicators", [...v.indicators, { indicatorId: indicators.data?.[0]?.id ?? "urgency", excerpt: "", explanation: "" }])}>
                    <Plus className="h-4 w-4" /> Add a tell
                  </button>
                )}
              </fieldset>
            ) : (
              <div>
                <label className={labelClass}>Why this email is legitimate</label>
                <textarea className={`${inputClass} min-h-20`} value={v.benignRationale ?? ""} onChange={(e) => set("benignRationale", e.target.value)} maxLength={1000} placeholder="Shown in the debrief, e.g. known colleague, internal portal, no pressure." />
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button className={secondaryButton} onClick={onDone} disabled={save.isPending}>
                Cancel
              </button>
              <button className={primaryButton} onClick={submit} disabled={!complete || save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {email ? "Save changes" : "Add email"}
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
          <p className="text-sm font-medium text-gray-700">Preview</p>
          <EmailView email={v} fill={fillSample} />
        </div>
      </div>
    </div>
  );
}
