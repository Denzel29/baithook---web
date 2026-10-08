import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type {
	BulkInviteResult,
	CompanySize,
	Department,
	DomainChangeRequest,
	Industry,
	Invite,
	JobFunction,
	Member,
	OnboardingChecklist,
	OrganizationRecord,
	Paginated,
	PlanUsage,
	RoleSummary,
} from "@/types/onboarding";

// The signed-in company admin's own organization. The server scopes every one
// of these endpoints to the caller's organization, so no org id is passed.

// Any change to people, departments or invites can move the setup checklist
// and plan usage, so mutations refresh everything under "company".
function useCompanyMutation<TVars, TResult = unknown>(
	request: (vars: TVars, token: string) => Promise<TResult>
) {
	const { token } = useAuth();
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (vars: TVars) => request(vars, token!),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["company"] }),
	});
}

function useCompanyQuery<T>(key: unknown[], path: string, enabled = true) {
	const { token } = useAuth();
	return useQuery<T>({
		queryKey: ["company", ...key],
		queryFn: () => apiRequest<T>(path, { token: token! }),
		enabled: !!token && enabled,
	});
}

// ── Organization ─────────────────────────────────────────────────────────────

// Pass enabled=false for people without an organization (personal accounts)
export const useMyOrganization = (enabled = true) =>
	useCompanyQuery<OrganizationRecord>(["organization"], "/organization", enabled);
export const useMyOnboarding = () => useCompanyQuery<OnboardingChecklist>(["onboarding"], "/organization/onboarding");
export const useMyUsage = () => useCompanyQuery<PlanUsage>(["usage"], "/organization/usage");

export const useUpdateMyOrganization = () =>
	useCompanyMutation(
		(
			body: {
				name: string;
				website: string | null;
				industry: Industry;
				companySize: CompanySize;
				country: string;
				timezone: string;
			},
			token
		) => apiRequest<OrganizationRecord>("/organization", { method: "PATCH", body, token })
	);

// ── Members ──────────────────────────────────────────────────────────────────

export function useMembers(filters: { search?: string; departmentId?: string; status?: string }) {
	const qs = new URLSearchParams({ limit: "100" });
	Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
	return useCompanyQuery<Paginated<Member>>(["members", filters], `/members?${qs}`);
}

export const useUpdateMember = () =>
	useCompanyMutation(
		(
			{ id, ...body }: { id: string; departmentId?: string | null; roleId?: string; jobFunction?: JobFunction | null },
			token
		) => apiRequest(`/members/${id}`, { method: "PATCH", body, token })
	);

export const useSuspendMember = () =>
	useCompanyMutation(({ id }: { id: string }, token) => apiRequest(`/members/${id}/suspend`, { method: "POST", token }));

export const useReactivateMember = () =>
	useCompanyMutation(({ id }: { id: string }, token) => apiRequest(`/members/${id}/reactivate`, { method: "POST", token }));

export const useRoles = () => useCompanyQuery<RoleSummary[]>(["roles"], "/roles");

// ── Departments ──────────────────────────────────────────────────────────────

export const useDepartments = () => useCompanyQuery<Department[]>(["departments"], "/departments");

export const useCreateDepartment = () =>
	useCompanyMutation((body: { name: string }, token) =>
		apiRequest<Department>("/departments", { method: "POST", body, token })
	);

export const useRenameDepartment = () =>
	useCompanyMutation(({ id, name }: { id: string; name: string }, token) =>
		apiRequest(`/departments/${id}`, { method: "PATCH", body: { name }, token })
	);

export const useDeleteDepartment = () =>
	useCompanyMutation(({ id }: { id: string }, token) => apiRequest(`/departments/${id}`, { method: "DELETE", token }));

// ── Invitations ──────────────────────────────────────────────────────────────

export const useInvites = () => useCompanyQuery<Invite[]>(["invites"], "/invites");

export const useCreateInvite = () =>
	useCompanyMutation(
		(
			body: {
				email: string;
				firstName?: string;
				lastName?: string;
				departmentId?: string | null;
				jobFunction?: JobFunction | null;
				roleId?: string;
			},
			token
		) => apiRequest<Invite>("/invites", { method: "POST", body, token })
	);

export const useBulkInvite = () =>
	useCompanyMutation(({ csv, createDepartments }: { csv: string; createDepartments: boolean }, token) =>
		apiRequest<BulkInviteResult>(`/invites/bulk${createDepartments ? "?createDepartments=true" : ""}`, {
			method: "POST",
			body: csv,
			contentType: "text/csv",
			token,
		})
	);

export const useResendInvite = () =>
	useCompanyMutation(({ id }: { id: string }, token) => apiRequest(`/invites/${id}/resend`, { method: "POST", token }));

export const useRevokeInvite = () =>
	useCompanyMutation(({ id }: { id: string }, token) => apiRequest(`/invites/${id}`, { method: "DELETE", token }));

// ── Domain change requests ───────────────────────────────────────────────────

export const useMyDomainRequests = () =>
	useCompanyQuery<DomainChangeRequest[]>(["domain-requests"], "/organization/domain-requests");

export const useRequestDomainChange = () =>
	useCompanyMutation(
		(body: { primaryDomain: string | null; allowedDomains: string[]; reason: string }, token) =>
			apiRequest<DomainChangeRequest>("/organization/domain-requests", { method: "POST", body, token })
	);

export const useCancelDomainRequest = () =>
	useCompanyMutation(({ id }: { id: string }, token) =>
		apiRequest(`/organization/domain-requests/${id}/cancel`, { method: "POST", token })
	);
