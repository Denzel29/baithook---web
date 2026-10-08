"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, CornerUpLeft, CornerUpRight, Printer, SquareArrowOutUpRight, Star } from "lucide-react";
import type { EmailContent } from "@/types/campaigns";

type ViewableEmail = Pick<EmailContent, "senderName" | "senderAddress" | "subject" | "greeting" | "body" | "cta" | "links" | "attachments">;

// Gmail's own palette and type, so the sandbox inbox feels like the real thing
const INK = "#202124";
const MUTED = "#5f6368";
const LINE = "#dadce0";
const LINK = "#1155cc";
const GMAIL_FONT: CSSProperties = { fontFamily: 'Roboto, "Segoe UI", Arial, sans-serif' };

// The same number every time for the same text, so an email always has the same
// sender colour and send time
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const AVATAR_COLORS = ["#1a73e8", "#d93025", "#188038", "#e37400", "#a142f4", "#12b5cb", "#e8710a", "#c5221f", "#0b8043", "#7627bb"];
const avatarColor = (name: string) => AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];

// A believable send time for an email: earlier today, or yesterday if that time has not happened yet
export function emailTime(seed: string, now = new Date()) {
  const h = hash(seed);
  const sent = new Date(now);
  sent.setHours(7 + (h % 10), (h >> 4) % 60, 0, 0);
  if (sent.getTime() > now.getTime()) sent.setDate(sent.getDate() - 1);

  const minutes = Math.round((now.getTime() - sent.getTime()) / 60000);
  const ago = minutes < 60 ? `${Math.max(minutes, 1)} minutes ago` : minutes < 1440 ? `${Math.round(minutes / 60)} hours ago` : `${Math.round(minutes / 1440)} day ago`;
  const clock = sent.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sameDay = sent.toDateString() === now.toDateString();
  return {
    list: sameDay ? clock : sent.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    full: `${sent.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${clock} (${ago})`,
  };
}

// First words of the body, as shown after the subject in Gmail's inbox list
export const snippetOf = (body: string, length = 70) => body.replace(/\s+/g, " ").trim().slice(0, length);

export function SenderAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.45 }}
      aria-hidden
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

const ATTACHMENT_STYLES: Record<string, { bg: string; label: string }> = {
  pdf: { bg: "#d93025", label: "PDF" },
  doc: { bg: "#1a73e8", label: "W" },
  docx: { bg: "#1a73e8", label: "W" },
  docm: { bg: "#1a73e8", label: "W" },
  xls: { bg: "#188038", label: "X" },
  xlsx: { bg: "#188038", label: "X" },
  xlsm: { bg: "#188038", label: "X" },
  zip: { bg: "#5f6368", label: "ZIP" },
  iso: { bg: "#5f6368", label: "ISO" },
  html: { bg: "#e8710a", label: "HTML" },
  htm: { bg: "#e8710a", label: "HTML" },
};

