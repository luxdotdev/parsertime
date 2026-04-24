"use client";

import type { PlayerState } from "@/lib/replay/build-player-timeline";
import { toHero } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { Skull, Zap } from "lucide-react";
import Image from "next/image";

type PlayerEntry = {
  key: string;
  playerName: string;
  playerTeam: string;
  state: PlayerState;
  isInactive: boolean;
};

type ReplayPlayerListProps = {
  team1Players: PlayerEntry[];
  team2Players: PlayerEntry[];
  team1Name: string;
  team2Name: string;
  team1Color: string;
  team2Color: string;
  selectedPlayer: string | null;
  onSelectPlayer: (key: string | null) => void;
};

export function ReplayPlayerList({
  team1Players,
  team2Players,
  team1Name,
  team2Name,
  team1Color,
  team2Color,
  selectedPlayer,
  onSelectPlayer,
}: ReplayPlayerListProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      {/* Team 1 - left aligned */}
      <div className="flex items-center gap-0.5">
        <span
          className="mr-2 text-sm font-bold tracking-wide uppercase"
          style={{ color: team1Color }}
        >
          {team1Name}
        </span>
        {team1Players.map((p) => (
          <PlayerCard
            key={p.key}
            player={p}
            color={team1Color}
            isSelected={selectedPlayer === p.key}
            onClick={() => onSelectPlayer(p.key)}
          />
        ))}
      </div>

      {/* Team 2 - right aligned */}
      <div className="flex items-center gap-0.5">
        {team2Players.map((p) => (
          <PlayerCard
            key={p.key}
            player={p}
            color={team2Color}
            isSelected={selectedPlayer === p.key}
            onClick={() => onSelectPlayer(p.key)}
          />
        ))}
        <span
          className="ml-2 text-sm font-bold tracking-wide uppercase"
          style={{ color: team2Color }}
        >
          {team2Name}
        </span>
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  color,
  isSelected,
  onClick,
}: {
  player: PlayerEntry;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { state } = player;
  const isActive = state.isUlting;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center transition-transform hover:scale-105"
      animate={
        prefersReducedMotion
          ? { opacity: player.isInactive ? 0.55 : 1 }
          : player.isInactive
            ? { opacity: 0.55, scale: [1, 1.04, 1] }
            : { opacity: 1, scale: 1 }
      }
      transition={
        player.isInactive
          ? {
              duration: 1.1,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }
          : { duration: 0.18, ease: "easeOut" }
      }
      style={{
        filter: state.isDead ? "grayscale(0.8) brightness(0.6)" : undefined,
        willChange: "transform, opacity",
      }}
    >
      {/* Player name (top) */}
      <span
        className="mb-0.5 max-w-[60px] truncate text-[10px] leading-tight font-medium"
        style={{ color: state.isDead ? "rgb(156 163 175)" : color }}
      >
        {player.playerName}
      </span>

      {/* Card container */}
      <div
        className="relative overflow-hidden rounded-md"
        style={{
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: isActive
            ? "rgb(234 179 8)"
            : isSelected
              ? color
              : "transparent",
          boxShadow: isActive
            ? "0 0 12px 2px rgba(234, 179, 8, 0.5)"
            : isSelected
              ? `0 0 8px 1px ${color}`
              : undefined,
        }}
      >
        {/* Hero portrait */}
        <div className="relative flex items-center justify-center bg-black/80 px-1 py-0.5">
          <Image
            src={`/heroes/${toHero(state.hero)}.png`}
            alt={state.hero}
            width={64}
            height={64}
            className="h-8 w-8 rounded-sm object-cover"
          />

          {/* Dead overlay */}
          {state.isDead && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Skull className="h-4 w-4 text-red-400" />
            </div>
          )}
        </div>

        {/* Team color bottom bar */}
        <div className="h-1 w-full" style={{ backgroundColor: color }} />
      </div>

      {/* Ult status indicator (below card) */}
      <div className="mt-0.5">
        {state.hasUltimate || state.isUlting ? (
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 shadow">
            <Zap className="h-2.5 w-2.5 fill-black text-black" />
          </div>
        ) : (
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-600 text-[9px] font-bold text-gray-400">
            ?
          </div>
        )}
      </div>
    </motion.button>
  );
}
