"use client";

import { AnchorDialog } from "@/components/admin/map-calibration/anchor-dialog";
import { AnchorList } from "@/components/admin/map-calibration/anchor-list";
import { MapCanvas } from "@/components/admin/map-calibration/map-canvas";
import { MapImageUpload } from "@/components/admin/map-calibration/map-image-upload";
import { PreviewMode } from "@/components/admin/map-calibration/preview-mode";
import { TransformDisplay } from "@/components/admin/map-calibration/transform-display";
import { Button } from "@/components/ui/button";
import type { MapTransform } from "@/lib/map-calibration/types";
import { ArrowLeft, Calculator, Save } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type CalibrationAnchor = {
  id: number;
  calibrationId: number;
  worldX: number;
  worldY: number;
  imageU: number;
  imageV: number;
  label: string | null;
};

type CalibrationWithAnchors = {
  id: number;
  mapName: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  originX: number | null;
  originY: number | null;
  scale: number | null;
  rotation: number | null;
  anchors: CalibrationAnchor[];
};

type CalibrationEditorProps = {
  mapName: string;
  calibration: CalibrationWithAnchors | null;
};

type TestPoint = {
  worldX: number;
  worldY: number;
  label?: string;
};

export function CalibrationEditor({
  mapName,
  calibration: initialCalibration,
}: CalibrationEditorProps) {
  const router = useRouter();
  const [calibration, setCalibration] = useState<CalibrationWithAnchors | null>(
    initialCalibration
  );
  const [anchorDialogOpen, setAnchorDialogOpen] = useState(false);
  const [pendingClick, setPendingClick] = useState<{
    u: number;
    v: number;
  } | null>(null);
  const [computedTransform, setComputedTransform] =
    useState<MapTransform | null>(
      initialCalibration?.scale != null &&
        initialCalibration?.rotation != null &&
        initialCalibration?.originX != null &&
        initialCalibration?.originY != null
        ? {
            origin: {
              x: initialCalibration.originX,
              y: initialCalibration.originY,
            },
            scale: initialCalibration.scale,
            rotation: initialCalibration.rotation,
          }
        : null
    );
  const [residualError, setResidualError] = useState<number | null>(null);
  const [transformSaved, setTransformSaved] = useState(
    initialCalibration?.scale != null
  );
  const [testPoints, setTestPoints] = useState<TestPoint[]>([]);
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transformSaved || !computedTransform) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [transformSaved, computedTransform]);

  const handleImageClick = useCallback((imageU: number, imageV: number) => {
    setPendingClick({ u: imageU, v: imageV });
    setAnchorDialogOpen(true);
  }, []);

  async function handleImageUpload(url: string, width: number, height: number) {
    const res = await fetch("/api/admin/map-calibration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapName,
        imageUrl: url,
        imageWidth: width,
        imageHeight: height,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as CalibrationWithAnchors;
      setCalibration(data);
    } else {
      toast.error("Failed to create calibration record.");
    }
  }

  async function handleAddAnchor(data: {
    worldX: number;
    worldY: number;
    imageU: number;
    imageV: number;
    label?: string;
  }) {
    if (!calibration) return;

    const res = await fetch(
      `/api/admin/map-calibration/${calibration.id}/anchors`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (res.ok) {
      const anchor = (await res.json()) as CalibrationAnchor;
      setCalibration((prev) =>
        prev ? { ...prev, anchors: [...prev.anchors, anchor] } : prev
      );
      setTransformSaved(false);
    } else {
      toast.error("Failed to add anchor point.");
    }
  }

  async function handleDeleteAnchor(anchorId: number) {
    if (!calibration) return;

    const res = await fetch(
      `/api/admin/map-calibration/${calibration.id}/anchors/${anchorId}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      setCalibration((prev) =>
        prev
          ? {
              ...prev,
              anchors: prev.anchors.filter((a) => a.id !== anchorId),
            }
          : prev
      );
      setTransformSaved(false);
    } else {
      toast.error("Failed to delete anchor point.");
    }
  }

  async function handleComputeTransform() {
    if (!calibration) return;
    setComputing(true);

    try {
      const res = await fetch("/api/admin/map-calibration/compute-transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calibrationId: calibration.id }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          transform: MapTransform;
          residualError: number;
        };
        setComputedTransform(data.transform);
        setResidualError(data.residualError);
        setTransformSaved(false);
      } else {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Failed to compute transform.");
      }
    } finally {
      setComputing(false);
    }
  }

  async function handleSaveTransform() {
    if (!calibration || !computedTransform) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/map-calibration/${calibration.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originX: computedTransform.origin.x,
          originY: computedTransform.origin.y,
          scale: computedTransform.scale,
          rotation: computedTransform.rotation,
        }),
      });

      if (res.ok) {
        setTransformSaved(true);
        toast.success("Transform saved.");
        router.refresh();
      } else {
        toast.error("Failed to save transform.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!calibration) {
    return (
      <div className="space-y-6">
        <Header mapName={mapName} />
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            No image uploaded for this map yet.
          </p>
          <MapImageUpload
            mapName={mapName}
            onUploadComplete={handleImageUpload}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
      <Header mapName={mapName}>
        <MapImageUpload
          mapName={mapName}
          onUploadComplete={async (url, width, height) => {
            const res = await fetch(
              `/api/admin/map-calibration/${calibration.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageUrl: url,
                  imageWidth: width,
                  imageHeight: height,
                }),
              }
            );
            if (res.ok) {
              const updated = (await res.json()) as CalibrationWithAnchors;
              setCalibration(updated);
              setComputedTransform(null);
              setResidualError(null);
              setTransformSaved(false);
              setTestPoints([]);
              toast.success("Image replaced. Anchors cleared.");
            } else {
              toast.error("Failed to replace image.");
            }
          }}
        />
      </Header>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-w-0 flex-1">
          <MapCanvas
            imageUrl={calibration.imageUrl}
            imageWidth={calibration.imageWidth}
            imageHeight={calibration.imageHeight}
            anchors={calibration.anchors}
            transform={computedTransform}
            testPoints={testPoints}
            onImageClick={handleImageClick}
          />
        </div>

        <div className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto">
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-medium">
              Anchor Points ({calibration.anchors.length})
            </h4>
            <AnchorList
              anchors={calibration.anchors}
              onDelete={handleDeleteAnchor}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleComputeTransform}
              disabled={calibration.anchors.length < 2 || computing}
              size="sm"
              className="flex-1"
            >
              <Calculator className="mr-2 h-4 w-4" />
              {computing ? "Computing…" : "Compute Transform"}
            </Button>
            {computedTransform && !transformSaved ? (
              <Button
                onClick={handleSaveTransform}
                disabled={saving}
                size="sm"
                variant="default"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : null}
          </div>

          {calibration.anchors.length < 2 ? (
            <p className="text-muted-foreground text-xs">
              Place at least 2 anchor points to compute a transform. 3+ is
              recommended for better accuracy.
            </p>
          ) : null}

          {computedTransform && residualError !== null ? (
            <TransformDisplay
              transform={computedTransform}
              residualError={residualError}
              saved={transformSaved}
            />
          ) : null}

          <PreviewMode
            onAddPoint={(p) => setTestPoints((pts) => [...pts, p])}
            onClearPoints={() => setTestPoints([])}
            pointCount={testPoints.length}
            disabled={!computedTransform}
          />
        </div>
      </div>

      {pendingClick ? (
        <AnchorDialog
          open={anchorDialogOpen}
          onOpenChange={setAnchorDialogOpen}
          imageU={pendingClick.u}
          imageV={pendingClick.v}
          onSubmit={handleAddAnchor}
        />
      ) : null}
    </div>
  );
}

function Header({
  mapName,
  children,
}: {
  mapName: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <Link href={"/map-calibration" as Route}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>
      <div className="flex-1">
        <h1 className="text-2xl font-bold tracking-tight">{mapName}</h1>
      </div>
      {children}
    </div>
  );
}
