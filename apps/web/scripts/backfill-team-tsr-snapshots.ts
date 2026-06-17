import { recomputeAllTeamTsrSnapshots } from "@/lib/matchmaker/snapshot";

async function main() {
  console.log("Backfilling TeamTsrSnapshot for all teams…");
  const result = await recomputeAllTeamTsrSnapshots();
  console.log(`Done: ${result.written} written, ${result.cleared} cleared.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
