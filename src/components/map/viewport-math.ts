export type View = { offsetX: number; offsetY: number; zoom: number };

export const MAX_ZOOM = 10;

/** Zoom at which the image height exactly fills the container (the floor). */
export function getMinZoom(
  containerHeight: number,
  imageHeight: number
): number {
  if (imageHeight <= 0) return 1;
  return containerHeight / imageHeight;
}

/** Initial "contain" zoom: the whole image fits inside the container. */
export function getInitialFitZoom(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): number {
  if (imageWidth <= 0 || imageHeight <= 0) return 1;
  return Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
}

export function clampZoom(zoom: number, minZoom: number): number {
  return Math.max(minZoom, Math.min(MAX_ZOOM, zoom));
}

/**
 * Multiply the zoom by `factor`, clamped to [minZoom, MAX_ZOOM]. When the
 * result lands at the floor, recenter (offset 0,0) — matching the heatmap.
 */
export function applyZoomFactor(
  view: View,
  factor: number,
  minZoom: number
): View {
  const zoom = clampZoom(view.zoom * factor, minZoom);
  if (zoom <= minZoom) return { offsetX: 0, offsetY: 0, zoom };
  return { ...view, zoom };
}

export function panBy(view: View, dx: number, dy: number): View {
  return { ...view, offsetX: view.offsetX + dx, offsetY: view.offsetY + dy };
}
