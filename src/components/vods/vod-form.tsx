"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogHeader } from "@/components/ui/dialog";
import { Form, FormField, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type Dispatch, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const ALLOWED_DOMAINS = [
  "https://www.youtube.com/",
  "https://youtube.com/",
  "https://youtu.be/",
  "https://www.twitch.tv/",
  "https://twitch.tv/",
];
const formSchema = z.object({
  vodUrl: z
    .string()
    .min(1, { message: "Please enter a VOD URL" })
    .refine(
      (url) => {
        return ALLOWED_DOMAINS.some((domain) => url.startsWith(domain));
      },
      { message: "URL must be from YouTube or Twitch" }
    ),
});

export function VodForm({
  mapId,
  setVodState,
  vodState,
  setIsOpen,
}: {
  mapId: number;
  setVodState: Dispatch<React.SetStateAction<string>>;
  vodState: string;
  setIsOpen: Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const t = useTranslations("mapPage.vod");
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vodUrl: vodState || "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setLoading(true);

    const reqBody = {
      mapId,
      vodUrl: data.vodUrl,
    };

    try {
      const res = await fetch("/api/vod", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!res.ok) {
        toast.error("Failed to link VOD:");
        setLoading(false);
        return;
      }

      toast.success("Successfully linked VOD");
      setVodState(data.vodUrl);
      setLoading(false);
      setIsOpen(false);
      router.refresh();
      return res.json();
    } catch (error) {
      toast.error("An error occurred while linking the VOD.", {
        description: String(error),
      });
      setLoading(false);
    }
  }
  return (
    <div>
      <DialogHeader className="mb-4">{t("uploadVOD")}</DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="vodUrl"
            render={({ field }) => (
              <>
                <Input
                  {...field}
                  type="text"
                  placeholder={t("inputPlaceholder")}
                  className="mb-2"
                />
                <FormMessage />
              </>
            )}
          />
          <div className="flex gap-2">
            <Button
              className="mt-4"
              variant="default"
              type="submit"
              disabled={loading}
              key="submit"
            >
              {t("uploadVod")}
            </Button>
            <DialogClose asChild>
              <Button className="mt-4" variant="secondary" key="cancel">
                {t("cancel")}
              </Button>
            </DialogClose>
          </div>
        </form>
      </Form>
    </div>
  );
}
