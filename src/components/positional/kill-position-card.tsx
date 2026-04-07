"use client";

import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { toHero } from "@/lib/utils";
import type { Kill } from "@prisma/client";
import { Skull } from "lucide-react";
import Image from "next/image";

export type NearbyPlayerMarker = {
  playerName: string;
  playerTeam: string;
  hero: string;
  x: number;
  z: number;
};

type KillPositionCardProps = {
  kill: Kill;
  fightKills: Kill[];
  calibration: LoadedCalibration;
  team1: string;
  team1Color: string;
  team2Color: string;
  abilityName: string;
  nearbyPlayers?: NearbyPlayerMarker[];
};

function getTeamColor(
  teamName: string,
  team1: string,
  team1Color: string,
  team2Color: string
) {
  return teamName === team1 ? team1Color : team2Color;
}

function distance3D(
  ax: number,
  ay: number,
  az: number,
  vx: number,
  vy: number,
  vz: number
) {
  return Math.sqrt((ax - vx) ** 2 + (ay - vy) ** 2 + (az - vz) ** 2);
}

const CARD_SIZE = 400;
const MARKER_SIZE = 32;
const CONTEXT_MARKER_SIZE = 20;
const PADDING_FACTOR = 0.35;
const MIN_VIEWPORT_PX = 200;

