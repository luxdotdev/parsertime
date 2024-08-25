"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AvatarUpdateDialog } from "@/components/settings/avatar-update-dialog";
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
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { User } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function DiscordSettingsForm({ user }: { user: User }) {
  const t = useTranslations("settingsPage.discordForm");
  const discordSettingsFormSchema = z.object({
    name: z
      .string()
      .min(2, {
        message: t("minMessage"),
      })
      .max(30, {
        message: t("maxMessage"),
      }),
  });
  type DiscordSettingsFormValues = z.infer<typeof discordSettingsFormSchema>;
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const form = useForm<DiscordSettingsFormValues>({
    resolver: zodResolver(discordSettingsFormSchema),
    defaultValues: {
      name: user.name ?? "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: DiscordSettingsFormValues) {
    const res = await fetch("/api/user/update-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({
        title: t("onSubmit.title"),
        description: t("onSubmit.description"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast({
        title: t("onSubmit.errorTitle"),
        description: t("onSubmit.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
        variant: "destructive",
        duration: 5000,
      });
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
      setAvatarDialogOpen(true); // Open the dialog upon file selection
    }
  };

  return (
    <ClientOnly>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("username.title")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="lux"
                    defaultValue={user.name ?? ""}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("username.description")}</FormDescription>
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
                  aria-label="File upload"
                />
                <Image
                  src={user.image || "https://avatar.vercel.sh/parsertime.png"}
                  width={800}
                  height={800}
                  alt="User avatar"
                  className="h-16 w-16 cursor-pointer rounded-full"
                  onClick={handleAvatarClick}
                />
                <AvatarUpdateDialog
                  user={user}
                  isOpen={avatarDialogOpen}
                  setIsOpen={setAvatarDialogOpen}
                  selectedFile={selectedFile}
                />
              </>
            </FormControl>
            <FormDescription>{t("avatar.description")}</FormDescription>
            <FormMessage />
          </FormItem>
          <Button type="submit">{t("update")}</Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
