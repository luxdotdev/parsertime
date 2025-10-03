"use client";

import type { GetTeamsResponse } from "@/app/api/team/get-teams/route";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Label } from "@/components/ui/label";
import { Link } from "@/components/ui/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseData } from "@/lib/parser";
import { cn, detectFileCorruption } from "@/lib/utils";
import { heroRoleMapping } from "@/types/heroes";
import type { ParserData } from "@/types/parser";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "@vercel/analytics";
import { format } from "date-fns";
import { GripVertical, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const ACCEPTED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const MAX_FILE_SIZE = 1000000; // 1MB in bytes

export function ScrimCreationForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const [mapData, setMapData] = useState<ParserData>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hasCorruptedData, setHasCorruptedData] = useState(false);
  const queryClient = useQueryClient();
  const t = useTranslations("dashboard.scrimCreationForm");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const FormSchema = z.object({
    name: z
      .string({
        error: t("scrimRequiredError"),
      })
      .min(2, {
        message: t("scrimMinMessage"),
      })
      .max(30, {
        message: t("scrimMaxMessage"),
      }),
    team: z.string({
      error: t("teamRequiredError"),
    }),
    date: z.date({
      error: t("dateRequiredError"),
    }),
    map: z.any(),
    heroBans: z.array(
      z.object({
        hero: z.string(),
        team: z.string(),
        banPosition: z.number(),
      })
    ),
  });

  async function getTeams() {
    const response = await fetch("/api/team/get-teams-with-perms");
    if (!response.ok) {
      throw new Error("Failed to fetch teams with permissions");
    }
    const data = (await response.json()) as GetTeamsResponse;
    return data.teams.map((team) => ({
      label: team.name,
      value: team.id.toString(),
    }));
  }

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
    staleTime: Infinity,
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("fileSize.title"), {
          duration: 5000,
          description: t("fileSize.description"),
        });
        return;
      }

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast.error(t("fileType.title"), {
          duration: 5000,
          description: t("fileType.description"),
        });
        return;
      }

      // Check for corrupted data before parsing
      const hasCorruptedData = await detectFileCorruption(file);

      if (hasCorruptedData.isCorrupted) {
        let warningMessage = t("dataCorruption.warning.baseDescription");

        if (hasCorruptedData.hasInvalidMercyRez) {
          warningMessage += `\n${t("dataCorruption.warning.invalidMercyRez")}`;
        }
        if (hasCorruptedData.hasAsterisks) {
          warningMessage += `\n${t("dataCorruption.warning.asteriskValues")}`;
        }

        toast.warning(t("dataCorruption.warning.title"), {
          description: warningMessage,
          duration: 8000,
        });
      }

      const data = await parseData(file);
      setMapData(data);

      // Store corruption info for success message
      setHasCorruptedData(hasCorruptedData.isCorrupted);
    }
  }

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setLoading(true);
    toast.error(t("creatingScrim.title"), {
      description: t("creatingScrim.description"),
      duration: 5000,
    });

    data.map = mapData;
    data.name = data.name.trim(); // Remove leading/trailing whitespace

    const res = await fetch("/api/scrim/create-scrim", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      if (hasCorruptedData) {
        toast.success(t("dataCorruption.success.title"), {
          description: t("dataCorruption.success.description"),
          duration: 6000,
        });
      } else {
        toast.success(t("createdScrim.title"), {
          description: t("createdScrim.description"),
          duration: 5000,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["scrims"] });
      router.refresh();
      setOpen(false);
      setLoading(false);
    } else {
      toast.error(t("createdScrim.errorTitle"), {
        description: t.rich("createdScrim.errorDescription", {
          res: `${await res.text()} (${res.status})`,
          here: (chunks) => (
            <Link
              href="https://docs.parsertime.app/#common-errors"
              target="_blank"
              className="underline"
              external
            >
              {chunks}
            </Link>
          ),
        }),
        duration: 5000,
      });
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("scrimName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("scrimPlaceholder")} {...field} />
              </FormControl>
              <FormDescription>{t("scrimDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="team"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("teamName")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-[240px] pl-3 text-left font-normal">
                    <SelectValue placeholder={t("teamPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">{t("teamIndividual")}</SelectItem>
                  {teams ? (
                    teams.map((team) => (
                      <SelectItem key={team.value} value={team.value}>
                        {team.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="1">{t("teamLoading")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {t.rich("teamDescription", {
                  link: (chunks) => <Link href="/dashboard">{chunks}</Link>,
                })}
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
              <FormLabel>{t("dateName")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>{t("datePlaceholder")}</span>
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
              <FormDescription>{t("dateDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="map"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("mapName")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(e) => {
                    startTransition(async () => await handleFile(e));
                  }}
                  type="file"
                  className="w-64"
                  accept=".xlsx, .txt"
                />
              </FormControl>
              <FormDescription>{t("mapDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="heroBans"
          render={({ field }) => {
            const handleDragEnd = (event: DragEndEvent) => {
              const { active, over } = event;

              if (over && active.id !== over.id) {
                const oldIndex = Number.parseInt(
                  active.id.toString().split("-")[1]
                );
                const newIndex = Number.parseInt(
                  over.id.toString().split("-")[1]
                );

                const reorderedBans = arrayMove(
                  field.value || [],
                  oldIndex,
                  newIndex
                );
                const updatedBans = reorderedBans.map((ban, i) => ({
                  ...ban,
                  banPosition: i + 1,
                }));
                field.onChange(updatedBans);
              }
            };

            return (
              <FormItem className="flex flex-col">
                <FormLabel>{t("heroBansName")}</FormLabel>
                <FormControl>
                  <div className="space-y-4">
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
                        {field.value?.map((ban, index) => (
                          <SortableBanItem
                            key={`ban-${ban.hero}-${ban.team}-${ban.banPosition}`}
                            ban={ban}
                            index={index}
                            overwatchHeroes={Object.keys(heroRoleMapping)}
                            onHeroChange={(value) => {
                              const newBans = [...(field.value || [])];
                              newBans[index] = {
                                ...newBans[index],
                                hero: value,
                              };
                              field.onChange(newBans);
                            }}
                            onTeamChange={(value) => {
                              const newBans = [...(field.value || [])];
                              newBans[index] = {
                                ...newBans[index],
                                team: value,
                              };
                              field.onChange(newBans);
                            }}
                            onRemove={() => {
                              const newBans =
                                field.value?.filter((_, i) => i !== index) ||
                                [];
                              const updatedBans = newBans.map((ban, i) => ({
                                ...ban,
                                banPosition: i + 1,
                              }));
                              field.onChange(updatedBans);
                            }}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <Button
                      type="button"
                      variant="outline"
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
                </FormControl>
                <FormDescription>{t("heroBansDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <Button
          type="submit"
          onClick={() => track("Create Scrim", { location: "Dashboard" })}
          disabled={loading}
        >
          {loading ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
              {t("submitting")}
            </>
          ) : (
            <>{t("submit")}</>
          )}
        </Button>
      </form>
    </Form>
  );
}

function SortableBanItem({
  ban,
  index,
  overwatchHeroes,
  onHeroChange,
  onTeamChange,
  onRemove,
}: {
  ban: { hero: string; team: string; banPosition: number };
  index: number;
  overwatchHeroes: string[];
  onHeroChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("dashboard.scrimCreationForm");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `ban-${ban.hero}-${ban.team}-${ban.banPosition}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-end gap-2">
      <button
        type="button"
        className="bg-background hover:bg-accent flex h-10 cursor-grab items-center justify-center rounded-md border px-2 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="text-muted-foreground h-4 w-4" />
      </button>
      <div className="flex-1">
        <Label className="text-sm font-medium">{t("hero")}</Label>
        <Select value={ban.hero} onValueChange={onHeroChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("selectHero")} />
          </SelectTrigger>
          <SelectContent>
            {overwatchHeroes.map((hero) => (
              <SelectItem key={hero} value={hero}>
                {hero}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label className="text-sm font-medium">{t("team")}</Label>
        <Select value={ban.team} onValueChange={onTeamChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("selectTeam")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="team1">Team 1</SelectItem>
            <SelectItem value="team2">Team 2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-20 text-center">
        <Label className="text-sm font-medium">{t("orderName")}</Label>
        <div className="bg-muted flex h-10 items-center justify-center rounded-md border px-3 text-sm">
          {index + 1}
        </div>
      </div>
      <Button type="button" variant="outline" size="icon" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
