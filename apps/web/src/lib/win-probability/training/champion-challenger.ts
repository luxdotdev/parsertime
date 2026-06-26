import type { FamilyModel } from "../model";

/** Ship the challenger only if it passed the gate AND strictly beats the
 * incumbent's CV log loss; else carry the incumbent forward. Mirrors the
 * Python choose_family. */
export function chooseFamily(
  challenger: FamilyModel | null,
  gatePass: boolean,
  incumbent: FamilyModel | null
): FamilyModel | null {
  if (challenger === null) return incumbent;
  if (!gatePass) return incumbent ?? challenger;
  if (incumbent === null) return challenger;
  const c = challenger.metrics?.logLoss ?? Infinity;
  const i = incumbent.metrics?.logLoss ?? Infinity;
  return c < i ? challenger : incumbent;
}
