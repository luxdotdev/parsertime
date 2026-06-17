// botid disabled: KPSDK (p.js) has a SyntaxError that causes all
// protected-route fetches to hang when ad blockers corrupt the script.
// Re-enable once Vercel ships a stable patch.
//
// import { initBotId } from "botid/client/core";
//
// initBotId({
//   protect: [
//     { path: "/api/send-contact-form-email", method: "POST" },
//     { path: "/api/send-team-invite", method: "POST" },
//     { path: "/api/team/*", method: "POST" },
//     { path: "/api/user/*", method: "POST" },
//     { path: "/api/scrim/*", method: "POST" },
//   ],
// });
