"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronUp, Loader2, Lock, ShieldAlert, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmailView, SenderAvatar, emailTime, snippetOf } from "@/components/campaigns/email-view";
import { SandboxPageView } from "@/components/campaigns/sandbox-frame";
import { Dialog, Panel, Spinner, primaryButton, secondaryButton } from "@/components/dashboard/ui";
import { DifficultyBadge } from "@/components/learner/campaign-cards";
import { useBriefing, useDebrief, useInbox, useOpenPage, usePageAction, useSaveResponse, useSubmitAssessment } from "@/lib/hooks/use-training";
import type { PageContent } from "@/types/campaigns";
import type { Briefing, Debrief, DebriefEmail, Inbox, InboxEmail, SandboxStep, Verdict } from "@/types/training";

// The whole journey for one assignment: briefing, then the inbox, then results.
export function TakeFlow({ id }: { id: string }) {
  const briefing = useBriefing(id);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  if (briefing.isLoading) return <Spinner className="mt-16" />;
  if (briefing.isError || !briefing.data) {
    return (
      <Panel>
        <p className="text-sm text-red-600">{(briefing.error as Error)?.message ?? "This assessment could not be found."}</p>
        <Link href="/dashboard/campaigns" className="mt-3 inline-block text-sm font-semibold text-[#2016a9] hover:underline">
          Back to my campaigns
        </Link>
      </Panel>
    );
  }

  const { assignment } = briefing.data;
  if (assignment.status === "submitted" || finished) return <Results id={id} />;
  if (assignment.status === "expired" || assignment.status === "cancelled") {
    return (
      <Panel>
        <p className="text-sm text-gray-700">
          {assignment.status === "expired" ? "This assessment is past its due date. Ask your administrator for more time." : "This assessment was cancelled."}
        </p>
        <Link href="/dashboard/campaigns" className="mt-3 inline-block text-sm font-semibold text-[#2016a9] hover:underline">
          Back to my campaigns
        </Link>
      </Panel>
    );
  }

  // Someone coming back to an attempt they already began goes straight to the inbox
  if (started || assignment.status === "in_progress") return <InboxView id={id} onSubmitted={() => setFinished(true)} />;
  return <BriefingView briefing={briefing.data} onStart={() => setStarted(true)} />;
}

// ── Briefing ─────────────────────────────────────────────────────────────────

