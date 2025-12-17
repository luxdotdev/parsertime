"use client";

import { SortableBanItem } from "@/components/map/sortable-ban-item";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/components/ui/link";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Form, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const TXT = "text/plain";

const ACCEPTED_FILE_TYPES = [XLSX, TXT];

const MAX_FILE_SIZE = 1000000; // 1MB in bytes

export function AddMapCard() {
  const [dragActive, setDragActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParserData | null>(null);
  const [heroBans, setHeroBans] = useState<
    { hero: string; team: string; banPosition: number }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("scrimPage.addMap");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const formSchema = z.object({
    file: z
      .instanceof(File)
      .refine(
        (file) => file !== null && file !== undefined,
        t("fileMessage.required")
      )
      .refine(
        (file) => file && file.size <= MAX_FILE_SIZE,
        t("fileMessage.maxSize")
      )
      .refine(
        (file) => file && ACCEPTED_FILE_TYPES.includes(file.type),
        t("fileMessage.accepted")
      )
      .nullable(),
  });

  async function handleFile(file: File) {
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

    setSelectedFile(file);
    setParsedData(data);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!parsedData) return;

    setIsSubmitting(true);
    const scrimId = pathname.split("/")[3];

    toast.error(t("handleFile.creatingTitle"), {
      description: t("handleFile.creatingDescription"),
      duration: 5000,
    });

    const hasCorruptedData = selectedFile
      ? await detectFileCorruption(selectedFile)
      : { isCorrupted: false };

    const requestData = {
      map: parsedData,
      heroBans: heroBans.length > 0 ? heroBans : undefined,
    };

    const res = await fetch(`/api/scrim/add-map?id=${scrimId}`, {
      method: "POST",
      body: JSON.stringify(requestData),
    });

    if (res.ok) {
      if (hasCorruptedData.isCorrupted) {
        toast.success(t("dataCorruption.success.title"), {
          description: t("dataCorruption.success.description"),
          duration: 6000,
        });
      } else {
        toast.success(t("handleFile.createTitle"), {
          description: t("handleFile.createDescription"),
          duration: 5000,
        });
      }
      setModalOpen(false);
      setHeroBans([]);
      setSelectedFile(null);
      setParsedData(null);
      router.refresh();
    } else {
      toast.error(t("handleFile.errorTitle"), {
        description: t.rich("handleFile.errorDescription", {
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
    }
    setIsSubmitting(false);
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
      // at least one file has been selected so do something
      void handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    if (e.target.files?.[0]) {
      // at least one file has been selected so do something
      void handleFile(e.target.files[0]);
    }
  }

  function handleClick() {
    document.getElementById("file")?.click();
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: null,
    },
  });

  return (
    <ClientOnly>
      <Form {...form} className="w-full p-2 md:w-1/3">
        <form onDragEnter={handleDrag}>
          <FormField
            control={form.control}
            name="file"
            render={() => (
              <FormItem>
                <div
                  className={cn(
                    "h-48 max-w-md rounded-2xl",
                    dragActive && "border-green-500"
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleClick();
                      }
                    }}
                    className="border-border flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleClick}
                  >
                    <div className="bg-muted mb-2 rounded-full p-3">
                      <Upload className="text-muted-foreground h-5 w-5" />
                    </div>
                    <p className="text-foreground text-sm font-medium">
                      {t("title")}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {t.rich("description", {
                        here: (chunks) => (
                          <Label
                            htmlFor="file"
                            className="text-primary hover:text-primary/90 inline-block cursor-pointer font-medium"
                            onClick={(e) => e.stopPropagation()} // Prevent triggering handleBoxClick
                          >
                            {chunks}
                          </Label>
                        ),
                      })}
                    </p>
                    <Input
                      type="file"
                      id="file"
                      className="hidden w-64"
                      accept=".xlsx, .txt"
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </FormItem>
            )}
          />
        </form>
      </Form>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("heroBansTitle")}</DialogTitle>
            <DialogDescription>{t("heroBansDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
                    team1Name={parsedData?.match_start?.[0]?.[4]}
                    team2Name={parsedData?.match_start?.[0]?.[5]}
                    onHeroChange={(value) => {
                      const newBans = [...heroBans];
                      newBans[index] = {
                        ...newBans[index],
                        hero: value,
                      };
                      setHeroBans(newBans);
                    }}
                    onTeamChange={(value) => {
                      const newBans = [...heroBans];
                      newBans[index] = {
                        ...newBans[index],
                        team: value,
                      };
                      setHeroBans(newBans);
                    }}
                    onRemove={() => {
                      const newBans = heroBans.filter((_, i) => i !== index);
                      const updatedBans = newBans.map((ban, i) => ({
                        ...ban,
                        banPosition: i + 1,
                      }));
                      setHeroBans(updatedBans);
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setHeroBans([
                  ...heroBans,
                  {
                    hero: "",
                    team: "",
                    banPosition: heroBans.length + 1,
                  },
                ]);
              }}
            >
              {t("addHeroBan")}
            </Button>
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
              {isSubmitting ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientOnly>
  );

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
        const updatedBans = reorderedBans.map((ban, i) => ({
          ...ban,
          banPosition: i + 1,
        }));
        setHeroBans(updatedBans);
      }
    }
  }
}
