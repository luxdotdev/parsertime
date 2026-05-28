"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { VodForm } from "@/components/vods/vod-form";
import { YouTubeEmbed } from "@next/third-parties/google";
import { useTranslations } from "next-intl";
import { useState } from "react";

function getYouTubeVideo(vod: string) {
  try {
    const url = new URL(vod);
    const hostname = url.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0] ?? null;
    } else if (hostname === "youtube.com") {
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
      } else if (url.pathname.startsWith("/live/")) {
        videoId = url.pathname.split("/live/")[1]?.split("/")[0] ?? null;
      } else {
        videoId = url.searchParams.get("v");
      }
    }

    if (!videoId || !/^[\w-]{6,64}$/.test(videoId)) return null;

    const rawStart = url.searchParams.get("t") ?? url.searchParams.get("start");
    const start = rawStart?.match(/^\d{1,6}s?$/)
      ? rawStart.replace(/s$/, "")
      : "0";

    return { videoId, start };
  } catch {
    return null;
  }
}

function getTwitchVideoId(vod: string) {
  try {
    const url = new URL(vod);
    const hostname = url.hostname.replace(/^www\./, "");
    if (hostname !== "twitch.tv") return null;
    const match = url.pathname.match(/^\/videos\/(\d+)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function VodOverview({ vod, mapId }: { vod: string; mapId: number }) {
  const parentDomain = process.env.NEXT_PUBLIC_VERCEL_URL
    ? process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, "").split(
        "/"
      )[0]
    : "localhost";

  const [vodState, setVodState] = useState(vod);
  const [isOpen, setIsOpen] = useState(false);

  const t = useTranslations("mapPage.vod");

  const youtubeVideo = getYouTubeVideo(vodState);
  const twitchVideoId = getTwitchVideoId(vodState);
  const twitchSrc = twitchVideoId
    ? `https://player.twitch.tv/?video=${twitchVideoId}&parent=${parentDomain}`
    : "";

  const vodSource = youtubeVideo ? "youtube" : twitchVideoId ? "twitch" : "";

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
        {youtubeVideo && (
          <YouTubeEmbed
            videoid={youtubeVideo.videoId}
            params={`controls=1&start=${youtubeVideo.start}`}
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
