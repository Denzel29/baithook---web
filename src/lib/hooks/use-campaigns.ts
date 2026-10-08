import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type {
  Campaign,
  CampaignEmail,
  CampaignInput,
  CampaignStatus,
  EmailContent,
  GenerationStatus,
  Indicator,
  MaterialType,
  PageContent,
  PagePattern,
  Readiness,
  SandboxPage,
  TrainingMaterial,
} from "@/types/campaigns";

// Authoring side of campaigns. The server scopes everything to the caller:
// company admins see their own campaigns, platform admins the platform's.

function useCampaignQuery<T>(
  key: unknown[],
  path: string,
  options: { enabled?: boolean; staleTime?: number; refetchInterval?: (data: T | undefined) => number | false } = {}
) {
  const { token } = useAuth();
  return useQuery<T>({
    queryKey: ["campaigns", ...key],
    queryFn: () => apiRequest<T>(path, { token: token! }),
    enabled: !!token && (options.enabled ?? true),
    staleTime: options.staleTime,
    refetchInterval: options.refetchInterval ? (query) => options.refetchInterval!(query.state.data) : undefined,
  });
}

// While the AI is writing, lists and counts refresh on their own
const POLL_MS = 3000;

// Any authoring change can move counts, readiness and review states, so every
// mutation refreshes everything under "campaigns".
function useCampaignMutation<TVars, TResult = unknown>(request: (vars: TVars, token: string) => Promise<TResult>) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => request(vars, token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

const FOREVER = 60 * 60 * 1000;

// ── Reference data ───────────────────────────────────────────────────────────

export const useIndicators = () => useCampaignQuery<Indicator[]>(["indicators"], "/phishing-indicators", { staleTime: FOREVER });
export const usePagePatterns = () => useCampaignQuery<PagePattern[]>(["patterns"], "/page-patterns", { staleTime: FOREVER });

// ── Campaigns ────────────────────────────────────────────────────────────────

export function useCampaigns(filters: { status?: CampaignStatus; search?: string }) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
  return useCampaignQuery<Campaign[]>(["list", filters], `/campaigns?${qs}`);
}

export const useCampaign = (id: string) =>
  useCampaignQuery<Campaign>(["detail", id], `/campaigns/${id}`, { refetchInterval: (c) => (c?.status === "generating" ? POLL_MS : false) });
export const useReadiness = (id: string) => useCampaignQuery<Readiness>(["readiness", id], `/campaigns/${id}/readiness`, { staleTime: 0 });

export const useCreateCampaign = () =>
  useCampaignMutation((body: CampaignInput, token) => apiRequest<Campaign>("/campaigns", { method: "POST", body, token }));

export const useUpdateCampaign = (id: string) =>
  useCampaignMutation((body: Partial<CampaignInput>, token) => apiRequest<Campaign>(`/campaigns/${id}`, { method: "PATCH", body, token }));

export const useCampaignAction = (id: string) =>
  useCampaignMutation((action: "launch" | "archive", token) => apiRequest<Campaign>(`/campaigns/${id}/${action}`, { method: "POST", token }));

export const useDeleteCampaign = () =>
  useCampaignMutation((id: string, token) => apiRequest(`/campaigns/${id}`, { method: "DELETE", token }));

// ── Emails ───────────────────────────────────────────────────────────────────

// `polling` is true while the whole campaign is generating; a single email being rewritten also polls
export const useEmails = (campaignId: string, polling = false) =>
  useCampaignQuery<CampaignEmail[]>(["emails", campaignId], `/campaigns/${campaignId}/emails`, {
    refetchInterval: (emails) => (polling || emails?.some((e) => e.generationStatus === "generating") ? POLL_MS : false),
  });

export const useSaveEmail = (campaignId: string) =>
  useCampaignMutation(({ id, body }: { id?: string; body: Partial<EmailContent> }, token) =>
    apiRequest<CampaignEmail>(id ? `/campaigns/${campaignId}/emails/${id}` : `/campaigns/${campaignId}/emails`, {
      method: id ? "PATCH" : "POST",
      body,
      token,
    })
  );

export const useEmailReview = (campaignId: string) =>
  useCampaignMutation(({ id, action, note }: { id: string; action: "approve" | "reject" | "delete"; note?: string }, token) =>
    action === "delete"
      ? apiRequest(`/campaigns/${campaignId}/emails/${id}`, { method: "DELETE", token })
      : apiRequest(`/campaigns/${campaignId}/emails/${id}/${action}`, { method: "POST", body: action === "reject" ? { note } : undefined, token })
  );

