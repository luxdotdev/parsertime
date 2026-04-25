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
          className="text-muted-foreground mr-2 font-mono text-xs uppercase tracking-[0.06em]"
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
          className="text-muted-foreground ml-2 font-mono text-xs uppercase tracking-[0.06em]"
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
        className={`mb-0.5 max-w-[60px] truncate text-[10px] leading-tight font-medium ${
          state.isDead ? "text-muted-foreground" : ""
        }`}
        style={state.isDead ? undefined : { color }}
      >
        {player.playerName}
      </span>

      {/* Card container */}
      <div
        className={`relative overflow-hidden rounded-md ${
          isActive
            ? "ring-primary/70 ring-offset-background ring-2 ring-offset-2"
            : isSelected
              ? "ring-primary ring-2"
              : ""
        }`}
      >
        {/* Hero portrait */}
        <div className="bg-popover/90 relative flex items-center justify-center px-1 py-0.5">
          <Image
            src={`/heroes/${toHero(state.hero)}.png`}
            alt={state.hero}
            width={64}
            height={64}
            className="h-8 w-8 rounded-sm object-cover"
          />

          {/* Dead overlay */}
          {state.isDead && (
            <div className="bg-popover/70 absolute inset-0 flex items-center justify-center">
              <Skull className="text-destructive h-4 w-4" />
            </div>
          )}
        </div>

        {/* Team color bottom bar */}
        <div className="h-1 w-full" style={{ backgroundColor: color }} />
      </div>

      {/* Ult status indicator (below card) */}
      <div className="mt-0.5">
        {state.hasUltimate || state.isUlting ? (
          <div className="bg-primary flex h-4 w-4 items-center justify-center rounded-full">
            <Zap className="text-primary-foreground h-2.5 w-2.5 fill-current" />
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
            ?
          </div>
        )}
      </div>
    </motion.button>
  );
}
