"use client";

import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import type { PlacedHero } from "@/lib/coaching/types";
import { toHero } from "@/lib/utils";
import { XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef } from "react";

type HeroTokenProps = {
  hero: PlacedHero;
  screenX: number;
  screenY: number;
  zoom: number;
  isInteractive: boolean;
  onDrag: (screenX: number, screenY: number) => void;
  onRemove: () => void;
};

const IMAGE_SPACE_SIZE = 120;

export function HeroToken({
  hero,
  screenX,
  screenY,
  zoom,
  isInteractive,
  onDrag,
  onRemove,
}: HeroTokenProps) {
  const { team1, team2 } = useColorblindMode();
  const teamColor = hero.team === 1 ? team1 : team2;
  const draggingRef = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteractive) return;
      e.stopPropagation();
      e.preventDefault();
      draggingRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isInteractive]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      e.stopPropagation();
      onDrag(e.clientX, e.clientY);
    },
    [onDrag]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const scaledSize = IMAGE_SPACE_SIZE * zoom;

  return (
    <div
      className="group absolute"
      style={{
        left: screenX - scaledSize / 2,
        top: screenY - scaledSize / 2,
        width: scaledSize,
        height: scaledSize,
        pointerEvents: isInteractive ? "auto" : "none",
        cursor: isInteractive ? "grab" : "default",
        zIndex: 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="relative size-full overflow-hidden rounded-full"
        style={{
          boxShadow: `0 0 0 2.5px ${teamColor}, 0 1px 3px rgba(0,0,0,0.4)`,
        }}
      >
        <Image
          src={`/heroes/${toHero(hero.heroName)}.png`}
          alt={hero.heroName}
          fill
          className="object-cover"
          sizes={`${scaledSize}px`}
          draggable={false}
        />
      </div>
      {isInteractive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 hidden size-4 items-center justify-center rounded-full group-hover:flex"
        >
          <XIcon className="size-2.5" />
        </button>
      )}
    </div>
  );
}
