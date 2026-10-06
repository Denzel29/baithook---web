"use client";

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
	BarChart3,
	Users,
	Eye,
	UserPlus,
	Activity,
	TrendingUp,
	Clock,
	Globe,
	ArrowLeft,
	RefreshCw,
	CalendarDays,
} from "lucide-react";
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	Legend,
} from "recharts";
import {
	useAnalyticsSummary,
	useVisitorStats,
	useAuditLog,
} from "@/lib/hooks/use-analytics";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().split("T")[0];
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ─── Color palette ────────────────────────────────────────────────────────────

const PIE_COLORS = [
	"#405189",
	"#0ab39c",
	"#299cdb",
	"#f7b84b",
	"#f06548",
	"#8b5cf6",
	"#6366f1",
	"#ec4899",
];

const CATEGORY_LABELS: Record<string, string> = {
	auth: "Authentication",
	page_view: "Page Views",
	campaign: "Campaigns",
	scenario: "Scenarios",
	sandbox: "Sandbox",
	user_mgmt: "User Mgmt",
	organization: "Organization",
	system: "System",
};

const ACTION_LABELS: Record<string, string> = {
	login_success: "Login Success",
	login_failed: "Login Failed",
	logout: "Logout",
	registered: "Registration",
	activated: "Account Activated",
	password_reset: "Password Reset",
	page_visited: "Page Visited",
	created: "Created",
	updated: "Updated",
	deleted: "Deleted",
	viewed: "Viewed",
	launched: "Launched",
	completed: "Completed",
	archived: "Archived",
};

// ─── Preset date ranges ──────────────────────────────────────────────────────

type DateRange = "7d" | "30d" | "90d" | "all";

const DATE_RANGES: { label: string; value: DateRange }[] = [
	{ label: "Last 7 days", value: "7d" },
	{ label: "Last 30 days", value: "30d" },
	{ label: "Last 90 days", value: "90d" },
	{ label: "All time", value: "all" },
];

