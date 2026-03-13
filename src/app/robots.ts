import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/demo",
          "/pricing",
          "/contact",
          "/privacy",
          "/terms-of-service",
        ],
        disallow: [
          "/api/",
          "/dashboard/",
          "/settings/",
          "/debug/",
          "/leaderboard/",
          "/notifications/",
          "/profile/",
          "/scouting/",
          "/stats/",
          "/team/",
          "/data-labeling/",
        ],
      },
    ],
    sitemap: "https://parsertime.app/sitemap.xml",
  };
}
