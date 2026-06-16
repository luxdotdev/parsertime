"use client";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormattedMapGroup } from "@/types/map-group";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type AddToMapGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  mapIds: number[];
  mapName: string;
};

async function fetchMapGroups(
  teamId: number,
  errorMessage: string
): Promise<FormattedMapGroup[]> {
  const response = await fetch(`/api/compare/map-groups?teamId=${teamId}`);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  const data = (await response.json()) as {
    success: boolean;
    groups: FormattedMapGroup[];
  };
  return data.groups;
}

async function addMapToGroup(
  groupId: number,
  mapIds: number[]
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`/api/compare/map-groups/${groupId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mapIds }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    return { success: false, error: error.error };
  }

  return { success: true };
}

async function createMapGroup(data: {
  name: string;
  description?: string;
  teamId: number;
  mapIds: number[];
  category?: string;
}): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("/api/compare/map-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    return { success: false, error: error.error };
  }

  return { success: true };
}

export function AddToMapGroupDialog({
  open,
  onOpenChange,
  teamId,
  mapIds,
  mapName,
}: AddToMapGroupDialogProps) {
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("scrimPage.addToMapGroupDialog");

  const queryClient = useQueryClient();

  const { data: mapGroups, isLoading } = useQuery({
    queryKey: ["mapGroups", teamId],
    queryFn: () => fetchMapGroups(teamId, t("toast.fetchFailed")),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  async function handleAddToExisting() {
    if (!selectedGroupId) return;

    setIsSubmitting(true);
    try {
      const group = mapGroups?.find((g) => g.id === selectedGroupId);
      if (!group) return;

      // Combine existing map IDs with new ones (deduplicate)
      const combinedMapIds = Array.from(new Set([...group.mapIds, ...mapIds]));

      const result = await addMapToGroup(selectedGroupId, combinedMapIds);

      if (result.success) {
        toast.success(t("toast.added.title"), {
          description: t("toast.added.description", {
            mapName,
            groupName: group.name,
          }),
        });
        await queryClient.invalidateQueries({
          queryKey: ["mapGroups", teamId],
        });
        onOpenChange(false);
        setSelectedGroupId(null);
      } else {
        toast.error(t("toast.addFailed.title"), {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error(t("toast.addFailed.title"), {
        description:
          error instanceof Error ? error.message : t("toast.unknownError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateNew() {
    if (!newGroupName.trim()) {
      toast.error(t("toast.nameRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createMapGroup({
        name: newGroupName,
        description: newGroupDescription || undefined,
        teamId,
        mapIds,
        category: newGroupCategory || undefined,
      });

      if (result.success) {
        toast.success(t("toast.created.title"), {
          description: t("toast.created.description", {
            groupName: newGroupName,
            mapName,
          }),
        });
        await queryClient.invalidateQueries({
          queryKey: ["mapGroups", teamId],
        });
        onOpenChange(false);
        setNewGroupName("");
        setNewGroupDescription("");
        setNewGroupCategory("");
        setMode("select");
      } else {
        toast.error(t("toast.createFailed.title"), {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error(t("toast.createFailed.title"), {
        description:
          error instanceof Error ? error.message : t("toast.unknownError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setMode("select");
    setSelectedGroupId(null);
    setNewGroupName("");
    setNewGroupDescription("");
    setNewGroupCategory("");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "select" ? t("title.add") : t("title.create")}
          </DialogTitle>
          <DialogDescription>
            {mode === "select"
              ? t("description.add", { mapName })
              : t("description.create", { mapName })}
          </DialogDescription>
        </DialogHeader>

        {mode === "select" ? (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : mapGroups && mapGroups.length > 0 ? (
              <div className="space-y-2">
                <Label>{t("selectGroup")}</Label>
                <div className="max-h-[300px] overflow-y-auto rounded-md border">
                  {mapGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`hover:bg-accent w-full px-4 py-3 text-left transition-colors ${
                        selectedGroupId === group.id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-muted-foreground text-sm">
                          {group.description}
                        </div>
                      )}
                      <div className="text-muted-foreground mt-1 text-xs">
                        {t("mapCount", { count: group.mapIds.length })}
                        {group.category && ` · ${group.category}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <p>{t("empty.title")}</p>
                <p className="text-sm">{t("empty.description")}</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMode("create")}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("createNew")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("form.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t("form.namePlaceholder")}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("form.description")}</Label>
              <Textarea
                id="description"
                placeholder={t("form.descriptionPlaceholder")}
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t("form.category")}</Label>
              <Input
                id="category"
                placeholder={t("form.categoryPlaceholder")}
                value={newGroupCategory}
                onChange={(e) => setNewGroupCategory(e.target.value)}
                maxLength={50}
              />
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setMode("select")}
            >
              {t("backToSelection")}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("cancel")}
          </Button>
          {mode === "select" ? (
            <Button
              onClick={handleAddToExisting}
              disabled={!selectedGroupId || isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("addToGroup")}
            </Button>
          ) : (
            <Button
              onClick={handleCreateNew}
              disabled={!newGroupName.trim() || isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("createAndAdd")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
