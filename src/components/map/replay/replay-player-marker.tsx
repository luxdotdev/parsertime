"use client";

import { toHero } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
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
  isInactive: boolean;
  playerName: string;
  isSelected: boolean;
  animatePosition: boolean;
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
  isInactive,
  playerName,
  isSelected,
  animatePosition,
  onClick,
}: ReplayPlayerMarkerProps) {
  const prefersReducedMotion = useReducedMotion();
  const positionTransition =
    prefersReducedMotion || !animatePosition
      ? { duration: 0 }
      : {
          type: "spring" as const,
          stiffness: 360,
          damping: 38,
          mass: 0.7,
        };
  const feedbackTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: "easeInOut" as const };

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      initial={false}
      animate={{
        x: x - size / 2,
        y: y - size / 2,
        opacity: isInactive ? 0.42 : 1,
      }}
      transition={{
        x: positionTransition,
        y: positionTransition,
        opacity: prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.2, ease: [0.215, 0.61, 0.355, 1] },
      }}
      style={{
        left: 0,
        top: 0,
        zIndex: isSelected ? 20 : 10,
        willChange: "transform, opacity",
      }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        className="flex items-center justify-center overflow-hidden rounded-full shadow-lg transition-transform hover:scale-110"
        animate={
          prefersReducedMotion
            ? undefined
            : isDead
              ? { x: [0, -2, 2, -1, 1, 0] }
              : isInactive
                ? { scale: [1, 1.08, 1] }
                : { x: 0, scale: 1 }
        }
        transition={
          isInactive
            ? {
                duration: 1.1,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
              }
            : feedbackTransition
        }
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
      </motion.button>
      <span
        className="mt-0.5 rounded bg-black/70 px-1 text-[10px] leading-tight font-medium whitespace-nowrap"
        style={{ color }}
      >
        {playerName}
      </span>
    </motion.div>
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
      prev.isInactive === next.isInactive &&
      prev.isSelected === next.isSelected &&
      prev.animatePosition === next.animatePosition &&
      prev.color === next.color
    );
  }
);
