"use client";

import { tempoPointsToSvgPath } from "@/data/map/types";

type TempoCurveProps = {
  points: { x: number; y: number }[];
  color: string;
  baselineY: number;
};

export function TempoCurve({ points, color, baselineY }: TempoCurveProps) {
  if (points.length < 2) return null;

  const linePath = tempoPointsToSvgPath(points);

  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = `${linePath}L${last.x},${baselineY}L${first.x},${baselineY}Z`;

  return (
    <g>
      <path
        d={areaPath}
        fill={color}
        fillOpacity={0.12}
        className="motion-safe:transition-opacity"
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="motion-safe:transition-opacity"
      />
    </g>
  );
}
