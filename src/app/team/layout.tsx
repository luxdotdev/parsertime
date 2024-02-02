import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthed = await auth();

  if (!isAuthed) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
