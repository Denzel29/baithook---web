import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type { Campaign } from "@/types/campaigns";
import type {
  AssessmentResultView,
  AssignInput,
  AssignResult,
  BatchDetail,
  BatchSummary,
  Briefing,
  CatalogEntry,
  Debrief,
  Inbox,
  MyAssignment,
  SandboxStep,
  Verdict,
} from "@/types/training";

function useTrainingQuery<T>(key: unknown[], path: string, options: { enabled?: boolean; staleTime?: number } = {}) {
  const { token } = useAuth();
  return useQuery<T>({
    queryKey: ["training", ...key],
    queryFn: () => apiRequest<T>(path, { token: token! }),
    enabled: !!token && (options.enabled ?? true),
    staleTime: options.staleTime,
  });
}

// Training changes touch assignment lists, batches and campaign counts alike
function useTrainingMutation<TVars, TResult = unknown>(request: (vars: TVars, token: string) => Promise<TResult>, alsoInvalidate: string[] = []) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => request(vars, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training"] });
      alsoInvalidate.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
    },
  });
}

// ── Learner: lists ───────────────────────────────────────────────────────────

export const useMyAssignments = () => useTrainingQuery<MyAssignment[]>(["mine"], "/me/assignments");
export const useCatalog = (enabled = true) => useTrainingQuery<CatalogEntry[]>(["catalog"], "/catalog", { enabled });

export const useEnroll = () =>
  useTrainingMutation((campaignId: string, token) => apiRequest<{ assignmentId: string }>(`/catalog/${campaignId}/enroll`, { method: "POST", token }));

// ── Learner: taking an assessment ────────────────────────────────────────────

export const useBriefing = (id: string) => useTrainingQuery<Briefing>(["briefing", id], `/assignments/${id}/briefing`);

// The inbox call starts the attempt, so it is only fetched once the learner begins
export const useInbox = (id: string, enabled: boolean) => useTrainingQuery<Inbox>(["inbox", id], `/assignments/${id}/inbox`, { enabled, staleTime: Infinity });

// Saving an answer must not refetch the inbox the learner is working in, so it
// only refreshes the progress counts shown on the lists
export const useSaveResponse = (id: string) => {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ emailId, verdict, flaggedIndicators }: { emailId: string; verdict: Verdict; flaggedIndicators: string[] }) =>
      apiRequest(`/assignments/${id}/responses/${emailId}`, { method: "PUT", body: { verdict, flaggedIndicators }, token: token! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", "mine"] }),
  });
};

// Opening a link or attachment, and clicking inside a sandbox page. The server
// resolves where each leads; only the names of filled fields are ever sent.
export const useOpenPage = (id: string) => {
  const { token } = useAuth();
  return useMutation({
    mutationFn: ({ emailId, kind, pageKey }: { emailId: string; kind: "link" | "attachment"; pageKey: string }) =>
      apiRequest<SandboxStep>(`/sandbox/assignments/${id}/emails/${emailId}/open`, { method: "POST", body: { kind, pageKey }, token: token! }),
  });
};

export const usePageAction = (id: string) => {
  const { token } = useAuth();
  return useMutation({
    mutationFn: ({ emailId, pageKey, blockId, filledFields }: { emailId: string; pageKey: string; blockId: string; filledFields: string[] }) =>
      apiRequest<SandboxStep>(`/sandbox/assignments/${id}/emails/${emailId}/pages/${pageKey}/actions`, {
        method: "POST",
        body: { blockId, filledFields },
        token: token!,
      }),
  });
};

export const useSubmitAssessment = (id: string) =>
  useTrainingMutation((_: void, token) => apiRequest<AssessmentResultView>(`/assignments/${id}/submit`, { method: "POST", token }));

export const useDebrief = (id: string, enabled: boolean) => useTrainingQuery<Debrief>(["debrief", id], `/assignments/${id}/debrief`, { enabled });

// ── Company admin: assigning ─────────────────────────────────────────────────

export const useAssign = (campaignId: string) =>
  useTrainingMutation((body: AssignInput, token) => apiRequest<AssignResult>(`/campaigns/${campaignId}/assignments`, { method: "POST", body, token }));

export const useBatches = (campaignId?: string) =>
  useTrainingQuery<BatchSummary[]>(["batches", campaignId ?? "all"], `/assignment-batches${campaignId ? `?campaignId=${campaignId}` : ""}`);

export const useBatch = (id: string) => useTrainingQuery<BatchDetail>(["batch", id], `/assignment-batches/${id}`);

export const useResyncBatch = () =>
  useTrainingMutation((id: string, token) => apiRequest<{ created: number; skipped: AssignResult["skipped"] }>(`/assignment-batches/${id}/resync`, { method: "POST", token }));

export const useExtendDueDate = () =>
  useTrainingMutation(({ assignmentId, dueAt }: { assignmentId: string; dueAt: string | null }, token) =>
    apiRequest(`/assignments/${assignmentId}/due-date`, { method: "PATCH", body: { dueAt }, token })
  );

export const useCancelAssignment = () =>
  useTrainingMutation((assignmentId: string, token) => apiRequest(`/assignments/${assignmentId}/cancel`, { method: "POST", token }));

// ── Platform admin: catalog ──────────────────────────────────────────────────

export const usePublishCampaign = (campaignId: string) =>
  useTrainingMutation(
    (publish: boolean, token) => apiRequest<Campaign>(`/campaigns/${campaignId}/${publish ? "publish" : "unpublish"}`, { method: "POST", token }),
    ["campaigns"]
  );
