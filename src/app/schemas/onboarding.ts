import { z } from "zod";
import { CompanySize, Industry, OnboardingGoal, PlanTier, ReferralSource } from "@/types/onboarding";

// Mirrors server/src/rules/onboarding.rule.ts so most mistakes are caught
// before the request is sent; the server stays the source of truth.
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, { message }).optional().or(z.literal(""));

export const companyRequestSchema = z.object({
  // Step 1: company
  companyName: z.string().trim().min(2, { message: "Company name must be at least 2 characters" }).max(120),
  website: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v), {
      message: "Enter a valid website, e.g. acme.com",
    }),
  industry: z.enum(Industry, { message: "Select your industry" }),
  companySize: z.enum(CompanySize, { message: "Select your company size" }),
  expectedSeats: z
    .string()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100000), {
      message: "Enter a number between 1 and 100,000",
    }),
  country: z.string().length(2, { message: "Select your country" }),

  // Step 2: contact
  contactFirstName: z.string().trim().min(2, { message: "First name is required" }).max(50),
  contactLastName: z.string().trim().min(2, { message: "Last name is required" }).max(50),
  contactEmail: z.string().trim().email({ message: "Enter a valid email address" }),
  contactJobTitle: z.string().trim().min(2, { message: "Job title is required" }).max(100),
  contactPhone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\+[1-9]\d{6,14}$/.test(v.replace(/[\s()-]/g, "")), {
      message: "Use international format, e.g. +250 788 123 456",
    }),

  // Step 3: goals & consent
  goals: z.array(z.enum(OnboardingGoal)).min(1, { message: "Select at least one goal" }),
  referralSource: z.union([z.enum(ReferralSource), z.literal("")]),
  interestedPlan: z.union([z.enum(PlanTier), z.literal("")]),
  message: optionalText(1000, "Keep your message under 1,000 characters"),
  acceptTerms: z.boolean().refine((v) => v, { message: "You must accept the terms of service" }),
  confirmAuthority: z.boolean().refine((v) => v, {
    message: "You must confirm you can register this organization",
  }),
  marketingOptIn: z.boolean(),
});

export type CompanyRequestSchema = z.infer<typeof companyRequestSchema>;

export const COMPANY_REQUEST_STEPS: { title: string; fields: (keyof CompanyRequestSchema)[] }[] = [
  { title: "Company", fields: ["companyName", "website", "industry", "companySize", "expectedSeats", "country"] },
  { title: "Contact", fields: ["contactFirstName", "contactLastName", "contactEmail", "contactJobTitle", "contactPhone"] },
  {
    title: "Goals",
    fields: ["goals", "referralSource", "interestedPlan", "message", "acceptTerms", "confirmAuthority", "marketingOptIn"],
  },
];
