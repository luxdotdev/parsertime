"use client";

import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { round as roundNum } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type Data = {
  name: string;
  dmgDone: number;
  dmgTaken: number;
}[];

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("mapPage.player.analytics.dmgDoneDmgTaken");
  const { team1, team2 } = useColorblindMode();

  if (active && payload?.length) {
    return (
      <div className="bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs">
        <h3 className="text-base">{label}</h3>
        <p className="text-sm">
          <strong style={{ color: team1 }}>{t("dmgDone")}</strong>:{" "}
          {(payload[0].value as number).toFixed(2)}
        </p>
        <p className="text-sm">
          <strong style={{ color: team2 }}>{t("dmgTaken")}</strong>:{" "}
          {(payload[1].value as number).toFixed(2)}
        </p>
      </div>
    );
  }

  return null;
}

type Props = {
  damageDoneByRound: Record<number, number>;
  damageTakenByRound: Record<number, number>;
};

export function DmgDoneVsDmgTakenChart({
  damageDoneByRound,
  damageTakenByRound,
}: Props) {
  const t = useTranslations("mapPage.player.analytics.dmgDoneDmgTaken");
  const { team1, team2 } = useColorblindMode();

  // damage taken looks like this: { '1': 2533.1400000000003, '2': 5258.17, '3': 8683.69 }
  const data: Data = Object.keys(damageDoneByRound).map((round) => {
    return {
      name: t("round", { round }),
      dmgDone: roundNum(damageDoneByRound[parseInt(round)]),
      dmgTaken: roundNum(damageTakenByRound[parseInt(round)]),
    };
  });

  return (
    <>
      {data.length > 1 && (
        <ResponsiveContainer width="100%" height={500}>
          <AreaChart
            width={600}
            height={500}
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="colorDmgDone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={team1} stopOpacity={0.8} />
                <stop offset="95%" stopColor={team1} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDmgTaken" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={team2} stopOpacity={0.8} />
                <stop offset="95%" stopColor={team2} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Legend />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="dmgDone"
              stroke={team1}
              fill="url(#colorDmgDone)"
              name={t("dmgDone")}
            />
            <Area
              type="monotone"
              dataKey="dmgTaken"
              stroke={team2}
              fill="url(#colorDmgTaken)"
              name={t("dmgTaken")}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {data.length === 1 && (
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            width={600}
            height={500}
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Legend />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="dmgDone" fill={team1} name={t("dmgDone")} />
            <Bar dataKey="dmgTaken" fill={team2} name={t("dmgTaken")} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}
