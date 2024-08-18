"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/components/ui/link";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { User } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DangerZone({ url }: { url: string }) {
  const t = useTranslations("settingsPage");
  const [firstDialogOpen, setFirstDialogOpen] = useState(false);

  return (
    <ClientOnly>
      <Card className="max-w-lg border-red-500 dark:border-red-700">
        <CardHeader>
          <CardTitle className="text-red-500 dark:text-red-700">
            {t("dangerZone.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold">{t("deleteAccount.title")}</h3>
          <p className="pb-4">
            {/* Account deletion is permanent and cannot be reversed. Are you
            looking to manage your subscription instead? If so, please click */}
            {t("dangerZone.description1")}{" "}
            <Link href={url} className="text-sky-500" external>
              {/* here. */}
              {t("dangerZone.description2")}
            </Link>
          </p>
          <FirstDialog
            url={url}
            firstDialogOpen={firstDialogOpen}
            setFirstDialogOpen={setFirstDialogOpen}
          />
        </CardContent>
      </Card>
    </ClientOnly>
  );
}

function FirstDialog({
  url,
  firstDialogOpen,
  setFirstDialogOpen,
}: {
  url: string;
  firstDialogOpen: boolean;
  setFirstDialogOpen: (open: boolean) => void;
}) {
  const t = useTranslations("settingsPage");
  return (
    <AlertDialog open={firstDialogOpen} onOpenChange={setFirstDialogOpen}>
      <AlertDialogTrigger>
        <Button variant="destructive">{t("deleteAccount.title")}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <h2 className="text-lg font-semibold">{t("deleteAccount.title")}</h2>
        </AlertDialogHeader>
        <p>
          {/* Are you sure you want to delete your account? This action cannot be
          undone. Are you looking to manage your subscription instead? If so,
          please click */}
          {t("deleteAccount.description1")}{" "}
          <Link href={url} className="text-sky-500" external>
            {/* here. */}
            {t("deleteAccount.description2")}
          </Link>
        </p>
        <div className="mt-4 flex justify-end space-x-4">
          <SecondDialog setFirstDialogOpen={setFirstDialogOpen} />
          <Button variant="secondary" onClick={() => setFirstDialogOpen(false)}>
            {t("deleteAccount.cancel")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SecondDialog({
  setFirstDialogOpen,
}: {
  setFirstDialogOpen: (open: boolean) => void;
}) {
  const t = useTranslations("settingsPage");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteEnabled, setDeleteEnabled] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setDeleteEnabled(deleteInput === "yes, delete my account");
  }, [deleteInput]);

  async function handleDelete() {
    setDeleteLoading(true);

    const res = await fetch("/api/user/delete-account", {
      method: "DELETE",
    });

    if (res.ok) {
      toast({
        title: t("deleteAccount.handleDelete.title"),
        description: t("deleteAccount.handleDelete.description"),
        duration: 5000,
      });
      setDeleteLoading(false);
      setModalOpen(false);
      router.push("/");
    } else {
      toast({
        title: t("deleteAccount.handleDelete.errorTitle"),
        description: `${t("deleteAccount.handleDelete.errorDescription")} ${await res.text()} (${res.status})`,
        duration: 5000,
        variant: "destructive",
      });
      setDeleteLoading(false);
    }
  }

  return (
    <AlertDialog open={modalOpen} onOpenChange={setModalOpen}>
      <AlertDialogTrigger>
        <Button variant="destructive">
          {t("deleteAccount.secondDialog.title")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <h2 className="text-lg font-semibold">{t("deleteAccount.title")}</h2>
        </AlertDialogHeader>
        <p>{t("deleteAccount.secondDialog.description1")}</p>
        <p>
          {/* Type */}
          {t("deleteAccount.secondDialog.description2")}{" "}
          <strong>
            {/* yes, delete my account */}
            {t("deleteAccount.secondDialog.description3")}
          </strong>{" "}
          {/* to confirm. */}
          {t("deleteAccount.secondDialog.description4")}
          {/*need to fix, locale input */}
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

                {t("deleteAccount.secondDialog.deleting")}
              </>
            ) : (
              t("deleteAccount.secondDialog.delete")
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setModalOpen(false);
              setFirstDialogOpen(false);
            }}
          >
            {t("deleteAccount.secondDialog.cancel")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
