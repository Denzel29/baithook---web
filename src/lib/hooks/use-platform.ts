import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type {
	DomainChangeRequestReview,
	PersonalAccount,
	PersonalAccountDetail,
	Invite,
	OnboardingChecklist,
	OnboardingRequest,
	OnboardingRequestDetail,
	OnboardingRequestStatus,
	OrganizationRecord,
	OrgStatus,
	Paginated,
	PlanTier,
	PlanUsage,
} from "@/types/onboarding";

// Platform admin data: the onboarding review queue and organization management.

function query(params: Record<string, string | number | undefined>): string {
	const qs = new URLSearchParams();
	Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && qs.set(k, String(v)));
	const s = qs.toString();
	return s ? `?${s}` : "";
}

// ── Onboarding requests ──────────────────────────────────────────────────────

export function useOnboardingRequests(status?: OnboardingRequestStatus, enabled = true) {
	const { token } = useAuth();
	return useQuery<Paginated<OnboardingRequest>>({
		queryKey: ["platform", "onboarding-requests", status],
		queryFn: () =>
			apiRequest(`/onboarding-requests${query({ status, limit: 100 })}`, { token: token! }),
		enabled: !!token && enabled,
	});
}

export function useOnboardingRequest(id: string | null) {
	const { token } = useAuth();
	return useQuery<OnboardingRequestDetail>({
		queryKey: ["platform", "onboarding-request", id],
		queryFn: () => apiRequest(`/onboarding-requests/${id}`, { token: token! }),
		enabled: !!token && !!id,
	});
}

export function useApproveRequest() {
	const { token } = useAuth();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...body
		}: {
			id: string;
			planTier: PlanTier;
			seatLimit?: number | null;
			primaryDomain?: string | null;
			note?: string;
		}) =>
			apiRequest<{ organization: OrganizationRecord; ownerInviteId: string }>(
				`/onboarding-requests/${id}/approve`,
				{ method: "POST", body, token: token! }
			),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
	});
}

export function useRejectRequest() {
	const { token } = useAuth();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, note }: { id: string; note: string }) =>
			apiRequest<OnboardingRequest>(`/onboarding-requests/${id}/reject`, {
				method: "POST",
				body: { note },
				token: token!,
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
	});
}

// ── Organizations ────────────────────────────────────────────────────────────

export function useOrganizations(filters: { status?: OrgStatus; search?: string }) {
	const { token } = useAuth();
	return useQuery<Paginated<OrganizationRecord>>({
		queryKey: ["platform", "organizations", filters.status, filters.search],
		queryFn: () =>
			apiRequest(`/organizations${query({ ...filters, limit: 100 })}`, { token: token! }),
		enabled: !!token,
	});
}

export function useOrganization(id: string | null) {
	const { token } = useAuth();
	return useQuery<OrganizationRecord>({
		queryKey: ["platform", "organization", id],
		queryFn: () => apiRequest(`/organizations/${id}`, { token: token! }),
		enabled: !!token && !!id,
	});
}

export function useOrganizationChecklist(id: string | null) {
	const { token } = useAuth();
	return useQuery<OnboardingChecklist>({
		queryKey: ["platform", "organization", id, "onboarding"],
		queryFn: () => apiRequest(`/organizations/${id}/onboarding`, { token: token! }),
		enabled: !!token && !!id,
	});
}

export function useOrganizationUsage(id: string | null) {
	const { token } = useAuth();
	return useQuery<PlanUsage>({
		queryKey: ["platform", "organization", id, "usage"],
		queryFn: () => apiRequest(`/organizations/${id}/usage`, { token: token! }),
		enabled: !!token && !!id,
	});
}

// The invite emailed to the owner on approval, while they haven't joined
export function useOwnerInvite(id: string | null, enabled: boolean) {
	const { token } = useAuth();
	return useQuery<(Invite & { ownerJoined: boolean }) | null>({
		queryKey: ["platform", "organization", id, "owner-invite"],
		queryFn: () => apiRequest(`/organizations/${id}/owner-invite`, { token: token! }),
		enabled: !!token && !!id && enabled,
	});
}

// One mutation hook per admin action; each refreshes every platform query on success
function useOrgMutation<TVars extends { id: string }>(
	build: (vars: TVars) => { path: string; method: "POST" | "PATCH"; body?: unknown }
) {
	const { token } = useAuth();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (vars: TVars) => {
			const { path, method, body } = build(vars);
			return apiRequest<OrganizationRecord>(path, { method, body, token: token! });
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
	});
}

export const useSuspendOrganization = () =>
	useOrgMutation(({ id, reason }: { id: string; reason: string }) => ({
		path: `/organizations/${id}/suspend`,
		method: "POST",
		body: { reason },
	}));

export const useResendOwnerInvite = () =>
	useOrgMutation(({ id }: { id: string }) => ({ path: `/organizations/${id}/owner-invite/resend`, method: "POST" }));

export const useActivateOrganization = () =>
	useOrgMutation(({ id }: { id: string }) => ({ path: `/organizations/${id}/activate`, method: "POST" }));

export const useUpdateOrganizationPlan = () =>
	useOrgMutation(({ id, ...body }: { id: string; planTier: PlanTier; seatLimit: number | null }) => ({
		path: `/organizations/${id}/plan`,
		method: "PATCH",
		body,
	}));

export const useUpdateOrganizationEmailPolicy = () =>
	useOrgMutation(
		({ id, ...body }: { id: string; primaryDomain: string | null; allowedDomains: string[]; allowedEmails: string[] }) => ({
			path: `/organizations/${id}/email-policy`,
			method: "PATCH",
			body,
		})
	);

// ── Domain change requests ───────────────────────────────────────────────────

export function useDomainRequests(status?: string, enabled = true) {
	const { token } = useAuth();
	return useQuery<DomainChangeRequestReview[]>({
		queryKey: ["platform", "domain-requests", status],
		queryFn: () => apiRequest(`/domain-requests${status ? `?status=${status}` : ""}`, { token: token! }),
		enabled: !!token && enabled,
	});
}

export function useReviewDomainRequest() {
	const { token } = useAuth();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, decision, note }: { id: string; decision: "approve" | "reject"; note?: string }) =>
			apiRequest(`/domain-requests/${id}/${decision}`, { method: "POST", body: { note }, token: token! }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
	});
}

// ── Personal accounts (users without a company) ──────────────────────────────

export function usePersonalAccounts(filters: { status?: string; search?: string }) {
	const { token } = useAuth();
	return useQuery<Paginated<PersonalAccount> & { counts: Record<string, number> }>({
		queryKey: ["platform", "users", filters.status, filters.search],
		queryFn: () => apiRequest(`/platform/users${query({ ...filters, limit: 100 })}`, { token: token! }),
		enabled: !!token,
	});
}

export function usePersonalAccount(id: string | null) {
	const { token } = useAuth();
	return useQuery<PersonalAccountDetail>({
		queryKey: ["platform", "users", "detail", id],
		queryFn: () => apiRequest(`/platform/users/${id}`, { token: token! }),
		enabled: !!token && !!id,
	});
}

export function usePersonalAccountAction() {
	const { token } = useAuth();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, action }: { id: string; action: "suspend" | "reactivate" | "resend-activation" | "password-reset" }) =>
			apiRequest<{ message?: string }>(`/platform/users/${id}/${action}`, { method: "POST", token: token! }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "users"] }),
	});
}
