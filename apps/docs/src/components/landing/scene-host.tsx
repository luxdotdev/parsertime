"use client";

import dynamic from "next/dynamic";

const LandingScene = dynamic(
  () => import("./scene").then((m) => m.LandingScene),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="text-fd-muted-foreground/60 absolute inset-0 grid place-items-center font-mono text-[11px] tracking-[0.22em] uppercase"
      >
        loading sigil…
      </div>
    ),
  }
);

export function SceneHost() {
  return <LandingScene />;
}
