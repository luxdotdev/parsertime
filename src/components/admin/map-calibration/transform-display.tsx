"use client";

import { Badge } from "@/components/ui/badge";
import type { MapTransform } from "@/lib/map-calibration/types";
import { useFormatter, useTranslations } from "next-intl";

type TransformDisplayProps = {
  transform: MapTransform;
  residualError: number;
  imageWidth: number;
  saved: boolean;
};

export function TransformDisplay({
  transform,
  residualError,
  imageWidth,
  saved,
}: TransformDisplayProps) {
  const t = useTranslations("mapCalibrationPage.transform");
  const formatter = useFormatter();
  const errorPct = (residualError / imageWidth) * 100;
  const det = transform.a * transform.d - transform.b * transform.c;
  const scaleX = Math.sqrt(transform.a ** 2 + transform.c ** 2);
  const scaleY = Math.sqrt(transform.b ** 2 + transform.d ** 2);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{t("title")}</h4>
        {saved ? (
          <Badge variant="default">{t("saved")}</Badge>
        ) : (
          <Badge variant="secondary">{t("unsaved")}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-muted-foreground">{t("scaleX")}</span>
        <span>
          {t("pixelsPerUnit", { value: formatDecimal(formatter, scaleX, 4) })}
        </span>
        <span className="text-muted-foreground">{t("scaleY")}</span>
        <span>
          {t("pixelsPerUnit", { value: formatDecimal(formatter, scaleY, 4) })}
        </span>
        <span className="text-muted-foreground">{t("determinant")}</span>
        <span>{formatDecimal(formatter, det, 4)}</span>
        <span className="text-muted-foreground">{t("avgError")}</span>
        <span
          className={
            errorPct > 5
              ? "text-destructive"
              : errorPct > 2
                ? "text-yellow-500"
                : "text-green-500"
          }
        >
          {t("errorValue", {
            percent: formatter.number(errorPct / 100, {
              style: "percent",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            pixels: formatter.number(Math.round(residualError)),
          })}
        </span>
      </div>
      {errorPct <= 5 ? (
        <p className="text-muted-foreground text-xs">{t("withinTolerance")}</p>
      ) : null}
    </div>
  );
}

function formatDecimal(
  formatter: ReturnType<typeof useFormatter>,
  value: number,
  digits: number
) {
  return formatter.number(value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
