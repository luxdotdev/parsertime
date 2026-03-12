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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bell, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";

interface NotificationConfigData {
  id: string;
  guildId: string;
  channelId: string;
  teamIds: number[];
  createdAt: string;
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

interface NotificationConfigProps {
  teams: { id: number; name: string }[];
}

export function NotificationConfig({ teams }: NotificationConfigProps) {
  const t = useTranslations("settingsPage.linkedAccounts.notifications");

  const [configs, setConfigs] = useState<NotificationConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add dialog state
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Guild/channel name cache for display
  const [guildNames, setGuildNames] = useState<Record<string, string>>({});
  const [channelNames, setChannelNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      const res = await fetch("/api/bot/notifications");
      const data = (await res.json()) as {
        success: boolean;
        data?: NotificationConfigData[];
      };
      if (data.success && Array.isArray(data.data)) {
        setConfigs(data.data);
      }
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchGuilds() {
    setLoadingGuilds(true);
    try {
      const res = await fetch("/api/bot/guilds");
      const data = (await res.json()) as {
        success: boolean;
        data?: Guild[];
      };
      if (data.success && Array.isArray(data.data)) {
        setGuilds(data.data);
        const names: Record<string, string> = {};
        for (const g of data.data) {
          names[g.id] = g.name;
        }
        setGuildNames((prev) => ({ ...prev, ...names }));
      }
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setLoadingGuilds(false);
    }
  }

  async function fetchChannels(guildId: string) {
    setLoadingChannels(true);
    setChannels([]);
    setSelectedChannelId("");
    try {
      const res = await fetch(`/api/bot/guilds/${guildId}/channels`);
      const data = (await res.json()) as {
        success: boolean;
        data?: Channel[];
      };
      if (data.success && Array.isArray(data.data)) {
        setChannels(data.data);
        const names: Record<string, string> = {};
        for (const c of data.data) {
          names[c.id] = c.name;
        }
        setChannelNames((prev) => ({ ...prev, ...names }));
      }
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setLoadingChannels(false);
    }
  }

  function handleOpenAddDialog() {
    setSelectedGuildId("");
    setSelectedChannelId("");
    setSelectedTeamIds([]);
    setChannels([]);
    setAddDialogOpen(true);
    fetchGuilds();
  }

  function handleGuildChange(guildId: string) {
    setSelectedGuildId(guildId);
    fetchChannels(guildId);
  }

  function handleTeamToggle(teamId: number) {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  }

  function handleCreate() {
    if (
      !selectedGuildId ||
      !selectedChannelId ||
      selectedTeamIds.length === 0
    ) {
      return;
    }

    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/bot/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guildId: selectedGuildId,
            channelId: selectedChannelId,
            teamIds: selectedTeamIds,
          }),
        });
        const data = (await res.json()) as { success: boolean; error?: string };
        if (data.success) {
          toast.success(t("toast.created"));
          setAddDialogOpen(false);
          await fetchConfigs();
        } else {
          toast.error(data.error ?? t("toast.error"));
        }
      } catch {
        toast.error(t("toast.error"));
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  function handleDelete() {
    if (!deletingConfigId) return;
    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/bot/notifications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ configId: deletingConfigId }),
        });
        const data = (await res.json()) as { success: boolean };
        if (data.success) {
          toast.success(t("toast.deleted"));
          setDeletingConfigId(null);
          await fetchConfigs();
        } else {
          toast.error(t("toast.error"));
        }
      } catch {
        toast.error(t("toast.error"));
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  function getTeamNames(teamIds: number[]): string {
    return teamIds
      .map((id) => teams.find((t) => t.id === id)?.name ?? `Team ${id}`)
      .join(", ");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
            <Button size="sm" onClick={handleOpenAddDialog}>
              {t("addConfig")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : configs.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="text-muted-foreground mx-auto h-8 w-8" />
              <p className="mt-2 font-medium">{t("noConfigs")}</p>
              <p className="text-muted-foreground text-sm">
                {t("noConfigsDescription")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("server")}</TableHead>
                  <TableHead>{t("channel")}</TableHead>
                  <TableHead>{t("teams")}</TableHead>
                  <TableHead className="w-[100px] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">
                      {guildNames[config.guildId] ?? config.guildId}
                    </TableCell>
                    <TableCell>
                      {channelNames[config.channelId] ?? config.channelId}
                    </TableCell>
                    <TableCell>{getTeamNames(config.teamIds)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingConfigId(config.id)}
                      >
                        {t("delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addDialog.title")}</DialogTitle>
            <DialogDescription>{t("addDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("addDialog.selectServer")}</Label>
              {loadingGuilds ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <Select
                  value={selectedGuildId}
                  onValueChange={handleGuildChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("addDialog.selectServer")} />
                  </SelectTrigger>
                  <SelectContent>
                    {guilds.map((guild) => (
                      <SelectItem key={guild.id} value={guild.id}>
                        {guild.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedGuildId && (
              <div>
                <Label>{t("addDialog.selectChannel")}</Label>
                {loadingChannels ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Select
                    value={selectedChannelId}
                    onValueChange={setSelectedChannelId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("addDialog.selectChannel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          #{channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {selectedChannelId && (
              <div>
                <Label>{t("addDialog.selectTeams")}</Label>
                <div className="mt-2 space-y-2">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`team-${team.id}`}
                        checked={selectedTeamIds.includes(team.id)}
                        onCheckedChange={() => handleTeamToggle(team.id)}
                      />
                      <Label
                        htmlFor={`team-${team.id}`}
                        className="cursor-pointer font-normal"
                      >
                        {team.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={
                isSubmitting ||
                !selectedGuildId ||
                !selectedChannelId ||
                selectedTeamIds.length === 0
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("addDialog.saving")}
                </>
              ) : (
                t("addDialog.submit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingConfigId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingConfigId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