export function KillPositionCard({
  kill,
  fightKills,
  calibration,
  team1,
  team1Color,
  team2Color,
  abilityName,
  nearbyPlayers,
}: KillPositionCardProps) {
  const hasAttackerCoords = kill.attacker_x != null && kill.attacker_z != null;
  const hasVictimCoords = kill.victim_x != null && kill.victim_z != null;

  if (!hasAttackerCoords && !hasVictimCoords) return null;

  const { transform, imagePresignedUrl, imageWidth, imageHeight } = calibration;

  const attackerImg = hasAttackerCoords
    ? worldToImage({ x: kill.attacker_x!, y: kill.attacker_z! }, transform)
    : null;
  const victimImg = hasVictimCoords
    ? worldToImage({ x: kill.victim_x!, y: kill.victim_z! }, transform)
    : null;

  // Collect all image-space points for bounding box
  const allPoints: { u: number; v: number }[] = [];
  if (attackerImg) allPoints.push(attackerImg);
  if (victimImg) allPoints.push(victimImg);

  const contextKills = fightKills.filter((k) => k.id !== kill.id);
  const contextPositions: {
    kill: Kill;
    pos: { u: number; v: number };
  }[] = [];

  for (const ck of contextKills) {
    if (ck.victim_x != null && ck.victim_z != null) {
      const pos = worldToImage({ x: ck.victim_x, y: ck.victim_z }, transform);
      contextPositions.push({ kill: ck, pos });
      allPoints.push(pos);
    }
  }

  const nearbyPositions: {
    player: NearbyPlayerMarker;
    pos: { u: number; v: number };
  }[] = [];

  if (nearbyPlayers) {
    const shownPlayers = new Set<string>();
    shownPlayers.add(kill.attacker_name);
    shownPlayers.add(kill.victim_name);
    for (const ck of contextKills) {
      shownPlayers.add(ck.attacker_name);
      shownPlayers.add(ck.victim_name);
    }

    for (const np of nearbyPlayers) {
      if (shownPlayers.has(np.playerName)) continue;
      const pos = worldToImage({ x: np.x, y: np.z }, transform);
      nearbyPositions.push({ player: np, pos });
      allPoints.push(pos);
    }
  }

  if (allPoints.length === 0) return null;

  // Compute bounding box in image pixels
  let minU = allPoints[0].u;
  let maxU = allPoints[0].u;
  let minV = allPoints[0].v;
  let maxV = allPoints[0].v;
  for (const p of allPoints) {
    if (p.u < minU) minU = p.u;
    if (p.u > maxU) maxU = p.u;
    if (p.v < minV) minV = p.v;
    if (p.v > maxV) maxV = p.v;
  }

  // Add padding
  const spanU = Math.max(maxU - minU, MIN_VIEWPORT_PX);
  const spanV = Math.max(maxV - minV, MIN_VIEWPORT_PX);
  const padU = spanU * PADDING_FACTOR;
  const padV = spanV * PADDING_FACTOR;

  // Make viewport square for consistent display
  const viewSpan = Math.max(spanU + padU * 2, spanV + padV * 2);
  const centerU = (minU + maxU) / 2;
  const centerV = (minV + maxV) / 2;

  // Clamp viewport to image bounds
  let vpLeft = Math.max(0, centerU - viewSpan / 2);
  let vpTop = Math.max(0, centerV - viewSpan / 2);
  if (vpLeft + viewSpan > imageWidth)
    vpLeft = Math.max(0, imageWidth - viewSpan);
  if (vpTop + viewSpan > imageHeight)
    vpTop = Math.max(0, imageHeight - viewSpan);
  const vpWidth = Math.min(viewSpan, imageWidth);
  const vpHeight = Math.min(viewSpan, imageHeight);

  // Scale from viewport pixels to card pixels
  const scale = CARD_SIZE / vpWidth;
  const cardHeight = vpHeight * scale;

  // Convert image-space coords to card-space coords
  function toCard(u: number, v: number) {
    return {
      x: (u - vpLeft) * scale,
      y: (v - vpTop) * scale,
    };
  }

  const attackerCard = attackerImg
    ? toCard(attackerImg.u, attackerImg.v)
    : null;
  const victimCard = victimImg ? toCard(victimImg.u, victimImg.v) : null;

  const dist =
    kill.attacker_x != null &&
    kill.attacker_y != null &&
    kill.attacker_z != null &&
    kill.victim_x != null &&
    kill.victim_y != null &&
    kill.victim_z != null
      ? distance3D(
          kill.attacker_x,
          kill.attacker_y,
          kill.attacker_z,
          kill.victim_x,
          kill.victim_y,
          kill.victim_z
        )
      : null;

  const attackerColor = getTeamColor(
    kill.attacker_team,
    team1,
    team1Color,
    team2Color
  );
  const victimColor = getTeamColor(
    kill.victim_team,
    team1,
    team1Color,
    team2Color
  );

  const isSuicide = kill.attacker_name === kill.victim_name;

  return (
    <div className="w-[400px] overflow-hidden rounded-md border">
      <div
        className="relative"
        style={{
          width: CARD_SIZE,
          height: cardHeight,
          backgroundImage: `url(${imagePresignedUrl})`,
          backgroundSize: `${imageWidth * scale}px ${imageHeight * scale}px`,
          backgroundPosition: `${-vpLeft * scale}px ${-vpTop * scale}px`,
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Nearby players at lower opacity */}
        {nearbyPositions.map(({ player, pos }) => {
          const cp = toCard(pos.u, pos.v);
          const npColor = getTeamColor(
            player.playerTeam,
            team1,
            team1Color,
            team2Color
          );

          return (
            <div
              key={`${player.playerName}::${player.playerTeam}`}
              className="absolute flex items-center justify-center overflow-hidden rounded-full"
              style={{
                left: cp.x - CONTEXT_MARKER_SIZE / 2,
                top: cp.y - CONTEXT_MARKER_SIZE / 2,
                width: CONTEXT_MARKER_SIZE,
                height: CONTEXT_MARKER_SIZE,
                border: `2px solid ${npColor}`,
                opacity: 0.3,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            >
              <Image
                src={`/heroes/${toHero(player.hero)}.png`}
                alt=""
                width={64}
                height={64}
                className="h-full w-full rounded-full"
              />
            </div>
          );
        })}

        {/* Context kills at lower opacity */}
        {contextPositions.map(({ kill: ck, pos }) => {
          const cp = toCard(pos.u, pos.v);
          const ckColor = getTeamColor(
            ck.victim_team,
            team1,
            team1Color,
            team2Color
          );

          return (
            <div
              key={ck.id}
              className="absolute flex items-center justify-center overflow-hidden rounded-full"
              style={{
                left: cp.x - CONTEXT_MARKER_SIZE / 2,
                top: cp.y - CONTEXT_MARKER_SIZE / 2,
                width: CONTEXT_MARKER_SIZE,
                height: CONTEXT_MARKER_SIZE,
                border: `2px solid ${ckColor}`,
                opacity: 0.35,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            >
              <Image
                src={`/heroes/${toHero(ck.victim_hero)}.png`}
                alt=""
                width={64}
                height={64}
                className="h-full w-full rounded-full grayscale"
              />
            </div>
          );
        })}

        {/* Dashed line between attacker and victim */}
        {attackerCard && victimCard && (
          <svg
            className="absolute inset-0"
            width={CARD_SIZE}
            height={cardHeight}
            style={{ pointerEvents: "none" }}
          >
            <line
              x1={attackerCard.x}
              y1={attackerCard.y}
              x2={victimCard.x}
              y2={victimCard.y}
              stroke={attackerColor}
              strokeWidth={2}
              strokeDasharray="6 4"
              opacity={0.9}
            />
          </svg>
        )}

        {/* Distance badge */}
        {attackerCard && victimCard && dist != null && (
          <div
            className="absolute flex items-center justify-center rounded-full bg-black/80 px-2 py-0.5 text-xs font-medium text-white shadow-md"
            style={{
              left: (attackerCard.x + victimCard.x) / 2 - 20,
              top: (attackerCard.y + victimCard.y) / 2 - 10,
              border: `1px solid ${attackerColor}`,
            }}
          >
            {dist.toFixed(1)}m
          </div>
        )}

        {/* Attacker marker */}
        {attackerCard && (
          <PlayerMarker
            heroName={kill.attacker_hero}
            color={attackerColor}
            x={attackerCard.x}
            y={attackerCard.y}
            size={MARKER_SIZE}
            isDead={false}
          />
        )}

        {/* Victim marker */}
        {victimCard && (
          <PlayerMarker
            heroName={kill.victim_hero}
            color={victimColor}
            x={victimCard.x}
            y={victimCard.y}
            size={MARKER_SIZE}
            isDead={true}
          />
        )}
      </div>

      {/* Footer */}
      <div className="bg-popover flex items-center gap-3 border-t px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Image
            src={`/heroes/${toHero(kill.attacker_hero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-5 w-5 rounded-full"
            style={{ border: `2px solid ${attackerColor}` }}
          />
          {!isSuicide && (
            <span className="font-medium" style={{ color: attackerColor }}>
              {kill.attacker_name}
            </span>
          )}
        </div>
        <span className="text-muted-foreground">{abilityName}</span>
        <div className="flex items-center gap-1.5">
          <Image
            src={`/heroes/${toHero(kill.victim_hero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-5 w-5 rounded-full grayscale"
            style={{ border: `2px solid ${victimColor}` }}
          />
          <span className="font-medium" style={{ color: victimColor }}>
            {kill.victim_name}
          </span>
        </div>
        {dist != null && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{dist.toFixed(1)}m</span>
          </>
        )}
        {kill.is_critical_hit === "True" && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-yellow-500">Crit</span>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerMarker({
  heroName,
  color,
  x,
  y,
  size,
  isDead,
}: {
  heroName: string;
  color: string;
  x: number;
  y: number;
  size: number;
  isDead: boolean;
}) {
  return (
    <div
      className="absolute flex items-center justify-center overflow-hidden rounded-full shadow-lg"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        border: `3px solid ${color}`,
        backgroundColor: "rgba(0,0,0,0.6)",
      }}
    >
      <Image
        src={`/heroes/${toHero(heroName)}.png`}
        alt=""
        width={64}
        height={64}
        className={`h-full w-full rounded-full object-cover ${isDead ? "grayscale" : ""}`}
      />
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
          <Skull className="h-4 w-4 text-red-400" />
        </div>
      )}
    </div>
  );
}
