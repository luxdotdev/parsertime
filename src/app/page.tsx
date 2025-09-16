import ClosedBetaBanner from "@/components/home/banner";
import LandingPage from "@/components/home/landing-page";
import type { Availability } from "@/lib/auth";
import { get } from "@vercel/edge-config";

export default async function Home() {
  const appAvailability = await get<Availability>("availability");

  const isPrivate = appAvailability === "private";

  return (
    <>
      {isPrivate && <ClosedBetaBanner />}
      <LandingPage />
    </>
  );
}
