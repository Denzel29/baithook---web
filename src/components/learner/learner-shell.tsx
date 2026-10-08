"use client";

import { ReactNode } from "react";
import { Building2, Compass, LayoutDashboard, ListChecks } from "lucide-react";
import { AppShell, type ShellNavItem } from "@/components/dashboard/app-shell";
import { getDashboardRoute, useAuth } from "@/providers/auth-provider";
import type { AuthUser } from "@/types/shared";

export * from "@/components/dashboard/ui";

// Everyone who takes training: personal accounts, company employees, and
// company admins (who are employees too). Platform admins don't train here.
const isLearner = (user: AuthUser) => getDashboardRoute(user) !== "/dashboard/platform";
export const isPersonalAccount = (user: AuthUser | null) => !!user && !user.organizationId;
const isCompanyAdmin = (user: AuthUser | null) => !!user && getDashboardRoute(user) === "/dashboard/company";

export function LearnerShell(props: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const { user } = useAuth();

  const nav: ShellNavItem[] = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/campaigns", label: "My campaigns", icon: ListChecks },
    // Companies assign their people's training; only personal accounts enroll themselves
    ...(isPersonalAccount(user) ? [{ href: "/dashboard/catalog", label: "Browse", icon: Compass }] : []),
    ...(isCompanyAdmin(user) ? [{ href: "/dashboard/company", label: "Company admin", icon: Building2 }] : []),
  ];

  return (
    <AppShell
      homeHref="/dashboard"
      tag="Training"
      roleLabel={isPersonalAccount(user) ? "Personal account" : "Team member"}
      nav={nav}
      canAccess={isLearner}
      redirectTo={getDashboardRoute}
      {...props}
    />
  );
}
