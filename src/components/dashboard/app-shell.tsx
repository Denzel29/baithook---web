"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import type { AuthUser } from "@/types/shared";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Header, navigation and access guard shared by every dashboard. Each role
// supplies its own nav, the label under the user's name, and who may enter
// (canAccess); anyone else is sent to their own dashboard.
export function AppShell({
  homeHref,
  tag,
  roleLabel,
  nav,
  canAccess,
  redirectTo,
  title,
  description,
  actions,
  children,
}: {
  homeHref: string;
  tag: string;
  roleLabel: string;
  nav: ShellNavItem[];
  canAccess: (user: AuthUser) => boolean;
  redirectTo: (user: AuthUser) => string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const allowed = !!user && canAccess(user);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) router.push("/login");
    else if (!allowed) router.push(redirectTo(user));
  }, [isLoading, isAuthenticated, user, allowed, redirectTo, router]);

  if (isLoading || !user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#2016a9]" />
      </div>
    );
  }

  // A single destination doesn't need a nav bar
  const showNav = nav.length > 1;
  // The most specific nav entry matching the URL wins, so "/dashboard" (My
  // training) isn't highlighted on "/dashboard/company/..." pages
  const matches = (href: string) => pathname === href || !!pathname?.startsWith(`${href}/`);
  const activeHref = nav
    .map((n) => n.href)
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  const navLink = (item: ShellNavItem, mobile = false) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMenuOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2 rounded-lg px-3 font-medium transition-colors ${mobile ? "py-2.5" : "py-2 text-sm"} ${
          active ? "bg-indigo-50 text-[#2016a9]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <Icon className="h-4 w-4" />
        {item.label}
        {!!item.badge && (
          <span className="rounded-full bg-[#2016a9] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const signOut = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href={homeHref} className="flex shrink-0 items-center gap-2">
              <Image src="/logo3.png" alt="Baitline" width={130} height={40} className="h-8 w-auto" priority />
              <span className="hidden rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 sm:inline">
                {tag}
              </span>
            </Link>
            {showNav && (
              <nav className="hidden items-center gap-1 md:flex" aria-label={tag}>
                {nav.map((item) => navLink(item))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2016a9] text-sm font-semibold text-white">
                {initials(user.name || user.email)}
              </span>
              <div className="hidden leading-tight lg:block">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
            {showNav && (
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="cursor-pointer rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                aria-label="Toggle navigation"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        {showNav && menuOpen && (
          <nav className="space-y-1 border-t border-gray-100 px-4 py-3 md:hidden" aria-label={tag}>
            {nav.map((item) => navLink(item, true))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
            {description && <div className="mt-1 text-base text-gray-500">{description}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
