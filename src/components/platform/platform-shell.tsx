"use client";

import { ReactNode } from "react";
import { BarChart3, Building2, LineChart, Megaphone, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { getDashboardRoute, useAuth } from "@/providers/auth-provider";
import { useDomainRequests, useOnboardingRequests } from "@/lib/hooks/use-platform";
import { OnboardingRequestStatus } from "@/types/onboarding";
import type { AuthUser } from "@/types/shared";

// Building blocks live in dashboard/ui; re-exported so platform pages keep one import
export * from "@/components/dashboard/ui";

const isPlatformAdmin = (user: AuthUser) => user.roleName?.toLowerCase() === "super admin";

export function PlatformShell(props: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const { user } = useAuth();
  // Only platform admins may read the queue; skip the call for anyone being redirected
  const admin = !!user && isPlatformAdmin(user);
  const pendingCompanies = useOnboardingRequests(OnboardingRequestStatus.PENDING, admin).data?.total ?? 0;
  const pendingDomains = useDomainRequests("pending", admin).data?.length ?? 0;

  return (
    <AppShell
      homeHref="/dashboard/platform"
      tag="Admin"
      roleLabel="Platform admin"
      nav={[
        { href: "/dashboard/platform", label: "Overview", icon: BarChart3 },
        { href: "/dashboard/platform/organizations", label: "Companies", icon: Building2, badge: pendingCompanies + pendingDomains },
        { href: "/dashboard/platform/users", label: "Users", icon: Users },
        { href: "/dashboard/platform/campaigns", label: "Campaigns", icon: Megaphone },
        { href: "/dashboard/platform/analytics", label: "Analytics", icon: LineChart },
      ]}
      canAccess={isPlatformAdmin}
      redirectTo={getDashboardRoute}
      {...props}
    />
  );
}
