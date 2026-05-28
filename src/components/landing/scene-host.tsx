'use client';

import dynamic from 'next/dynamic';

const LandingScene = dynamic(
  () => import('./scene').then((m) => m.LandingScene),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="absolute inset-0 grid place-items-center font-mono text-[11px] uppercase tracking-[0.22em] text-fd-muted-foreground/60"
      >
        loading sigil…
      </div>
    ),
  },
);

export function SceneHost() {
  return <LandingScene />;
}
