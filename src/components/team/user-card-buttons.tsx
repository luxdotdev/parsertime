"use client";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { User } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  user: User;
  managers: {
    id: number;
    teamId: number;
    userId: string;
  }[];
};

export function UserCardButtons({ user, managers }: Props) {
  const pathname = usePathname();
  const teamId = pathname.split("/")[2];

  const [promotionLoading, setPromotionLoading] = useState(false);
  const [demotionLoading, setDemotionLoading] = useState(false);
  const [removalLoading, setRemovalLoading] = useState(false);

  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [demotionDialogOpen, setDemotionDialogOpen] = useState(false);
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);

  const router = useRouter();

  const isManager = managers.some((manager) => manager.userId === user.id);

  async function handlePromoteToManager() {
    setPromotionLoading(true);

    const res = await fetch(`/api/team/promote-user`, {
      method: "POST",
      body: JSON.stringify({
        teamId,
        userId: user.id,
      }),
    });

    if (res.ok) {
      setPromotionLoading(false);
      toast({
        title: "User promoted to manager",
        description: `${user.name} has been promoted to manager.`,
        duration: 5000,
      });
      router.refresh();
    } else {
      setPromotionLoading(false);
      toast({
        title: "An error occurred",
        description: `An error occurred: ${await res.text()} (${res.status})`,
        duration: 5000,
      });
    }
  }

  async function handleDemoteToMember() {
    setDemotionLoading(true);

    const res = await fetch(`/api/team/demote-user`, {
      method: "POST",
      body: JSON.stringify({
        teamId,
        userId: user.id,
      }),
    });

    if (res.ok) {
      setDemotionLoading(false);
      toast({
        title: "User demoted to member",
        description: `${user.name} has been demoted to member.`,
        duration: 5000,
      });
      router.refresh();
    } else {
      setDemotionLoading(false);
      toast({
        title: "An error occurred",
        description: `An error occurred: ${await res.text()} (${res.status})`,
        duration: 5000,
      });
    }
  }

  async function handleRemoveFromTeam() {
    setRemovalLoading(true);

    const res = await fetch(`/api/team/remove-user-from-team`, {
      method: "POST",
      body: JSON.stringify({
        teamId,
        userId: user.id,
      }),
    });

    if (res.ok) {
      setRemovalLoading(false);
      toast({
        title: "User removed from team",
        description: `${user.name} has been removed from the team.`,
        duration: 5000,
      });
      router.refresh();
    } else {
      setRemovalLoading(false);
      toast({
        title: "An error occurred",
        description: `An error occurred: ${await res.text()} (${res.status})`,
        duration: 5000,
      });
    }
  }

  return (
    <ClientOnly>
      <CardFooter>
        {!isManager && (
          <div className="pr-2">
            <AlertDialog
              open={promotionDialogOpen}
              onOpenChange={setPromotionDialogOpen}
            >
              <AlertDialogTrigger>
                <Button>Promote to Manager</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will change the user&apos;s role from member to
                    manager. This user will be able to manage the team and its
                    resources.
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <Button
                      variant="secondary"
                      onClick={() => setPromotionDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handlePromoteToManager}
                      disabled={promotionLoading}
                    >
                      {promotionLoading ? (
                        <>
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Promoting...
                        </>
                      ) : (
                        "Promote to Manager"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogHeader>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {isManager && (
          <div className="pr-2">
            <AlertDialog
              open={demotionDialogOpen}
              onOpenChange={setDemotionDialogOpen}
            >
              <AlertDialogTrigger>
                <Button>Demote to Member</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will change the user&apos;s role from manager to
                    member.
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <Button
                      variant="secondary"
                      onClick={() => setDemotionDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDemoteToMember}
                      disabled={demotionLoading}
                    >
                      {demotionLoading ? (
                        <>
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Demoting...
                        </>
                      ) : (
                        "Demote to Member"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogHeader>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div>
          <AlertDialog
            open={removalDialogOpen}
            onOpenChange={setRemovalDialogOpen}
          >
            <AlertDialogTrigger>
              <Button variant="destructive">Remove from Team</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the user from the team and they will lose
                  access to all team resources.
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => setRemovalDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveFromTeam}
                    disabled={removalLoading}
                  >
                    {removalLoading ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Removing...
                      </>
                    ) : (
                      "Remove from Team"
                    )}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogHeader>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </ClientOnly>
  );
}
