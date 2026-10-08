// PREVIEW ONLY. Campaigns aren't built yet (see server/docs/ai-campaigns).
// These example records show how the learner dashboard will look; replace
// every import of this file with real API hooks when campaigns land, then
// delete it.

export type Difficulty = "obvious" | "moderate" | "subtle";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  obvious: "Beginner",
  moderate: "Intermediate",
  subtle: "Advanced",
};

// Same ids as the indicator library in the AI campaign spec
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

export interface CatalogCampaign {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  emails: number;
  minutes: number;
  indicators: string[];
  enrolled: number;
}

export const SAMPLE_CATALOG: CatalogCampaign[] = [
  {
    id: "parcel",
    title: "Parcel delivery scams",
    description: "Missed-delivery notices and customs fees: the most common lure there is. A good place to start.",
    difficulty: "obvious",
    emails: 8,
    minutes: 10,
    indicators: ["urgency", "suspicious_link", "generic_greeting"],
    enrolled: 1240,
  },
  {
    id: "account-alerts",
    title: "Account security alerts",
    description: "\"Unusual sign-in\" and \"password expires today\" messages that try to rush you into logging in.",
    difficulty: "obvious",
    emails: 10,
    minutes: 12,
    indicators: ["threat_fear", "credential_request", "command_cta"],
    enrolled: 980,
  },
  {
    id: "invoice",
    title: "Invoice & payment fraud",
    description: "Fake invoices and changed bank details from suppliers who look exactly like the real ones.",
    difficulty: "moderate",
    emails: 10,
    minutes: 15,
    indicators: ["sender_mismatch", "risky_attachment", "secrecy_unusual"],
    enrolled: 610,
  },
  {
    id: "shared-docs",
    title: "Shared document lures",
    description: "\"A file has been shared with you\" emails that lead to convincing fake sign-in pages.",
    difficulty: "moderate",
    emails: 8,
    minutes: 12,
    indicators: ["suspicious_link", "credential_request", "sender_mismatch"],
    enrolled: 455,
  },
  {
    id: "prizes",
    title: "Prizes, refunds & gift cards",
    description: "Tax refunds, survey rewards and gift cards that are a little too generous.",
    difficulty: "obvious",
    emails: 6,
    minutes: 8,
    indicators: ["reward_greed", "urgency", "poor_language"],
    enrolled: 820,
  },
  {
    id: "ceo-fraud",
    title: "CEO & executive impersonation",
    description: "Polished, personal requests from \"the boss\". No typos, no obvious tells. The hardest kind to spot.",
    difficulty: "subtle",
    emails: 12,
    minutes: 20,
    indicators: ["authority", "secrecy_unusual", "sender_mismatch"],
    enrolled: 290,
  },
];

export type MyCampaignStatus = "not_started" | "in_progress" | "completed";

export interface MyCampaign {
  id: string;
  campaignId: string;
  status: MyCampaignStatus;
  answered: number;
  total: number;
  dueAt: string | null; // set when a company assigns it
  scorePercent: number | null;
  passed: boolean | null;
}

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

export const SAMPLE_MY_CAMPAIGNS: MyCampaign[] = [
  { id: "a1", campaignId: "invoice", status: "in_progress", answered: 4, total: 10, dueAt: daysFromNow(5), scorePercent: null, passed: null },
  { id: "a2", campaignId: "shared-docs", status: "not_started", answered: 0, total: 8, dueAt: daysFromNow(12), scorePercent: null, passed: null },
  { id: "a3", campaignId: "parcel", status: "completed", answered: 8, total: 8, dueAt: null, scorePercent: 88, passed: true },
  { id: "a4", campaignId: "account-alerts", status: "completed", answered: 10, total: 10, dueAt: null, scorePercent: 64, passed: false },
];

export const catalogById = (id: string) => SAMPLE_CATALOG.find((c) => c.id === id)!;
