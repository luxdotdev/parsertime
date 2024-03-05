import NoAuthCard from "@/components/auth/no-auth";
import { isAuthedToViewTeam } from "@/lib/auth";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { teamId: string };
}) {
  const id = parseInt(params.teamId);
  const isAuthed = await isAuthedToViewTeam(id);

  if (!isAuthed) {
    return NoAuthCard();
  }

  // Must be wrapped in an element due to Next.js Server Component typing
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}
