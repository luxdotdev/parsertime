"use client";

import { AvatarUpdateDialog } from "@/components/settings/avatar-update-dialog";
import { BannerUpdateDialog } from "@/components/settings/banner-update-dialog";
import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ClientOnly } from "@/lib/client-only";
import { zodResolver } from "@hookform/resolvers/zod";
import { $Enums, type AppliedTitle, type User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const colorblindModeOptions = [
  {
    value: $Enums.ColorblindMode.OFF,
    label: "Off",
    description: "Standard colors",
  },
  {
    value: $Enums.ColorblindMode.DEUTERANOPIA,
    label: "Deuteranopia",
    description: "Red-green colorblind (green-weak)",
  },
  {
    value: $Enums.ColorblindMode.PROTANOPIA,
    label: "Protanopia",
    description: "Red-green colorblind (red-weak)",
  },
  {
    value: $Enums.ColorblindMode.TRITANOPIA,
    label: "Tritanopia",
    description: "Blue-yellow colorblind",
  },
  {
    value: $Enums.ColorblindMode.CUSTOM,
    label: "Custom",
    description: "Choose your own team colors",
  },
];

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
  battletag: z.string().optional(),
  title: z.enum($Enums.Title).optional(),
  colorblindMode: z.enum($Enums.ColorblindMode),
  customTeam1Color: z.string().optional(),
  customTeam2Color: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type AppSettings = {
  id: number;
  userId: string;
  colorblindMode: $Enums.ColorblindMode;
  customTeam1Color: string | null;
  customTeam2Color: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null;

export function ProfileForm({
  user,
  appSettings,
  appliedTitle,
}: {
  user: User;
  appSettings: AppSettings;
  appliedTitle: AppliedTitle | null;
}) {
  const titleT = useTranslations("titles");
  const t = useTranslations("settingsPage.profileForm");

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name ?? "",
      battletag: user.battletag ?? "",
      title: appliedTitle?.title ?? undefined,
      colorblindMode: appSettings?.colorblindMode ?? $Enums.ColorblindMode.OFF,
      customTeam1Color: appSettings?.customTeam1Color ?? "#3b82f6",
      customTeam2Color: appSettings?.customTeam2Color ?? "#ef4444",
    },
    mode: "onChange",
  });

  // Watch form values to prevent infinite re-renders
  const watchedColorblindMode = useWatch({
    control: form.control,
    name: "colorblindMode",
  });
  const watchedTeam1Color = useWatch({
    control: form.control,
    name: "customTeam1Color",
  });
  const watchedTeam2Color = useWatch({
    control: form.control,
    name: "customTeam2Color",
  });

  async function onSubmit(data: ProfileFormValues) {
    try {
      // Update name if it changed
      if (data.name !== user.name) {
        const nameRes = await fetch("/api/user/update-name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: data.name }),
        });

        if (!nameRes.ok) {
          throw new Error(`Failed to update name: ${await nameRes.text()}`);
        }
      }

      // Update battletag if it changed
      if (data.battletag !== user.battletag) {
        const battletagRes = await fetch("/api/user/update-battletag", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ battletag: data.battletag }),
        });

        if (!battletagRes.ok) {
          throw new Error(
            `Failed to update battletag: ${await battletagRes.text()}`
          );
        }
      }

      // Update title if it changed
      if (data.title !== appliedTitle?.title) {
        const titleRes = await fetch("/api/user/update-title", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            appliedTitleId: appliedTitle?.id,
            newTitle: data.title,
          }),
        });

        if (!titleRes.ok) {
          throw new Error(`Failed to update title: ${await titleRes.text()}`);
        }
      }

      // Update app settings if they changed
      const currentColorblindMode =
        appSettings?.colorblindMode ?? $Enums.ColorblindMode.OFF;
      const currentTeam1Color = appSettings?.customTeam1Color ?? "#3b82f6";
      const currentTeam2Color = appSettings?.customTeam2Color ?? "#ef4444";

      if (
        data.colorblindMode !== currentColorblindMode ||
        data.customTeam1Color !== currentTeam1Color ||
        data.customTeam2Color !== currentTeam2Color
      ) {
        const settingsRes = await fetch("/api/user/app-settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            colorblindMode: data.colorblindMode,
            customTeam1Color: data.customTeam1Color,
            customTeam2Color: data.customTeam2Color,
          }),
        });

        if (!settingsRes.ok) {
          throw new Error(
            `Failed to update settings: ${await settingsRes.text()}`
          );
        }

        void queryClient.invalidateQueries({
          queryKey: ["appSettings"],
        });
      }

      toast.success(t("onSubmit.title"), {
        description: t("onSubmit.description"),
        duration: 5000,
      });
      router.refresh();
    } catch (error) {
      toast.error(t("onSubmit.errorTitle"), {
        description: t("onSubmit.errorDescription", {
          res: error instanceof Error ? error.message : "Unknown error",
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
      setAvatarDialogOpen(true);
    }
  }

  function handleBannerClick() {
    bannerFileInputRef.current?.click();
  }

  function handleBannerFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files?.[0]) {
      setSelectedBannerFile(files[0]);
      setBannerDialogOpen(true);
    }
  }

  function handleCustomColorChange(team: "team1" | "team2", color: unknown) {
    // Convert RGBA array to hex string if needed
    let hexColor: string;
    if (Array.isArray(color) && color.length >= 3) {
      const [r, g, b] = color as number[];
      hexColor = `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
    } else if (typeof color === "string") {
      hexColor = color;
    } else {
      // Fallback to current color
      const currentValue =
        team === "team1"
          ? form.getValues("customTeam1Color")
          : form.getValues("customTeam2Color");
      hexColor = currentValue ?? (team === "team1" ? "#3b82f6" : "#ef4444");
    }

    // Update form value
    if (team === "team1") {
      form.setValue("customTeam1Color", hexColor, { shouldDirty: true });
    } else {
      form.setValue("customTeam2Color", hexColor, { shouldDirty: true });
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
          <FormField
            control={form.control}
            name="battletag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("battletag.title")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="lux"
                    defaultValue={user.battletag ?? ""}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("battletag.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("title.title")}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a title" />
                    </SelectTrigger>
                    <SelectContent>
                      {user.titles.map((title) => (
                        <SelectItem key={title} value={title}>
                          {titleT(title)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>{t("title.description")}</FormDescription>
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
          {user.billingPlan === $Enums.BillingPlan.PREMIUM && (
            <FormItem>
              <FormLabel>{t("banner.title")}</FormLabel>
              <FormControl aria-readonly>
                <>
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    onChange={handleBannerFileChange}
                    className="hidden"
                    accept="image/*"
                    aria-label={t("banner.ariaLabel")}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    className="hover:border-primary relative h-32 w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-colors"
                    onClick={handleBannerClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleBannerClick();
                      }
                    }}
                  >
                    {user.bannerImage ? (
                      <Image
                        src={user.bannerImage}
                        fill
                        alt={t("banner.altText")}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600">
                        <span className="text-sm font-medium text-white">
                          {t("banner.placeholder")}
                        </span>
                      </div>
                    )}
                  </div>
                  <BannerUpdateDialog
                    user={user}
                    isOpen={bannerDialogOpen}
                    setIsOpen={setBannerDialogOpen}
                    selectedFile={selectedBannerFile}
                  />
                </>
              </FormControl>
              <FormDescription>{t("banner.description")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}

          <Separator />

          {/* Colorblind Mode Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">
                {t("colorblindMode.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("colorblindMode.description")}
              </p>
            </div>

            <FormField
              control={form.control}
              name="colorblindMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("colorblindMode.label")}
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={form.formState.isSubmitting}
                      className="mt-2"
                    >
                      {colorblindModeOptions.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-start space-x-2"
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={option.value}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={option.value}
                              className="cursor-pointer font-medium"
                            >
                              {option.label}
                            </Label>
                            <p className="text-muted-foreground text-sm">
                              {option.description}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <div
                                  className="border-border bg-team-1-off size-4 rounded-sm border"
                                  style={{
                                    backgroundColor:
                                      option.value ===
                                      $Enums.ColorblindMode.CUSTOM
                                        ? watchedTeam1Color
                                        : `var(--team-1-${option.value?.toLowerCase() ?? "off"})`,
                                  }}
                                />
                                <span className="text-muted-foreground text-xs">
                                  {t("colorblindMode.team1")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div
                                  className="border-border size-4 rounded-sm border"
                                  style={{
                                    backgroundColor:
                                      option.value ===
                                      $Enums.ColorblindMode.CUSTOM
                                        ? watchedTeam2Color
                                        : `var(--team-2-${option.value?.toLowerCase() ?? "off"})`,
                                  }}
                                />
                                <span className="text-muted-foreground text-xs">
                                  {t("colorblindMode.team2")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Color Pickers - only show when CUSTOM mode is selected */}
            {watchedColorblindMode === $Enums.ColorblindMode.CUSTOM && (
              <div className="space-y-6 rounded-md border p-4">
                <div>
                  <Label className="text-base font-medium">
                    {t("colorblindMode.customTeamColors")}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {t("colorblindMode.customTeamColorsDescription")}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="customTeam1Color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {t("colorblindMode.team1Color")}
                        </FormLabel>
                        <FormControl>
                          <ColorPicker
                            value={field.value}
                            onChange={(color) => {
                              handleCustomColorChange("team1", color);
                            }}
                            className="bg-background max-w-sm rounded-md border p-4 shadow-sm"
                          >
                            <ColorPickerSelection />
                            <div className="flex items-center gap-4">
                              <ColorPickerEyeDropper />
                              <div className="grid w-full gap-1">
                                <ColorPickerHue />
                                <ColorPickerAlpha />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ColorPickerOutput />
                              <ColorPickerFormat />
                            </div>
                          </ColorPicker>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customTeam2Color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {t("colorblindMode.team2Color")}
                        </FormLabel>
                        <FormControl>
                          <ColorPicker
                            value={field.value}
                            onChange={(color) => {
                              handleCustomColorChange("team2", color);
                            }}
                            className="bg-background max-w-sm rounded-md border p-4 shadow-sm"
                          >
                            <ColorPickerSelection />
                            <div className="flex items-center gap-4">
                              <ColorPickerEyeDropper />
                              <div className="grid w-full gap-1">
                                <ColorPickerHue />
                                <ColorPickerAlpha />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ColorPickerOutput />
                              <ColorPickerFormat />
                            </div>
                          </ColorPicker>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("updating")}
              </>
            ) : (
              t("update")
            )}
          </Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
