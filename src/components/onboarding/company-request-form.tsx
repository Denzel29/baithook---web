"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "../ui";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { ApiError, apiRequest } from "@/lib/api";
import {
  COMPANY_REQUEST_STEPS,
  companyRequestSchema,
  type CompanyRequestSchema,
} from "@/app/schemas/onboarding";
import {
  COMPANY_SIZE_LABELS,
  GOAL_LABELS,
  INDUSTRY_LABELS,
  PLAN_LABELS,
  REFERRAL_LABELS,
  type OnboardingRequestResult,
} from "@/types/onboarding";
import { getCountryOptions, guessCountry, guessTimezone } from "./countries";

// Native selects/textareas styled to match ui/input
const fieldClass =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm";

const Required = () => <span className="text-red-500">*</span>;

export const CompanyRequestForm = () => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const countries = useMemo(() => getCountryOptions(), []);

  const form = useForm<CompanyRequestSchema>({
    resolver: zodResolver(companyRequestSchema),
    defaultValues: {
      companyName: "",
      website: "",
      industry: undefined,
      companySize: undefined,
      expectedSeats: "",
      country: "",
      contactFirstName: "",
      contactLastName: "",
      contactEmail: "",
      contactJobTitle: "",
      contactPhone: "",
      goals: [],
      referralSource: "",
      interestedPlan: "",
      message: "",
      acceptTerms: false,
      confirmAuthority: false,
      marketingOptIn: false,
    },
  });

  // Browser-only guess, so it runs after mount to keep static export hydration clean
  useEffect(() => {
    if (!form.getValues("country")) form.setValue("country", guessCountry());
  }, [form]);

  const isLastStep = step === COMPANY_REQUEST_STEPS.length - 1;

  const goNext = async () => {
    const valid = await form.trigger(COMPANY_REQUEST_STEPS[step].fields, { shouldFocus: true });
    if (valid) setStep((s) => s + 1);
  };

  // Server validation errors are shown on their field, on the step that owns it
  const showServerErrors = (error: ApiError) => {
    const known = error.fieldErrors.filter(
      (e): e is { field: keyof CompanyRequestSchema; message: string } =>
        !!e.field && e.field in companyRequestSchema.shape
    );
    if (known.length === 0) return false;

    known.forEach((e) => form.setError(e.field, { message: e.message }));
    const firstStep = COMPANY_REQUEST_STEPS.findIndex((s) => s.fields.includes(known[0].field));
    if (firstStep >= 0) setStep(firstStep);
    return true;
  };

  const onSubmit = async (data: CompanyRequestSchema) => {
    setIsLoading(true);
    try {
      await apiRequest<OnboardingRequestResult>("/onboarding-requests", {
        method: "POST",
        body: {
          companyName: data.companyName,
          website: data.website || undefined,
          industry: data.industry,
          companySize: data.companySize,
          expectedSeats: data.expectedSeats ? Number(data.expectedSeats) : undefined,
          country: data.country,
          timezone: guessTimezone(),
          contactFirstName: data.contactFirstName,
          contactLastName: data.contactLastName,
          contactEmail: data.contactEmail,
          contactJobTitle: data.contactJobTitle,
          contactPhone: data.contactPhone ? data.contactPhone.replace(/[\s()-]/g, "") : undefined,
          goals: data.goals,
          referralSource: data.referralSource || undefined,
          interestedPlan: data.interestedPlan || undefined,
          message: data.message || undefined,
          acceptTerms: data.acceptTerms,
          confirmAuthority: data.confirmAuthority,
          marketingOptIn: data.marketingOptIn,
        },
      });
      setSubmittedEmail(data.contactEmail);
    } catch (error) {
      if (error instanceof ApiError && showServerErrors(error)) {
        toast.error("Please check the highlighted fields");
      } else {
        toast.error(error instanceof Error ? error.message : "Could not submit your request");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="space-y-4 py-4 text-center">
        <MailCheck className="mx-auto h-14 w-14 text-[#2016a9]" />
        <h3 className="text-xl font-bold text-gray-900">Check your inbox</h3>
        <p className="text-sm text-gray-600">
          We sent a verification link to <span className="font-semibold text-gray-900">{submittedEmail}</span>.
          Once you confirm it, our team will review your request, usually within one business day.
        </p>
        <p className="text-xs text-gray-500">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <button
            type="button"
            className="cursor-pointer font-medium text-[#2016a9] underline-offset-2 hover:underline"
            onClick={() => {
              setSubmittedEmail(null);
              setStep(0);
            }}
          >
            submit the request again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6 text-left">
      <div className="text-center">
        <h2 className="mb-1 flex items-center justify-center space-x-2 text-2xl font-bold">
          <Image src="/logo-mini.png" alt="Baitline Logo" width={26} height={26} />
          <span className="text-[#2016a9]">Baitline for teams</span>
        </h2>
        <p className="text-base tracking-wide text-[#6D7580]">
          Request access for your organization
        </p>
      </div>

      {/* Step indicator */}
      <ol className="flex items-center gap-2" aria-label="Form progress">
        {COMPANY_REQUEST_STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < step
                  ? "bg-[#2016a9] text-white"
                  : i === step
                    ? "border-2 border-[#2016a9] text-[#2016a9]"
                    : "border border-gray-300 text-gray-400"
              }`}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-sm ${i === step ? "font-semibold text-gray-900" : "text-gray-500"}`}>
              {s.title}
            </span>
            {i < COMPANY_REQUEST_STEPS.length - 1 && <span className="h-px flex-1 bg-gray-200" />}
          </li>
        ))}
      </ol>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            // Enter on an earlier step advances instead of submitting
            if (!isLastStep) {
              e.preventDefault();
              void goNext();
              return;
            }
            void form.handleSubmit(onSubmit)(e);
          }}
          className="space-y-4"
          noValidate
        >
          {step === 0 && (
            <>
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Company name<Required />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Corporation" autoComplete="organization" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="acme.com" autoComplete="url" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Industry<Required />
                      </FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value ?? ""}
                          className={`${fieldClass} h-8`}
                          disabled={isLoading}
                        >
                          <option value="" disabled>
                            Select…
                          </option>
                          {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Company size<Required />
                      </FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value ?? ""}
                          className={`${fieldClass} h-8`}
                          disabled={isLoading}
                        >
                          <option value="" disabled>
                            Select…
                          </option>
                          {Object.entries(COMPANY_SIZE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Country<Required />
                      </FormLabel>
                      <FormControl>
                        <select {...field} className={`${fieldClass} h-8`} autoComplete="country" disabled={isLoading}>
                          <option value="" disabled>
                            Select…
                          </option>
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedSeats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>People to train</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="numeric" placeholder="e.g. 40" disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        First name<Required />
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Jane" autoComplete="given-name" disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Last name<Required />
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Doe" autoComplete="family-name" disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Work email<Required />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="jane@acme.com"
                        autoComplete="email"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      You&apos;ll become the organization owner. A company address speeds up approval.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactJobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Job title<Required />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="IT Manager" autoComplete="organization-title" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="+250 788 123 456" autoComplete="tel" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {step === 2 && (
            <>
              <FormField
                control={form.control}
                name="goals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      What brings you to Baitline?<Required />
                    </FormLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(GOAL_LABELS).map(([value, label]) => {
                        const checked = field.value.includes(value as CompanyRequestSchema["goals"][number]);
                        return (
                          <label
                            key={value}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                              checked ? "border-[#2016a9] bg-indigo-50 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#2016a9]"
                              checked={checked}
                              disabled={isLoading}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.checked
                                    ? [...field.value, value]
                                    : field.value.filter((g) => g !== value)
                                )
                              }
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="interestedPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan you&apos;re considering</FormLabel>
                      <FormControl>
                        <select {...field} className={`${fieldClass} h-8`} disabled={isLoading}>
                          <option value="">Not sure yet</option>
                          {Object.entries(PLAN_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referralSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about us?</FormLabel>
                      <FormControl>
                        <select {...field} className={`${fieldClass} h-8`} disabled={isLoading}>
                          <option value="">Prefer not to say</option>
                          {Object.entries(REFERRAL_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anything we should know?</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        maxLength={1000}
                        placeholder="Timelines, compliance requirements, questions…"
                        className={`${fieldClass} resize-y py-2`}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                {(
                  [
                    ["confirmAuthority", "I'm authorized to register this organization", true],
                    ["acceptTerms", "I accept the terms of service and privacy policy", true],
                    ["marketingOptIn", "Send me occasional product updates", false],
                  ] as const
                ).map(([name, label, required]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
                          <FormControl>
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 accent-[#2016a9]"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              onBlur={field.onBlur}
                              ref={field.ref}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <span>
                            {label}
                            {required && <Required />}
                          </span>
                        </label>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                onClick={() => setStep((s) => s - 1)}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2016a9] text-white hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : isLastStep ? "Submit request" : "Continue"}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
};
