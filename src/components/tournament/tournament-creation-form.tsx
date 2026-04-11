"use client";

import type { GetTeamsResponse } from "@/app/api/team/get-teams/route";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const teamEntrySchema = z.object({
  name: z.string().min(1, "Team name is required").max(50),
  teamId: z.number().optional(),
});

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  format: z.enum([
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "ROUND_ROBIN_SE",
    "SWISS",
  ]),
  bestOf: z.number().int().min(1).max(9),
  playoffBestOf: z.number().int().min(1).max(9).optional(),
  advancingTeams: z.number().int().min(2).optional(),
  teams: z.array(teamEntrySchema).min(2, "At least 2 teams required"),
});

type FormValues = z.infer<typeof formSchema>;

function SortableTeamItem({
  id,
  index,
  name,
  onRemove,
}: {
  id: string;
  index: number;
  name: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-2 rounded-md border p-2"
    >
      <button
        type="button"
        className="text-muted-foreground cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="text-muted-foreground w-6 text-center text-sm font-medium">
        #{index + 1}
      </span>
      <span className="flex-1 text-sm">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function TournamentCreationForm({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<GetTeamsResponse> => {
      const res = await fetch("/api/team/get-teams");
      return (await res.json()) as GetTeamsResponse;
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      format: "SINGLE_ELIMINATION",
      bestOf: 3,
      playoffBestOf: undefined,
      advancingTeams: undefined,
      teams: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "teams",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    move(oldIndex, newIndex);
  }

  function addTeamFromExisting(teamId: number, teamName: string) {
    if (fields.some((f) => f.teamId === teamId)) {
      toast.error("Team already added");
      return;
    }
    append({ name: teamName, teamId });
  }

  function addCustomTeam() {
    const trimmed = newTeamName.trim();
    if (!trimmed) return;
    append({ name: trimmed });
    setNewTeamName("");
  }

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          format: data.format,
          bestOf: data.bestOf,
          playoffBestOf: data.playoffBestOf,
          advancingTeams: data.advancingTeams,
          teams: data.teams.map((t, i) => ({
            name: t.name,
            teamId: t.teamId,
            seed: i + 1,
          })),
        }),
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error?: string };
        throw new Error(errBody.error ?? "Failed to create tournament");
      }

      const body = (await res.json()) as { id: number };
      toast.success("Tournament created!");
      setOpen(false);
      router.push(`/tournaments/${body.id}` as Route);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create tournament"
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedFormat = watch("format");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field>
        <FieldLabel>Tournament Name</FieldLabel>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input placeholder="Spring Invitational 2026" {...field} />
          )}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Format</FieldLabel>
          <Controller
            control={control}
            name="format"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_ELIMINATION">
                    Single Elimination
                  </SelectItem>
                  <SelectItem value="DOUBLE_ELIMINATION">
                    Double Elimination
                  </SelectItem>
                  <SelectItem value="ROUND_ROBIN_SE">
                    Round Robin → Single Elim
                  </SelectItem>
                  <SelectItem value="SWISS" disabled>
                    Swiss (coming soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field>
          <FieldLabel>
            {selectedFormat === "ROUND_ROBIN_SE" ? "RR Best Of" : "Best Of"}
          </FieldLabel>
          <Controller
            control={control}
            name="bestOf"
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Bo1</SelectItem>
                  <SelectItem value="3">Bo3</SelectItem>
                  <SelectItem value="5">Bo5</SelectItem>
                  <SelectItem value="7">Bo7</SelectItem>
                  <SelectItem value="9">Bo9</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      {selectedFormat === "ROUND_ROBIN_SE" && (
        <Field>
          <FieldLabel>Playoff Best Of</FieldLabel>
          <FieldDescription>
            Best-of format for the single elimination playoff phase
          </FieldDescription>
          <Controller
            control={control}
            name="playoffBestOf"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Same as RR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Bo1</SelectItem>
                  <SelectItem value="3">Bo3</SelectItem>
                  <SelectItem value="5">Bo5</SelectItem>
                  <SelectItem value="7">Bo7</SelectItem>
                  <SelectItem value="9">Bo9</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      )}

      {selectedFormat === "ROUND_ROBIN_SE" && (
        <Field>
          <FieldLabel>Teams Advancing to Playoffs</FieldLabel>
          <FieldDescription>
            Leave empty for all teams to advance
          </FieldDescription>
          <Controller
            control={control}
            name="advancingTeams"
            render={({ field }) => (
              <Input
                type="number"
                min={2}
                placeholder="All"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            )}
          />
        </Field>
      )}

      <Field>
        <FieldLabel>Teams</FieldLabel>
        <FieldDescription>
          Drag to reorder seeding. Seed #1 is at the top.
        </FieldDescription>
        {errors.teams?.message && (
          <FieldError>{errors.teams.message}</FieldError>
        )}

        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {fields.map((field, index) => (
                <SortableTeamItem
                  key={field.id}
                  id={field.id}
                  index={index}
                  name={field.name}
                  onRemove={() => remove(index)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {fields.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No teams added yet. Add teams below.
            </p>
          )}
        </div>

        {teamsData?.teams && teamsData.teams.length > 0 && (
          <div className="pt-2">
            <Select
              onValueChange={(v) => {
                const team = teamsData.teams.find((t) => t.id === Number(v));
                if (team) addTeamFromExisting(team.id, team.name);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add an existing team..." />
              </SelectTrigger>
              <SelectContent>
                {teamsData.teams.map((team) => (
                  <SelectItem key={team.id} value={String(team.id)}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Custom team name..."
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTeam();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addCustomTeam}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || fields.length < 2}>
          {loading && <ReloadIcon className="mr-2 size-4 animate-spin" />}
          Create Tournament
        </Button>
      </div>
    </form>
  );
}
