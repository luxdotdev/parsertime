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
import { useTranslations } from "next-intl";

type Props = {
  user: User;
  managers: {
    id: number;
    teamId: number;
    userId: string;
  }[];
};

export function UserCardButtons({ user, managers }: Props) {
  const t = useTranslations("teamPage.userButtons");
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
        title: t("promote.handlePromote.title"),
        description: t("promote.handlePromote.description", {
          user: `${user.name}`,
        }),
        duration: 5000,
      });
      router.refresh();
    } else {
      setPromotionLoading(false);
      toast({
        title: t("promote.handlePromote.errorTitle"),
        description: t("promote.handlePromote.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
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
        title: t("demote.handleDemote.title"),
        description: t("demote.handleDemote.description", {
          user: `${user.name}`,
        }),
        duration: 5000,
      });
      router.refresh();
    } else {
      setDemotionLoading(false);
      toast({
        title: t("demote.handleDemote.errorTitle"),
        description: t("demote.handleDemote.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
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
        title: t("remove.handleRemove.title"),
        description: t("remove.handleRemove.description", {
          user: `${user.name}`,
        }),
        duration: 5000,
      });
      router.refresh();
    } else {
      setRemovalLoading(false);
      toast({
        title: t("remove.handleRemove.errorTitle"),
        description: t("remove.handleRemove.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
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
                <Button>{t("promote.button")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("promote.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("promote.description")}
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <Button
                      variant="secondary"
                      onClick={() => setPromotionDialogOpen(false)}
                    >
                      {t("promote.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handlePromoteToManager}
                      disabled={promotionLoading}
                    >
                      {promotionLoading ? (
                        <>
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                          {t("promote.promoting")}
                        </>
                      ) : (
                        t("promote.promote")
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
                <Button>{t("demote.button")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("demote.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("demote.description")}
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <Button
                      variant="secondary"
                      onClick={() => setDemotionDialogOpen(false)}
                    >
                      {t("demote.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDemoteToMember}
                      disabled={demotionLoading}
                    >
                      {demotionLoading ? (
                        <>
                          <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                          {t("demote.demoting")}
                        </>
                      ) : (
                        t("demote.demote")
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
              <Button variant="destructive">{t("remove.button")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("remove.title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("remove.description")}
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => setRemovalDialogOpen(false)}
                  >
                    {t("remove.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveFromTeam}
                    disabled={removalLoading}
                  >
                    {removalLoading ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                        {t("remove.removing")}
                      </>
                    ) : (
                      t("remove.remove")
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
