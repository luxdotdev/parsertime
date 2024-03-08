import { $ } from "bun";

// Create a backup of the production database
const output =
  await $`pg_dump --disable-triggers -v -a -d "${process.env.PROD_DB_URL}" -f /verceldb_dump.sql`;

const backup = Bun.file("/verceldb_dump.sql");

if (backup.size === 0) {
  // Stop the process if there was an error
  // We do not want to continue if the backup failed
  // because we will be clearing the replica database
  console.log("Backup failed");
  process.exit(1);
}

const tablesToTruncate =
  '"_TeamToUser", "Account", "DefensiveAssist", "DvaRemech", "EchoDuplicateEnd", "EchoDuplicateStart", "HeroSpawn", "HeroSwap", "Kill", "Map", "MapData", "MatchEnd", "MatchStart", "MercyRez", "ObjectiveCaptured", "ObjectiveUpdated", "OffensiveAssist", "PayloadProgress", "PlayerStat", "PointProgress", "RemechCharged", "RoundEnd", "RoundStart", "Scrim", "Session", "SetupComplete", "Team", "TeamInviteToken", "TeamManager", "UltimateCharged", "UltimateEnd", "UltimateStart", "User", "VerificationToken"';

// Clear the replica database
await $`psql "${process.env.REPLICA_DB_URL}" -c 'TRUNCATE TABLE '${tablesToTruncate}' CASCADE;'`;

// Apply the backup to the replica database
await $`psql "${process.env.REPLICA_DB_URL}" -c "SET session_replication_role = 'replica';"`;
await $`psql "${process.env.REPLICA_DB_URL}" -f /verceldb_dump.sql`;
await $`psql "${process.env.REPLICA_DB_URL}" -c "SET session_replication_role = 'origin';"`;

console.log("Backup and restore completed!");
