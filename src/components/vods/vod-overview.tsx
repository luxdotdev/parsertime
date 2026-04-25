"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { VodForm } from "@/components/vods/vod-form";
import { YouTubeEmbed } from "@next/third-parties/google";
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

  let twitchSrc = "";
  if (vodState.startsWith("https://www.twitch.tv/videos/")) {
    const videoId = vodState.split("/videos/")[1].split("?")[0];
    twitchSrc = `https://player.twitch.tv/?video=${videoId}&parent=${parentDomain}`;
  }

  const vodSource =
    vodState.startsWith("https://www.youtube.com/") ||
    vodState.startsWith("https://youtu.be/") ||
    vodState.startsWith("https://youtube.com/") ||
    vodState.startsWith("https://www.youtube.com/embed/") ||
    vodState.startsWith("https://youtube.com/embed/")
      ? "youtube"
      : vodState.startsWith("https://www.twitch.tv/videos/")
        ? "twitch"
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
        {vodSource === "youtube" && (
          <YouTubeEmbed
            videoid={
              vodState.startsWith("https://youtu.be/")
                ? vodState.split("youtu.be/")[1].split("?")[0]
                : vodState.includes("/embed/")
                  ? vodState.split("/embed/")[1].split("?")[0]
                  : vodState.includes("/live/")
                    ? vodState.split("/live/")[1].split("?")[0]
                    : vodState.split("v=")[1]?.split("&")[0] || ""
            }
            params={`controls=1&start=${vodState.split("t=")[1] ? vodState.split("t=")[1].split("s")[0] : 0}`}
            style="width:full; height:full; max-width:100%; max-height:100%; border:0;"
          />
        )}

        {vodSource === "twitch" && (
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
