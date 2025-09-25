import { NoAuthCard } from "@/components/auth/no-auth";
import { isAuthedToViewTeam } from "@/lib/auth";

export default async function TeamLayout(props: LayoutProps<"/team/[teamId]">) {
  const params = await props.params;

  const { children } = props;

  const id = parseInt(params.teamId);
  const isAuthed = await isAuthedToViewTeam(id);

  if (!isAuthed) {
    return NoAuthCard();
  }

  // Must be wrapped in an element due to Next.js Server Component typing
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}
