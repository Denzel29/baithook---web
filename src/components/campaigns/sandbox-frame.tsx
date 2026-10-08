"use client";

import { useState } from "react";
import { FlaskConical, Lock, RotateCcw } from "lucide-react";
import { resolveAction, type Destination } from "@/lib/sandbox";
import type { InputType, PageAction, PageBlock, PageContent } from "@/types/campaigns";

const INPUT_ATTRS: Record<InputType, { type: string; inputMode?: "numeric" | "tel" | "email" | "text" }> = {
  text: { type: "text" },
  email: { type: "email", inputMode: "email" },
  password: { type: "password" },
  otp: { type: "text", inputMode: "numeric" },
  card: { type: "text", inputMode: "numeric" },
  phone: { type: "tel", inputMode: "tel" },
};

const blockButton = "cursor-pointer rounded-lg bg-[#2016a9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1290]";

// A page inside the sandbox. It always sits in a labelled frame with a fake
// address bar so it can never be mistaken for the real web. Typed values live
// only in this component's state and are discarded when the page changes; the
// caller is only told which fields were filled.
export function SandboxPageView({
  page,
  onAction,
}: {
  page: PageContent;
  onAction?: (blockId: string, action: PageAction, filledFields: string[]) => void;
}) {
  // Reset typed values whenever the page changes
  const [values, setValues] = useState<{ key: string; data: Record<string, string> }>({ key: page.key, data: {} });
  const data = values.key === page.key ? values.data : {};
  const setField = (name: string, value: string) => setValues({ key: page.key, data: { ...data, [name]: value } });

  const activate = (blockId: string, action: PageAction, fieldNames: string[] = []) =>
    onAction?.(
      blockId,
      action,
      fieldNames.filter((n) => (data[n] ?? "").length > 0)
    );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-100 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-3 py-1 text-xs text-gray-600 ring-1 ring-gray-200">
          <Lock className="h-3 w-3 shrink-0 text-gray-400" />
          <span className="truncate" title={page.displayUrl}>
            {page.displayUrl}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-800">
        <FlaskConical className="h-3.5 w-3.5" /> Training sandbox. Nothing here is real, and nothing you type is saved.
      </div>

      <div className="space-y-4 p-6">
        {page.blocks.length === 0 && <p className="text-sm text-gray-400">This page has no content yet.</p>}
        {page.blocks.map((block) => (
          <BlockView key={block.id} block={block} data={data} setField={setField} activate={activate} />
        ))}
      </div>
    </div>
  );
}

function BlockView({
  block,
  data,
  setField,
  activate,
}: {
  block: PageBlock;
  data: Record<string, string>;
  setField: (name: string, value: string) => void;
  activate: (blockId: string, action: PageAction, fieldNames?: string[]) => void;
}) {
  switch (block.type) {
    case "heading": {
      const size = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" }[block.level];
      return <p className={`font-bold text-gray-900 ${size}`}>{block.text}</p>;
    }
    case "text":
      return <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{block.text}</p>;
    case "image":
      return block.assetRef.startsWith("data:image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.assetRef} alt={block.alt} className="max-h-40 rounded-md" />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">{block.alt}</div>
      );
    case "button":
      return (
        <button className={blockButton} onClick={() => activate(block.id, block.action)}>
          {block.label}
        </button>
      );
    case "link":
      return (
        <a
          href="#"
          title={block.displayHref}
          className="text-sm text-[#2016a9] underline"
          onClick={(e) => {
            e.preventDefault();
            activate(block.id, block.action);
          }}
        >
          {block.text}
        </a>
      );
    case "form":
      return (
        <form
          autoComplete="off"
          className="max-w-sm space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            activate(block.id, block.submit.action, block.fields.map((f) => f.name));
          }}
        >
          {block.fields.map((field) => (
            <label key={field.name} className="block text-sm font-medium text-gray-700">
              {field.label}
              <input
                {...INPUT_ATTRS[field.inputType]}
                // Keep browsers and password managers from storing or filling anything
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                name={`sandbox-${block.id}-${field.name}`}
                value={data[field.name] ?? ""}
                onChange={(e) => setField(field.name, e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          ))}
          <button type="submit" className={blockButton}>
            {block.submit.label}
          </button>
        </form>
      );
  }
}

// Click-through preview of a set of pages for authors: follows branches
// locally and never records or sends anything.
export function PagePreview({ pages, startKey }: { pages: PageContent[]; startKey: string }) {
  const [key, setKey] = useState(startKey);
  const [ended, setEnded] = useState<Destination | null>(null);
  const page = pages.find((p) => p.key === key) ?? pages.find((p) => p.key === startKey);

  if (!page) return <p className="text-sm text-gray-500">Pick a page to preview it.</p>;

  const restart = () => {
    setKey(startKey);
    setEnded(null);
  };

  const go = (_blockId: string, action: PageAction, filled: string[]) => {
    const next = resolveAction(action, new Set(filled));
    if ("goto" in next) {
      if (pages.some((p) => p.key === next.goto)) setKey(next.goto);
    } else setEnded(next);
  };

  if (ended) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="font-semibold text-gray-900">{"end" in ended && ended.end === "return_to_inbox" ? "Back to the inbox" : "The page ends here"}</p>
        <p className="mt-1 text-sm text-gray-500">
          {"end" in ended && ended.end === "return_to_inbox"
            ? "The learner returns to the email."
            : "The learner sees a neutral page and can close it. No verdict is shown."}
        </p>
        <button onClick={restart} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RotateCcw className="h-4 w-4" /> Start again
        </button>
      </div>
    );
  }

  return <SandboxPageView page={page} onAction={go} />;
}
