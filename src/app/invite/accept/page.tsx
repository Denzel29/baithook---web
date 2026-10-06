"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiRequest } from "@/lib/api";
import { getDashboardRoute, useAuth } from "@/providers/auth-provider";
import { Button, Card, Input } from "@/components/ui";
import type { LoginResponse } from "@/types/shared";
import type { InviteLookup } from "@/types/onboarding";

// Landing page for invitation emails (organization owners and employees)
function AcceptInvite() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const { login } = useAuth();
  const [invite, setInvite] = useState<InviteLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const looked = useRef(false);

  useEffect(() => {
    if (!token || looked.current) return;
    looked.current = true;
    apiRequest<InviteLookup>("/invites/lookup", { method: "POST", body: { token } })
      .then(setInvite)
      .catch((e) => setLookupError(e instanceof Error ? e.message : "This invitation is invalid."));
  }, [token]);

  const error = !token ? "This link is missing its invitation token." : lookupError;

  if (error) {
    return (
      <Card className="w-full max-w-md p-8 text-center shadow-lg">
        <XCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
        <h2 className="text-xl font-bold text-gray-900">Invitation unavailable</h2>
        <p className="mt-2 text-gray-600">{error}</p>
        <p className="mt-2 text-sm text-gray-500">Invitations expire after 7 days. Ask your administrator to resend it.</p>
        <Link href="/" className="mt-6 block">
          <Button variant="ghost" className="w-full">Back to home</Button>
        </Link>
      </Card>
    );
  }

  if (!invite) return <Loader2 className="h-10 w-10 animate-spin text-[#2016a9]" />;

  const needsName = !invite.existingAccount && (!invite.firstName || !invite.lastName);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.existingAccount && password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<LoginResponse>("/invites/accept", {
        method: "POST",
        body: {
          token,
          password,
          ...(needsName ? { firstName: firstName.trim(), lastName: lastName.trim() } : {}),
        },
      });
      login(result);
      toast.success(`Welcome to ${invite.organizationName}!`);
      router.push(getDashboardRoute(result.user));
    } catch (err) {
      const fieldMessage = err instanceof ApiError ? err.fieldErrors[0]?.message : undefined;
      toast.error(fieldMessage ?? (err instanceof Error ? err.message : "Could not accept the invitation"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 shadow-lg">
      <div className="mb-6 text-center">
        <Building2 className="mx-auto mb-3 h-12 w-12 text-[#2016a9]" />
        <h2 className="text-2xl font-bold text-gray-900">Join {invite.organizationName}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {invite.isOwner
            ? "Your organization has been approved. You'll be its owner."
            : "You've been invited to train with your team on Baitline."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
          Signing in as <span className="font-semibold">{invite.email}</span>
        </div>

        {needsName && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">First name</span>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required minLength={2} autoComplete="given-name" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">Last name</span>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required minLength={2} autoComplete="family-name" />
            </label>
          </div>
        )}

        {invite.existingAccount ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Your current Baitline password</span>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <span className="mt-1 block text-xs text-gray-500">
              You already have a personal account. Confirm it to link it to {invite.organizationName}.
            </span>
          </label>
        ) : (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Create a password</span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={64} autoComplete="new-password" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Confirm password</span>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} maxLength={64} autoComplete="new-password" />
            </label>
          </>
        )}

        <Button type="submit" className="flex w-full items-center justify-center gap-2 bg-[#2016a9] text-white hover:bg-blue-700" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {invite.existingAccount ? "Link my account" : "Accept invitation"}
        </Button>
      </form>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-[#2016a9]" />}>
        <AcceptInvite />
      </Suspense>
    </main>
  );
}
