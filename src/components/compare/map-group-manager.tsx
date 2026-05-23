"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormattedMapGroup } from "@/types/map-group";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FolderPlus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type MapGroupManagerProps = {
  teamId: number;
  availableMaps: {
    id: number;
    name: string;
    scrimName: string;
  }[];
};

type MapGroupFormData = {
  name: string;
  description: string;
  category: string;
  mapIds: number[];
};

async function fetchMapGroups(
  teamId: number,
  fallbackError: string
): Promise<FormattedMapGroup[]> {
  const response = await fetch(`/api/compare/map-groups?teamId=${teamId}`);
  if (!response.ok) {
    throw new Error(fallbackError);
  }
  const data = (await response.json()) as {
    success: boolean;
    groups: FormattedMapGroup[];
  };
  return data.groups;
}

async function createMapGroup(
  teamId: number,
  formData: MapGroupFormData,
  fallbackError: string
): Promise<FormattedMapGroup> {
  const response = await fetch("/api/compare/map-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...formData,
      teamId,
    }),
  });
  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || fallbackError);
  }
  const data = (await response.json()) as {
    success: boolean;
    group: FormattedMapGroup;
  };
  return data.group;
}

async function updateMapGroup(
  groupId: number,
  formData: Partial<MapGroupFormData>,
  fallbackError: string
): Promise<FormattedMapGroup> {
  const response = await fetch(`/api/compare/map-groups/${groupId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || fallbackError);
  }
  const data = (await response.json()) as {
    success: boolean;
    group: FormattedMapGroup;
  };
  return data.group;
}

async function deleteMapGroup(
  groupId: number,
  fallbackError: string
): Promise<void> {
  const response = await fetch(`/api/compare/map-groups/${groupId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || fallbackError);
  }
}

function MapGroupForm({
  teamId,
  availableMaps,
  onSuccess,
  editGroup,
}: {
  teamId: number;
  availableMaps: MapGroupManagerProps["availableMaps"];
  onSuccess: () => void;
  editGroup?: FormattedMapGroup;
}) {
  const t = useTranslations("comparePage.mapGroupManager");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<MapGroupFormData>({
    name: editGroup?.name ?? "",
    description: editGroup?.description ?? "",
    category: editGroup?.category ?? "",
    mapIds: editGroup?.mapIds ?? [],
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createMapGroup(teamId, formData, t("errors.createFailed")),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mapGroups", teamId] });
      toast.success(t("toast.created"), {
        description: t("toast.createdDescription"),
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(t("toast.error"), {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMapGroup(editGroup!.id, formData, t("errors.updateFailed")),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mapGroups", teamId] });
      toast.success(t("toast.updated"), {
        description: t("toast.updatedDescription"),
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(t("toast.error"), {
        description: error.message,
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editGroup) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  function toggleMapSelection(mapId: number) {
    setFormData((prev) => ({
      ...prev,
      mapIds: prev.mapIds.includes(mapId)
        ? prev.mapIds.filter((id) => id !== mapId)
        : [...prev.mapIds, mapId],
    }));
  }

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          {t("form.name")}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="name"
          placeholder={t("form.namePlaceholder")}
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("form.description")}</Label>
        <Textarea
          id="description"
          placeholder={t("form.descriptionPlaceholder")}
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          disabled={isLoading}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">{t("form.category")}</Label>
        <Input
          id="category"
          placeholder={t("form.categoryPlaceholder")}
          value={formData.category}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, category: e.target.value }))
          }
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">
          {t("form.selectMaps")}
          <span className="text-destructive ml-1">*</span>
        </span>
        <div className="max-h-[300px] overflow-y-auto rounded-lg border">
          {availableMaps.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">
              {t("form.noMapsAvailable")}
            </div>
          ) : (
            <div className="divide-y">
              {availableMaps.map((map) => (
                <label
                  key={map.id}
                  aria-label={map.name}
                  className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 p-3 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.mapIds.includes(map.id)}
                    onChange={() => toggleMapSelection(map.id)}
                    disabled={isLoading}
                    className="text-primary focus:ring-primary size-4 rounded border-gray-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {map.name}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {map.scrimName}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        {formData.mapIds.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {t("form.selectedMaps", { count: formData.mapIds.length })}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={isLoading || formData.mapIds.length === 0}
        >
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {editGroup ? t("form.update") : t("form.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MapGroupManager({
  teamId,
  availableMaps,
}: MapGroupManagerProps) {
  const t = useTranslations("comparePage.mapGroupManager");
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FormattedMapGroup | null>(
    null
  );
  const [deletingGroup, setDeletingGroup] = useState<FormattedMapGroup | null>(
    null
  );

  const { data: mapGroups, isLoading } = useQuery({
    queryKey: ["mapGroups", teamId],
    queryFn: () => fetchMapGroups(teamId, t("errors.fetchFailed")),
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: number) =>
      deleteMapGroup(groupId, t("errors.deleteFailed")),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mapGroups", teamId] });
      toast.success(t("toast.deleted"), {
        description: t("toast.deletedDescription"),
      });
      setDeletingGroup(null);
    },
    onError: (error: Error) => {
      toast.error(t("toast.error"), {
        description: error.message,
      });
    },
  });

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("title")}</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("description")}
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FolderPlus className="mr-2 size-4" />
                {t("newGroup")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("createDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("createDialog.description")}
                </DialogDescription>
              </DialogHeader>
              <MapGroupForm
                teamId={teamId}
                availableMaps={availableMaps}
                onSuccess={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : !mapGroups || mapGroups.length === 0 ? (
          <div className="py-12 text-center">
            <div className="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
              <FolderPlus className="text-muted-foreground size-8" />
            </div>
            <h3 className="mb-2 text-base font-semibold">{t("empty.title")}</h3>
            <p className="text-muted-foreground mx-auto mb-4 max-w-sm text-sm text-pretty">
              {t("empty.description")}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <FolderPlus className="mr-2 size-4" />
              {t("empty.create")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mapGroups.map((group) => (
              <Card key={group.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {group.name}
                      </CardTitle>
                      {group.category && (
                        <p className="text-muted-foreground mt-1 truncate text-xs">
                          {group.category}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          aria-label={t("actions.label")}
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingGroup(group)}
                        >
                          <Pencil className="mr-2 size-4" />
                          {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingGroup(group)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          {t("actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm text-pretty">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {t("card.maps")}:
                    </span>
                    <span className="font-medium tabular-nums">
                      {group.mapCount}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {t("card.createdBy", { name: group.createdBy })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={!!editingGroup}
          onOpenChange={() => setEditingGroup(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("editDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("editDialog.description")}
              </DialogDescription>
            </DialogHeader>
            {editingGroup && (
              <MapGroupForm
                teamId={teamId}
                availableMaps={availableMaps}
                onSuccess={() => setEditingGroup(null)}
                editGroup={editingGroup}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deletingGroup}
          onOpenChange={() => setDeletingGroup(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDialog.description", {
                  name: deletingGroup?.name ?? "",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletingGroup) {
                    deleteMutation.mutate(deletingGroup.id);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {t("deleteDialog.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
