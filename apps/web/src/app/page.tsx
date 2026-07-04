import { ClosedBetaBanner } from "@/components/home/banner";
import { V3LandingPage } from "@/components/home/v3/landing-page";
import type { Availability } from "@/lib/auth";
import { get } from "@vercel/edge-config";
import { cacheLife } from "next/cache";

async function getAvailability() {
  "use cache";
  cacheLife("minutes");
  return get<Availability>("availability");
}

// Marketing page: fully prerendered into the static shell (no loading state).
// The availability read is cached so it can be part of the shell; the landing
// page streams only its logged-in CTA state.
export default async function Home() {
  const appAvailability = await getAvailability();
  const isPrivate = appAvailability === "private";

  return (
    <>
      {isPrivate && <ClosedBetaBanner />}
      <V3LandingPage />
    </>
  );
}
