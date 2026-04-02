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
  if (anchors.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        No anchor points yet. Click on the map image to place one.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>Label</TableHead>
          <TableHead>World (X, Y)</TableHead>
          <TableHead>Image (U, V)</TableHead>
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
              ({anchor.worldX.toFixed(2)}, {anchor.worldY.toFixed(2)})
            </TableCell>
            <TableCell className="font-mono text-xs">
              ({Math.round(anchor.imageU)}, {Math.round(anchor.imageV)})
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(anchor.id)}
                className="h-7 w-7 p-0"
                aria-label={`Delete anchor ${anchor.label ?? String(i + 1)}`}
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
