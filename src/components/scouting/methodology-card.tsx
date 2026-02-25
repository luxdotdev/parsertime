"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

type MethodologyCardProps = {
  translationKey: string;
};

export function MethodologyCard({ translationKey }: MethodologyCardProps) {
  const t = useTranslations(translationKey);

  const points = getPoints(t);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Info className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-muted-foreground space-y-1.5 text-xs leading-relaxed">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function getPoints(t: ReturnType<typeof useTranslations>): string[] {
  const points: string[] = [];
  for (let i = 0; t.has(`points.${i}`); i++) {
    points.push(t(`points.${i}`));
  }
  return points;
}
