"use client";

import type { HeroBan } from "@/components/dashboard/scrim-creator/types";
import { SortableBanItem } from "@/components/map/sortable-ban-item";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

const HEROES = Object.keys(heroRoleMapping);

function banKey(ban: HeroBan) {
  return `ban-${ban.hero}-${ban.team}-${ban.banPosition}`;
}

function renumber(bans: HeroBan[]): HeroBan[] {
  return bans.map((ban, i) => ({ ...ban, banPosition: i + 1 }));
}

type Props = {
  bans: HeroBan[];
  onChange: (bans: HeroBan[]) => void;
  team1Name?: string;
  team2Name?: string;
  disabled?: boolean;
};

/**
 * Hero-ban list for a single map inside the bulk upload flow. Each map renders
 * its own editor with an isolated drag context, so reordering one map's bans
 * never interferes with another's.
 */
export function MapBansEditor({
  bans,
  onChange,
  team1Name,
  team2Name,
  disabled,
}: Props) {
  const t = useTranslations("bulkUpload");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = bans.findIndex((b) => banKey(b) === active.id);
    const newIndex = bans.findIndex((b) => banKey(b) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(renumber(arrayMove(bans, oldIndex, newIndex)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground/80 font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {t("heroBansHeader")}
          {bans.length > 0 && (
            <span className="ml-1.5 tabular-nums">{bans.length}</span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground -mr-2 gap-1"
          onClick={() =>
            onChange([
              ...bans,
              { hero: "", team: "", banPosition: bans.length + 1 },
            ])
          }
        >
          <Plus className="size-3.5" />
          {t("addHeroBan")}
        </Button>
      </div>

      {bans.length > 0 ? (
        <>
          <div className="text-muted-foreground/80 grid grid-cols-[minmax(28px,32px)_minmax(0,1fr)_minmax(0,1fr)_minmax(56px,64px)_minmax(44px,48px)] items-center gap-2 px-1 font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
            <span aria-hidden="true" />
            <span>{t("hero")}</span>
            <span>{t("team")}</span>
            <span className="text-center">{t("order")}</span>
            <span aria-hidden="true" />
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={bans.map(banKey)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {bans.map((ban, index) => (
                  <SortableBanItem
                    key={banKey(ban)}
                    ban={ban}
                    index={index}
                    overwatchHeroes={HEROES}
                    team1Name={team1Name}
                    team2Name={team2Name}
                    onHeroChange={(value) => {
                      const next = [...bans];
                      next[index] = { ...next[index], hero: value };
                      onChange(next);
                    }}
                    onTeamChange={(value) => {
                      const next = [...bans];
                      next[index] = { ...next[index], team: value };
                      onChange(next);
                    }}
                    onRemove={() =>
                      onChange(renumber(bans.filter((_, i) => i !== index)))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <p className="text-muted-foreground/80 text-xs">{t("heroBansEmpty")}</p>
      )}
    </div>
  );
}
