"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { CreditCard, FileText, FlaskConical, Lock, RotateCcw, ShieldCheck } from "lucide-react";
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

const FONT: CSSProperties = { fontFamily: 'Roboto, "Segoe UI", system-ui, Arial, sans-serif' };
const INK = "#202124";
const MUTED = "#5f6368";
const LINE = "#dadce0";

interface Theme {
  brand: string;
  accent: string;
}

// Pages made before themes existed have none: take a brand name from the address and use a neutral blue
function themeOf(page: PageContent): Theme {
  if (page.theme?.brand) return page.theme;
  const host = page.displayUrl.replace(/^https?:\/\//, "").split("/")[0].replace(/\.example$/, "");
  const name = host.split(".")[0].split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  return { brand: name || "Account", accent: "#1a73e8" };
}

// A page inside the sandbox. It sits in a labelled frame with a fake address bar so it
// can never be mistaken for the real web, and inside it looks like the kind of page it
// imitates: a branded sign-in, a shared file, a Word "protected view", a company portal.
// Typed values live only in this component's state and are discarded when the page
// changes; the caller is only told which fields were filled.
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

  const theme = themeOf(page);
  const activate = (blockId: string, action: PageAction, fieldNames: string[] = []) =>
    onAction?.(
      blockId,
      action,
      fieldNames.filter((n) => (data[n] ?? "").length > 0)
    );

  const blocks = (
    <div className="space-y-4">
      {page.blocks.length === 0 && <p className="text-sm text-gray-400">This page has no content yet.</p>}
      {page.blocks.map((block, i) => (
        <BlockView key={block.id} block={block} first={i === 0} theme={theme} data={data} setField={setField} activate={activate} />
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-100 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-gray-600 ring-1 ring-gray-200">
          <Lock className="h-3 w-3 shrink-0 text-gray-400" />
          <span className="truncate" title={page.displayUrl}>
            {page.displayUrl}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-800">
        <FlaskConical className="h-3.5 w-3.5" /> Training sandbox. Nothing here is real, and nothing you type is saved.
      </div>

      <div style={FONT}>
        <Layout kind={page.kind} theme={theme} title={page.title}>
          {blocks}
        </Layout>
      </div>
    </div>
  );
}

// ── Layouts, one per kind of page ───────────────────────────────────────────

function BrandMark({ theme, size = 28 }: { theme: Theme; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center justify-center rounded-md font-bold text-white" style={{ width: size, height: size, background: theme.accent, fontSize: size * 0.55 }}>
        {theme.brand[0]?.toUpperCase()}
      </span>
      <span className="font-semibold" style={{ color: INK, fontSize: size * 0.6 }}>
        {theme.brand}
      </span>
    </span>
  );
}

function Footer({ theme }: { theme: Theme }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs" style={{ color: MUTED }}>
      <span>Help</span>
      <span>Privacy</span>
      <span>Terms</span>
      <span>© {new Date().getFullYear()} {theme.brand}</span>
    </div>
  );
}

function Layout({ kind, theme, title, children }: { kind: PageContent["kind"]; theme: Theme; title: string; children: ReactNode }) {
  if (kind === "portal") {
    return (
      <div style={{ background: "#f8f9fa" }}>
        <div className="flex items-center justify-between border-b bg-white px-5 py-3" style={{ borderColor: LINE }}>
          <BrandMark theme={theme} />
          <nav className="hidden items-center gap-5 text-sm sm:flex" style={{ color: MUTED }} aria-hidden>
            <span style={{ color: theme.accent, fontWeight: 500 }}>Home</span>
            <span>Directory</span>
            <span>Benefits</span>
            <span>Help</span>
          </nav>
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white" style={{ background: "#5f6368" }} aria-hidden>
            ME
          </span>
        </div>
        <div className="mx-auto max-w-2xl px-5 py-8">
          <p className="mb-3 text-xs" style={{ color: MUTED }}>
            Home › {title}
          </p>
          <div className="rounded-lg border bg-white p-6" style={{ borderColor: LINE }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (kind === "download") {
    // A document opened in a word processor's "protected view"
    return (
      <div style={{ background: "#e1e3e6" }}>
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-white" style={{ background: "#185abd" }}>
          <FileText className="h-4 w-4" /> {title} · Protected View
        </div>
        <div className="border-b px-4 py-2 text-xs" style={{ background: "#fff4ce", borderColor: "#e5d08f", color: INK }}>
          <strong>PROTECTED VIEW</strong>{" "}Be careful: files from the Internet can contain viruses. Unless you need to edit, it&apos;s safer to stay in Protected View.
        </div>
        <div className="relative mx-auto my-6 max-w-xl overflow-hidden bg-white px-10 py-10 shadow" style={{ minHeight: 320 }}>
          <div className="space-y-3 opacity-40 blur-[2px]" aria-hidden>
            {[90, 100, 82, 96, 70, 100, 88, 60].map((w, i) => (
              <div key={i} className="h-2.5 rounded bg-gray-300" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-lg" style={{ borderColor: LINE }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "document_share") {
    return (
      <div style={{ background: "#f8f9fa" }}>
        <div className="flex items-center justify-between border-b bg-white px-5 py-3" style={{ borderColor: LINE }}>
          <BrandMark theme={theme} />
          <span className="text-sm" style={{ color: theme.accent, fontWeight: 500 }}>
            Sign in
          </span>
        </div>
        <div className="mx-auto max-w-md px-5 py-8">
          <div className="rounded-xl border bg-white p-8" style={{ borderColor: LINE }}>
            <div className="mb-5 flex justify-center" aria-hidden>
              <span className="flex h-14 w-11 flex-col justify-end gap-1 rounded-sm border p-1.5" style={{ borderColor: theme.accent, background: `${theme.accent}14` }}>
                {[100, 80, 90].map((w, i) => (
                  <span key={i} className="block h-1 rounded" style={{ width: `${w}%`, background: theme.accent, opacity: 0.55 }} />
                ))}
              </span>
            </div>
            {children}
          </div>
          <Footer theme={theme} />
        </div>
      </div>
    );
  }

  // Sign-in, verification code, payment and anything else: a centred card on a soft background
  return (
    <div style={{ background: "#f1f3f4" }}>
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="rounded-xl border bg-white p-8" style={{ borderColor: LINE }}>
          <div className="mb-5 flex flex-col items-center gap-3">
            <BrandMark theme={theme} size={32} />
            {kind === "mfa" && (
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${theme.accent}18`, color: theme.accent }} aria-hidden>
                <ShieldCheck className="h-6 w-6" />
              </span>
            )}
            {kind === "payment" && (
              <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: MUTED }} aria-hidden>
                <CreditCard className="h-4 w-4" /> Secure payment <Lock className="h-3 w-3" />
              </span>
            )}
          </div>
          {children}
        </div>
        <Footer theme={theme} />
      </div>
    </div>
  );
}

// ── Blocks ───────────────────────────────────────────────────────────────────

function BlockView({
  block,
  first,
  theme,
  data,
  setField,
  activate,
}: {
  block: PageBlock;
  first: boolean;
  theme: Theme;
  data: Record<string, string>;
  setField: (name: string, value: string) => void;
  activate: (blockId: string, action: PageAction, fieldNames?: string[]) => void;
}) {
  const primary: CSSProperties = { background: theme.accent };
  const button = "w-full cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-95";

  switch (block.type) {
    case "heading": {
      const size = { 1: "text-[22px]", 2: "text-lg", 3: "text-base" }[block.level];
      return (
        <p className={`${size} ${first ? "text-center" : ""} leading-snug font-normal`} style={{ color: INK }}>
          {block.text}
        </p>
      );
    }
    case "text":
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: MUTED }}>
          {block.text}
        </p>
      );
    case "image":
      return block.assetRef.startsWith("data:image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.assetRef} alt={block.alt} className="max-h-40 rounded-md" />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">{block.alt}</div>
      );
    case "button":
      return (
        <button className={button} style={primary} onClick={() => activate(block.id, block.action)}>
          {block.label}
        </button>
      );
    case "link":
      return (
        <a
          href="#"
          title={block.displayHref}
          className="inline-block text-sm font-medium hover:underline"
          style={{ color: theme.accent }}
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
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            activate(block.id, block.submit.action, block.fields.map((f) => f.name));
          }}
        >
          {block.fields.map((field) => (
            <label key={field.name} className="block text-xs font-medium" style={{ color: MUTED }}>
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
                className="mt-1 block w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{ borderColor: "#80868b", color: INK, ["--tw-ring-color" as string]: `${theme.accent}55` }}
              />
            </label>
          ))}
          <button type="submit" className={button} style={primary}>
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
