import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { useTranslations } from "next-intl";

export function SortableBanItem({
  ban,
  index,
  overwatchHeroes,
  onHeroChange,
  onTeamChange,
  onRemove,
  team1Name,
  team2Name,
}: {
  ban: { hero: string; team: string; banPosition: number };
  index: number;
  overwatchHeroes: string[];
  onHeroChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onRemove: () => void;
  team1Name?: string;
  team2Name?: string;
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
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[28px_1fr_1fr_56px_36px] items-center gap-2"
    >
      <button
        type="button"
        aria-label="Reorder"
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-9 cursor-grab items-center justify-center rounded-md transition-colors active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
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
      <Select value={ban.team} onValueChange={onTeamChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("selectTeam")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="team1">{team1Name ?? "Team 1"}</SelectItem>
          <SelectItem value="team2">{team2Name ?? "Team 2"}</SelectItem>
        </SelectContent>
      </Select>
      <div className="bg-muted text-foreground flex h-9 items-center justify-center rounded-md font-mono text-sm tabular-nums">
        {index + 1}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive"
        aria-label="Remove ban"
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
