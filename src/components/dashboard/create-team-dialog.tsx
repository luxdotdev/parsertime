import { Button } from "@/components/ui/button";
import {
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
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export function CreateTeamDialog({
  setShowNewTeamDialog,
  setNewTeamCreated,
}: {
  setShowNewTeamDialog: (show: boolean) => void;
  setNewTeamCreated: (created: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("dashboard.createTeam");

  const formSchema = z.object({
    name: z
      .string()
      .min(1, t("required"))
      .min(2, t("minCharacters"))
      .max(30, t("maxCharacters")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const res = await fetch("/api/team/create-team", {
      method: "POST",
      body: JSON.stringify(values),
    });

    if (res.ok) {
      setShowNewTeamDialog(false);
      setNewTeamCreated(true);
      toast.success(t("newTeamCreated.title"), {
        duration: 5000,
        description: t("newTeamCreated.description"),
      });
      setLoading(false);
    } else {
      toast.error(t("error.title"), {
        duration: 5000,
        description: t("error.description", {
          res: `${await res.text()} (${res.status})`,
        }),
      });
      setLoading(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <div className="space-y-4 py-2 pb-4">
                <div className="space-y-2">
                  <FormLabel>{t("teamName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("placeholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </div>
              </div>
            )}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewTeamDialog(false)}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                  {t("creatingTeam")}
                </>
              ) : (
                <>{t("createTeam")}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
