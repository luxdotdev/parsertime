import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function BaseProfilePage() {
  const session = await auth();
  const user = await getUser(session?.user?.email);

  if (!user) redirect("/sign-in");
  if (!user.battletag) notFound();
  redirect(`/profile/${user.battletag}`);
}
