"use client";

import { ReactNode } from "react";
import { FolderTree, GraduationCap, LayoutDashboard, Megaphone, Settings, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { getDashboardRoute } from "@/providers/auth-provider";
import type { AuthUser } from "@/types/shared";

export * from "@/components/dashboard/ui";

const isCompanyAdmin = (user: AuthUser) => getDashboardRoute(user) === "/dashboard/company";

const NAV = [
  { href: "/dashboard/company", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/company/team", label: "Team", icon: Users },
  { href: "/dashboard/company/departments", label: "Departments", icon: FolderTree },
  { href: "/dashboard/company/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/company/settings", label: "Settings", icon: Settings },
  // Admins are employees too and take their own training
  { href: "/dashboard", label: "My training", icon: GraduationCap },
];

export function CompanyShell(props: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <AppShell
      homeHref="/dashboard/company"
      tag="Company"
      roleLabel="Company admin"
      nav={NAV}
      canAccess={isCompanyAdmin}
      redirectTo={getDashboardRoute}
      {...props}
    />
  );
}
