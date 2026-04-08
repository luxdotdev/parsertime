import type {
  ArrowStroke,
  CircleStroke,
  DrawingElement,
  PenStroke,
  Point,
} from "./types";

export function renderPenStroke(
  ctx: CanvasRenderingContext2D,
  stroke: PenStroke
) {
  if (stroke.points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function renderArrowStroke(
  ctx: CanvasRenderingContext2D,
  arrow: ArrowStroke
) {
  const { start, end } = arrow;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(12, arrow.width * 4);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = arrow.color;
  ctx.lineWidth = arrow.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

export function renderCircleStroke(
  ctx: CanvasRenderingContext2D,
  circle: CircleStroke
) {
  ctx.beginPath();
  ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2);
  ctx.strokeStyle = circle.color;
  ctx.lineWidth = circle.width;
  ctx.lineCap = "round";
  ctx.stroke();
}

export function renderDrawingResolved(
  ctx: CanvasRenderingContext2D,
  drawing: DrawingElement,
  styles: CSSStyleDeclaration
) {
  const color = resolveColor(drawing.color, styles);
  if (drawing.type === "pen") {
    renderPenStroke(ctx, { ...drawing, color });
  } else if (drawing.type === "arrow") {
    renderArrowStroke(ctx, { ...drawing, color });
  } else if (drawing.type === "circle") {
    renderCircleStroke(ctx, { ...drawing, color });
  }
}

export function resolveColor(
  color: string,
  styles: CSSStyleDeclaration
): string {
  if (color.startsWith("var(")) {
    return styles.getPropertyValue(color.slice(4, -1)).trim() || color;
  }
  return color;
}

export function screenToImage(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number,
  view: { offsetX: number; offsetY: number; zoom: number }
): Point {
  return {
    x:
      (screenX - canvasWidth / 2) / view.zoom -
      view.offsetX / view.zoom +
      imageWidth / 2,
    y:
      (screenY - canvasHeight / 2) / view.zoom -
      view.offsetY / view.zoom +
      imageHeight / 2,
  };
}

export function imageToScreen(
  imgX: number,
  imgY: number,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number,
  view: { offsetX: number; offsetY: number; zoom: number }
): Point {
  return {
    x:
      (imgX - imageWidth / 2 + view.offsetX / view.zoom) * view.zoom +
      canvasWidth / 2,
    y:
      (imgY - imageHeight / 2 + view.offsetY / view.zoom) * view.zoom +
      canvasHeight / 2,
  };
}