function BriefingView({ briefing, onStart }: { briefing: Briefing; onStart: () => void }) {
  const { campaign, materials, scoring, assignment } = briefing;
  return (
    <div className="space-y-6">
      <Panel
        title={campaign.name}
        description={campaign.summary || undefined}
        actions={<DifficultyBadge difficulty={campaign.difficulty} />}
      >
        <p className="text-sm text-gray-600">
          You will review {assignment.total} emails and decide for each whether it is genuine or phishing. You need {campaign.passThreshold}% to pass.
        </p>
      </Panel>

      {materials.map((m) => (
        <Panel key={m.type} title={m.title}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{m.content}</p>
        </Panel>
      ))}

      <Panel title="How you're scored" description="Nothing is revealed until you submit. Then you see your score and what each email was.">
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            <strong>+{scoring.correctVerdict}</strong> for each email you classify correctly.
          </li>
          <li>
            <strong>+{scoring.flagBonus}</strong> for each real red flag you tick on a phishing email you caught (up to +{scoring.flagBonusCap}), and <strong>−{scoring.wrongFlagPenalty}</strong> for each red flag you tick that is not there.
          </li>
          <li className="rounded-lg bg-amber-50 p-3 text-amber-900">
            <strong>What you do inside an email counts.</strong> Opening a link or attachment in a phishing email costs <strong>{scoring.openedPhishingLink}</strong> points, and entering
            information on its page costs <strong>{scoring.submittedPhishingForm}</strong> more. Everything happens in a safe sandbox, and nothing you type is ever saved. Only whether you filled a
            field in is recorded.
          </li>
        </ul>
      </Panel>

      <div className="flex justify-end">
        <button className={primaryButton} onClick={onStart}>
          Start the assessment <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Inbox ────────────────────────────────────────────────────────────────────

type Answer = { verdict: Verdict; flaggedIndicators: string[] };

function InboxView({ id, onSubmitted }: { id: string; onSubmitted: () => void }) {
  const inbox = useInbox(id, true);
  if (inbox.isLoading) return <Spinner className="mt-16" />;
  if (inbox.isError || !inbox.data) return <Panel><p className="text-sm text-red-600">{(inbox.error as Error)?.message ?? "The inbox could not be loaded."}</p></Panel>;
  return <InboxBody id={id} inbox={inbox.data} onSubmitted={onSubmitted} />;
}

function InboxBody({ id, inbox, onSubmitted }: { id: string; inbox: Inbox; onSubmitted: () => void }) {
  const save = useSaveResponse(id);
  const submit = useSubmitAssessment(id);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(inbox.emails.filter((e) => e.response).map((e) => [e.id, e.response as Answer]))
  );
  const [selectedId, setSelectedId] = useState(() => (inbox.emails.find((e) => !e.response) ?? inbox.emails[0])?.id);
  const [confirming, setConfirming] = useState(false);
  const [sandbox, setSandbox] = useState<{ emailId: string; kind: "link" | "attachment"; pageKey: string } | null>(null);

  const selected = inbox.emails.find((e) => e.id === selectedId) ?? inbox.emails[0];
  const answered = inbox.emails.filter((e) => answers[e.id]).length;
  const allDone = answered === inbox.emails.length;

  const answer = (emailId: string, next: Answer) => {
    const previous = answers[emailId];
    setAnswers((a) => ({ ...a, [emailId]: next }));
    save.mutate(
      { emailId, ...next },
      {
        onError: (e) => {
          toast.error(e.message);
          setAnswers((a) => {
            const copy = { ...a };
            if (previous) copy[emailId] = previous;
            else delete copy[emailId];
            return copy;
          });
        },
      }
    );
  };

  const nextUnanswered = inbox.emails.find((e) => e.id !== selected.id && !answers[e.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/campaigns" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Save and leave. Your answers are kept.
        </Link>
        <p className="text-sm font-medium text-gray-700">
          {answered} of {inbox.emails.length} answered
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        {/* The inbox list, laid out like Gmail's: unanswered mail is bold (unread), answered mail is shaded (read) */}
        <nav aria-label="Emails" className="overflow-hidden rounded-lg border border-[#dadce0] bg-white" style={{ fontFamily: 'Roboto, "Segoe UI", Arial, sans-serif' }}>
          <p className="border-b border-[#dadce0] px-4 py-2.5 text-sm font-medium text-[#202124]">
            Inbox <span className="ml-1 font-normal text-[#5f6368]">{inbox.emails.length - answered > 0 ? `${inbox.emails.length - answered} unread` : "all read"}</span>
          </p>
          <ul className="divide-y divide-[#e8eaed]">
            {inbox.emails.map((e) => {
              const read = !!answers[e.id];
              const active = e.id === selected.id;
              return (
                <li key={e.id}>
                  <button
                    onClick={() => setSelectedId(e.id)}
                    aria-current={active ? "true" : undefined}
                    className="flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition hover:shadow-[inset_0_-1px_0_#dadce0]"
                    style={{ background: active ? "#d3e3fd" : read ? "#f2f6fc" : "#ffffff" }}
                  >
                    <SenderAvatar name={e.senderName} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[13px] text-[#202124] ${read ? "font-normal" : "font-bold"}`}>{e.senderName}</span>
                        <span className={`shrink-0 text-xs ${read ? "text-[#5f6368]" : "font-bold text-[#202124]"}`}>{emailTime(e.id).list}</span>
                      </span>
                      <span className={`block truncate text-[13px] text-[#202124] ${read ? "font-normal" : "font-bold"}`}>{e.subject}</span>
                      <span className="flex items-center gap-1.5 text-xs text-[#5f6368]">
                        <span className="truncate">{snippetOf(e.body)}</span>
                        {read && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-[#188038]" aria-label="Answered" />}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-4">
          <EmailView email={selected} seed={selected.id} onOpenPage={(pageKey, kind) => setSandbox({ emailId: selected.id, kind, pageKey })} />

          <Panel title="Your verdict" description="Is this email genuine or phishing?">
            <VerdictControls
              email={selected}
              answer={answers[selected.id]}
              indicators={inbox.indicators}
              onChange={(next) => answer(selected.id, next)}
            />
            {nextUnanswered && answers[selected.id] && (
              <button onClick={() => setSelectedId(nextUnanswered.id)} className={`${secondaryButton} mt-5`}>
                Next email <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </Panel>
        </div>
      </div>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <p className="text-sm text-gray-600">{allDone ? "All emails answered. Review them, then submit." : `${inbox.emails.length - answered} email(s) still need a verdict.`}</p>
        <button className={primaryButton} disabled={!allDone} onClick={() => setConfirming(true)}>
          Submit assessment
        </button>
      </div>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Submit your assessment?" icon={<CheckCircle2 />}>
        <p className="text-sm text-gray-600">You can&apos;t change your answers after submitting. You&apos;ll see your score and what each email really was.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className={secondaryButton} onClick={() => setConfirming(false)}>
            Keep reviewing
          </button>
          <button
            className={primaryButton}
            disabled={submit.isPending}
            onClick={() =>
              submit.mutate(undefined, {
                onSuccess: () => {
                  setConfirming(false);
                  onSubmitted();
                },
                onError: (e) => {
                  toast.error(e.message);
                  setConfirming(false);
                },
              })
            }
          >
            {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit
          </button>
        </div>
      </Dialog>

      {sandbox && <SandboxOverlay assignmentId={id} request={sandbox} onClose={() => setSandbox(null)} />}
    </div>
  );
}

function VerdictControls({
  email,
  answer,
  indicators,
  onChange,
}: {
  email: InboxEmail;
  answer?: Answer;
  indicators: Inbox["indicators"];
  onChange: (a: Answer) => void;
}) {
  const flagged = answer?.flaggedIndicators ?? [];
  const toggle = (indicatorId: string) =>
    onChange({ verdict: "phishing", flaggedIndicators: flagged.includes(indicatorId) ? flagged.filter((f) => f !== indicatorId) : [...flagged, indicatorId] });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            { verdict: "phishing", label: "Phishing", icon: ShieldAlert, on: "border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500" },
            { verdict: "legit", label: "Legitimate", icon: CheckCircle2, on: "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500" },
          ] as const
        ).map(({ verdict, label, icon: Icon, on }) => (
          <button
            key={verdict}
            aria-pressed={answer?.verdict === verdict}
            onClick={() => onChange({ verdict, flaggedIndicators: verdict === "phishing" ? flagged : [] })}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold transition ${
              answer?.verdict === verdict ? on : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </div>

      {answer?.verdict === "phishing" && (
        <fieldset>
          <legend className="text-sm font-medium text-gray-900">Which red flags did you notice? (optional)</legend>
          <p className="mt-0.5 text-sm text-gray-500">Each real one earns bonus points. Each one that isn&apos;t there costs a point, so tick only what you&apos;re sure of.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {indicators.map((i) => (
              <label key={`${email.id}-${i.id}`} title={i.description} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <input type="checkbox" checked={flagged.includes(i.id)} onChange={() => toggle(i.id)} className="h-4 w-4 accent-[#2016a9]" />
                {i.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

// ── Sandbox ──────────────────────────────────────────────────────────────────

function SandboxOverlay({
  assignmentId,
  request,
  onClose,
}: {
  assignmentId: string;
  request: { emailId: string; kind: "link" | "attachment"; pageKey: string };
  onClose: () => void;
}) {
  const open = useOpenPage(assignmentId);
  const act = usePageAction(assignmentId);
  const [page, setPage] = useState<PageContent | null>(null);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (step: SandboxStep) => {
    if ("page" in step) setPage(step.page);
    else if (step.end === "return_to_inbox") onClose();
    else setEnded(true);
  };

  // Open the page the learner clicked, exactly once (dev double-mounts effects, and
  // each open is recorded, so a repeat would show twice in their debrief)
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    // Take the result from the request itself: a mount-bound callback is dropped when React remounts in development
    open
      .mutateAsync(request)
      .then(apply)
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 animate-[dialog-fade_160ms_ease-out] overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Sandbox page">
      <div className="mx-auto max-w-3xl space-y-3 py-6">
        <div className="flex justify-end">
          <button onClick={onClose} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-lg ring-1 ring-black/5 transition hover:bg-gray-50">
            <X className="h-4 w-4" /> Close and return to the email
          </button>
        </div>

        {error ? (
          <Panel>
            <p className="text-sm text-red-600">{error}</p>
          </Panel>
        ) : ended ? (
          <Panel>
            <p className="font-semibold text-gray-900">You can close this window.</p>
          </Panel>
        ) : !page ? (
          <div className="rounded-xl bg-white p-12">
            <Spinner />
          </div>
        ) : (
          <div className={act.isPending ? "pointer-events-none opacity-70" : ""}>
            <SandboxPageView
              page={page}
              onAction={(blockId, _action, filledFields) =>
                act.mutate({ emailId: request.emailId, pageKey: page.key, blockId, filledFields }, { onSuccess: apply, onError: (e) => setError(e.message) })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Results and debrief ──────────────────────────────────────────────────────

function Results({ id }: { id: string }) {
  const debrief = useDebrief(id, true);
  if (debrief.isLoading) return <Spinner className="mt-16" />;
  if (debrief.isError || !debrief.data) return <Panel><p className="text-sm text-red-600">{(debrief.error as Error)?.message ?? "Results could not be loaded."}</p></Panel>;
  return <ResultsBody debrief={debrief.data} />;
}

function ResultsBody({ debrief }: { debrief: Debrief }) {
  const { result, emails, weakest } = debrief;
  const passed = result.outcome === "passed";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/campaigns?tab=completed" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> My campaigns
      </Link>

      <Panel>
        <div className="flex flex-wrap items-center gap-6">
          <div className={`text-5xl font-bold tracking-tight ${passed ? "text-emerald-600" : "text-red-600"}`}>{result.scorePercent}%</div>
          <div>
            <p className={`flex items-center gap-2 text-lg font-semibold ${passed ? "text-emerald-700" : "text-red-700"}`}>
              {passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {passed ? "You passed" : `Not passed yet (pass mark ${result.passThreshold}%)`}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {result.points} of {result.maxPoints} points · {result.campaignName}
              {result.attemptNumber > 1 && ` · attempt ${result.attemptNumber}`}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Phishing caught", result.phishingCaught],
            ["Phishing missed", result.phishingMissed],
            ["Legitimate trusted", result.benignCorrect],
            ["False alarms", result.falseAlarms],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-gray-50 p-4">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        {result.interactionPenalty > 0 && (
          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <strong>What you did inside emails cost you {result.interactionPenalty} points.</strong> You opened a link or attachment in {result.linksOpened} phishing email
            {result.linksOpened === 1 ? "" : "s"}
            {result.formsSubmitted > 0 && ` and entered information on ${result.formsSubmitted} of them`}. A real attacker would have gained something from that. The details are below.
          </p>
        )}
      </Panel>

      {weakest.length > 0 && (
        <Panel title="Where to focus" description="The red flags you missed most often.">
          <ul className="space-y-3 text-sm">
            {weakest.map((w) => (
              <li key={w.indicatorId}>
                <p className="font-semibold text-gray-900">
                  {w.label} <span className="font-normal text-gray-500">· spotted {w.spotted} of {w.encountered}</span>
                </p>
                <p className="text-gray-600">{w.howToSpot}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Every email, explained</h2>
        {emails.map((e, i) => (
          <DebriefCard key={e.id} email={e} index={i + 1} />
        ))}
      </section>
    </div>
  );
}

const EVENT_TEXT: Record<string, string> = {
  opened_link: "Opened a link",
  opened_attachment: "Opened an attachment",
  viewed_page: "Viewed a page",
  clicked_button: "Clicked a button",
  submitted_form: "Submitted a form",
};

function DebriefCard({ email, index }: { email: DebriefEmail; index: number }) {
  const [open, setOpen] = useState(!email.isCorrect || email.path.length > 0);
  const highlights = useMemo(() => email.indicators.map((i) => i.excerpt), [email.indicators]);

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-start justify-between gap-4 px-5 py-4 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${email.isPhishing ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {email.isPhishing ? "Phishing" : "Legitimate"}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${email.isCorrect ? "text-emerald-700" : "text-red-700"}`}>
              {email.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {email.isCorrect ? "You got this right" : `You said ${email.yourVerdict === "phishing" ? "phishing" : "legitimate"}`}
            </span>
          </div>
          <p className="mt-2 truncate font-semibold text-gray-900">
            {index}. {email.subject}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2 text-sm text-gray-500">
          {email.points} pts {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-gray-100 bg-gray-50/50 px-5 py-5">
          <EmailView email={email} seed={email.id} highlights={highlights} />

          {email.isPhishing ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">The warning signs</p>
              {email.indicators.map((ind) => (
                <p key={ind.indicatorId + ind.excerpt} className="flex gap-2 text-sm text-gray-700">
                  {ind.spotted ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                  <span>
                    <strong>{ind.label}:</strong> &ldquo;{ind.excerpt}&rdquo;. {ind.explanation} <em className="text-gray-500">{ind.spotted ? "You spotted this." : "You missed this."}</em>
                  </span>
                </p>
              ))}
              {email.wrongFlags.length > 0 && <p className="text-sm text-gray-600">You also ticked {email.wrongFlags.join(", ")}, which {email.wrongFlags.length === 1 ? "isn't" : "aren't"} in this email.</p>}
            </div>
          ) : (
            email.benignRationale && (
              <p className="text-sm text-gray-700">
                <strong className="text-gray-900">Why it&apos;s legitimate:</strong> {email.benignRationale}
              </p>
            )
          )}

          {email.path.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">What you did</p>
              <ol className="space-y-1.5 text-sm text-gray-700">
                {email.path.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-gray-400">{i + 1}.</span>
                    <span>
                      {EVENT_TEXT[step.type] ?? step.type}: {step.pageTitle}
                      {step.displayUrl && <span className="text-gray-400"> ({step.displayUrl})</span>}
                      {step.filledFields.length > 0 && <span className="text-gray-500"> · filled in {step.filledFields.join(", ")}</span>}
                    </span>
                  </li>
                ))}
              </ol>
              {email.isPhishing && email.attackerGained.length > 0 && (
                <p className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>On a real phishing page, an attacker would now have {email.attackerGained.join(" and ")}.</span>
                </p>
              )}
              {email.isPhishing && email.attackerGained.length === 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Opening a link on a phishing email can confirm your address is active and expose your device. Checking the address first is safer.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
