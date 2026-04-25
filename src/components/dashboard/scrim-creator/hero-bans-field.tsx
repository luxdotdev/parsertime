"use client";

import { SortableBanItem } from "@/components/map/sortable-ban-item";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { heroRoleMapping } from "@/types/heroes";
import type { ParserData } from "@/types/parser";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ControllerRenderProps } from "react-hook-form";
import type { FormValues, HeroBan } from "./types";

type Props = {
  field: ControllerRenderProps<FormValues, "heroBans">;
  invalid: boolean;
  error: { message?: string } | undefined;
  mapData: ParserData | undefined;
  sensors: ReturnType<typeof useSensors>;
};

export function HeroBansField({
  field,
  invalid,
  error,
  mapData,
  sensors,
}: Props) {
  const t = useTranslations("dashboard.scrimCreationForm");
  const prefersReducedMotion = useReducedMotion();
  const bans = field.value || [];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = bans.findIndex(
      (ban) => `ban-${ban.hero}-${ban.team}-${ban.banPosition}` === active.id
    );
    const newIndex = bans.findIndex(
      (ban) => `ban-${ban.hero}-${ban.team}-${ban.banPosition}` === over.id
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(bans, oldIndex, newIndex).map((ban, i) => ({
      ...ban,
      banPosition: i + 1,
    }));
    field.onChange(reordered);
  }

  function addBan() {
    field.onChange([
      ...bans,
      { hero: "", team: "", banPosition: bans.length + 1 },
    ]);
  }

  function updateBan(index: number, patch: Partial<HeroBan>) {
    const next = [...bans];
    next[index] = { ...next[index], ...patch };
    field.onChange(next);
  }

  function removeBan(index: number) {
    const next = bans
      .filter((_, i) => i !== index)
      .map((ban, i) => ({ ...ban, banPosition: i + 1 }));
    field.onChange(next);
  }

  return (
    <Field data-invalid={invalid} id="docs-demo-step7">
      <div className="flex items-center justify-between">
        <FieldLabel className="mb-0">
          {t("heroBansName")}
          {bans.length > 0 && (
            <span className="text-muted-foreground/70 ml-1.5 font-mono text-[0.6875rem] tracking-[0.04em] tabular-nums">
              {bans.length}
            </span>
          )}
        </FieldLabel>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -mr-2 gap-1"
          onClick={addBan}
        >
          <Plus className="size-3.5" />
          {t("addHeroBan")}
        </Button>
      </div>
      <div className="mt-2 space-y-2">
        {bans.length > 0 && (
          <div className="text-muted-foreground/80 grid grid-cols-[28px_1fr_1fr_56px_36px] items-center gap-2 px-1 font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
            <span aria-hidden="true" />
            <span>{t("hero")}</span>
            <span>{t("team")}</span>
            <span className="text-center">{t("orderName")}</span>
            <span aria-hidden="true" />
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={bans.map(
              (ban) => `ban-${ban.hero}-${ban.team}-${ban.banPosition}`
            )}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence initial={false}>
              {bans.map((ban, index) => (
                <motion.div
                  key={`ban-${ban.hero}-${ban.team}-${ban.banPosition}`}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -4 }
                  }
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <SortableBanItem
                    ban={ban}
                    index={index}
                    overwatchHeroes={Object.keys(heroRoleMapping)}
                    team1Name={mapData?.match_start?.[0]?.[4]}
                    team2Name={mapData?.match_start?.[0]?.[5]}
                    onHeroChange={(value) => updateBan(index, { hero: value })}
                    onTeamChange={(value) => updateBan(index, { team: value })}
                    onRemove={() => removeBan(index)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
        {bans.length === 0 && (
          <p className="text-muted-foreground/80 text-xs">
            {t("heroBansDescription")}
          </p>
        )}
      </div>
      {invalid && error && <FieldError errors={[error]} />}
    </Field>
  );
}
