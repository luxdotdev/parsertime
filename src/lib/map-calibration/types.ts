export type Vec2 = { x: number; y: number };

export type MapTransform = {
  origin: Vec2;
  scale: number;
  rotation: number; // radians
};
