import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export function GET() {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  const body = `Contact: mailto:${SUPPORT_EMAIL}
Expires: ${expires.toISOString()}
Preferred-Languages: en
Canonical: ${SITE_URL}/.well-known/security.txt
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
