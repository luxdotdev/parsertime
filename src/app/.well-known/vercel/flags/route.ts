import * as flags from "@/lib/flags";
import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next";

export const GET = createFlagsDiscoveryEndpoint(() => getProviderData(flags));
