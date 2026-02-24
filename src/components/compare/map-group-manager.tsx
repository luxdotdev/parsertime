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

async function fetchMapGroups(teamId: number): Promise<FormattedMapGroup[]> {
  const response = await fetch(`/api/compare/map-groups?teamId=${teamId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch map groups");
  }
  const data = (await response.json()) as {
    success: boolean;
    groups: FormattedMapGroup[];
  };
  return data.groups;
}

async function createMapGroup(
  teamId: number,
  formData: MapGroupFormData
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
    throw new Error(error.error || "Failed to create map group");
  }
  const data = (await response.json()) as {
    success: boolean;
    group: FormattedMapGroup;
  };
  return data.group;
}

async function updateMapGroup(
  groupId: number,
  formData: Partial<MapGroupFormData>
): Promise<FormattedMapGroup> {
  const response = await fetch(`/api/compare/map-groups/${groupId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || "Failed to update map group");
  }
  const data = (await response.json()) as {
    success: boolean;
    group: FormattedMapGroup;
  };
  return data.group;
}

async function deleteMapGroup(groupId: number): Promise<void> {
  const response = await fetch(`/api/compare/map-groups/${groupId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || "Failed to delete map group");
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
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<MapGroupFormData>({
    name: editGroup?.name ?? "",
    description: editGroup?.description ?? "",
    category: editGroup?.category ?? "",
    mapIds: editGroup?.mapIds ?? [],
  });

  const createMutation = useMutation({
    mutationFn: () => createMapGroup(teamId, formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mapGroups", teamId] });
      toast.success("Map group created", {
        description: "Your map group has been created successfully.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateMapGroup(editGroup!.id, formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mapGroups", teamId] });
      toast.success("Map group updated", {
        description: "Your map group has been updated successfully.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error("Error", {
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
          Group Name<span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Brawl Maps, Open Maps"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional description for this group"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          disabled={isLoading}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          placeholder="e.g., Playstyle, Map Type"
          value={formData.category}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, category: e.target.value }))
          }
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Select Maps<span className="text-destructive ml-1">*</span>
        </Label>
        <div className="max-h-[300px] overflow-y-auto rounded-lg border">
          {availableMaps.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">
              No maps available
            </div>
          ) : (
            <div className="divide-y">
              {availableMaps.map((map) => (
                <label
                  key={map.id}
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
            {formData.mapIds.length} map
            {formData.mapIds.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={isLoading || formData.mapIds.length === 0}
        >
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {editGroup ? "Update Group" : "Create Group"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MapGroupManager({
  teamId,
  availableMaps,
}: MapGroupManagerProps) {
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
    queryFn: () => fetchMapGroups(teamId),
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: number) => deleteMapGroup(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mapGroups", teamId] });
      toast.success("Map group deleted", {
        description: "The map group has been deleted successfully.",
      });
      setDeletingGroup(null);
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Map Groups</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Create custom map groups to organize and compare performance
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FolderPlus className="mr-2 size-4" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Map Group</DialogTitle>
                <DialogDescription>
                  Group maps together to analyze performance across different
                  contexts
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
            <h3 className="mb-2 text-base font-semibold">No map groups yet</h3>
            <p className="text-muted-foreground mx-auto mb-4 max-w-sm text-sm text-pretty">
              Create your first map group to organize maps and compare
              performance across different contexts
            </p>
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <FolderPlus className="mr-2 size-4" />
              Create Map Group
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
                          aria-label="Group actions"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingGroup(group)}
                        >
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingGroup(group)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
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
                    <span className="text-muted-foreground">Maps:</span>
                    <span className="font-medium tabular-nums">
                      {group.mapCount}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Created by {group.createdBy}
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
              <DialogTitle>Edit Map Group</DialogTitle>
              <DialogDescription>
                Update the map group details and map selection
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
              <AlertDialogTitle>Delete Map Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingGroup?.name}
                &quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
