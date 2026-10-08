"use client";

import Image from "next/image";
import Link from "next/link";
import { CompanyRequestForm } from "@/components/onboarding/company-request-form";
import { SiteFooter } from "@/components/site-footer";

// Standalone home for the company request form, linked from the site header
// and footer. The same form also appears on the home page's Organizations tab.
export default function RegisterOrganizationPage() {
  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Image src="/logo3.png" alt="Baitline" width={150} height={100} />
          </Link>
          <Link href="/login" className="rounded-[6px] border border-gray-200 bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200">
            Login
          </Link>
        </div>
      </header>
      <main className="bg-gray-50 px-4 py-12">
        <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-2">
          <div className="lg:pt-8">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Train your whole team to spot the <span className="text-[#332c8e]">Hook</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Tell us about your organization. Once our team approves the request, you&apos;ll get an email to set up your
              owner account and invite your people.
            </p>
            <ol className="mt-8 space-y-4 text-gray-700">
              {[
                "Submit the request and verify your email",
                "We review it, usually within one business day",
                "Set up your account, departments and team",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2016a9] text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-2xl">
            <CompanyRequestForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
