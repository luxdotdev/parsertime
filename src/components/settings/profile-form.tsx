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
import { ClientOnly } from "@/lib/client-only";
import type { User } from "@prisma/client";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    })
    .trim()
    .regex(/^(?!.*?:).*$/, {
      message: "Name must not contain special characters.",
    }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm({ user }: { user: User }) {
  const t = useTranslations("settingsPage.profileForm");

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name ?? "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    const res = await fetch("/api/user/update-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(t("onSubmit.title"), {
        description: t("onSubmit.description"),
        duration: 5000,
      });
      router.refresh();
    } else {
      toast.error(t("onSubmit.errorTitle"), {
        description: t("onSubmit.errorDescription", {
          res: `${await res.text()} (${res.status})`,
        }),
        duration: 5000,
      });
    }
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
                  aria-label={t("avatar.ariaLabel")}
                />
                <Image
                  src={user.image ?? "https://avatar.vercel.sh/parsertime.png"}
                  width={800}
                  height={800}
                  alt={t("avatar.altText")}
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
