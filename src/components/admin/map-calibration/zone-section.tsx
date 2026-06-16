"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MapTransform } from "@/lib/map-calibration/types";
import {
  imageToWorld,
  worldToImage,
} from "@/lib/map-calibration/world-to-image";
import { tagZone } from "@/lib/zones/tag";
import { useCallback, useEffect, useRef, useState } from "react";

export type MapZoneDto = {
  id: number;
  name: string;
  category: "POINT" | "LANE";
  status: "DRAFT" | "PUBLISHED";
  source: "AUTO" | "MANUAL";
  laneRole: "MAIN" | "FLANK" | null;
  vertices: [number, number][];
};

type ZoneSectionProps = {
  calibrationId: number;
  presignedImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  transform: MapTransform | null;
  initialZones: MapZoneDto[];
};

const CATEGORY_RGB: Record<MapZoneDto["category"], string> = {
  POINT: "59, 130, 246",
  LANE: "34, 197, 94",
};
const HANDLE_SIZE = 4;

export function ZoneSection({
  calibrationId,
  presignedImageUrl,
  imageWidth,
  imageHeight,
  transform,
  initialZones,
}: ZoneSectionProps) {
  if (!transform) {
    return (
      <p className="text-muted-foreground mt-6 text-sm">
        Calibrate this map before editing zones.
      </p>
    );
  }
  return (
    <ZoneEditor
      calibrationId={calibrationId}
      presignedImageUrl={presignedImageUrl}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      transform={transform}
      initialZones={initialZones}
    />
  );
}

type ZoneEditorProps = Omit<ZoneSectionProps, "transform"> & {
  transform: MapTransform;
};

