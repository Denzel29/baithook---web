"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import type { EmailContent } from "@/types/campaigns";

type ViewableEmail = Pick<EmailContent, "senderName" | "senderAddress" | "subject" | "greeting" | "body" | "cta" | "links" | "attachments">;

// An email as it appears in the sandbox inbox. Hovering a link shows its
// address in a status bar, like a real mail client; clicking opens the
// sandbox page behind it (when the caller supplies onOpenPage).
export function EmailView({ email, onOpenPage }: { email: ViewableEmail; onOpenPage?: (pageKey: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);

  const open = (e: React.MouseEvent, pageKey: string) => {
    e.preventDefault();
    onOpenPage?.(pageKey);
  };

  return (
    <article className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-lg font-semibold text-gray-900">{email.subject || "(No subject)"}</h3>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-[#2016a9]">
            {(email.senderName[0] ?? "?").toUpperCase()}
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-gray-900">{email.senderName || "Unknown sender"}</p>
            <p className="truncate text-gray-500">&lt;{email.senderAddress || "unknown@sender.example"}&gt;</p>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-5 py-5 text-sm leading-relaxed text-gray-800">
        {email.greeting && <p>{email.greeting}</p>}
        <p className="whitespace-pre-wrap">{email.body}</p>

        {email.cta && (
          <a
            href="#"
            onClick={(e) => open(e, email.cta!.pageKey)}
            onMouseEnter={() => setHover(email.cta!.displayHref)}
            onMouseLeave={() => setHover(null)}
            className="inline-block rounded-lg bg-[#2016a9] px-4 py-2 font-semibold text-white"
          >
            {email.cta.text}
          </a>
        )}

        {email.links.length > 0 && (
          <ul className="space-y-1">
            {email.links.map((link, i) => (
              <li key={i}>
                <a
                  href="#"
                  onClick={(e) => open(e, link.pageKey)}
                  onMouseEnter={() => setHover(link.displayHref)}
                  onMouseLeave={() => setHover(null)}
                  className="text-[#2016a9] underline"
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        )}

        {email.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {email.attachments.map((a, i) => (
              <button
                key={i}
                onClick={(e) => open(e, a.pageKey)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {a.filename}
                <span className="text-gray-400">{a.sizeKb} KB</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {hover && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate border-t border-gray-300 bg-gray-100 px-3 py-1 text-xs text-gray-600">{hover}</div>
      )}
    </article>
  );
}
