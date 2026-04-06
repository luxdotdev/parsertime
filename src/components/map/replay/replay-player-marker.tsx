"use client";

import { toHero } from "@/lib/utils";
import { Skull } from "lucide-react";
import Image from "next/image";
import { memo } from "react";

type ReplayPlayerMarkerProps = {
  heroName: string;
  color: string;
  x: number;
  y: number;
  size: number;
  isDead: boolean;
  isUlting: boolean;
  playerName: string;
  isSelected: boolean;
  onClick: () => void;
};

function ReplayPlayerMarkerInner({
  heroName,
  color,
  x,
  y,
  size,
  isDead,
  isUlting,
  playerName,
  isSelected,
  onClick,
}: ReplayPlayerMarkerProps) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        zIndex: isSelected ? 20 : 10,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex items-center justify-center overflow-hidden rounded-full shadow-lg transition-transform hover:scale-110"
        style={{
          width: size,
          height: size,
          border: `3px solid ${color}`,
          backgroundColor: "rgba(0,0,0,0.6)",
          boxShadow: isUlting
            ? `0 0 12px 4px ${color}`
            : isSelected
              ? `0 0 8px 2px ${color}`
              : undefined,
        }}
      >
        <Image
          src={`/heroes/${toHero(heroName)}.png`}
          alt={heroName}
          width={64}
          height={64}
          className={`h-full w-full rounded-full object-cover ${isDead ? "grayscale" : ""}`}
        />
        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Skull className="h-4 w-4 text-red-400" />
          </div>
        )}
      </button>
      <span
        className="mt-0.5 rounded bg-black/70 px-1 text-[10px] leading-tight font-medium whitespace-nowrap"
        style={{ color }}
      >
        {playerName}
      </span>
    </div>
  );
}

export const ReplayPlayerMarker = memo(
  ReplayPlayerMarkerInner,
  (prev, next) => {
    return (
      prev.x === next.x &&
      prev.y === next.y &&
      prev.heroName === next.heroName &&
      prev.isDead === next.isDead &&
      prev.isUlting === next.isUlting &&
      prev.isSelected === next.isSelected &&
      prev.color === next.color
    );
  }
);
