"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { VodForm } from "@/components/vods/vod-form";
import { YouTubeEmbed } from "@next/third-parties/google";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function VodOverview({ vod, mapId }: { vod: string; mapId: number }) {
  // 1. Clean the parent domain (Twitch rejects 'https://' and paths)
  const parentDomain = process.env.NEXT_PUBLIC_VERCEL_URL
    ? process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, "").split(
        "/"
      )[0]
    : "localhost";

  const [vodState, setVodState] = useState(vod);
  const [isOpen, setIsOpen] = useState(false);

  // 2. Identify the content type and ID
  const t = useTranslations("mapPage.vod");

  let twitchSrc = "";
  if (vodState.includes("https://www.twitch.tv/videos/")) {
    const videoId = vodState.split("/videos/")[1].split("?")[0];
    twitchSrc = `https://player.twitch.tv/?video=${videoId}&parent=${parentDomain}`;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video">
          {(vodState.includes("https://www.youtube.com/watch?v=") ||
            vodState.includes("https://youtu.be/")) && (
            <YouTubeEmbed
              videoid={
                vodState.includes("https://youtu.be/")
                  ? vodState.split("youtu.be/")[1].split("?")[0]
                  : vodState.split("v=")[1]?.split("&")[0] || ""
              }
              params={`controls=1&start=${vodState.split("t=")[1] ? vodState.split("t=")[1].split("s")[0] : 0}`}
              style="width:full; height:full; max-width:100%; max-height:100%; border:0;"
            />
          )}

          {twitchSrc !== "" && (
            <iframe
              src={twitchSrc}
              className="h-full w-full border-0"
              allowFullScreen
            />
          )}
          {!vodState && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger className="bg-muted" asChild>
                <div className="flex aspect-video w-full cursor-pointer items-center justify-center">
                  <span className="text-gray-500">{t("noVod")}</span>
                </div>
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
          <div className="flex justify-center p-6">
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
      </CardContent>
    </Card>
  );
}
