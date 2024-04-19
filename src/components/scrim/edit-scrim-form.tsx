"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { Scrim } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GetTeamsResponse } from "@/app/api/team/get-teams-with-perms/route";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  teamId: z.string(),
  guestMode: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function EditScrimForm({ scrim }: { scrim: Scrim }) {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<{ label: string; value: string }[]>([]);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: scrim.name ?? "",
      teamId: (scrim.teamId ?? 0).toString(),
      guestMode: scrim.guestMode,
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    console.log(data);

    setLoading(true);
    const reqBody = {
      name: data.name.trim(),
      teamId: data.teamId,
      scrimId: scrim.id,
      guestMode: data.guestMode,
    };

    const res = await fetch("/api/scrim/update-scrim-options", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    if (res.ok) {
      toast({
        title: "Scrim updated",
        description: "Your scrim has been successfully updated.",
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: "An error occurred",
        description: `An error occurred: ${await res.text()} (${res.status})`,
        variant: "destructive",
        duration: 5000,
      });
    }
    setLoading(false);
  }

  function getTeams() {
    fetch("/api/team/get-teams-with-perms")
      .then((res) => res.json() as Promise<GetTeamsResponse>)
      .then((data) => {
        const newTeams = data.teams.map((team) => ({
          label: team.name,
          value: team.id.toString(),
        }));
        setTeams(newTeams);
      });
  }

  useEffect(() => {
    getTeams();
  }, []);

  return (
    <ClientOnly>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="FIU Panthers vs UF Gators"
                    defaultValue={scrim.name ?? ""}
                    className="max-w-lg"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is your scrim&apos;s name. This will show on your
                  dashboard.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="teamId"
            render={({ field }) => (
              <FormItem className="max-w-lg">
                <FormLabel>Team</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Teams</SelectLabel>
                        <SelectItem value="0">Individual</SelectItem>
                        {teams.map((team) => (
                          <SelectItem
                            key={team.value}
                            value={team.value.toString()}
                          >
                            {team.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  This is the team that will be associated with this scrim. You
                  can assign scrims to teams that you manage or own.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestMode"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md  shadow">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Enable Guest Mode</FormLabel>
                  <FormDescription className="max-w-[450px]">
                    If enabled, the scrim will be accessible to any logged in
                    user. If disabled, only your team members will be able to
                    access the scrim.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              "Update scrim"
            )}
          </Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
