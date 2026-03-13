import { ClosedBetaBanner } from "@/components/home/banner";
import { LandingPage } from "@/components/home/landing-page";
import { NewLandingPage } from "@/components/home/new-landing/landing-page";
import type { Availability } from "@/lib/auth";
import { newLandingPage } from "@/lib/flags";
import { get } from "@vercel/edge-config";

export default async function Home() {
  const [appAvailability, showNewLanding] = await Promise.all([
    get<Availability>("availability"),
    newLandingPage(),
  ]);

  const isPrivate = appAvailability === "private";

  return (
    <>
      {isPrivate && <ClosedBetaBanner />}
      {showNewLanding ? <NewLandingPage /> : <LandingPage />}
    </>
  );
}
