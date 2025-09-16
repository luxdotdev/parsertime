"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AvatarUpdateDialog } from "@/components/team/avatar-update-dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClientOnly } from "@/lib/client-only";
import type { Team } from "@prisma/client";
import { ClipboardCopyIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

export function TeamSettingsForm({ team }: { team: Team }) {
  const t = useTranslations("teamPage");

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const profileFormSchema = z.object({
    name: z
      .string()
      .min(2, {
        message: t("name.minMessage"),
      })
      .max(30, {
        message: t("name.maxMessage"),
      }),
    readonly: z.boolean().optional(),
  });

  type ProfileFormValues = z.infer<typeof profileFormSchema>;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: team.name ?? "",
      readonly: team.readonly,
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    const reqBody = {
      name: data.name,
      readonly: data.readonly,
      teamId: team.id,
    };

    setLoading(true);
    const res = await fetch("/api/team/update-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    if (res.ok) {
      toast.success(t("update.onSubmit.title"), {
        description: t("update.onSubmit.description"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast.error(t("update.onSubmit.errorTitle"), {
        description: t("update.onSubmit.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
        duration: 5000,
      });
    }
    setLoading(false);
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files?.[0]) {
      setSelectedFile(files[0]);
      setAvatarDialogOpen(true); // Open the dialog upon file selection
    }
  }

  return (
    <ClientOnly>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormItem>
            <FormLabel>{t("teamInviteLink.title")}</FormLabel>
            <FormControl>
              <div className="items-center">
                <p>{t("teamInviteLink.subtitle")}</p>
                <code className="rounded bg-zinc-800 p-1 text-zinc-800 transition-colors hover:text-white">
                  https://parsertime.app/team/join/
                  {btoa(team.createdAt.toISOString())}
                </code>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ClipboardCopyIcon
                        className="ml-2 inline-block h-5 w-5 cursor-pointer"
                        onClick={() => {
                          void navigator.clipboard.writeText(
                            `https://parsertime.app/team/join/${btoa(
                              team.createdAt.toISOString()
                            )}`
                          );
                          toast.success(t("clipboard.title"), {
                            description: t("clipboard.description"),
                            duration: 5000,
                          });
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{t("clipboard.tooltip")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </FormControl>
            <FormDescription>{t("teamInviteLink.description")}</FormDescription>
          </FormItem>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name.title")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("name.placeholder")}
                    defaultValue={team.name ?? ""}
                    className="max-w-lg"
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("name.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>{t("avatar.title")}</FormLabel>
            <FormControl aria-readonly>
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                  aria-label={t("avatar.label")}
                />
                <Image
                  src={
                    team.image ?? `https://avatar.vercel.sh/${team.name}.png`
                  }
                  width={800}
                  height={800}
                  alt={t("avatar.altText")}
                  className="h-16 w-16 cursor-pointer rounded-full"
                  onClick={handleAvatarClick}
                />
                <AvatarUpdateDialog
                  team={team}
                  isOpen={avatarDialogOpen}
                  setIsOpen={setAvatarDialogOpen}
                  selectedFile={selectedFile}
                />
              </>
            </FormControl>
            <FormDescription>{t("avatar.description")}</FormDescription>
            <FormMessage />
          </FormItem>
          <FormField
            control={form.control}
            name="readonly"
            render={({ field }) => (
              <FormItem className="flex max-w-lg flex-row items-start space-y-0 space-x-3 rounded-md p-4 shadow">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t("readonly.title")}</FormLabel>
                  <FormDescription>{t("readonly.description")}</FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("update.updating")}
              </>
            ) : (
              t("update.title")
            )}
          </Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
