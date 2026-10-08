// Training: what company admins assign and what learners take. Learner-facing
// shapes never include answers until an assessment is submitted.

import type { CampaignEmail, Difficulty, EmailAttachment, EmailLink, PageContent } from "@/types/campaigns";

export type AssignmentStatus = "assigned" | "in_progress" | "submitted" | "expired" | "cancelled";
export type Verdict = "phishing" | "legit";
export type Outcome = "passed" | "failed";
export type TargetType = "users" | "departments" | "organization" | "self_enroll";
export type SkipReason = "open_attempt" | "exposed_to_answers" | "max_attempts" | "inactive";

export interface CatalogEntry {
  id: string;
  name: string;
  summary: string;
  difficulty: Difficulty;
  focusIndicators: string[];
  emails: number;
  minutes: number;
  passThreshold: number;
  maxAttempts: number | null;
  myStatus: AssignmentStatus | null;
  myAssignmentId: string | null;
}

export interface MyAssignment {
  id: string;
  campaignId: string;
  campaignName: string;
  summary: string;
  difficulty: Difficulty;
  status: AssignmentStatus;
  attemptNumber: number;
  dueAt: string | null;
  assignedBy: string | null;
  total: number;
  answered: number;
  scorePercent: number | null;
  outcome: Outcome | null;
  passThreshold: number;
  createdAt: string;
  submittedAt: string | null;
}

export interface AssignmentSummary {
  id: string;
  status: AssignmentStatus;
  attemptNumber: number;
  dueAt: string | null;
  total: number;
}

export interface ScoringRules {
  correctVerdict: number;
  flagBonus: number;
  flagBonusCap: number;
  wrongFlagPenalty: number;
  openedPhishingLink: number;
  submittedPhishingForm: number;
}

export interface Briefing {
  assignment: AssignmentSummary;
  campaign: { name: string; summary: string; difficulty: Difficulty; passThreshold: number };
  materials: { type: "briefing" | "quick_reference"; title: string; content: string }[];
  scoring: ScoringRules;
}

export interface InboxEmail {
  id: string;
  senderName: string;
  senderAddress: string;
  subject: string;
  greeting: string;
  body: string;
  cta: EmailLink | null;
  links: EmailLink[];
  attachments: EmailAttachment[];
  response: { verdict: Verdict; flaggedIndicators: string[] } | null;
}

export interface Inbox {
  assignment: AssignmentSummary;
  indicators: { id: string; label: string; description: string }[];
  emails: InboxEmail[];
}

export type SandboxStep = { page: PageContent } | { end: "dead_end" | "return_to_inbox" };

export interface AssessmentResultView {
  assignmentId: string;
  campaignName: string;
  attemptNumber: number;
  points: number;
  maxPoints: number;
  scorePercent: number;
  passThreshold: number;
  outcome: Outcome;
  phishingCaught: number;
  phishingMissed: number;
  benignCorrect: number;
  falseAlarms: number;
  linksOpened: number;
  formsSubmitted: number;
  interactionPenalty: number;
  durationSeconds: number | null;
  submittedAt: string;
}

export interface DebriefEmail extends Pick<CampaignEmail, "senderName" | "senderAddress" | "subject" | "greeting" | "body" | "cta" | "links" | "attachments"> {
  id: string;
  isPhishing: boolean;
  yourVerdict: Verdict | null;
  isCorrect: boolean;
  points: number;
  indicators: { indicatorId: string; label: string; excerpt: string; explanation: string; spotted: boolean }[];
  wrongFlags: string[];
  benignRationale: string | null;
  path: { type: string; pageTitle: string; displayUrl: string | null; filledFields: string[] }[];
  attackerGained: string[];
}

export interface Debrief {
  result: AssessmentResultView;
  emails: DebriefEmail[];
  weakest: { indicatorId: string; label: string; howToSpot: string; encountered: number; spotted: number }[];
}

// ── Company admin side ───────────────────────────────────────────────────────

export interface AssignInput {
  targetType: "users" | "departments" | "organization";
  userIds?: string[];
  departmentIds?: string[];
  dueAt?: string | null;
  includeExposed?: boolean;
}

export interface AssignResult {
  batchId: string | null;
  created: number;
  skipped: { userId: string; name: string; reason: SkipReason }[];
  hint?: string;
}

export interface BatchSummary {
  id: string;
  campaignId: string;
  campaignName: string;
  targetType: TargetType;
  dueAt: string | null;
  createdAt: string;
  assignedByName: string;
  counts: Record<AssignmentStatus, number> & { total: number };
  averageScore: number | null;
}

export interface BatchDetail {
  id: string;
  campaignId: string;
  targetType: TargetType;
  dueAt: string | null;
  createdAt: string;
  people: {
    assignmentId: string;
    userId: string;
    name: string;
    email: string;
    department: string | null;
    status: AssignmentStatus;
    attemptNumber: number;
    dueAt: string | null;
    submittedAt: string | null;
    scorePercent: number | null;
    outcome: Outcome | null;
    exposed: boolean;
  }[];
}

// ── Labels ───────────────────────────────────────────────────────────────────

// Friendlier wording for learners than the authoring labels
export const LEARNER_DIFFICULTY_LABELS: Record<Difficulty, string> = {
  obvious: "Beginner",
  moderate: "Intermediate",
  subtle: "Advanced",
};

export const INDICATOR_LABELS: Record<string, string> = {
  urgency: "Urgency",
  command_cta: "Pushy call to action",
  threat_fear: "Threats",
  reward_greed: "Too good to be true",
  authority: "Impersonated authority",
  credential_request: "Asks for passwords",
  secrecy_unusual: "Unusual request",
  generic_greeting: "Generic greeting",
  sender_mismatch: "Spoofed sender",
  suspicious_link: "Suspicious links",
  risky_attachment: "Risky attachments",
  poor_language: "Poor spelling",
};

export const SKIP_REASON_TEXT: Record<SkipReason, string> = {
  open_attempt: "already has this campaign open",
  exposed_to_answers: "wrote or reviewed this campaign, so has seen the answers",
  max_attempts: "has used all their attempts",
  inactive: "has not activated their account or is suspended",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: "Not started",
  in_progress: "In progress",
  submitted: "Completed",
  expired: "Overdue",
  cancelled: "Cancelled",
};
