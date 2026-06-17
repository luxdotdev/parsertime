"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

type Props = {
  data: number[];
  trending: "toward" | "away" | "neutral";
  width?: number;
  height?: number;
};

export function Sparkline({ data, trending, width = 80, height = 24 }: Props) {
  const chartData = data.map((value, index) => ({ value, index }));
  const color =
    trending === "toward"
      ? "var(--color-green-500)"
      : trending === "away"
        ? "var(--color-red-500)"
        : "var(--color-muted-foreground)";

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
