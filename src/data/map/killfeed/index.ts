import "server-only";

export {
  KillfeedService,
  KillfeedServiceLive,
  hasAnyUltFeature,
  mergeKillfeedEvents,
  getEventTime,
  isKillDuringUlt,
} from "./service";
export type { KillfeedServiceInterface } from "./service";

export {
  KillfeedCalibrationService,
  KillfeedCalibrationServiceLive,
  serializeCalibrationData,
} from "./calibration";
export type { KillfeedCalibrationServiceInterface } from "./calibration";

export type {
  UltimateSpan,
  FightUltimateData,
  KillfeedDisplayOptions,
  KillfeedEvent,
  KillfeedCalibrationData,
  SerializedCalibrationData,
} from "./types";
export { DEFAULT_KILLFEED_OPTIONS } from "./types";
