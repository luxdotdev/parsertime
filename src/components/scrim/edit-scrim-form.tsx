"use client";

import { SortableBanItem } from "@/components/map/sortable-ban-item";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ClientOnly } from "@/lib/client-only";
import { cn, toKebabCase, useMapNames } from "@/lib/utils";
import { heroRoleMapping } from "@/types/heroes";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import type { HeroBan, Map, Scrim, Team } from "@prisma/client";
import { CalendarIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Calendar } from "../ui/calendar";

type MapWithHeroBans = Map & {
  heroBans: HeroBan[];
  team1Name: string;
  team2Name: string;
};

export function EditScrimForm({
  scrim,
  teams,
  maps,
}: {
  scrim: Scrim;
  teams: Team[];
  maps: MapWithHeroBans[];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("scrimPage.editScrim");
  const mapNames = useMapNames();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    maps: z.array(
      z.object({
        id: z.number(),
        replayCode: z
          .string()
          .max(6, {
            message: t("replayCode"),
          })
          .optional(),
        heroBans: z.array(
          z.object({
            id: z.number().optional(),
            hero: z.string(),
            team: z.string(),
            banPosition: z.number(),
          })
        ),
      })
    ),
  });

  type ProfileFormValues = z.infer<typeof profileFormSchema>;

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
        heroBans: map.heroBans.map((ban) => ({
          id: ban.id,
          hero: ban.hero,
          team: ban.team === map.team1Name ? "team1" : "team2",
          banPosition: ban.banPosition,
        })),
      })),
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
      maps: data.maps.map((map, mapIndex) => ({
        id: map.id,
        // Replay code is trimmed and converted to uppercase
        replayCode: map.replayCode
          ? map.replayCode.trim().toUpperCase()
          : undefined,
        heroBans: map.heroBans.map((ban) => ({
          id: ban.id,
          hero: ban.hero,
          team:
            ban.team === "team1"
              ? maps[mapIndex].team1Name
              : maps[mapIndex].team2Name,
          banPosition: ban.banPosition,
        })),
      })),
    };

    const res = await fetch("/api/scrim/update-scrim-options", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    if (res.ok) {
      toast.success(t("onSubmit.title"), {
        description: t("onSubmit.description"),
        duration: 5000,
      });
      void queryClient.invalidateQueries({ queryKey: ["scrims"] });
      router.refresh();
    } else {
      toast.error(t("onSubmit.errorTitle"), {
        description: t("onSubmit.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
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
      toast.success(t("deleteMap.title"), {
        description: t("deleteMap.description"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast.error(t("deleteMap.errorTitle"), {
        description: t("deleteMap.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
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
                      disabled={(date: Date) =>
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
              <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md shadow">
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
              {maps.map((map, index) => (
                <AccordionItem key={map.id} value={map.id.toString()}>
                  <AccordionTrigger>
                    {mapNames.get(toKebabCase(map.name))}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pl-1">
                      <FormField
                        control={form.control}
                        name={`maps.${index}.replayCode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("maps.replayCodeLabel", {
                                map: mapNames.get(toKebabCase(map.name)) ?? "",
                              })}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("maps.replayCode")}
                                className="w-28"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`maps.${index}.heroBans`}
                        render={({ field }) => {
                          function handleDragEnd(event: DragEndEvent) {
                            const { active, over } = event;

                            if (over && active.id !== over.id) {
                              const bans = field.value || [];
                              const oldIndex = bans.findIndex(
                                (ban) =>
                                  `ban-${ban.hero}-${ban.team}-${ban.banPosition}` ===
                                  active.id
                              );
                              const newIndex = bans.findIndex(
                                (ban) =>
                                  `ban-${ban.hero}-${ban.team}-${ban.banPosition}` ===
                                  over.id
                              );

                              if (oldIndex !== -1 && newIndex !== -1) {
                                const reorderedBans = arrayMove(
                                  bans,
                                  oldIndex,
                                  newIndex
                                );
                                const updatedBans = reorderedBans.map(
                                  (ban, i) => ({
                                    ...ban,
                                    banPosition: i + 1,
                                  })
                                );
                                field.onChange(updatedBans);
                              }
                            }
                          }

                          return (
                            <FormItem>
                              <FormLabel>Hero Bans</FormLabel>
                              <div className="space-y-2">
                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={handleDragEnd}
                                >
                                  <SortableContext
                                    items={(field.value || []).map(
                                      (ban) =>
                                        `ban-${ban.hero}-${ban.team}-${ban.banPosition}`
                                    )}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {field.value?.map((ban, banIndex) => (
                                      <SortableBanItem
                                        key={`ban-${ban.hero}-${ban.team}-${ban.banPosition}`}
                                        ban={ban}
                                        index={banIndex}
                                        overwatchHeroes={Object.keys(
                                          heroRoleMapping
                                        )}
                                        team1Name={map.team1Name}
                                        team2Name={map.team2Name}
                                        onHeroChange={(value) => {
                                          const newBans = [
                                            ...(field.value || []),
                                          ];
                                          newBans[banIndex] = {
                                            ...newBans[banIndex],
                                            hero: value,
                                          };
                                          field.onChange(newBans);
                                        }}
                                        onTeamChange={(value) => {
                                          const newBans = [
                                            ...(field.value || []),
                                          ];
                                          newBans[banIndex] = {
                                            ...newBans[banIndex],
                                            team: value,
                                          };
                                          field.onChange(newBans);
                                        }}
                                        onRemove={() => {
                                          const newBans =
                                            field.value?.filter(
                                              (_, i) => i !== banIndex
                                            ) || [];
                                          const updatedBans = newBans.map(
                                            (ban, i) => ({
                                              ...ban,
                                              banPosition: i + 1,
                                            })
                                          );
                                          field.onChange(updatedBans);
                                        }}
                                      />
                                    ))}
                                  </SortableContext>
                                </DndContext>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const currentBans = field.value || [];
                                    field.onChange([
                                      ...currentBans,
                                      {
                                        hero: "",
                                        team: "",
                                        banPosition: currentBans.length + 1,
                                      },
                                    ]);
                                  }}
                                >
                                  Add Hero Ban
                                </Button>
                              </div>
                            </FormItem>
                          );
                        }}
                      />

                      <Separator />

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="mt-3" variant="destructive">
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
                                strong: (chunks) => <strong>{chunks}</strong>,
                                map: mapNames.get(toKebabCase(map.name)) ?? "",
                              })}
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t("maps.deleteDialog.cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  startTransition(
                                    async () => await deleteMap(map.id)
                                  )
                                }
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
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FormItem>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("updating")}
              </>
            ) : (
              t("update")
            )}
          </Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
