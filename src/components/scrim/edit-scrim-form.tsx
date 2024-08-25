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
import { useTranslations } from "next-intl";

export function EditScrimForm({
  scrim,
  teams,
  maps,
}: {
  scrim: Scrim;
  teams: Team[];
  maps: Map[];
}) {
  const t = useTranslations("scrimPage.editScrim");
  const profileFormSchema = z.object({
    name: z
      .string()
      .min(2, {
        message: t("displayName.minMessage"),
      })
      .max(30, {
        message: t("displayName.maxMessage"),
      }),
    teamId: z.string(),
    date: z.date(),
    guestMode: z.boolean(),
  });

  type ProfileFormValues = z.infer<typeof profileFormSchema>;

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: scrim.name ?? "",
      teamId: (scrim.teamId ?? 0).toString(),
      date: scrim.date,
      guestMode: scrim.guestMode,
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true);
    const reqBody = {
      name: data.name.trim(),
      teamId: data.teamId,
      date: data.date.toISOString(),
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
        title: t("onSubmit.title"),
        description: t("onSubmit.description"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: t("onSubmit.errorTitle"),
        description: t("onSubmit.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
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
        title: t("deleteMap.title"),
        description: t("deleteMap.description"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: t("deleteMap.errorTitle"),
        description: t("deleteMap.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
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
                <FormLabel>{t("displayName.title")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("displayName.placeholder")}
                    defaultValue={scrim.name ?? ""}
                    className="max-w-lg"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t("displayName.description")}
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
                <FormLabel>{t("team.title")}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("team.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{t("team.select.teams")}</SelectLabel>
                        <SelectItem value="0">
                          {t("team.select.individual")}
                        </SelectItem>
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
                <FormDescription>{t("team.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("date.title")}</FormLabel>
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
                          <span>{t("date.edit")}</span>
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
                <FormDescription>{t("date.description")}</FormDescription>
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
                  <FormLabel>{t("guestMode.title")}</FormLabel>
                  <FormDescription className="max-w-[450px]">
                    {t("guestMode.description")}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>{t("maps.title")}</FormLabel>
            <Accordion type="single" collapsible className="max-w-lg">
              {maps.map((map) => (
                <AccordionItem key={map.id} value={map.id.toString()}>
                  <AccordionTrigger>{map.name}</AccordionTrigger>
                  <AccordionContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          {t("maps.delete")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("maps.deleteDialog.title")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t.rich("maps.deleteDialog.description", {
                              strong: (children) => <strong>{children}</strong>,
                              map: map.name,
                            })}
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t("maps.deleteDialog.cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMap(map.id)}
                            >
                              {loading ? (
                                <>
                                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                                  {t("maps.deleteDialog.deleting")}
                                </>
                              ) : (
                                t("maps.deleteDialog.delete")
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
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("update")}
              </>
            ) : (
              t("updating")
            )}
          </Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
