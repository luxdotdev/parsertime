"use client";

import { SortableBanItem } from "@/components/map/sortable-ban-item";
import { WinnerSelectorDialog } from "@/components/tournament/match/winner-selector-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientOnly } from "@/lib/client-only";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

const ACCEPTED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const MAX_FILE_SIZE = 10000000; // 10MB

type TournamentAddMapCardProps = {
  matchId: number;
  bestOf: number;
  currentMapCount: number;
  team1Name: string;
  team2Name: string;
};

export function TournamentAddMapCard({
  matchId,
  bestOf,
  currentMapCount,
  team1Name,
  team2Name,
}: TournamentAddMapCardProps) {
  const [dragActive, setDragActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParserData | null>(null);
  const [, setSelectedFile] = useState<File | null>(null);
  const [heroBans, setHeroBans] = useState<
    { hero: string; team: string; banPosition: number }[]
  >([]);
  const [gameNumber, setGameNumber] = useState(String(currentMapCount + 1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [winnerDialog, setWinnerDialog] = useState<{
    open: boolean;
    tournamentMapId: number;
    mapName: string;
  }>({ open: false, tournamentMapId: 0, mapName: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE) return "File must be under 10MB";
    if (!ACCEPTED_FILE_TYPES.includes(file.type))
      return "Only .xlsx and .txt files are accepted";
    return null;
  }

  async function handleFile(file: File) {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    const hasCorruptedData = await detectFileCorruption(file);
    if (hasCorruptedData.isCorrupted) {
      toast.warning("Corrupted data detected", {
        description: "Some data may have been cleaned automatically.",
        duration: 8000,
      });
    }

    const data = await parseData(file);
    setSelectedFile(file);
    setParsedData(data);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!parsedData) return;

    setIsSubmitting(true);
    toast.info("Uploading map...", { duration: 5000 });

    try {
      const res = await fetch(`/api/tournament/match/${matchId}/add-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          map: parsedData,
          heroBans: heroBans.length > 0 ? heroBans : undefined,
          gameNumber: Number(gameNumber),
        }),
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error?: string };
        throw new Error(errBody.error ?? "Failed to upload map");
      }

      const result = (await res.json()) as {
        mapId: number;
        tournamentMapId: number;
        winner: string | null;
        needsManualWinner: boolean;
      };

      setModalOpen(false);
      setHeroBans([]);
      setSelectedFile(null);
      setParsedData(null);

      if (result.needsManualWinner) {
        const mapName = parsedData.match_start?.[0]?.[2] ?? "Unknown Map";
        setWinnerDialog({
          open: true,
          tournamentMapId: result.tournamentMapId,
          mapName,
        });
        toast.info("Map uploaded — please select the winner", {
          duration: 5000,
        });
      } else {
        toast.success("Map uploaded successfully", { duration: 5000 });
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload map"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    if (e.target.files?.[0]) {
      void handleFile(e.target.files[0]);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = heroBans.findIndex(
        (ban) => `ban-${ban.hero}-${ban.team}-${ban.banPosition}` === active.id
      );
      const newIndex = heroBans.findIndex(
        (ban) => `ban-${ban.hero}-${ban.team}-${ban.banPosition}` === over.id
      );
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedBans = arrayMove(heroBans, oldIndex, newIndex);
        setHeroBans(
          reorderedBans.map((ban, i) => ({ ...ban, banPosition: i + 1 }))
        );
      }
    }
  }

  return (
    <ClientOnly>
      <button
        type="button"
        className={cn(
          "border-border flex w-full cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-5 py-6 text-left transition-colors",
          dragActive
            ? "border-green-500 bg-green-500/5"
            : "hover:border-muted-foreground/30 hover:bg-muted/30"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="bg-muted rounded-full p-2.5">
          <Upload className="text-muted-foreground size-4" />
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">
            Upload a map replay
          </p>
          <p className="text-muted-foreground text-xs">
            Drag and drop an .xlsx or .txt file, or click to browse
          </p>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx, .txt"
          onChange={handleChange}
        />
      </button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Map</DialogTitle>
            <DialogDescription>
              Set the game number and optionally add hero bans for this map.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="game-number-trigger"
                className="text-sm font-medium"
              >
                Game Number
              </label>
              <Select value={gameNumber} onValueChange={setGameNumber}>
                <SelectTrigger id="game-number-trigger" className="mt-1 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: bestOf }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Map {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <span className="text-sm font-medium">Hero Bans</span>
              <div className="mt-2 space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={heroBans.map(
                      (ban) => `ban-${ban.hero}-${ban.team}-${ban.banPosition}`
                    )}
                    strategy={verticalListSortingStrategy}
                  >
                    {heroBans.map((ban, index) => (
                      <SortableBanItem
                        key={`ban-${ban.hero}-${ban.team}-${ban.banPosition}`}
                        ban={ban}
                        index={index}
                        overwatchHeroes={Object.keys(heroRoleMapping)}
                        team1Name={
                          parsedData?.match_start?.[0]?.[4] ?? team1Name
                        }
                        team2Name={
                          parsedData?.match_start?.[0]?.[5] ?? team2Name
                        }
                        onHeroChange={(value) => {
                          const newBans = [...heroBans];
                          newBans[index] = { ...newBans[index], hero: value };
                          setHeroBans(newBans);
                        }}
                        onTeamChange={(value) => {
                          const newBans = [...heroBans];
                          newBans[index] = { ...newBans[index], team: value };
                          setHeroBans(newBans);
                        }}
                        onRemove={() => {
                          const newBans = heroBans
                            .filter((_, i) => i !== index)
                            .map((b, i) => ({ ...b, banPosition: i + 1 }));
                          setHeroBans(newBans);
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setHeroBans([
                      ...heroBans,
                      { hero: "", team: "", banPosition: heroBans.length + 1 },
                    ])
                  }
                >
                  Add Hero Ban
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <ReloadIcon className="mr-2 size-4 animate-spin" />
              )}
              Upload Map
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WinnerSelectorDialog
        open={winnerDialog.open}
        onOpenChange={(open) => setWinnerDialog((prev) => ({ ...prev, open }))}
        tournamentMapId={winnerDialog.tournamentMapId}
        mapName={winnerDialog.mapName}
        team1Name={team1Name}
        team2Name={team2Name}
      />
    </ClientOnly>
  );
}
