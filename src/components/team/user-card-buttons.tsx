"use client";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { User } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
        description: `An error occurred: ${res.statusText} (${res.status})`,
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
        description: `An error occurred: ${res.statusText} (${res.status})`,
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
        description: `An error occurred: ${res.statusText} (${res.status})`,
        duration: 5000,
      });
    }
  }

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <Skeleton className="w-4" />;

  return (
    <CardFooter>
      {!isManager && (
        <div className="pr-2">
          <Dialog
            open={promotionDialogOpen}
            onOpenChange={setPromotionDialogOpen}
          >
            <DialogTrigger>
              <Button>Promote to Manager</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This will change the user&apos;s role from member to manager.
                  This user will be able to manage the team and its resources.
                </DialogDescription>
                <DialogFooter>
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
                </DialogFooter>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isManager && (
        <div className="pr-2">
          <Dialog
            open={demotionDialogOpen}
            onOpenChange={setDemotionDialogOpen}
          >
            <DialogTrigger>
              <Button>Demote to Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This will change the user&apos;s role from manager to member.
                </DialogDescription>
                <DialogFooter>
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
                </DialogFooter>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div>
        <Dialog open={removalDialogOpen} onOpenChange={setRemovalDialogOpen}>
          <DialogTrigger>
            <Button variant="destructive">Remove from Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This will remove the user from the team and they will lose
                access to all team resources.
              </DialogDescription>
              <DialogFooter>
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
              </DialogFooter>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </CardFooter>
  );
}
