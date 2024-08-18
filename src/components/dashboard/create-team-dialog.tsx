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
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function CreateTeamDialog({
  setShowNewTeamDialog,
  setNewTeamCreated,
}: {
  setShowNewTeamDialog: (show: boolean) => void;
  setNewTeamCreated: (created: boolean) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const t = useTranslations("dashboard");

  const formSchema = z.object({
    name: z
      .string()
      .min(1, /* "Team name is required." */ t("createTeam.required"))
      .min(
        2,
        /* "Name must be at least 2 characters." */ t(
          "createTeam.minCharacters"
        )
      )
      .max(
        30,
        /* "Name must not be longer than 30 characters." */ t(
          "createTeam.maxCharacters"
        )
      ),
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
      toast({
        title: /* "Team created!" */ t("createTeam.newTeamCreated.title"),
        description: /* "Your team has been created successfully." */ t(
          "createTeam.newTeamCreated.description"
        ),
      });
      setLoading(false);
    } else {
      toast({
        variant: "destructive",
        title: /* "Error" */ t("createTeam.error.title"),
        description: /* `An error occurred: */ `${t("createTeam.error.description")} ${await res.text()} (${res.status})`,
      });
      setLoading(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {/* Create team */}
          {t("createTeam.title")}
        </DialogTitle>
        <DialogDescription>
          {/* Add a new team to categorize your scrims and invite your players to
          view and manage your scrims. */}
          {t("createTeam.description")}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <div className="space-y-4 py-2 pb-4">
                <div className="space-y-2">
                  <FormLabel>
                    {/* Team name */}
                    {t("createTeam.teamName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Esports at Cornell"
                      /* Not sure if should translate this */ {...field}
                    />
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
              {/* Cancel */}
              {t("createTeam.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                  {/* Creating
                  team... */}
                  {t("createTeam.creatingTeam")}
                </>
              ) : (
                /* "Create team" */ t("createTeam.createTeam")
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
