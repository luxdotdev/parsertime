import * as flags from "@/lib/flags";
import {
  createFlagsDiscoveryEndpoint,
  getProviderData,
  type KeyedFlagDefinitionType,
} from "flags/next";

export const GET = createFlagsDiscoveryEndpoint(() =>
  getProviderData(
    flags as Record<string, KeyedFlagDefinitionType | readonly unknown[]>
  )
);
