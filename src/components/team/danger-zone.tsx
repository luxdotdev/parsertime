"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { Team } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

export function DangerZone({ team }: { team: Team }) {
  const t = useTranslations("teamPage");

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferInput, setTransferInput] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteEnabled, setDeleteEnabled] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  async function handleTransfer() {
    setTransferLoading(true);
    const res = await fetch(
      `/api/team/transfer-ownership?id=${team.id}&owner=${transferInput}`,
      {
        method: "POST",
      }
    );

    if (res.ok) {
      toast({
        title: t("transferOwner.handleTransfer.title"),
        description: t("transferOwner.handleTransfer.description"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: t("transferOwner.handleTransfer.errorTitle"),
        description: t("transferOwner.handleTransfer.errorDescription", {
          error: `${await res.text()} (${res.status})`,
        }),
        duration: 5000,
        variant: "destructive",
      });
    }

    setTransferLoading(false);
  }

  useEffect(() => {
    setDeleteEnabled(deleteInput === team.name);
  }, [deleteInput, team.name]);

  async function handleDelete() {
    setDeleteLoading(true);
    const res = await fetch(`/api/team/remove-team?id=${team.id}`, {
      method: "POST",
    });

    if (res.ok) {
      toast({
        title: t("deleteTeam.handleDelete.title"),
        description: t("deleteTeam.handleDelete.description"),
        duration: 5000,
      });
      router.push("/team");
    } else {
      toast({
        title: t("deleteTeam.handleDelete.errorTitle"),
        description: t("deleteTeam.handleDelete.errorDescription", {
          error: `${await res.text()} (${res.status})`,
        }),
        duration: 5000,
        variant: "destructive",
      });
    }

    setDeleteLoading(false);
  }

  return (
    <ClientOnly>
      <Card className="max-w-lg border-red-500 dark:border-red-700">
        <CardHeader>
          <CardTitle className="text-red-500 dark:text-red-700">
            {t("dangerZone.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pb-6">
            <h3 className="text-lg font-semibold">
              {t("transferOwner.title")}
            </h3>
            <p className="pb-4">{t("transferOwner.description")}</p>
            <AlertDialog
              open={transferModalOpen}
              onOpenChange={setTransferModalOpen}
            >
              <AlertDialogTrigger>
                <Button variant="destructive">
                  {t("transferOwner.button")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <h2 className="text-lg font-semibold">
                    {t("transferOwner.title")}
                  </h2>
                </AlertDialogHeader>
                <p>{t("transferOwner.email")}</p>
                <Input
                  type="text"
                  className="mt-4 w-full rounded border border-solid p-2"
                  onChange={(e) => setTransferInput(e.target.value)}
                />
                <div className="mt-4 flex justify-end space-x-4">
                  <Button
                    variant="destructive"
                    disabled={transferLoading || !transferInput}
                    onClick={() =>
                      startTransition(async () => await handleTransfer())
                    }
                  >
                    {transferLoading ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        {t("transferOwner.transferring")}
                      </>
                    ) : (
                      t("transferOwner.button")
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setTransferModalOpen(false)}
                  >
                    {t("transferOwner.cancel")}
                  </Button>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div>
            <h3 className="text-lg font-semibold">{t("deleteTeam.title")}</h3>
            <p className="pb-4">{t("deleteTeam.description")}</p>
            <AlertDialog
              open={deleteModalOpen}
              onOpenChange={setDeleteModalOpen}
            >
              <AlertDialogTrigger>
                <Button variant="destructive">{t("deleteTeam.button")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <h2 className="text-lg font-semibold">
                    {t("deleteTeam.title")}
                  </h2>
                </AlertDialogHeader>
                <p>
                  {t.rich("deleteTeam.deleteAlert", {
                    strong: (chunk) => <strong>{chunk}</strong>,
                    team: team.name,
                  })}
                </p>
                <p>
                  {t.rich("deleteTeam.deleteConfirmation", {
                    strong: (chunk) => <strong>{chunk}</strong>,
                    team: team.name,
                  })}
                </p>
                <Input
                  type="text"
                  className="mt-4 w-full rounded border border-solid p-2"
                  onChange={(e) => setDeleteInput(e.target.value)}
                />
                <div className="mt-4 flex justify-end space-x-4">
                  <Button
                    variant="destructive"
                    disabled={!deleteEnabled || deleteLoading}
                    onClick={() =>
                      startTransition(async () => await handleDelete())
                    }
                  >
                    {deleteLoading ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        {t("deleteTeam.deleting")}
                      </>
                    ) : (
                      t("deleteTeam.button")
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDeleteModalOpen(false)}
                  >
                    {t("deleteTeam.cancel")}
                  </Button>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">{t("dangerZone.description")}</p>
        </CardFooter>
      </Card>
    </ClientOnly>
  );
}
