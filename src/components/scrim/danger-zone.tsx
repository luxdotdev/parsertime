"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { Scrim } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DangerZone({ scrim }: { scrim: Scrim }) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteEnabled, setDeleteEnabled] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setDeleteEnabled(deleteInput === scrim.name);
  }, [deleteInput, scrim.name]);

  async function handleDelete() {
    setDeleteLoading(true);
    const res = await fetch(`/api/scrim/remove-scrim?id=${scrim.id}`, {
      method: "POST",
    });

    if (res.ok) {
      toast({
        title: "Scrim deleted",
        description: "The scrim has been deleted.",
        duration: 5000,
      });
      router.push("/dashboard");
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
          <h3 className="text-lg font-semibold">Delete Scrim</h3>
          <p className="pb-4">
            Once you delete a scrim, there is no going back. Please be certain.
          </p>
          <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <AlertDialogTrigger>
              <Button variant="destructive">Delete Scrim</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <h2 className="text-lg font-semibold">Delete Scrim</h2>
              </AlertDialogHeader>
              <p>
                Are you sure you want to delete the scrim{" "}
                <strong>{scrim.name}</strong>? This action cannot be undone.
              </p>
              <p>
                Type <strong>{scrim.name}</strong> to confirm.
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
                  onClick={handleDelete}
                >
                  {deleteLoading ? (
                    <>
                      <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Scrim"
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
        </CardContent>
      </Card>
    </ClientOnly>
  );
}
