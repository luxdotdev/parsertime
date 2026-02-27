import { MatchLabelingView } from "@/components/data-labeling/match-labeling-view";
import { getMatchForLabeling } from "@/data/data-labeling-dto";
import { dataLabeling } from "@/lib/flags";
import { notFound } from "next/navigation";

type Params = { matchId: string };

export default async function MatchLabelingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const enabled = await dataLabeling();
  if (!enabled) notFound();

  const { matchId } = await params;
  const id = Number(matchId);
  if (Number.isNaN(id)) notFound();

  const match = await getMatchForLabeling(id);
  if (!match) notFound();

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-8 sm:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <MatchLabelingView match={match} />
      </div>
    </div>
  );
}
