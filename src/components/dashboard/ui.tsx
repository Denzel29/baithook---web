"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { Building2, Loader2, X } from "lucide-react";

// Dashboards share the landing page's look: indigo brand colour, rounded-xl
// cards with a light border, gray type.
export const BRAND = "#2016a9";

// ── Building blocks shared by the dashboard pages ────────────────────────────────

export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean; // no body padding, for tables that run edge to edge
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={flush ? "" : "p-6"}>{children}</div>
    </section>
  );
}

const BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  unverified: "bg-gray-50 text-gray-600 ring-gray-500/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  revoked: "bg-gray-50 text-gray-500 ring-gray-500/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  expired: "bg-gray-50 text-gray-500 ring-gray-500/20",
  pending_setup: "bg-indigo-50 text-[#2016a9] ring-indigo-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  suspended: "bg-red-50 text-red-700 ring-red-600/20",
};

const BADGE_LABELS: Record<string, string> = {
  pending: "Awaiting review",
  pending_setup: "Setting up",
};

// `label` overrides the default wording, e.g. "pending" means different things
// for a company request and for an invitation
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        BADGE_STYLES[status] ?? "bg-gray-50 text-gray-600 ring-gray-500/20"
      }`}
    >
      {label ?? BADGE_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-gray-900">{children ?? <span className="font-normal text-gray-400">—</span>}</dd>
    </div>
  );
}

// Segmented control, same treatment as the Login / Sign Up switch on the home page
export function FilterTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition ${
            value === o.value
              ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200"
              : "font-medium text-gray-600 hover:text-gray-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: typeof Building2; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
        <Icon className="h-6 w-6 text-[#2016a9]" />
      </span>
      <p className="mt-4 font-semibold text-gray-900">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-gray-500">{children}</p>}
    </div>
  );
}

export const Spinner = ({ className = "" }: { className?: string }) => (
  <Loader2 className={`mx-auto h-6 w-6 animate-spin text-[#2016a9] ${className}`} />
);

export const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#2016a9] focus:ring-2 focus:ring-[#2016a9]/15 disabled:cursor-not-allowed disabled:opacity-50";

export const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

const buttonBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${buttonBase} bg-[#2016a9] text-white shadow-sm hover:bg-[#1a1290]`;
export const dangerButton = `${buttonBase} bg-red-600 text-white shadow-sm hover:bg-red-700`;
export const secondaryButton = `${buttonBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// Centred modal: a rounded panel with a brand accent bar, an optional icon chip, a soft blurred
// backdrop and a short entrance animation. Closes on Escape or a click on the backdrop. The panel is
// capped to the screen height and its body scrolls, so tall forms never run off the screen.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean | "xl"; // true: roomy form, "xl": the widest, for dense forms
  icon?: ReactNode; // shown in a tinted chip beside the title
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-[dialog-fade_160ms_ease-out] items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[calc(100dvh-2rem)] w-full animate-[dialog-pop_220ms_cubic-bezier(0.2,0.8,0.2,1)] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_90px_-20px_rgba(20,16,100,0.45)] ring-1 ring-black/5 ${
          wide === "xl" ? "max-w-4xl" : wide ? "max-w-2xl" : "max-w-lg"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 shrink-0 bg-gradient-to-r from-[#2016a9] via-indigo-500 to-sky-400" />
        <div className="flex shrink-0 items-start justify-between gap-4 px-7 pt-6 pb-3">
          <div className="flex min-w-0 items-start gap-4">
            {icon && (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#2016a9] ring-1 ring-indigo-100 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
            )}
            <div className="min-w-0">
              <h2 className="text-xl leading-7 font-semibold tracking-tight text-gray-900">{title}</h2>
              {description && <p className="mt-1 text-sm leading-relaxed text-gray-500">{description}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="-mt-1 -mr-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[#2016a9]/30 focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-7 pt-2 pb-7">{children}</div>
      </div>
    </div>
  );
}

// Underlined page tabs that live in the URL (?tab=...)
export function PageTabs({ tabs }: { tabs: { href: string; label: string; active: boolean; count?: number }[] }) {
  return (
    <nav className="flex border-b border-gray-200">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            t.active ? "border-[#2016a9] text-[#2016a9]" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {t.label}
          {!!t.count && (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-gray-600">{t.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
