"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LearnerShell, Spinner } from "@/components/learner/learner-shell";
import { TakeFlow } from "@/components/learner/take-flow";

function TakeView() {
  const id = useSearchParams().get("id");
  return <LearnerShell title="Assessment">{id ? <TakeFlow id={id} /> : <p className="text-sm text-gray-600">No assessment selected.</p>}</LearnerShell>;
}

export default function TakePage() {
  return (
    <Suspense fallback={<Spinner className="mt-24" />}>
      <TakeView />
    </Suspense>
  );
}