// An email as it appears when opened in Gmail. Hovering a link shows its address in
// the corner, as Chrome does; clicking opens the sandbox page behind it (when the
// caller supplies onOpenPage). The sender's address is always shown so it can be inspected.
export function EmailView({
  email,
  onOpenPage,
  highlights = [],
  seed,
  fill,
}: {
  email: ViewableEmail;
  onOpenPage?: (pageKey: string, kind: "link" | "attachment") => void;
  highlights?: string[]; // exact phrases to mark in the greeting and body (the debrief's red flags)
  seed?: string; // keeps the send time and colour stable for a given email
  fill?: (text: string) => string; // authoring previews fill merge fields with a sample name
}) {
  const f = fill ?? ((t: string) => t);
  const [hover, setHover] = useState<string | null>(null);
  const time = emailTime(seed ?? `${email.senderAddress}${email.subject}`);

  const open = (e: React.MouseEvent, pageKey: string, kind: "link" | "attachment") => {
    e.preventDefault();
    onOpenPage?.(pageKey, kind);
  };

  return (
    <article className="relative overflow-hidden rounded-lg border bg-white" style={{ ...GMAIL_FONT, borderColor: LINE, color: INK }}>
      {/* Subject row */}
      <header className="flex items-start justify-between gap-3 px-6 pt-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-[22px] leading-7 font-normal" style={{ color: INK }}>
            {f(email.subject) || "(no subject)"}
          </h3>
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs" style={{ background: "#e8eaed", color: MUTED }}>
            Inbox <span className="ml-1.5 text-[10px]">✕</span>
          </span>
        </div>
        <div className="flex shrink-0 gap-3 pt-1" style={{ color: MUTED }} aria-hidden>
          <Printer className="h-[18px] w-[18px]" />
          <SquareArrowOutUpRight className="h-[18px] w-[18px]" />
        </div>
      </header>

      {/* Sender row */}
      <div className="flex items-start gap-3 px-6 pt-4">
        <SenderAvatar name={email.senderName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="min-w-0 truncate text-sm">
              <span className="font-bold" style={{ color: INK }}>
                {email.senderName || "Unknown sender"}
              </span>{" "}
              <span className="text-xs" style={{ color: MUTED }}>
                &lt;{email.senderAddress || "unknown@sender.example"}&gt;
              </span>
            </p>
            <p className="flex shrink-0 items-center gap-3 text-xs" style={{ color: MUTED }}>
              {time.full}
              <Star className="h-[18px] w-[18px]" aria-hidden />
            </p>
          </div>
          <p className="flex items-center gap-0.5 text-xs" style={{ color: MUTED }}>
            to me <ChevronDown className="h-4 w-4" aria-hidden />
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 px-6 pt-5 pb-2 pl-[4.75rem] text-sm leading-[1.6]" style={{ color: INK }}>
        {email.greeting && <p>{marked(f(email.greeting), highlights)}</p>}
        <p className="whitespace-pre-wrap">{marked(f(email.body), highlights)}</p>

        {email.cta && (
          <p>
            <a
              href="#"
              onClick={(e) => open(e, email.cta!.pageKey, "link")}
              onMouseEnter={() => setHover(email.cta!.displayHref)}
              onMouseLeave={() => setHover(null)}
              className="inline-block rounded px-6 py-2.5 text-sm font-medium text-white no-underline"
              style={{ background: "#1a73e8" }}
            >
              {f(email.cta.text)}
            </a>
          </p>
        )}

        {email.links.length > 0 && (
          <ul className="space-y-1">
            {email.links.map((link, i) => (
              <li key={i}>
                <a
                  href="#"
                  onClick={(e) => open(e, link.pageKey, "link")}
                  onMouseEnter={() => setHover(link.displayHref)}
                  onMouseLeave={() => setHover(null)}
                  className="underline"
                  style={{ color: LINK }}
                >
                  {f(link.text)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Attachments, as Gmail lays them out */}
      {email.attachments.length > 0 && (
        <div className="mx-6 mt-4 mb-2 ml-[4.75rem] border-t pt-3" style={{ borderColor: LINE }}>
          <p className="mb-2 text-xs" style={{ color: MUTED }}>
            {email.attachments.length} attachment{email.attachments.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-3">
            {email.attachments.map((a, i) => {
              const extension = a.filename.toLowerCase().split(".").pop() ?? "";
              const style = ATTACHMENT_STYLES[extension] ?? { bg: "#5f6368", label: extension.slice(0, 4).toUpperCase() || "FILE" };
              return (
                <button
                  key={i}
                  onClick={(e) => open(e, a.pageKey, "attachment")}
                  onMouseEnter={() => setHover(a.filename)}
                  onMouseLeave={() => setHover(null)}
                  className="w-44 cursor-pointer overflow-hidden rounded-lg border text-left transition hover:shadow-md"
                  style={{ borderColor: LINE }}
                >
                  <span className="flex h-24 items-center justify-center" style={{ background: "#f1f3f4" }}>
                    <span className="flex h-11 w-9 items-center justify-center rounded-sm text-[11px] font-bold text-white" style={{ background: style.bg }}>
                      {style.label}
                    </span>
                  </span>
                  <span className="block border-t px-3 py-2" style={{ borderColor: LINE }}>
                    <span className="block truncate text-xs font-medium" style={{ color: INK }}>
                      {a.filename}
                    </span>
                    <span className="block text-[11px]" style={{ color: MUTED }}>
                      {a.sizeKb} K
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reply and forward: part of the picture, but nothing is sent from the sandbox */}
      <div className="flex gap-3 px-6 pt-4 pb-6 pl-[4.75rem]">
        {[
          { label: "Reply", icon: <CornerUpLeft className="h-[18px] w-[18px]" /> },
          { label: "Forward", icon: <CornerUpRight className="h-[18px] w-[18px]" /> },
        ].map(({ label, icon }) => (
          <Pill key={label} icon={icon} label={label} />
        ))}
      </div>

      {/* Chrome's link preview, bottom-left */}
      {hover && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 max-w-[85%] truncate rounded-tr border-t border-r px-2 py-1 text-xs"
          style={{ background: "#f1f3f4", borderColor: "#c4c7c5", color: INK }}
        >
          {hover}
        </div>
      )}
    </article>
  );
}

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      className="inline-flex cursor-default items-center gap-2 rounded-full border px-5 py-2 text-sm"
      style={{ borderColor: "#747775", color: MUTED }}
      title="Replying isn't available in the sandbox"
    >
      {icon} {label}
    </span>
  );
}

// Wraps each highlighted phrase in <mark>, leaving the rest of the text alone
function marked(text: string, phrases: string[]): React.ReactNode {
  const wanted = phrases.filter((p) => p && text.includes(p));
  if (wanted.length === 0) return text;
  const escape = (p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${wanted.map(escape).join("|")})`, "g");
  return text.split(pattern).map((part, i) =>
    wanted.includes(part) ? (
      <mark key={i} className="rounded bg-amber-200 px-0.5 text-gray-900">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
