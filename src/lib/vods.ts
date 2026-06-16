export type ParsedVod =
  | {
      source: "youtube";
      videoId: string;
      start: string;
      normalizedUrl: string;
    }
  | {
      source: "twitch";
      videoId: string;
      normalizedUrl: string;
    };

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{6,64}$/;
const TWITCH_VIDEO_ID = /^\d{1,20}$/;
const START_SECONDS = /^\d{1,6}s?$/;

function parseStartSeconds(url: URL) {
  const rawStart = url.searchParams.get("t") ?? url.searchParams.get("start");
  if (!rawStart?.match(START_SECONDS)) return "0";
  return rawStart.replace(/s$/, "");
}

export function parseVodUrl(vodUrl: string): ParsedVod | null {
  try {
    const url = new URL(vodUrl.trim());
    if (url.protocol !== "https:") return null;

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const videoId = url.pathname.slice(1).split("/")[0] ?? "";
      if (!YOUTUBE_VIDEO_ID.test(videoId)) return null;

      const start = parseStartSeconds(url);
      const normalizedUrl = new URL("https://www.youtube.com/watch");
      normalizedUrl.searchParams.set("v", videoId);
      if (start !== "0") normalizedUrl.searchParams.set("t", `${start}s`);

      return {
        source: "youtube",
        videoId,
        start,
        normalizedUrl: normalizedUrl.toString(),
      };
    }

    if (hostname === "youtube.com") {
      let videoId: string | null = null;
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
      } else if (url.pathname.startsWith("/live/")) {
        videoId = url.pathname.split("/live/")[1]?.split("/")[0] ?? null;
      }

      if (!videoId || !YOUTUBE_VIDEO_ID.test(videoId)) return null;

      const start = parseStartSeconds(url);
      const normalizedUrl = new URL("https://www.youtube.com/watch");
      normalizedUrl.searchParams.set("v", videoId);
      if (start !== "0") normalizedUrl.searchParams.set("t", `${start}s`);

      return {
        source: "youtube",
        videoId,
        start,
        normalizedUrl: normalizedUrl.toString(),
      };
    }

    if (hostname === "twitch.tv") {
      const videoId = url.pathname.match(/^\/videos\/(\d+)$/)?.[1];
      if (!videoId || !TWITCH_VIDEO_ID.test(videoId)) return null;

      return {
        source: "twitch",
        videoId,
        normalizedUrl: `https://www.twitch.tv/videos/${videoId}`,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function getYoutubeEmbedSrc(
  vod: Extract<ParsedVod, { source: "youtube" }>
): string {
  const params = new URLSearchParams({
    controls: "1",
    start: vod.start,
  });

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(vod.videoId)}?${params.toString()}`;
}
