"use client";

import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ClientOnly } from "@/lib/client-only";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function EmptyTeamView() {
  const [newTeamCreated, setNewTeamCreated] = useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (newTeamCreated) {
      setNewTeamCreated(false);
      router.refresh();
    }
  }, [newTeamCreated, router]);

  return (
    <ClientOnly>
      <Card className="border-dashed">
        <CardDescription>
          <div className="flex h-[36rem] flex-col items-center justify-center space-y-2">
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
            <Dialog
              open={showNewTeamDialog}
              onOpenChange={setShowNewTeamDialog}
            >
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
    </ClientOnly>
  );
}