function ZoneEditor({
  calibrationId,
  presignedImageUrl,
  imageWidth,
  imageHeight,
  transform,
  initialZones,
}: ZoneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [zones, setZones] = useState<MapZoneDto[]>(initialZones);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dirtyZoneId, setDirtyZoneId] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draftVertices, setDraftVertices] = useState<[number, number][]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const dragVertexRef = useRef<number | null>(null);

  const base = `/api/admin/map-calibration/${calibrationId}/zones`;
  const scale = canvasWidth / imageWidth;
  const canvasHeight = imageHeight * scale;

  // World [x, z] -> canvas pixels.
  const worldToCanvas = useCallback(
    (x: number, z: number) => {
      const { u, v } = worldToImage({ x, y: z }, transform);
      return { cx: u * scale, cy: v * scale };
    },
    [transform, scale]
  );

  // Canvas pixels -> world [x, z].
  const canvasToWorld = useCallback(
    (cx: number, cy: number): [number, number] => {
      const { x, y } = imageToWorld(cx / scale, cy / scale, transform);
      return [x, y];
    },
    [transform, scale]
  );

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = presignedImageUrl;
  }, [presignedImageUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx || !img || !imageLoaded) return;

    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    for (const zone of zones) {
      if (zone.vertices.length < 3) continue;
      const rgb = CATEGORY_RGB[zone.category];
      const alpha = zone.status === "PUBLISHED" ? 0.35 : 0.15;
      const selected = zone.id === selectedId;

      ctx.beginPath();
      let sumX = 0;
      let sumY = 0;
      zone.vertices.forEach(([x, z], i) => {
        const { cx, cy } = worldToCanvas(x, z);
        sumX += cx;
        sumY += cy;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.closePath();
      ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgb(${rgb})`;
      ctx.lineWidth = selected ? 2.5 : 1.5;
      ctx.stroke();

      if (selected) {
        ctx.fillStyle = `rgb(${rgb})`;
        for (const [x, z] of zone.vertices) {
          const { cx, cy } = worldToCanvas(x, z);
          ctx.fillRect(
            cx - HANDLE_SIZE,
            cy - HANDLE_SIZE,
            HANDLE_SIZE * 2,
            HANDLE_SIZE * 2
          );
        }
      }

      const n = zone.vertices.length;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(zone.name, sumX / n, sumY / n);
      ctx.fillText(zone.name, sumX / n, sumY / n);
    }

    if (drawing && draftVertices.length > 0) {
      ctx.beginPath();
      draftVertices.forEach(([x, z], i) => {
        const { cx, cy } = worldToCanvas(x, z);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#eab308";
      for (const [x, z] of draftVertices) {
        const { cx, cy } = worldToCanvas(x, z);
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      }
    }
  }, [
    imageLoaded,
    canvasWidth,
    canvasHeight,
    zones,
    selectedId,
    drawing,
    draftVertices,
    worldToCanvas,
  ]);

  useEffect(() => {
    requestAnimationFrame(render);
  }, [render]);

  function canvasPos(e: React.PointerEvent | React.MouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent) {
    const pos = canvasPos(e);
    if (!pos) return;

    if (drawing) {
      setDraftVertices((vs) => [...vs, canvasToWorld(pos.cx, pos.cy)]);
      return;
    }

    // Grab a vertex handle of the selected zone (within HANDLE_SIZE + slop).
    const selected = zones.find((z) => z.id === selectedId);
    if (selected) {
      for (let i = 0; i < selected.vertices.length; i++) {
        const [x, z] = selected.vertices[i];
        const { cx, cy } = worldToCanvas(x, z);
        if (
          Math.abs(cx - pos.cx) <= HANDLE_SIZE + 3 &&
          Math.abs(cy - pos.cy) <= HANDLE_SIZE + 3
        ) {
          dragVertexRef.current = i;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    // Otherwise select the smallest containing zone.
    const [wx, wz] = canvasToWorld(pos.cx, pos.cy);
    const hit = tagZone(wx, wz, zones);
    setSelectedId(hit ? hit.id : null);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const idx = dragVertexRef.current;
    if (idx === null || selectedId === null) return;
    const pos = canvasPos(e);
    if (!pos) return;
    const world = canvasToWorld(pos.cx, pos.cy);
    setZones((prev) =>
      prev.map((z) =>
        z.id === selectedId
          ? {
              ...z,
              vertices: z.vertices.map((v, i) => (i === idx ? world : v)),
            }
          : z
      )
    );
    setDirtyZoneId(selectedId);
  }

  function handlePointerUp() {
    dragVertexRef.current = null;
  }

  const finishDrawing = useCallback(async () => {
    if (draftVertices.length < 3) {
      setDrawing(false);
      setDraftVertices([]);
      return;
    }
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New zone",
          category: "POINT",
          vertices: draftVertices,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as MapZoneDto;
        setZones((prev) => [...prev, created]);
        setSelectedId(created.id);
        setActionError(null);
      } else {
        setActionError("Failed to create zone");
      }
    } catch {
      setActionError("Failed to create zone");
    }
    setDrawing(false);
    setDraftVertices([]);
  }, [base, draftVertices]);

  useEffect(() => {
    if (!drawing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawing(false);
        setDraftVertices([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing]);

  async function saveVertices() {
    const target = zones.find((z) => z.id === dirtyZoneId);
    if (!target) return;
    try {
      const res = await fetch(`${base}/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertices: target.vertices }),
      });
      if (res.ok) {
        const updated = (await res.json()) as MapZoneDto;
        setZones((prev) =>
          prev.map((z) => (z.id === updated.id ? updated : z))
        );
        setDirtyZoneId(null);
        setActionError(null);
      } else {
        setActionError("Failed to save vertices");
      }
    } catch {
      setActionError("Failed to save vertices");
    }
  }

  async function patchZone(id: number, body: Partial<MapZoneDto>) {
    try {
      const res = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = (await res.json()) as MapZoneDto;
        setZones((prev) =>
          prev.map((z) => (z.id === updated.id ? updated : z))
        );
        setActionError(null);
      } else {
        setActionError("Failed to update zone");
      }
    } catch {
      setActionError("Failed to update zone");
    }
  }

  async function deleteZone(id: number) {
    if (!confirm("Delete this zone?")) return;
    try {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (res.ok) {
        setZones((prev) => prev.filter((z) => z.id !== id));
        if (selectedId === id) setSelectedId(null);
        if (dirtyZoneId === id) setDirtyZoneId(null);
        setActionError(null);
      } else {
        setActionError("Failed to delete zone");
      }
    } catch {
      setActionError("Failed to delete zone");
    }
  }

  async function generateProposals() {
    setActionError(null);
    const res = await fetch(`${base}/generate`, { method: "POST" });
    if (res.ok) {
      const refetch = await fetch(base);
      if (refetch.ok) {
        const fresh = (await refetch.json()) as MapZoneDto[];
        setZones(fresh);
        setSelectedId(null);
        setDirtyZoneId(null);
      }
    } else {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(err.error ?? "Failed to generate proposals.");
    }
  }

  return (
    <div className="mt-6 flex gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {drawing ? (
            <>
              <Button size="sm" onClick={finishDrawing}>
                Finish
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDrawing(false);
                  setDraftVertices([]);
                }}
              >
                Cancel
              </Button>
              <span className="text-muted-foreground text-xs">
                Click to add vertices, double-click or Finish to close, Esc to
                cancel.
              </span>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDrawing(true);
                setDraftVertices([]);
                setSelectedId(null);
              }}
            >
              Draw zone
            </Button>
          )}
          {dirtyZoneId !== null && dirtyZoneId === selectedId ? (
            <Button size="sm" onClick={saveVertices}>
              Save vertices
            </Button>
          ) : null}
        </div>
        <div ref={containerRef} className="w-full">
          <canvas
            ref={canvasRef}
            style={{ width: canvasWidth, height: canvasHeight }}
            className="rounded-lg border"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={drawing ? finishDrawing : undefined}
          />
        </div>
      </div>

      <ZoneListPanel
        zones={zones}
        selectedId={selectedId}
        actionError={actionError}
        onSelect={setSelectedId}
        onRename={(id, name) => patchZone(id, { name })}
        onLaneRole={(id, laneRole) => patchZone(id, { laneRole })}
        onToggleStatus={(zone) =>
          patchZone(zone.id, {
            status: zone.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
          })
        }
        onDelete={deleteZone}
        onGenerate={generateProposals}
      />
    </div>
  );
}

