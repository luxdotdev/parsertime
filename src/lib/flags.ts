import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { vercelAdapter } from "@flags-sdk/vercel";
import type { $Enums } from "@prisma/client";
import { dedupe, flag } from "flags/next";

type Entities = {
  user?: {
    id: string;
    email: string;
    role: $Enums.UserRole;
  };
  teams?: {
    idArray: string[];
  };
};

const identify = dedupe(async (): Promise<Entities> => {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { email: session?.user?.email },
    include: { teams: true },
  });

  return {
    user: user
      ? {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      : undefined,
    teams:
      user?.teams && user?.teams.length > 0
        ? { idArray: user?.teams.map((team) => team.id.toString()) }
        : undefined,
  };
});

export const mapComparison = flag({
  key: "map-comparison",
  adapter: vercelAdapter(),
  options: [
    {
      value: true,
      label: "Enabled",
    },
    {
      value: false,
      label: "Disabled",
    },
  ],
  defaultValue: false,
  description: "Enable or disable map comparison",
  identify,
});

export const playerComparison = flag({
  key: "player-comparison",
  adapter: vercelAdapter(),
  options: [
    {
      value: true,
      label: "Enabled",
    },
    {
      value: false,
      label: "Disabled",
    },
  ],
  defaultValue: false,
  description: "Enable or disable player comparison",
  identify,
});
