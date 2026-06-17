import { Layer, Logger } from "effect";
import type { Instrumentation } from "next";

const IS_PROD = process.env.NODE_ENV === "production";
type RequestErrorArgs = Parameters<Instrumentation.onRequestError>;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { registerNode } = await import("./instrumentation-node");
  registerNode();
}

export async function onRequestError(
  error: RequestErrorArgs[0],
  request: RequestErrorArgs[1],
  context: RequestErrorArgs[2]
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logRequestError } = await import("./instrumentation-node");
  await logRequestError(error, request, context);
}

export const EffectObservabilityLive = Layer.merge(
  Layer.empty,
  IS_PROD ? Logger.structured : Logger.pretty
);
