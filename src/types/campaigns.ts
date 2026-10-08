// Campaign authoring types. These mirror what the server returns for company
// and platform admins; learners never receive answer data (indicators, scans).

export type Difficulty = "obvious" | "moderate" | "subtle";
export type CampaignStatus = "draft" | "generating" | "in_review" | "active" | "completed" | "archived";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type MaterialType = "briefing" | "quick_reference";
export type PageKind = "login" | "document_share" | "payment" | "mfa" | "download" | "portal" | "generic";
export type InputType = "text" | "email" | "password" | "otp" | "card" | "phone";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { obvious: "Obvious", moderate: "Moderate", subtle: "Subtle" };
export const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  obvious: "Many clear tells: urgency, poor language, generic greetings.",
  moderate: "Clean writing. The link or sender is the main tell.",
  subtle: "Polished and personal. One or two quiet tells.",
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  generating: "Generating",
  in_review: "In review",
  active: "Live",
  completed: "Completed",
  archived: "Archived",
};

export const PAGE_KIND_LABELS: Record<PageKind, string> = {
  login: "Sign-in",
  document_share: "Shared document",
  payment: "Payment",
  mfa: "Verification code",
  download: "Download / attachment",
  portal: "Portal",
  generic: "Generic",
};

export const INPUT_TYPE_LABELS: Record<InputType, string> = {
  text: "Text",
  email: "Email",
  password: "Password",
  otp: "One-time code",
  card: "Card number",
  phone: "Phone",
};

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  parcel_delivery: "Parcel delivery",
  payroll_hr: "Payroll / HR",
  shared_document: "Shared document",
  account_security: "Account security",
  vendor_invoice: "Vendor invoice",
  it_helpdesk: "IT help desk",
  event_invite: "Event invite",
  policy_update: "Policy update",
  executive_request: "Executive request",
  other: "Other",
};

export interface Indicator {
  id: string;
  label: string;
  category: string;
  description: string;
  howToSpot: string;
  triggerPhrases: string[];
  structural: boolean;
}

export interface CampaignCounts {
  emails: { total: number; approved: number; pending: number; rejected: number; phishing: number; benign: number };
  pages: { total: number; approved: number; pending: number; rejected: number };
  materials: { total: number; approved: number; pending: number };
}

export interface Campaign {
  id: string;
  organizationId: string | null;
  name: string;
  description: string;
  difficulty: Difficulty;
  focusIndicators: string[];
  templateCategories: string[];
  benignPerAttempt: number;
  phishingPerAttempt: number;
  poolMultiplier: number;
  passThreshold: number;
  maxAttempts: number | null;
  allowSpoofImperfections: boolean;
  tailorToAudience: boolean;
  publishedToCatalog: boolean;
  status: CampaignStatus;
  launchTime: string | null;
  createdAt: string;
  updatedAt: string;
  counts: CampaignCounts;
}

export type CampaignInput = Pick<
  Campaign,
  | "name"
  | "description"
  | "difficulty"
  | "focusIndicators"
  | "templateCategories"
  | "benignPerAttempt"
  | "phishingPerAttempt"
  | "poolMultiplier"
  | "passThreshold"
  | "maxAttempts"
  | "allowSpoofImperfections"
  | "tailorToAudience"
>;

export interface Readiness {
  ready: boolean;
  problems: string[];
  needed: { phishing: number; benign: number };
  counts: CampaignCounts;
}

export interface EmailLink {
  text: string;
  displayHref: string;
  pageKey: string;
}

export interface EmailAttachment {
  filename: string;
  sizeKb: number;
  pageKey: string;
}

export interface EmailIndicator {
  indicatorId: string;
  excerpt: string;
  explanation: string;
}

export type ScanWarning =
  | { code: "CLAIMED_NOT_FOUND"; indicatorId: string }
  | { code: "BENIGN_TOO_PHISHY"; indicatorIds: string[] }
  | { code: "UNSAFE_LINK"; original: string }
  | { code: "PHISHING_TOO_FEW"; count: number }
  | { code: "PHISHING_TOO_MANY"; count: number }
  | { code: "MISSING_PAGE"; pageKey: string };

export interface ScanResult {
  matches: { indicatorId: string; excerpt: string; start: number; end: number; field: string }[];
  detectedIndicators: string[];
  warnings: ScanWarning[];
}

export interface EmailContent {
  isPhishing: boolean;
  senderName: string;
  senderAddress: string;
  subject: string;
  greeting: string;
  body: string;
  cta: EmailLink | null;
  links: EmailLink[];
  attachments: EmailAttachment[];
  indicators: EmailIndicator[];
  benignRationale: string | null;
}

export interface CampaignEmail extends EmailContent {
  id: string;
  campaignId: string;
  scanResult: ScanResult | null;
  reviewStatus: ReviewStatus;
  reviewerNotes: string | null;
  editedByHuman: boolean;
  updatedAt: string;
}

export type PageAction =
  | { goto: string }
  | { branches: { if: { field: string; filled: boolean }; goto: string }[]; default: string }
  | { end: "dead_end" | "return_to_inbox" };

export type PageBlock =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; assetRef: string; alt: string }
  | { id: string; type: "form"; fields: { name: string; label: string; inputType: InputType }[]; submit: { label: string; action: PageAction } }
  | { id: string; type: "button"; label: string; action: PageAction }
  | { id: string; type: "link"; text: string; displayHref: string; action: PageAction };

export interface PageContent {
  key: string;
  title: string;
  displayUrl: string;
  kind: PageKind;
  blocks: PageBlock[];
}

export interface SandboxPage extends PageContent {
  id: string;
  campaignId: string;
  reviewStatus: ReviewStatus;
  reviewerNotes: string | null;
  updatedAt: string;
}

export interface PagePattern {
  id: string;
  label: string;
  description: string;
  phishing: boolean;
  entryKey: string;
  pages: { key: string; title: string }[];
}

export interface TrainingMaterial {
  id: string;
  campaignId: string;
  type: MaterialType;
  title: string;
  content: string;
  reviewStatus: ReviewStatus;
  reviewerNotes: string | null;
}
