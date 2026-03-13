export function GET() {
  const body = `Contact: mailto:help@parsertime.app
Expires: 2027-03-13T00:00:00.000Z
Preferred-Languages: en
Canonical: https://parsertime.app/.well-known/security.txt
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