type ZoneListPanelProps = {
  zones: MapZoneDto[];
  selectedId: number | null;
  actionError: string | null;
  onSelect: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onLaneRole: (id: number, laneRole: "MAIN" | "FLANK" | null) => void;
  onToggleStatus: (zone: MapZoneDto) => void;
  onDelete: (id: number) => void;
  onGenerate: () => void;
};

function ZoneListPanel({
  zones,
  selectedId,
  actionError,
  onSelect,
  onRename,
  onLaneRole,
  onToggleStatus,
  onDelete,
  onGenerate,
}: ZoneListPanelProps) {
  return (
    <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto">
      <Button size="sm" variant="secondary" onClick={onGenerate}>
        Generate proposals
      </Button>
      {actionError ? (
        <p className="text-destructive text-xs">{actionError}</p>
      ) : null}
      {zones.length === 0 ? (
        <p className="text-muted-foreground text-sm">No zones yet.</p>
      ) : null}
      {zones.map((zone) => (
        <div
          key={zone.id}
          className={`space-y-2 rounded-lg border p-3 text-left ${
            zone.id === selectedId ? "border-primary" : ""
          }`}
        >
          <Input
            defaultValue={zone.name}
            key={`${zone.id}-${zone.name}`}
            onFocus={() => onSelect(zone.id)}
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (next && next !== zone.name) onRename(zone.id, next);
            }}
            className="h-8"
          />
          <button
            type="button"
            onClick={() => onSelect(zone.id)}
            className="flex w-full flex-wrap items-center gap-1.5"
          >
            <Badge variant="outline">{zone.category}</Badge>
            <Badge variant="secondary">{zone.source}</Badge>
            <Badge
              variant={zone.status === "PUBLISHED" ? "default" : "outline"}
            >
              {zone.status}
            </Badge>
          </button>
          {zone.category === "LANE" ? (
            <Select
              value={zone.laneRole ?? "NONE"}
              onValueChange={(v) =>
                onLaneRole(
                  zone.id,
                  v === "NONE" ? null : (v as "MAIN" | "FLANK")
                )
              }
            >
              <SelectTrigger className="h-8" onClick={() => onSelect(zone.id)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAIN">MAIN</SelectItem>
                <SelectItem value="FLANK">FLANK</SelectItem>
                <SelectItem value="NONE">—</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onToggleStatus(zone)}
            >
              {zone.status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(zone.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
