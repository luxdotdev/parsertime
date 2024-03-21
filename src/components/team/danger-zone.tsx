"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Team } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
      router.push("/dashboard");
    } else {
      toast({
        title: "Error",
        description: `An error occurred: ${res.statusText} (${res.status})`,
        duration: 5000,
        variant: "destructive",
      });
    }

    setDeleteLoading(false);
  }

  // fix LastPass hydration issue
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
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
            Once you transfer ownership, you will no longer be the owner of this
            team.
          </p>
          <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
            <DialogTrigger>
              <Button variant="destructive">Transfer Ownership</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <h2 className="text-lg font-semibold">Transfer Ownership</h2>
              </DialogHeader>
              <p>
                Enter the email address of the user you want to transfer
                ownership to.
              </p>
              <Input
                type="text"
                className="border border-solid rounded p-2 w-full mt-4"
                onChange={(e) => setTransferInput(e.target.value)}
              />
              <div className="flex justify-end space-x-4 mt-4">
                <Button
                  variant="destructive"
                  disabled={transferLoading || !transferInput}
                  onClick={handleTransfer}
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
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Delete Team</h3>
          <p className="pb-4">
            Once you delete a team, there is no going back. Please be certain.
          </p>
          <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <DialogTrigger>
              <Button variant="destructive">Delete Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <h2 className="text-lg font-semibold">Delete Team</h2>
              </DialogHeader>
              <p>
                Are you sure you want to delete the team{" "}
                <strong>{team.name}</strong>? This action cannot be undone.
              </p>
              <p>
                Type <strong>{team.name}</strong> to confirm.
              </p>
              <Input
                type="text"
                className="border border-solid rounded p-2 w-full mt-4"
                onChange={(e) => setDeleteInput(e.target.value)}
              />
              <div className="flex justify-end space-x-4 mt-4">
                <Button
                  variant="destructive"
                  disabled={!deleteEnabled || deleteLoading}
                  onClick={handleDelete}
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
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
