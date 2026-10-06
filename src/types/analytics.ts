// Analytics API response types — mirrors the server's analytics.types.ts and
// analytics.service.ts return shapes.

export interface AnalyticsSummary {
	totalUsers: number;
	activeUsers: number;
	newRegistrations: number;
	uniqueVisitors: number;
	totalPageViews: number;
	eventsByCategory: Record<string, number>;
	topActions: Array<{ action: string; count: number }>;
}

export interface AnalyticsSummaryFilter {
	from?: string; // ISO date string
	to?: string;
}

export interface AnalyticsEvent {
	id: string;
	userId: string | null;
	organizationId: string | null;
	category: string;
	action: string;
	resourceType: string | null;
	resourceId: string | null;
	metadata: Record<string, unknown> | null;
	ipAddress: string | null;
	userAgent: string | null;
	sessionFingerprint: string | null;
	occurredAt: string;
	createdAt: string;
}

export interface AuditLogResponse {
	data: AnalyticsEvent[];
	total: number;
}

export interface VisitorStats {
	totalVisitors: number;
	totalPageViews: number;
	dailyStats: Record<string, { unique: number; returning: number; total: number }>;
}

export interface CampaignAnalytics {
	totalEvents: number;
	actionCounts: Record<string, number>;
	perCampaign: Record<string, Record<string, number>>;
	events?: AnalyticsEvent[];
}
