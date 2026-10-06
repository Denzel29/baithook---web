"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Building2, LineChart, Loader2, LogOut, Menu, X } from "lucide-react";
import { getDashboardRoute, useAuth } from "@/providers/auth-provider";
import { useOnboardingRequests } from "@/lib/hooks/use-platform";
import { OnboardingRequestStatus } from "@/types/onboarding";

const NAV = [
  { href: "/dashboard/platform", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/platform/organizations", label: "Companies", icon: Building2, badge: true },
  { href: "/dashboard/platform/analytics", label: "Analytics", icon: LineChart },
];

// Header, navigation and Super Admin guard shared by the platform admin pages
export function PlatformShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const pending = useOnboardingRequests(OnboardingRequestStatus.PENDING);
  const pendingCount = pending.data?.total ?? 0;

  const isPlatformAdmin = user?.roleName?.toLowerCase() === "super admin";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) router.push("/login");
    else if (!isPlatformAdmin) router.push(getDashboardRoute(user));
  }, [isLoading, isAuthenticated, user, isPlatformAdmin, router]);

  if (isLoading || !user || !isPlatformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f3f9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#405189]" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/dashboard/platform" ? pathname === href : pathname?.startsWith(href);

  const navLinks = (mobile: boolean) =>
    NAV.map(({ href, label, icon: Icon, badge }) => (
      <Link
        key={href}
        href={href}
        onClick={() => setMenuOpen(false)}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
          mobile ? "py-2.5" : ""
        } ${isActive(href) ? "bg-[#405189]/10 text-[#405189]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
      >
        <Icon className="h-4 w-4" />
        {label}
        {badge && pendingCount > 0 && (
          <span className="ml-1 rounded-full bg-[#f06548] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {pendingCount}
          </span>
        )}
      </Link>
    ));

  return (
    <div className="min-h-screen bg-[#f3f3f9] pb-12">
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/platform" className="text-xl font-bold tracking-widest text-[#405189]">
              PHISHGUARD
            </Link>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm font-medium text-slate-700 md:inline">{user.email}</span>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        <div className="hidden border-t border-slate-200 bg-white lg:block">
          <nav className="mx-auto flex max-w-[1440px] space-x-1 px-4 py-3 sm:px-6 lg:px-8">{navLinks(false)}</nav>
        </div>
        {menuOpen && (
          <nav className="flex flex-col space-y-1 border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            {navLinks(true)}
          </nav>
        )}
      </header>

      <main className="mx-auto mt-6 w-full max-w-[1440px] space-y-6 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

// ── Small building blocks shared by the platform pages ───────────────────────

export function Panel({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  unverified: "bg-slate-100 text-slate-600",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-500",
  pending_setup: "bg-sky-100 text-sky-800",
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${BADGE_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-800">{children ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

export function FilterTabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 shadow-sm">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.value ? "bg-[#405189] text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#405189] focus:ring-2 focus:ring-[#405189]/20 disabled:opacity-50";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#405189] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#364574] disabled:opacity-50";

export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#f06548] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d9573c] disabled:opacity-50";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

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
