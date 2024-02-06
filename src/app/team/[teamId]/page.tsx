import { AddMemberCard } from "@/components/team/add-member-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import Image from "next/image";

export default async function Team({ params }: { params: { teamId: string } }) {
  const teamId = parseInt(params.teamId);

  const teamData = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
  });

  const teamMembers = (await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: {
      users: true,
    },
  })) ?? { users: [] };

  return (
    <>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {teamData?.name ?? "Team Name"}
          </h2>
        </div>

        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Members
        </h3>

        {teamMembers?.users.length > 0 && (
          <div className="flex flex-wrap -m-2">
            {teamMembers?.users.map((user) => (
              <div key={user.id} className="p-2 w-1/3">
                <Card className="max-w-md relative h-36">
                  <Image
                    src={
                      user.image ?? `https://avatar.vercel.sh/${user.email}.png`
                    }
                    alt={
                      user.name
                        ? `Profile picture of ${user.name}`
                        : "Default user avatar"
                    }
                    width={100}
                    height={100}
                    className="rounded-full float-right p-4"
                  />
                  <CardHeader className="flex">
                    <div>
                      <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                        {user.name}
                      </h4>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p>{user.email}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
            <AddMemberCard />
          </div>
        )}
      </div>
    </>
  );
}
