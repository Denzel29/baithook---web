import { apiRequest } from './api';

export enum ANALYTICS_EVENT_CATEGORY {
	AUTH = 'auth',
	PAGE_VIEW = 'page_view',
	CAMPAIGN = 'campaign',
	SCENARIO = 'scenario',
	SANDBOX = 'sandbox',
	USER_MGMT = 'user_mgmt',
	ORGANIZATION = 'organization',
	SYSTEM = 'system'
}

export interface ClientTrackingPayload {
	category: ANALYTICS_EVENT_CATEGORY | string;
	action: string;
	resourceType?: string;
	resourceId?: string;
	metadata?: Record<string, unknown>;
}

export const Analytics = {
	/**
	 * Send an analytics event to the backend.
	 * Requires the user to be authenticated since the backend endpoint uses isAuthenticated.
	 */
	track: async (payload: ClientTrackingPayload, token?: string) => {
		try {
			await apiRequest('/analytics/track', {
				method: 'POST',
				body: payload,
				token
			});
		} catch (error) {
			// Fail silently on the frontend so analytics tracking never breaks the user experience
			console.warn('Analytics tracking failed', error);
		}
	},

	/**
	 * Convenience method for tracking a page view.
	 */
	trackPageView: (path: string, token?: string) => {
		return Analytics.track(
			{
				category: ANALYTICS_EVENT_CATEGORY.PAGE_VIEW,
				action: 'page_visited',
				resourceType: 'frontend_route',
				metadata: { path }
			},
			token
		);
	}
};
