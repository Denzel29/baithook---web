"use client";

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Target, BookOpen, BarChart3, Play, LogOut, Menu, X } from "lucide-react";

export default function UserDashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">My Dashboard</h1>
              <p className="text-xs text-gray-500">Security Awareness Training</p>
            </div>
          </div>
          {/* Desktop User Menu */}
          <div className="hidden items-center gap-4 md:flex">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 md:hidden">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}</h2>
          <p className="mt-1 text-gray-500">Practice identifying phishing attacks and track your progress.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashCard
            icon={<Play className="h-6 w-6 text-blue-600" />}
            title="My Campaigns"
            description="View and participate in assigned simulations."
            stat="—"
            statLabel="Active campaigns"
            color="blue"
          />
          <DashCard
            icon={<Target className="h-6 w-6 text-orange-600" />}
            title="Sandbox"
            description="Practice phishing detection in a safe environment."
            stat=""
            statLabel=""
            color="orange"
          />
          <DashCard
            icon={<BarChart3 className="h-6 w-6 text-green-600" />}
            title="My Reports"
            description="Track your training progress and scores."
            stat="—"
            statLabel="Training sessions"
            color="green"
          />
        </div>
      </div>
    </main>
  );
}

function DashCard({
  icon,
  title,
  description,
  stat,
  statLabel,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-50",
    orange: "bg-orange-50",
    green: "bg-green-50",
  };

  return (
    <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2 ${bgMap[color] ?? "bg-gray-100"}`}>
          {icon}
        </div>
        {stat && (
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{stat}</p>
            <p className="text-xs text-gray-500">{statLabel}</p>
          </div>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}
