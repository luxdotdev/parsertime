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
import { cn } from "@/lib/utils";
import type { ParserData } from "@/types/parser";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { track } from "@vercel/analytics";
import { format } from "date-fns";
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
  const t = useTranslations("dashboard.scrimCreationForm");

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
    replayCode: z
      .string()
      .max(6, {
        message: "Replay code must not be longer than 6 characters.",
      })
      .optional(),
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

      const data = await parseData(file);
      setMapData(data);
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
      toast.success(t("createdScrim.title"), {
        description: t("createdScrim.description"),
        duration: 5000,
      });
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
