"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { toast } from "@/components/ui/use-toast";
import { ClientOnly } from "@/lib/client-only";
import { useTranslations } from "next-intl";

export function ImpersonateUserForm() {
  const t = useTranslations("settingsPage.admin");

  const adminFormSchema = z.object({
    email: z.string().email({
      message: t("email.message"),
    }),
    isProd: z.boolean().default(true),
  });

  type AdminFormValues = z.infer<typeof adminFormSchema>;

  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      isProd: true,
    },
  });

  async function onSubmit(data: AdminFormValues) {
    try {
      const res = await fetch("/api/admin/impersonate-user", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(t("onSubmit.errorDescription"));
      }

      const { url } = (await res.json()) as { url: string };

      await navigator.clipboard.writeText(url);

      toast({
        title: t("onSubmit.title"),
        description: t("onSubmit.description"),
        duration: 5000,
      });
    } catch (e) {
      toast({
        title: t("onSubmit.errorTitle"),
        description: t("onSubmit.errorDescription"),
        variant: "destructive",
      });
    }
  }

  return (
    <ClientOnly>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("email.title")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="lucas@lux.dev"
                    defaultValue=""
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("email.description")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isProd"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t("prod.title")}</FormLabel>
                  <FormDescription>{t("prod.description")}</FormDescription>
                </div>
              </FormItem>
            )}
          />
          <Button type="submit">{t("impersonate")}</Button>
        </form>
      </Form>
    </ClientOnly>
  );
}
