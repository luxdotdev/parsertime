import { ManagedRuntime } from "effect";
import { DataLayerLive } from "./layer";

export const AppRuntime = ManagedRuntime.make(DataLayerLive);
