"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Button, Card } from "@/components/ui";

// Landing page for the link in the onboarding verification email
function VerifyContent() {
  const token = useSearchParams().get("token");
  const [result, setResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  // Tokens are single-use; guard against React running the effect twice in dev
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    apiRequest<{ message: string }>("/onboarding-requests/verify", { method: "POST", body: { token } })
      .then((res) => setResult({ status: "success", message: res.message }))
      .catch((error) =>
        setResult({
          status: "error",
          message: error instanceof Error ? error.message : "We couldn't verify your email.",
        })
      );
  }, [token]);

  const status = !token ? "error" : (result?.status ?? "loading");
  const message = !token ? "This link is missing its verification token." : (result?.message ?? "");

  return (
    <Card className="w-full max-w-md p-8 text-center shadow-lg">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-[#2016a9]" />
          <h2 className="text-xl font-semibold text-gray-900">Verifying your email</h2>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-gray-900">Email verified</h2>
          <p className="text-gray-600">{message}</p>
          <p className="text-sm text-gray-500">
            When your organization is approved, you&apos;ll get an email with a link to set up your owner account.
          </p>
          <Link href="/" className="w-full">
            <Button className="w-full bg-[#2016a9] text-white hover:bg-blue-700">Back to home</Button>
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <XCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900">Verification failed</h2>
          <p className="text-gray-600">{message}</p>
          <p className="text-sm text-gray-500">
            Links expire after 7 days and can only be used once. You can submit a new request from the home page.
          </p>
          <Link href="/" className="w-full">
            <Button className="w-full bg-gray-100 text-gray-900 hover:bg-gray-200" variant="ghost">
              Back to home
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

export default function VerifyOnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-[#2016a9]" />}>
        <VerifyContent />
      </Suspense>
    </main>
  );
}
