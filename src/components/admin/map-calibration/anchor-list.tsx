"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

type Anchor = {
  id: number;
  worldX: number;
  worldY: number;
  imageU: number;
  imageV: number;
  label: string | null;
};

type AnchorListProps = {
  anchors: Anchor[];
  onDelete: (anchorId: number) => void;
};

export function AnchorList({ anchors, onDelete }: AnchorListProps) {
  const t = useTranslations("mapCalibrationPage.anchorList");
  const formatter = useFormatter();

  if (anchors.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>{t("label")}</TableHead>
          <TableHead>{t("worldCoordinates")}</TableHead>
          <TableHead>{t("imageCoordinates")}</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {anchors.map((anchor, i) => (
          <TableRow key={anchor.id}>
            <TableCell className="font-mono text-xs">{i + 1}</TableCell>
            <TableCell className="text-sm">
              {anchor.label ?? (
                <span className="text-muted-foreground italic">—</span>
              )}
            </TableCell>
            <TableCell className="font-mono text-xs">
              ({formatter.number(anchor.worldX, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              ,{" "}
              {formatter.number(anchor.worldY, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              )
            </TableCell>
            <TableCell className="font-mono text-xs">
              ({formatter.number(Math.round(anchor.imageU))},{" "}
              {formatter.number(Math.round(anchor.imageV))})
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(anchor.id)}
                className="h-7 w-7 p-0"
                aria-label={t("deleteAnchor", {
                  label: anchor.label ?? formatter.number(i + 1),
                })}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
