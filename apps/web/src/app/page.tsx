import { ClosedBetaBanner } from "@/components/home/banner";
import { LandingPage } from "@/components/home/landing-page";
import { V3LandingPage } from "@/components/home/v3/landing-page";
import type { Availability } from "@/lib/auth";
import { newLandingPage } from "@/lib/flags";
import { get } from "@vercel/edge-config";
import { Suspense } from "react";

export default function Home() {
  // The landing variant depends on a request-time flag, so the choice streams
  // in under Suspense instead of blocking the prerender. The fallback is empty
  // because the flag read is fast and either landing renders its own content.
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const [appAvailability, showNewLanding] = await Promise.all([
    get<Availability>("availability"),
    newLandingPage(),
  ]);

  const isPrivate = appAvailability === "private";

  return (
    <>
      {isPrivate && <ClosedBetaBanner />}
      {showNewLanding ? <V3LandingPage /> : <LandingPage />}
    </>
  );
}
