import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type {
	AnalyticsSummary,
	AuditLogResponse,
	VisitorStats,
	CampaignAnalytics,
	AnalyticsEvent,
} from "@/types/analytics";

function buildDateParams(from?: string, to?: string): string {
	const params = new URLSearchParams();
	if (from) params.set("from", from);
	if (to) params.set("to", to);
	const qs = params.toString();
	return qs ? `?${qs}` : "";
}

export function useAnalyticsSummary(from?: string, to?: string) {
	const { token } = useAuth();
	return useQuery<AnalyticsSummary>({
		queryKey: ["analytics", "summary", from, to],
		queryFn: () =>
			apiRequest<AnalyticsSummary>(
				`/analytics/summary${buildDateParams(from, to)}`,
				{ token: token! }
			),
		enabled: !!token,
		refetchInterval: 60_000, // poll every 60s
	});
}

export function useVisitorStats(from?: string, to?: string) {
	const { token } = useAuth();
	return useQuery<VisitorStats>({
		queryKey: ["analytics", "visitors", from, to],
		queryFn: () =>
			apiRequest<VisitorStats>(
				`/analytics/visitors${buildDateParams(from, to)}`,
				{ token: token! }
			),
		enabled: !!token,
		refetchInterval: 60_000,
	});
}

export function useAuditLog(limit = 20, offset = 0) {
	const { token } = useAuth();
	return useQuery<AuditLogResponse>({
		queryKey: ["analytics", "audit", limit, offset],
		queryFn: () =>
			apiRequest<AuditLogResponse>(
				`/analytics/activity?limit=${limit}&offset=${offset}`,
				{ token: token! }
			),
		enabled: !!token,
	});
}

export function useUserActivity(userId: string) {
	const { token } = useAuth();
	return useQuery<AnalyticsEvent[]>({
		queryKey: ["analytics", "user-activity", userId],
		queryFn: () =>
			apiRequest<AnalyticsEvent[]>(`/analytics/activity/${userId}`, {
				token: token!,
			}),
		enabled: !!token && !!userId,
	});
}

export function useCampaignAnalytics(campaignId?: string) {
	const { token } = useAuth();
	return useQuery<CampaignAnalytics>({
		queryKey: ["analytics", "campaigns", campaignId ?? "all"],
		queryFn: () =>
			apiRequest<CampaignAnalytics>(
				campaignId
					? `/analytics/campaigns/${campaignId}`
					: "/analytics/campaigns",
				{ token: token! }
			),
		enabled: !!token,
	});
}
