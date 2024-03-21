"use client";

import { GetTeamsResponse } from "@/app/api/team/get-teams/route";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function EmptyTeamView() {
  const [isClient, setIsClient] = useState(false);
  const [newTeamCreated, setNewTeamCreated] = useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (newTeamCreated) {
      setNewTeamCreated(false);
      router.refresh();
    }
  }, [newTeamCreated, router]);

  if (!isClient)
    return (
      <Card className="border-dashed">
        <div className="flex flex-col items-center justify-center space-y-2 h-[36rem]">
          <Skeleton className="w-28 h-8" />
          <Skeleton className="w-96 h-5" />
          <Skeleton className="w-64 h-8" />
          <Skeleton className="w-24 h-8" />
        </div>
      </Card>
    );

  return (
    <Card className="border-dashed">
      <CardDescription>
        <div className="flex flex-col items-center justify-center space-y-2 h-[36rem]">
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            No Teams
          </h2>
          <p className="text-gray-500">
            <Link href="/team/join">
              Click here to join a team from an invite code.
            </Link>
          </p>
          <p className="text-gray-500">
            Or, create a new team by clicking the button below.
          </p>
          <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
            <DialogTrigger asChild>
              <Button>Create Team</Button>
            </DialogTrigger>
            <CreateTeamDialog
              setShowNewTeamDialog={setShowNewTeamDialog}
              setNewTeamCreated={setNewTeamCreated}
            />
          </Dialog>
        </div>
      </CardDescription>
    </Card>
  );
}