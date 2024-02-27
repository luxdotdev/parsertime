import NoAuthCard from "@/components/auth/no-auth";
import { auth } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import prisma from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  if (user?.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  return <>{children}</>;
}