function getDateFrom(range: DateRange): string | undefined {
	switch (range) {
		case "7d":
			return daysAgo(7);
		case "30d":
			return daysAgo(30);
		case "90d":
			return daysAgo(90);
		default:
			return undefined;
	}
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
	const { user, token, isAuthenticated, logout } = useAuth();
	const router = useRouter();
	const [range, setRange] = useState<DateRange>("30d");

	useEffect(() => {
		if (!isAuthenticated) router.push("/login");
	}, [isAuthenticated, router]);

	const from = getDateFrom(range);
	const to = undefined; // always "up to now"

	const summary = useAnalyticsSummary(from, to);
	const visitors = useVisitorStats(from, to);
	const audit = useAuditLog(15);

	// ── Derived chart data ──────────────────────────────────────────────────

	const categoryPieData = useMemo(() => {
		if (!summary.data?.eventsByCategory) return [];
		return Object.entries(summary.data.eventsByCategory).map(
			([name, value]) => ({
				name: CATEGORY_LABELS[name] ?? name,
				value,
			})
		);
	}, [summary.data]);

	const dailyVisitorData = useMemo(() => {
		if (!visitors.data?.dailyStats) return [];
		return Object.entries(visitors.data.dailyStats)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, stats]) => ({
				date: formatDate(date),
				unique: stats.unique,
				returning: stats.returning,
				total: stats.total,
			}));
	}, [visitors.data]);

	const topActionsData = useMemo(() => {
		if (!summary.data?.topActions) return [];
		return summary.data.topActions.slice(0, 8).map((item) => ({
			action: ACTION_LABELS[item.action] ?? item.action,
			count: item.count,
		}));
	}, [summary.data]);

	if (!user || !token) return null;

	const isLoading = summary.isLoading || visitors.isLoading;

	const handleRefresh = () => {
		summary.refetch();
		visitors.refetch();
		audit.refetch();
	};

	return (
		<div className="min-h-screen bg-[#f3f3f9]">
			{/* ── Header ────────────────────────────────────────────── */}
			<header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white shadow-sm">
				<div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
					<div className="flex items-center gap-4">
						<button
							onClick={() => router.push("/dashboard/platform")}
							className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
						>
							<ArrowLeft className="h-4 w-4" />
							<span className="hidden sm:inline">Dashboard</span>
						</button>
						<div className="h-5 w-px bg-slate-200" />
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#405189]">
								<BarChart3 className="h-4 w-4 text-white" />
							</div>
							<h1 className="text-base font-semibold text-slate-800">
								Analytics
							</h1>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{/* Date Range Selector */}
						<div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
							{DATE_RANGES.map((dr) => (
								<button
									key={dr.value}
									onClick={() => setRange(dr.value)}
									className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
										range === dr.value
											? "bg-[#405189] text-white shadow-sm"
											: "text-slate-500 hover:text-slate-800"
									}`}
								>
									{dr.label}
								</button>
							))}
						</div>
						<button
							onClick={handleRefresh}
							disabled={isLoading}
							className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
						>
							<RefreshCw
								className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
							/>
							<span className="hidden sm:inline">Refresh</span>
						</button>
					</div>
				</div>
			</header>

			{/* ── Content ───────────────────────────────────────────── */}
			<main className="mx-auto mt-6 max-w-[1440px] space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
				{/* ── Page title ────────────────────────────────────── */}
				<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-lg font-semibold text-slate-800">
							Platform Analytics
						</h2>
						<p className="text-sm text-slate-500">
							{range === "all"
								? "Showing all-time data"
								: `Last ${range.replace("d", " days")} overview`}
						</p>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-slate-400">
						<CalendarDays className="h-3.5 w-3.5" />
						{from ? `${formatDate(from)} – Today` : "All time"}
					</div>
				</div>

				{/* ── KPI Cards ─────────────────────────────────────── */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<KpiCard
						icon={<Users className="h-5 w-5 text-[#0ab39c]" />}
						iconBg="bg-[#daf5f0]"
						label="ACTIVE USERS"
						value={summary.data?.activeUsers}
						isLoading={summary.isLoading}
					/>
					<KpiCard
						icon={<Globe className="h-5 w-5 text-[#299cdb]" />}
						iconBg="bg-[#e2f6f8]"
						label="UNIQUE VISITORS"
						value={summary.data?.uniqueVisitors}
						isLoading={summary.isLoading}
					/>
					<KpiCard
						icon={<Eye className="h-5 w-5 text-[#405189]" />}
						iconBg="bg-[#e8e6f1]"
						label="PAGE VIEWS"
						value={summary.data?.totalPageViews}
						isLoading={summary.isLoading}
					/>
					<KpiCard
						icon={<UserPlus className="h-5 w-5 text-[#f7b84b]" />}
						iconBg="bg-[#fef4e4]"
						label="NEW REGISTRATIONS"
						value={summary.data?.newRegistrations}
						isLoading={summary.isLoading}
					/>
				</div>

				{/* ── Row 2: Visitors chart + Category breakdown ──── */}
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
					{/* Visitor traffic area chart */}
					<div className="col-span-1 rounded-lg border border-slate-200/60 bg-white p-5 shadow-sm lg:col-span-2">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold text-slate-700">
									Visitor Traffic
								</h3>
								<p className="text-xs text-slate-400">
									Daily unique &amp; returning visitors
								</p>
							</div>
							<div className="flex items-center gap-4 text-xs text-slate-500">
								<span className="flex items-center gap-1.5">
									<span className="inline-block h-2.5 w-2.5 rounded-full bg-[#405189]" />
									Unique
								</span>
								<span className="flex items-center gap-1.5">
									<span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0ab39c]" />
									Returning
								</span>
							</div>
						</div>
						{visitors.isLoading ? (
							<ChartSkeleton height={280} />
						) : dailyVisitorData.length === 0 ? (
							<EmptyChart
								height={280}
								message="No visitor data for this period"
							/>
						) : (
							<ResponsiveContainer width="100%" height={280}>
								<AreaChart data={dailyVisitorData}>
									<defs>
										<linearGradient
											id="uniqueGrad"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="#405189"
												stopOpacity={0.2}
											/>
											<stop
												offset="95%"
												stopColor="#405189"
												stopOpacity={0}
											/>
										</linearGradient>
										<linearGradient
											id="returningGrad"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="#0ab39c"
												stopOpacity={0.2}
											/>
											<stop
												offset="95%"
												stopColor="#0ab39c"
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="#e2e8f0"
										vertical={false}
									/>
									<XAxis
										dataKey="date"
										tick={{ fontSize: 11, fill: "#94a3b8" }}
										axisLine={false}
										tickLine={false}
									/>
									<YAxis
										tick={{ fontSize: 11, fill: "#94a3b8" }}
										axisLine={false}
										tickLine={false}
										width={32}
									/>
									<Tooltip
										contentStyle={{
											borderRadius: 8,
											border: "none",
											boxShadow:
												"0 4px 6px -1px rgb(0 0 0 / 0.08)",
											fontSize: 12,
										}}
									/>
									<Area
										type="monotone"
										dataKey="unique"
										stroke="#405189"
										strokeWidth={2}
										fill="url(#uniqueGrad)"
										dot={false}
										activeDot={{ r: 4, strokeWidth: 0 }}
									/>
									<Area
										type="monotone"
										dataKey="returning"
										stroke="#0ab39c"
										strokeWidth={2}
										fill="url(#returningGrad)"
										dot={false}
										activeDot={{ r: 4, strokeWidth: 0 }}
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</div>

					{/* Category breakdown pie chart */}
					<div className="rounded-lg border border-slate-200/60 bg-white p-5 shadow-sm">
						<h3 className="mb-1 text-sm font-semibold text-slate-700">
							Events by Category
						</h3>
						<p className="mb-4 text-xs text-slate-400">
							Distribution of tracked events
						</p>
						{summary.isLoading ? (
							<ChartSkeleton height={260} />
						) : categoryPieData.length === 0 ? (
							<EmptyChart height={260} message="No events recorded" />
						) : (
							<ResponsiveContainer width="100%" height={260}>
								<PieChart>
									<Pie
										data={categoryPieData}
										cx="50%"
										cy="45%"
										innerRadius={50}
										outerRadius={80}
										paddingAngle={3}
										dataKey="value"
										stroke="none"
									>
										{categoryPieData.map((_, idx) => (
											<Cell
												key={idx}
												fill={PIE_COLORS[idx % PIE_COLORS.length]}
											/>
										))}
									</Pie>
									<Tooltip
										contentStyle={{
											borderRadius: 8,
											border: "none",
											boxShadow:
												"0 4px 6px -1px rgb(0 0 0 / 0.08)",
											fontSize: 12,
										}}
									/>
									<Legend
										iconType="circle"
										iconSize={8}
										wrapperStyle={{ fontSize: 11 }}
									/>
								</PieChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>

				{/* ── Row 3: Top Actions bar chart + Audit Log ──── */}
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
					{/* Top actions horizontal bar chart */}
					<div className="rounded-lg border border-slate-200/60 bg-white p-5 shadow-sm">
						<div className="mb-4">
							<h3 className="text-sm font-semibold text-slate-700">
								Top Actions
							</h3>
							<p className="text-xs text-slate-400">
								Most frequent events in this period
							</p>
						</div>
						{summary.isLoading ? (
							<ChartSkeleton height={300} />
						) : topActionsData.length === 0 ? (
							<EmptyChart
								height={300}
								message="No actions recorded yet"
							/>
						) : (
							<ResponsiveContainer width="100%" height={300}>
								<BarChart
									data={topActionsData}
									layout="vertical"
									margin={{ left: 10, right: 20 }}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="#e2e8f0"
										horizontal={false}
									/>
									<XAxis
										type="number"
										tick={{ fontSize: 11, fill: "#94a3b8" }}
										axisLine={false}
										tickLine={false}
									/>
									<YAxis
										type="category"
										dataKey="action"
										tick={{ fontSize: 11, fill: "#64748b" }}
										width={120}
										axisLine={false}
										tickLine={false}
									/>
									<Tooltip
										contentStyle={{
											borderRadius: 8,
											border: "none",
											boxShadow:
												"0 4px 6px -1px rgb(0 0 0 / 0.08)",
											fontSize: 12,
										}}
									/>
									<Bar
										dataKey="count"
										fill="#405189"
										radius={[0, 4, 4, 0]}
										barSize={20}
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>

					{/* Recent audit log */}
					<div className="rounded-lg border border-slate-200/60 bg-white p-5 shadow-sm">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold text-slate-700">
									Recent Activity
								</h3>
								<p className="text-xs text-slate-400">
									Latest platform events
								</p>
							</div>
							{audit.data && (
								<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
									{audit.data.total.toLocaleString()} total
								</span>
							)}
						</div>
						{audit.isLoading ? (
							<div className="space-y-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<div
										key={i}
										className="flex animate-pulse items-start gap-3"
									>
										<div className="h-8 w-8 rounded-full bg-slate-100" />
										<div className="flex-1 space-y-1.5">
											<div className="h-3 w-3/4 rounded bg-slate-100" />
											<div className="h-2.5 w-1/2 rounded bg-slate-50" />
										</div>
									</div>
								))}
							</div>
						) : !audit.data?.data.length ? (
							<div className="flex h-[300px] items-center justify-center">
								<p className="text-sm text-slate-400">
									No activity recorded yet
								</p>
							</div>
						) : (
							<div className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
								{audit.data.data.map((event) => (
									<AuditLogItem key={event.id} event={event} />
								))}
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
	icon,
	iconBg,
	label,
	value,
	isLoading,
}: {
	icon: React.ReactNode;
	iconBg: string;
	label: string;
	value: number | undefined;
	isLoading: boolean;
}) {
	return (
		<div className="group flex items-center justify-between rounded-lg border border-slate-200/60 bg-white px-5 py-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
			<div>
				<p className="text-[11px] font-semibold tracking-wider text-slate-400">
					{label}
				</p>
				{isLoading ? (
					<div className="mt-2 h-7 w-16 animate-pulse rounded bg-slate-100" />
				) : (
					<p className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
						{value?.toLocaleString() ?? "—"}
					</p>
				)}
			</div>
			<div
				className={`flex h-11 w-11 items-center justify-center rounded-lg shadow-sm ${iconBg}`}
			>
				{icon}
			</div>
		</div>
	);
}

function AuditLogItem({
	event,
}: {
	event: {
		id: string;
		category: string;
		action: string;
		userId: string | null;
		resourceType: string | null;
		occurredAt: string;
		metadata: Record<string, unknown> | null;
	};
}) {
	const categoryColor: Record<string, string> = {
		auth: "bg-blue-100 text-blue-700",
		page_view: "bg-slate-100 text-slate-600",
		campaign: "bg-amber-100 text-amber-700",
		scenario: "bg-purple-100 text-purple-700",
		user_mgmt: "bg-emerald-100 text-emerald-700",
		organization: "bg-indigo-100 text-indigo-700",
		system: "bg-rose-100 text-rose-700",
		sandbox: "bg-teal-100 text-teal-700",
	};

	const actionLabel = ACTION_LABELS[event.action] ?? event.action;
	const catLabel = CATEGORY_LABELS[event.category] ?? event.category;
	const colorCls = categoryColor[event.category] ?? "bg-slate-100 text-slate-600";

	return (
		<div className="flex items-start gap-3 rounded-md px-2 py-2.5 transition hover:bg-slate-50/80">
			<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
				<Activity className="h-3.5 w-3.5 text-slate-500" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-slate-700 truncate">
						{actionLabel}
					</span>
					<span
						className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${colorCls}`}
					>
						{catLabel}
					</span>
				</div>
				<div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
					<Clock className="h-3 w-3" />
					<span>{formatDateTime(event.occurredAt)}</span>
					{event.resourceType && (
						<>
							<span className="text-slate-300">·</span>
							<span className="text-slate-500">{event.resourceType}</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function ChartSkeleton({ height }: { height: number }) {
	return (
		<div
			className="flex animate-pulse items-end justify-between gap-2 rounded-lg bg-slate-50 px-4 pb-4"
			style={{ height }}
		>
			{Array.from({ length: 12 }).map((_, i) => (
				<div
					key={i}
					className="w-full rounded-t bg-slate-200"
					style={{ height: `${30 + Math.random() * 50}%` }}
				/>
			))}
		</div>
	);
}

function EmptyChart({
	height,
	message,
}: {
	height: number;
	message: string;
}) {
	return (
		<div
			className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50"
			style={{ height }}
		>
			<TrendingUp className="mb-2 h-8 w-8 text-slate-300" />
			<p className="text-sm text-slate-400">{message}</p>
		</div>
	);
}
