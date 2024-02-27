import ClosedBetaBanner from "@/components/home/banner";
import LandingPage from "@/components/home/landing-page";
import { Availability } from "@/lib/auth";
import { get } from "@vercel/edge-config";

export default async function Home() {
  const appAvailability = (await get("availability")) as Availability;

  const isPrivate = appAvailability === "private";

  return (
    <>
      {isPrivate && <ClosedBetaBanner />}
      <LandingPage />
    </>
  );
}
