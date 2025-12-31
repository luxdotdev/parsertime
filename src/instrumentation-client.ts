import { initBotId } from "botid/client/core";

// Define the paths that need bot protection.
// These are paths that are routed to by your app.
// These can be:
// - API endpoints (e.g., '/api/checkout')
// - Server actions invoked from a page (e.g., '/dashboard')
// - Dynamic routes (e.g., '/api/create/*')

initBotId({
  protect: [
    {
      path: "/api/send-contact-form-email",
      method: "POST",
    },
    {
      path: "/api/send-team-invite",
      method: "POST",
    },
    {
      path: "/api/team/*",
      method: "POST",
    },
    {
      path: "/api/user/*",
      method: "POST",
    },
    {
      path: "/api/scrim/*",
      method: "POST",
    },
  ],
});
