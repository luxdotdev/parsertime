"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarIcon,
  ExternalLinkIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { GetTeamsResponse } from "@/app/api/team/get-teams/route";
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
import { useToast } from "@/components/ui/use-toast";
import { parseData } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { ParserData } from "@/types/parser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

const ACCEPTED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const MAX_FILE_SIZE = 1000000; // 1MB in bytes

// const createFormSchema = (t: (key: string) => string) =>
//   z.object({
//     name: z.string({
//       required_error: /* "A scrim name is required." */ t(
//         "scrimCreationForm.scrimRequiredError"
//       ),
//     }),
//     team: z.string({
//       required_error: /* "A team name is required." */ t(
//         "scrimCreationForm.teamRequiredError"
//       ),
//     }),
//     date: z.date({
//       required_error: /* "A scrim date is required." */ t(
//         "scrimCreationForm.dateRequiredError"
//       ),
//     }),
//     map: z.any(),
//   });

export function ScrimCreationForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const [teams, setTeams] = useState<{ label: string; value: string }[]>([]);
  const [mapData, setMapData] = useState<ParserData>();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const t = useTranslations("dashboard");

  const FormSchema = z.object({
    name: z.string({
      required_error: /* "A scrim name is required." */ t(
        "scrimCreationForm.scrimRequiredError"
      ),
    }),
    team: z.string({
      required_error: /* "A team name is required." */ t(
        "scrimCreationForm.teamRequiredError"
      ),
    }),
    date: z.date({
      required_error: /* "A scrim date is required." */ t(
        "scrimCreationForm.dateRequiredError"
      ),
    }),
    map: z.any(),
  });

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: /* "File is too big" */ t("scrimCreationForm.fileSize.title"),
          description: /* "Max file size is 1MB." */ t(
            "scrimCreationForm.fileSize.description"
          ),
        });
        return;
      }

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast({
          title: /* "Invalid file type" */ t(
            "scrimCreationForm.fileType.title"
          ),
          description: /* ".xlsx and .txt files are accepted." */ t(
            "scrimCreationForm.fileType.description"
          ),
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
    toast({
      title: /* "Creating scrim" */ t("scrimCreationForm.creatingScrim.title"),
      description: /* "Please wait..." */ t(
        "scrimCreationForm.creatingScrim.description"
      ),
      duration: 5000,
    });

    data.map = mapData;
    data.name = data.name.trim(); // Remove leading/trailing whitespace

    const res = await fetch("/api/scrim/create-scrim", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({
        title: /* "Scrim created" */ t("scrimCreationForm.createdScrim.title"),
        description: /* "Your scrim has been created successfully." */ t(
          "scrimCreationForm.createdScrim.description"
        ),
        duration: 5000,
      });
      router.refresh();
      setOpen(false);
      setLoading(false);
    } else {
      toast({
        title: /* "Error" */ t("scrimCreationForm.createdScrimError.title"),
        description: (
          <p>
            {/* An error occurred: */}
            {t("scrimCreationForm.createdScrimError.description1")}{" "}
            {await res.text()} ({res.status}){/* . Please read the docs */}
            {t("scrimCreationForm.createdScrimError.description2")}{" "}
            <Link
              href="https://docs.parsertime.app/#common-errors"
              target="_blank"
              className="underline"
            >
              {/* here */}
              {t("scrimCreationForm.createdScrimError.description3")}
            </Link>{" "}
            <ExternalLinkIcon className="inline h-4 w-4" />{" "}
            {/* to see if the error
            can be resolved. */}
            {t("scrimCreationForm.createdScrimError.description4")}
          </p>
        ),
        duration: 5000,
        variant: "destructive",
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
              <FormLabel>
                {/* Scrim Name */}
                {t("scrimCreationForm.scrimName")}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder=/* "New Scrim" */ {t(
                    "scrimCreationForm.scrimPlaceholder"
                  )}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {/* This is the name of the scrim. It will be displayed on the
                dashboard. */}
                {t("scrimCreationForm.scrimDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="team"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                {/* Assign a Team */}
                {t("scrimCreationForm.teamName")}
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-[240px] pl-3 text-left font-normal">
                    <SelectValue
                      placeholder=/* "Select a team" */ {t(
                        "scrimCreationForm.teamPlaceholder"
                      )}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">
                    {/* Individual */}
                    {t("scrimCreationForm.teamIndividual")}
                  </SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.value} value={team.value}>
                      {team.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {/* You can manage teams from your */}
                {t("scrimCreationForm.teamDescription")}{" "}
                <Link href="/dashboard">
                  {/* dashboard */}
                  {t("scrimCreationForm.teamDashboardLink")}
                </Link>
                .
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
              <FormLabel>
                {/* Scrim Date */}
                {t("scrimCreationForm.dateName")}
              </FormLabel>
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
                        <span>
                          {/* Pick a date */}
                          {t("scrimCreationForm.datePlaceholder")}
                        </span>
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
                {/* The scrim date is the date when the scrim took place. */}
                {t("scrimCreationForm.dateDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="map"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                {/* First Map */}
                {t("scrimCreationForm.mapName")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={handleFile}
                  type="file"
                  className="w-64"
                  accept=".xlsx, .txt"
                />
              </FormControl>
              <FormDescription>
                {/* Upload the first map of the scrim. Only .xlsx and .txt files are
                accepted, and max file size is 1MB. You can add more maps after
                the scrim is created. */}
                {t("scrimCreationForm.mapDescription")}
              </FormDescription>
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
              {/* Submitting... */}
              {t("scrimCreationForm.submitting")}
            </>
          ) : (
            /* "Submit" */ t("scrimCreationForm.submit")
          )}
        </Button>
      </form>
    </Form>
  );
}
