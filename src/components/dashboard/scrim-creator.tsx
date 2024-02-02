"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { GetTeamsResponse } from "@/app/api/(team)/get-teams/route";
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

const ACCEPTED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const MAX_FILE_SIZE = 1000000; // 1MB in bytes

const FormSchema = z.object({
  name: z.string({
    required_error: "A scrim name is required.",
  }),
  team: z.string({
    required_error: "A team name is required.",
  }),
  date: z.date({
    required_error: "A scrim date is required.",
  }),
  map: z.any(),
});

export function ScrimCreationForm() {
  const [teams, setTeams] = useState<{ label: string; value: string }[]>([]);
  const [mapData, setMapData] = useState<ParserData>();
  const { toast } = useToast();
  const router = useRouter();

  function getTeams() {
    fetch("/api/get-teams")
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
          title: "File is too big",
          description: "Max file size is 1MB.",
        });
        return;
      }

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: ".xlsx and .txt files are accepted.",
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
    toast({
      title: "Creating scrim",
      description: "Please wait...",
      duration: 5000,
    });

    data.map = mapData;

    const res = await fetch("/api/create-scrim", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({
        title: "Scrim created",
        description: "Your scrim has been created successfully.",
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: `An error occurred: ${res.statusText} (${res.status})`,
        duration: 5000,
        variant: "destructive",
      });
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
              <FormLabel>Scrim Name</FormLabel>
              <FormControl>
                <Input placeholder="New Scrim" {...field} />
              </FormControl>
              <FormDescription>
                This is the name of the scrim. It will be displayed on the
                dashboard.
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
              <FormLabel>Assign a Team</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-[240px] pl-3 text-left font-normal">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Individual</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.value} value={team.value}>
                      {team.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                You can manage teams from your{" "}
                <Link href="/dashboard">dashboard</Link>.
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
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                The scrim date is the date when the scrim took place.
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
              <FormLabel>First Map</FormLabel>
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
                Upload the first map of the scrim. Only .xlsx and .txt files are
                accepted, and max file size is 1MB. You can add more maps after
                the scrim is created.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
