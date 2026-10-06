// Mirrors the onboarding enums in server/src/types/enums.ts (kept in sync by
// hand, like shared.ts).

export enum Industry {
	FINANCE = 'finance',
	HEALTHCARE = 'healthcare',
	EDUCATION = 'education',
	GOVERNMENT = 'government',
	TECHNOLOGY = 'technology',
	RETAIL = 'retail',
	MANUFACTURING = 'manufacturing',
	NONPROFIT = 'nonprofit',
	OTHER = 'other'
}

export enum CompanySize {
	XS = '1-10',
	S = '11-50',
	M = '51-200',
	L = '201-500',
	XL = '501-1000',
	XXL = '1000+'
}

export enum OnboardingGoal {
	SECURITY_AWARENESS = 'security_awareness',
	COMPLIANCE = 'compliance',
	BASELINE_RISK = 'baseline_risk',
	POST_INCIDENT = 'post_incident',
	ONBOARDING_TRAINING = 'onboarding_training',
	OTHER = 'other'
}

export enum ReferralSource {
	SEARCH = 'search',
	REFERRAL = 'referral',
	SOCIAL = 'social',
	EVENT = 'event',
	OTHER = 'other'
}

export enum PlanTier {
	FREE = 'free',
	TEAM = 'team',
	ENTERPRISE = 'enterprise'
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
	[Industry.FINANCE]: 'Finance & banking',
	[Industry.HEALTHCARE]: 'Healthcare',
	[Industry.EDUCATION]: 'Education',
	[Industry.GOVERNMENT]: 'Government & public sector',
	[Industry.TECHNOLOGY]: 'Technology',
	[Industry.RETAIL]: 'Retail & e-commerce',
	[Industry.MANUFACTURING]: 'Manufacturing',
	[Industry.NONPROFIT]: 'Non-profit',
	[Industry.OTHER]: 'Other'
};

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
	[CompanySize.XS]: '1–10 employees',
	[CompanySize.S]: '11–50 employees',
	[CompanySize.M]: '51–200 employees',
	[CompanySize.L]: '201–500 employees',
	[CompanySize.XL]: '501–1,000 employees',
	[CompanySize.XXL]: 'More than 1,000 employees'
};

export const GOAL_LABELS: Record<OnboardingGoal, string> = {
	[OnboardingGoal.SECURITY_AWARENESS]: 'General security awareness',
	[OnboardingGoal.COMPLIANCE]: 'Compliance requirement',
	[OnboardingGoal.BASELINE_RISK]: 'Measure our phishing risk',
	[OnboardingGoal.POST_INCIDENT]: 'Follow-up after an incident',
	[OnboardingGoal.ONBOARDING_TRAINING]: 'New-hire training',
	[OnboardingGoal.OTHER]: 'Something else'
};

export const REFERRAL_LABELS: Record<ReferralSource, string> = {
	[ReferralSource.SEARCH]: 'Search engine',
	[ReferralSource.REFERRAL]: 'Recommendation',
	[ReferralSource.SOCIAL]: 'Social media',
	[ReferralSource.EVENT]: 'Event or conference',
	[ReferralSource.OTHER]: 'Other'
};

export const PLAN_LABELS: Record<PlanTier, string> = {
	[PlanTier.FREE]: 'Free — trying it out',
	[PlanTier.TEAM]: 'Team',
	[PlanTier.ENTERPRISE]: 'Enterprise'
};

export interface OnboardingRequestResult {
	id: string;
	status: 'unverified' | 'pending';
	message: string;
}

export enum OnboardingRequestStatus {
	UNVERIFIED = 'unverified',
	PENDING = 'pending',
	APPROVED = 'approved',
	REJECTED = 'rejected',
	EXPIRED = 'expired'
}

export enum OrgStatus {
	PENDING_SETUP = 'pending_setup',
	ACTIVE = 'active',
	SUSPENDED = 'suspended'
}

export interface OnboardingRequest {
	id: string;
	companyName: string;
	website: string | null;
	primaryDomain: string | null;
	industry: Industry;
	companySize: CompanySize;
	expectedSeats: number | null;
	country: string;
	timezone: string;
	contactFirstName: string;
	contactLastName: string;
	contactEmail: string;
	contactJobTitle: string;
	contactPhone: string | null;
	goals: OnboardingGoal[];
	hasExistingProgram: boolean | null;
	message: string | null;
	referralSource: ReferralSource | null;
	interestedPlan: PlanTier | null;
	marketingOptIn: boolean;
	status: OnboardingRequestStatus;
	emailVerifiedAt: string | null;
	isFreeEmailDomain: boolean;
	possibleDuplicateOrgId: string | null;
	reviewedAt: string | null;
	reviewNote: string | null;
	organizationId: string | null;
	createdAt: string;
}

export interface OnboardingRequestDetail extends OnboardingRequest {
	possibleDuplicateOrg: { id: string; name: string; primaryDomain: string | null } | null;
	contactAccount: { exists: boolean; organizationId: string | null };
}

export interface OrganizationRecord {
	id: string;
	name: string;
	planTier: PlanTier;
	seatLimit: number | null;
	ownerUserId: string | null;
	status: OrgStatus;
	industry: Industry | null;
	companySize: CompanySize | null;
	country: string | null;
	timezone: string;
	website: string | null;
	primaryDomain: string | null;
	allowedDomains: string[];
	allowedEmails: string[];
	activatedAt: string | null;
	suspendedAt: string | null;
	suspensionReason: string | null;
	createdAt: string;
}

export interface OnboardingChecklist {
	status: OrgStatus;
	activatedAt: string | null;
	steps: { step: string; required: boolean; done: boolean; completedAt: string | null }[];
	requiredRemaining: string[];
	nextStep: string | null;
}

export interface PlanUsage {
	planTier: PlanTier;
	enforced: boolean;
	periodStart: string;
	limits: { limit: string; max: number | null; current: number }[];
	usageThisPeriod: Record<string, number>;
}

export interface Paginated<T> {
	data: T[];
	total: number;
}

export interface InviteLookup {
	email: string;
	firstName: string | null;
	lastName: string | null;
	organizationName: string;
	isOwner: boolean;
	expiresAt: string;
	existingAccount: boolean;
}
