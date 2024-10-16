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
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

export function DangerZone({ team }: { team: Team }) {
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
        title: "Ownership transferred",
        description: "Ownership of the team has successfully been transferred.",
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: `An error occurred: ${await res.text()} (${res.status})`,
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
        title: "Team deleted",
        description: "The team has been deleted.",
        duration: 5000,
      });
      router.push("/team");
    } else {
      toast({
        title: "Error",
        description: `An error occurred: ${await res.text()} (${res.status})`,
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
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pb-6">
            <h3 className="text-lg font-semibold">Transfer Ownership</h3>
            <p className="pb-4">
              Once you transfer ownership, you will no longer be the owner of
              this team.
            </p>
            <AlertDialog
              open={transferModalOpen}
              onOpenChange={setTransferModalOpen}
            >
              <AlertDialogTrigger>
                <Button variant="destructive">Transfer Ownership</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <h2 className="text-lg font-semibold">Transfer Ownership</h2>
                </AlertDialogHeader>
                <p>
                  Enter the email address of the user you want to transfer
                  ownership to.
                </p>
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
                        Transferring...
                      </>
                    ) : (
                      "Transfer Ownership"
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setTransferModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Delete Team</h3>
            <p className="pb-4">
              Once you delete a team, there is no going back. Please be certain.
            </p>
            <AlertDialog
              open={deleteModalOpen}
              onOpenChange={setDeleteModalOpen}
            >
              <AlertDialogTrigger>
                <Button variant="destructive">Delete Team</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <h2 className="text-lg font-semibold">Delete Team</h2>
                </AlertDialogHeader>
                <p>
                  Are you sure you want to delete the team{" "}
                  <strong>{team.name}</strong>? This action cannot be undone.
                </p>
                <p>
                  Type <strong>{team.name}</strong> to confirm.
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
                        Deleting...
                      </>
                    ) : (
                      "Delete Team"
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDeleteModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            These are irreversible actions. Please be certain before proceeding.
          </p>
        </CardFooter>
      </Card>
    </ClientOnly>
  );
}
