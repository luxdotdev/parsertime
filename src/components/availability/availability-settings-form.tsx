"use client";

import { TimezoneSelect } from "@/components/availability/timezone-select";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

function createSchema(t: ReturnType<typeof useTranslations>) {
  return z
    .object({
      slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
      hoursStart: z.number().int().min(0).max(23),
      hoursEnd: z.number().int().min(1).max(24),
      timezone: z.string().min(1),
      reminderEnabled: z.boolean(),
      reminderDayOfWeek: z.number().int().min(0).max(6),
      reminderHour: z.number().int().min(0).max(23),
      reminderMinute: z.number().int().min(0).max(59),
      reminderRoleId: z.string().optional(),
      reminderGuildId: z.string().optional(),
      reminderChannelId: z.string().optional(),
    })
    .refine((v) => v.hoursEnd > v.hoursStart, {
      path: ["hoursEnd"],
      message: t("validation.endAfterStart"),
    })
    .refine((v) => ((v.hoursEnd - v.hoursStart) * 60) % v.slotMinutes === 0, {
      path: ["slotMinutes"],
      message: t("validation.evenSlots"),
    });
}

type Values = z.infer<ReturnType<typeof createSchema>>;

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function AvailabilitySettingsForm({
  teamId,
  initial,
}: {
  teamId: number;
  initial: Values;
}) {
  const t = useTranslations("availability.settingsForm");
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: initial,
  });

  async function onSubmit(values: Values) {
    const res = await fetch(`/api/team/${teamId}/availability/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        reminderRoleId: values.reminderRoleId ?? null,
        reminderGuildId: values.reminderGuildId ?? null,
        reminderChannelId: values.reminderChannelId ?? null,
      }),
    });
    if (!res.ok) {
      toast.error(t("toast.saveFailed"));
      return;
    }
    toast.success(t("toast.saved"));
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="slotMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("slotGranularity")}</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) =>
                    field.onChange(Number(v) as 15 | 30 | 60)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="15">
                      {t("slotMinutes", { count: 15 })}
                    </SelectItem>
                    <SelectItem value="30">
                      {t("slotMinutes", { count: 30 })}
                    </SelectItem>
                    <SelectItem value="60">
                      {t("slotMinutes", { count: 60 })}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("defaultTimezone")}</FormLabel>
                <FormControl>
                  <TimezoneSelect
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hoursStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("startHour")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hoursEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("endHour")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>{t("midnightHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 border-t pt-6">
          <FormField
            control={form.control}
            name="reminderEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>{t("weeklyReminder")}</FormLabel>
                  <FormDescription>
                    {t("weeklyReminderDescription")}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="reminderDayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("day")}</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DAYS.map((d, i) => (
                        <SelectItem key={d} value={String(i)}>
                          {t(`days.${d.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminderHour"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("hour")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminderMinute"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("minute")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="reminderRoleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("roleId")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123456789012345678"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reminderGuildId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("guildId")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("botConfigPlaceholder")}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reminderChannelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("channelId")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("botConfigPlaceholder")}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("saving") : t("save")}
        </Button>
      </form>
    </Form>
  );
}
