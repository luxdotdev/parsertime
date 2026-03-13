export function GET() {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  const body = `Contact: mailto:help@parsertime.app
Expires: ${expires.toISOString()}
Preferred-Languages: en
Canonical: https://parsertime.app/.well-known/security.txt
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
