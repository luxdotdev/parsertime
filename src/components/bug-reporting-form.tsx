"use client";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@prisma/client";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  email: z.string(),
  url: z.string(),
});

export function BugReportForm({
  user,
  setReportDialogOpen,
}: {
  user: User | null;
  setReportDialogOpen: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("dashboard.bugReportForm");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user?.email ?? t("unknown"), // Default to "unknown" if no user is logged in
      url: window.location.href,
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setLoading(true);

    const res = await fetch("/api/reporting/submit-bug-report", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(t("successToast.title"), {
        description: t("successToast.description"),
        duration: 5000,
      });
      setReportDialogOpen(false);
    } else {
      toast.error(t("errorToast.title"), {
        description: t("errorToast.description"),
        duration: 5000,
      });
    }

    setLoading(false);
  }

  return (
    <DialogHeader>
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogDescription className="pb-2">{t("description")}</DialogDescription>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("formTitle")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("titlePlaceholder")} {...field} />
                </FormControl>
                <FormDescription>{t("titleDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("descriptionTitle")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("descriptionPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("descriptionDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("emailTitle")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("emailPlaceholder")}
                    defaultValue={field.value}
                    disabled={!!user}
                  />
                </FormControl>
                <FormDescription>{t("emailDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("urlTitle")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("urlPlaceholder")}
                    defaultValue={window.location.href}
                    disabled
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t("urlDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading} className="float-right">
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      </Form>
    </DialogHeader>
  );
}
