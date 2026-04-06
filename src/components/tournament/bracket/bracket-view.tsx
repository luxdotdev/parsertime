"use client";

import {
  BracketMatchCard,
  type BracketMatchData,
} from "@/components/tournament/bracket/bracket-match-card";
import { useCallback, useEffect, useRef, useState } from "react";

type RoundData = {
  roundNumber: number;
  roundName: string;
  matches: BracketMatchData[];
};

type ConnectorLine = {
  key: string;
  d: string;
};

export function BracketView({ rounds }: { rounds: RoundData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [connectors, setConnectors] = useState<ConnectorLine[]>([]);

  const setCardRef = useCallback(
    (roundIdx: number, matchIdx: number, el: HTMLDivElement | null) => {
      const key = `${roundIdx}-${matchIdx}`;
      if (el) {
        cardRefs.current.set(key, el);
      } else {
        cardRefs.current.delete(key);
      }
    },
    []
  );

  const calculateConnectors = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const lines: ConnectorLine[] = [];

    for (let roundIdx = 0; roundIdx < rounds.length - 1; roundIdx++) {
      const nextRound = rounds[roundIdx + 1];

      for (let nextIdx = 0; nextIdx < nextRound.matches.length; nextIdx++) {
        const topIdx = nextIdx * 2;
        const bottomIdx = nextIdx * 2 + 1;

        const topCard = cardRefs.current.get(`${roundIdx}-${topIdx}`);
        const bottomCard = cardRefs.current.get(`${roundIdx}-${bottomIdx}`);
        const nextCard = cardRefs.current.get(`${roundIdx + 1}-${nextIdx}`);

        if (!nextCard) continue;

        const nextRect = nextCard.getBoundingClientRect();
        const nextMidY = nextRect.top + nextRect.height / 2 - containerRect.top;
        const endX = nextRect.left - containerRect.left;

        if (topCard) {
          const topRect = topCard.getBoundingClientRect();
          const topMidY = topRect.top + topRect.height / 2 - containerRect.top;
          const startX = topRect.right - containerRect.left;
          const midX = (startX + endX) / 2;

          lines.push({
            key: `${roundIdx}-${nextIdx}-top`,
            d: `M ${startX} ${topMidY} H ${midX} V ${nextMidY} H ${endX}`,
          });
        }

        if (bottomCard) {
          const bottomRect = bottomCard.getBoundingClientRect();
          const bottomMidY =
            bottomRect.top + bottomRect.height / 2 - containerRect.top;
          const startX = bottomRect.right - containerRect.left;
          const midX = (startX + endX) / 2;

          lines.push({
            key: `${roundIdx}-${nextIdx}-bottom`,
            d: `M ${startX} ${bottomMidY} H ${midX} V ${nextMidY}`,
          });
        }
      }
    }

    setConnectors(lines);
  }, [rounds]);

  useEffect(() => {
    // Calculate after layout settles
    const frame = requestAnimationFrame(() => {
      calculateConnectors();
    });
    return () => cancelAnimationFrame(frame);
  }, [calculateConnectors]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      calculateConnectors();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [calculateConnectors]);

  if (rounds.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="bracket-grid relative flex min-h-[60vh] items-stretch gap-8"
    >
      {/* SVG connector overlay */}
      <svg className="pointer-events-none absolute inset-0 size-full">
        {connectors.map(({ d, key }) => (
          <path
            key={key}
            d={d}
            fill="none"
            className="stroke-border"
            strokeWidth={2}
          />
        ))}
      </svg>

      {rounds.map((round, roundIdx) => (
        <div
          key={round.roundNumber}
          className="relative z-10 flex min-w-56 flex-1 flex-col"
        >
          <div className="text-muted-foreground mb-3 text-center text-xs font-medium tracking-wide uppercase">
            {round.roundName}
          </div>
          <div className="flex flex-1 flex-col justify-around gap-2">
            {round.matches.map((match, matchIdx) => (
              <div
                key={match.id}
                ref={(el) => setCardRef(roundIdx, matchIdx, el)}
              >
                <BracketMatchCard match={match} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
