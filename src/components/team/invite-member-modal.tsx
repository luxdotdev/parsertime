"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function InviteMemberModal({
  showInviteMemberModal,
  setShowInviteMemberModal,
}: {
  showInviteMemberModal: boolean;
  setShowInviteMemberModal: (show: boolean) => void;
}) {
  const t = useTranslations("teamPage.inviteMember");
  const formSchema = z.object({
    email: z
      .string()
      .email({ message: t("emailMessage") })
      .min(1, t("reqMessage")),
  });
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const params = useParams<{ teamId: string }>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const getToken = await fetch(
      `/api/team/create-team-invite?id=${params.teamId}`,
      {
        method: "POST",
      }
    );
    if (!getToken.ok) {
      toast({
        variant: "destructive",
        title: t("onSubmit.errorTitle"),
        description: t("onSubmit.errorDescription1", {
          res: `${await getToken.text()} (${getToken.status})`,
        }),
      });
      setLoading(false);
      return;
    }

    const token = (await getToken.json()) as { token: string };

    const res = await fetch(
      `/api/send-team-invite?email=${values.email}&token=${token.token}`,
      {
        method: "POST",
      }
    );

    if (res.ok) {
      setShowInviteMemberModal(false);
      toast({
        title: t("onSubmit.title"),
        description: t("onSubmit.description"),
      });
      setLoading(false);
    } else {
      toast({
        variant: "destructive",
        title: t("onSubmit.errorTitle"),
        description: t("onSubmit.errorDescription", {
          res: `${await res.text()} (${res.status})${res.status === 404 ? t("onSubmit.errorStatus") : ""}`,
        }),
      });
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={showInviteMemberModal}
      onOpenChange={setShowInviteMemberModal}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <div className="space-y-4 py-2 pb-4">
                  <div className="space-y-2">
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input placeholder="lucas@lux.dev" {...field} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </div>
              )}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteMemberModal(false)}
                disabled={loading}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />

                    {t("sending")}
                  </>
                ) : (
                  t("send")
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
