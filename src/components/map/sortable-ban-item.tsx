import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
            <SelectItem value="team1">{team1Name ?? "Team 1"}</SelectItem>
            <SelectItem value="team2">{team2Name ?? "Team 2"}</SelectItem>
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