// Approves the chosen emails, or every email still waiting when no ids are given
export const useBulkApproveEmails = (campaignId: string) =>
  useCampaignMutation((emailIds: string[] | undefined, token) =>
    apiRequest<{ approved: number; skipped: { emailId: string; subject: string; reason: string }[] }>(`/campaigns/${campaignId}/emails/bulk-approve`, {
      method: "POST",
      body: emailIds ? { emailIds } : {},
      token,
    })
  );

// ── Sandbox pages ────────────────────────────────────────────────────────────

export const usePages = (campaignId: string, polling = false) =>
  useCampaignQuery<SandboxPage[]>(["pages", campaignId], `/campaigns/${campaignId}/pages`, { refetchInterval: () => (polling ? POLL_MS : false) });

export const useSavePage = (campaignId: string) =>
  useCampaignMutation(({ id, body }: { id?: string; body: Partial<PageContent> }, token) =>
    apiRequest<SandboxPage>(id ? `/campaigns/${campaignId}/pages/${id}` : `/campaigns/${campaignId}/pages`, {
      method: id ? "PATCH" : "POST",
      body,
      token,
    })
  );

export const useCreatePagesFromPattern = (campaignId: string) =>
  useCampaignMutation((body: { pattern: string; prefix: string; brand: string; domain: string }, token) =>
    apiRequest<SandboxPage[]>(`/campaigns/${campaignId}/pages/from-pattern`, { method: "POST", body, token })
  );

// Approves the chosen pages, or every page still waiting when no ids are given
export const useBulkApprovePages = (campaignId: string) =>
  useCampaignMutation((pageIds: string[] | undefined, token) =>
    apiRequest<{ approved: number; skipped: { pageId: string; key: string; reason: string }[] }>(`/campaigns/${campaignId}/pages/bulk-approve`, {
      method: "POST",
      body: pageIds ? { pageIds } : {},
      token,
    })
  );

export const usePageReview = (campaignId: string) =>
  useCampaignMutation(({ id, action, note }: { id: string; action: "approve" | "reject" | "delete"; note?: string }, token) =>
    action === "delete"
      ? apiRequest(`/campaigns/${campaignId}/pages/${id}`, { method: "DELETE", token })
      : apiRequest(`/campaigns/${campaignId}/pages/${id}/${action}`, { method: "POST", body: action === "reject" ? { note } : undefined, token })
  );

// ── Training materials ───────────────────────────────────────────────────────

export const useMaterials = (campaignId: string) =>
  useCampaignQuery<TrainingMaterial[]>(["materials", campaignId], `/campaigns/${campaignId}/materials`);

export const useSaveMaterial = (campaignId: string) =>
  useCampaignMutation(({ id, body }: { id?: string; body: { type?: MaterialType; title?: string; content?: string } }, token) =>
    apiRequest<TrainingMaterial>(id ? `/campaigns/${campaignId}/materials/${id}` : `/campaigns/${campaignId}/materials`, {
      method: id ? "PATCH" : "POST",
      body,
      token,
    })
  );

export const useMaterialReview = (campaignId: string) =>
  useCampaignMutation(({ id, action, note }: { id: string; action: "approve" | "reject" | "delete"; note?: string }, token) =>
    action === "delete"
      ? apiRequest(`/campaigns/${campaignId}/materials/${id}`, { method: "DELETE", token })
      : apiRequest(`/campaigns/${campaignId}/materials/${id}/${action}`, { method: "POST", body: action === "reject" ? { note } : undefined, token })
  );

// ── AI generation ────────────────────────────────────────────────────────────

export const useGeneration = (campaignId: string) =>
  useCampaignQuery<GenerationStatus>(["generation", campaignId], `/campaigns/${campaignId}/generation`, {
    staleTime: 0,
    refetchInterval: (g) => (g?.status === "generating" ? POLL_MS : false),
  });

export const useGenerationAction = (campaignId: string) =>
  useCampaignMutation((action: "generate" | "generate/cancel" | "generate/retry-failed", token) =>
    apiRequest<unknown>(`/campaigns/${campaignId}/${action}`, { method: "POST", token })
  );

export const useRegenerateEmail = (campaignId: string) =>
  useCampaignMutation(({ emailId, feedback }: { emailId: string; feedback: string }, token) =>
    apiRequest(`/campaigns/${campaignId}/emails/${emailId}/regenerate`, { method: "POST", body: { feedback }, token })
  );
