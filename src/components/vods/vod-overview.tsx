"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { VodForm } from "@/components/vods/vod-form";
import { getYoutubeEmbedSrc, parseVodUrl } from "@/lib/vods";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function VodOverview({ vod, mapId }: { vod: string; mapId: number }) {
  const parentDomain = process.env.NEXT_PUBLIC_VERCEL_URL
    ? process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, "").split(
        "/"
      )[0]
    : "localhost";

  const [vodState, setVodState] = useState(vod);
  const [isOpen, setIsOpen] = useState(false);

  const t = useTranslations("mapPage.vod");

  const parsedVod = parseVodUrl(vodState);
  const youtubeSrc =
    parsedVod?.source === "youtube" ? getYoutubeEmbedSrc(parsedVod) : "";
  const twitchSrc =
    parsedVod?.source === "twitch"
      ? `https://player.twitch.tv/?video=${parsedVod.videoId}&parent=${parentDomain}`
      : "";

  return (
    <section aria-label={t("title")} className="space-y-5">
      <div className="space-y-1">
        <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {t("eyebrow")}
        </span>
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="aspect-video overflow-hidden rounded-md">
        {parsedVod?.source === "youtube" && (
          <iframe
            src={youtubeSrc}
            title="YouTube VOD"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}

        {parsedVod?.source === "twitch" && (
          <iframe
            src={twitchSrc}
            title="Twitch VOD"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
        {!vodState && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label={t("addVod")}
                className="bg-card border-border hover:border-muted-foreground/30 flex aspect-video w-full cursor-pointer items-center justify-center rounded-md border border-dashed transition-colors"
              >
                <span className="text-muted-foreground">{t("noVod")}</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <VodForm
                mapId={mapId}
                setVodState={setVodState}
                vodState={vodState}
                setIsOpen={setIsOpen}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {vodState && (
        <div className="flex justify-center">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">{t("changeVod")}</Button>
            </DialogTrigger>
            <DialogContent>
              <VodForm
                mapId={mapId}
                setVodState={setVodState}
                vodState={vodState}
                setIsOpen={setIsOpen}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </section>
  );
}
