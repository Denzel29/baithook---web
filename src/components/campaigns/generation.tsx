"use client";

import { useState } from "react";
import { AlertCircle, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, Panel, Spinner, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { useGeneration, useGenerationAction } from "@/lib/hooks/use-campaigns";
import type { Campaign, GenerationStatus } from "@/types/campaigns";

// Rough time per email: a laptop-sized local model takes about a minute, a cloud model a few seconds
const SECONDS_PER_EMAIL = (provider: string) => (provider === "gemini" ? 10 : 60);

function estimate(g: GenerationStatus, total: number): string {
  const minutes = Math.max(1, Math.round((total * SECONDS_PER_EMAIL(g.provider.name)) / 60));
  return minutes <= 1 ? "about a minute" : `about ${minutes} minutes`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Progress while the AI is writing. Shown on every tab so it is never out of sight.
export function GenerationBanner({ campaign }: { campaign: Campaign }) {
  const generation = useGeneration(campaign.id);
  const action = useGenerationAction(campaign.id);
  const g = generation.data;
  if (campaign.status !== "generating") return null;

  const progress = g?.progress ?? campaign.generationProgress ?? { total: 0, done: 0, failed: 0 };
  const settled = progress.done + progress.failed;
  const pct = progress.total ? Math.round((settled / progress.total) * 100) : 0;
  const current = g?.slots.find((s) => s.status === "generating");

  return (
    <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
          <Loader2 className="h-4 w-4 animate-spin text-[#2016a9]" />
          The AI is writing emails ({settled} of {progress.total})
          {progress.failed > 0 && <span className="font-normal text-red-700">· {progress.failed} failed</span>}
        </p>
        <button
          className={secondaryButton}
          disabled={action.isPending}
          onClick={() =>
            action.mutate("generate/cancel", {
              onSuccess: () => toast.success("Stopped. What was written is kept for review."),
              onError: (e) => toast.error(e.message),
            })
          }
        >
          <X className="h-4 w-4" /> Stop
        </button>
      </div>
      <div className="h-2 rounded-full bg-indigo-100">
        <div className="h-2 rounded-full bg-[#2016a9] transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
      <p className="text-sm text-indigo-900">
        {current ? `Now writing: ${current.kind === "phishing" ? "a phishing email" : "a legitimate email"} about ${current.theme}.` : "Getting ready…"} This page updates by itself, and it keeps
        working if you leave. Content is locked until it finishes.
      </p>
    </div>
  );
}

// Starting a run, retrying failures, and explaining what will happen
export function GenerationPanel({ campaign }: { campaign: Campaign }) {
  const generation = useGeneration(campaign.id);
  const action = useGenerationAction(campaign.id);
  const [confirming, setConfirming] = useState(false);
  const g = generation.data;

  if (generation.isLoading || !g) return <Spinner />;
  if (campaign.status === "generating") return <p className="text-sm text-gray-600">Generation is running. Progress is shown at the top of the page.</p>;

  const total = g.needed.phishing + g.needed.benign;
  const failed = g.progress?.failed ?? 0;

  const start = () =>
    action.mutate("generate", {
      onSuccess: () => {
        toast.success("The AI has started writing");
        setConfirming(false);
      },
      onError: (e) => {
        toast.error(e.message);
        setConfirming(false);
      },
    });

  return (
    <div className="space-y-4">
      {total > 0 ? (
        <p className="text-sm text-gray-600">
          Have the AI write {plural(g.needed.phishing, "phishing email")} and {plural(g.needed.benign, "legitimate email")}, with their sandbox pages, from your brief. Anything you have already written
          is kept.
        </p>
      ) : (
        <p className="text-sm text-gray-600">The email pool is full. Raise the email counts in the campaign settings to generate more.</p>
      )}

      {g.error && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {g.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {total > 0 && (
          <button className={primaryButton} onClick={() => setConfirming(true)}>
            <Sparkles className="h-4 w-4" /> Generate with AI
          </button>
        )}
        {failed > 0 && (
          <button
            className={secondaryButton}
            disabled={action.isPending}
            onClick={() => action.mutate("generate/retry-failed", { onError: (e) => toast.error(e.message), onSuccess: () => toast.success("Retrying the failed emails") })}
          >
            <RotateCcw className="h-4 w-4" /> Retry {failed} failed
          </button>
        )}
      </div>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Generate with AI?" icon={<Sparkles />}>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            The AI will write <strong>{plural(total, "email")}</strong> ({g.needed.phishing} phishing, {g.needed.benign} legitimate) and a sandbox page for each link or attachment, using your brief,
            the difficulty and the tactics you chose.
          </p>
          <p>
            It is using <strong>{g.provider.model}</strong> ({g.provider.name === "gemini" ? "Google Gemini" : "running on this computer"}). Expect {estimate(g, total)}.
            {g.provider.name === "ollama" && " You can leave the page; it keeps working."}
          </p>
          <p className="rounded-lg bg-gray-50 p-3 text-gray-600">
            Nothing goes live. Every email and page arrives waiting for your review, and you can edit, reject or regenerate any of them.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className={secondaryButton} onClick={() => setConfirming(false)}>
            Cancel
          </button>
          <button className={primaryButton} onClick={start} disabled={action.isPending}>
            {action.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Start writing
          </button>
        </div>
      </Dialog>
    </div>
  );
}

export function GenerationCard({ campaign }: { campaign: Campaign }) {
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#2016a9]" /> Write with AI
        </span>
      }
    >
      <GenerationPanel campaign={campaign} />
    </Panel>
  );
}
