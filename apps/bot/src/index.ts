import "./instrumentation.ts";
import { Client, GatewayIntentBits } from "discord.js";
import { startServer } from "./api/server.ts";
import * as interactionCreate from "./events/interactionCreate.ts";
import * as ready from "./events/ready.ts";
import { startAvailabilityReminderScheduler } from "./scheduler/availability-reminders.ts";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Register event handlers
client.once(ready.name, (...args) => ready.execute(...(args as [any])));
client.on(interactionCreate.name, (...args) =>
  interactionCreate.execute(...(args as [any])),
);

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Start HTTP server for Parsertime -> Bot communication
const port = Number(process.env.PORT) || 8080;
startServer(client, port);

// Start availability reminder scheduler (polls parsertime every minute).
// Use "clientReady" (the non-deprecated name) so we don't add a second
// listener on the deprecated "ready" event.
client.once("clientReady", () => {
  startAvailabilityReminderScheduler(client);
});
