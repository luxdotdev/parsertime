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
        <h3 className="text-lg font-semibold">Delete Scrim</h3>
        <p className="pb-4">
          Once you delete a scrim, there is no going back. Please be certain.
        </p>
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogTrigger>
            <Button variant="destructive">Delete Scrim</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <h2 className="text-lg font-semibold">Delete Scrim</h2>
            </DialogHeader>
            <p>
              Are you sure you want to delete the scrim{" "}
              <strong>{scrim.name}</strong>? This action cannot be undone.
            </p>
            <p>
              Type <strong>{scrim.name}</strong> to confirm.
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
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
