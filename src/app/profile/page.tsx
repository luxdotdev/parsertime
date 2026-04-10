import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function BaseProfilePage() {
  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  if (!user) redirect("/sign-in");
  if (!user.battletag) notFound();
  redirect(`/profile/${user.battletag}`);
}
