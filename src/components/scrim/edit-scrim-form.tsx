"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { Scrim, Team, Map } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Calendar } from "../ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  date: z.date(),
  guestMode: z.boolean(),
  maps: z.array(
    z.object({
      id: z.number(),
      replayCode: z
        .string()
        .max(6, {
          message: "Replay code must not be longer than 6 characters.",
        })
        .optional(),
    })
  ),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function EditScrimForm({
  scrim,
  teams,
  maps,
}: {
  scrim: Scrim;
  teams: Team[];
  maps: Map[];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: scrim.name ?? "",
      teamId: (scrim.teamId ?? 0).toString(),
      date: scrim.date,
      guestMode: scrim.guestMode,
      maps: maps.map((map) => ({
        id: map.id,
        replayCode: map.replayCode ?? "",
      })),
    },
    mode: "onChange",
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "maps",
  });

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true);
    const reqBody = {
      name: data.name.trim(),
      teamId: data.teamId,
      date: data.date.toISOString(),
      scrimId: scrim.id,
      guestMode: data.guestMode,
      maps: data.maps,
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

  async function deleteMap(mapId: number) {
    setLoading(true);
    const res = await fetch(`/api/scrim/remove-map?id=${mapId}`, {
      method: "POST",
    });

    if (res.ok) {
      toast({
        title: "Map deleted",
        description: "The map has been deleted.",
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
                            key={team.name}
                            value={team.id.toString()}
                          >
                            {team.name}
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
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Scrim Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "max-w-lg pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Edit date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("2016-01-01")
                      }
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The date when the scrim took place.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestMode"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md shadow">
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

          <FormItem>
            <FormLabel>Maps</FormLabel>
            <Accordion type="single" collapsible className="max-w-lg">
              {maps.map((map, index) => (
                <AccordionItem key={map.id} value={map.id.toString()}>
                  <AccordionTrigger>{map.name}</AccordionTrigger>
                  <AccordionContent>
                    <FormField
                      control={form.control}
                      name={`maps.${index}.replayCode`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Replay Code for {map.name}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Replay Code"
                              className="w-28"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="mt-3" variant="destructive">
                          Delete Map
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the map{" "}
                            <strong>{map.name}</strong>. This action cannot be
                            undone.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMap(map.id)}
                            >
                              {loading ? (
                                <>
                                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                                  Deleting...
                                </>
                              ) : (
                                "Delete"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogHeader>
                      </AlertDialogContent>
                    </AlertDialog>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FormItem>

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
