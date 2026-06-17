export function verifyBotSecret(req: Request): boolean {
  const auth = req.headers.get("Authorization");
  return auth === `Bearer ${process.env.BOT_SECRET}`;
}
