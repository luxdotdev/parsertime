"use client";

import { Logger, type Transport } from "@axiomhq/logging";
import { nextJsFormatters } from "@axiomhq/nextjs/client";
import { createUseLogger, createWebVitalsComponent } from "@axiomhq/react";

const noopTransport: Transport = {
  log: () => undefined,
  flush: () => undefined,
};

export const logger = new Logger({
  transports: [noopTransport],
  formatters: nextJsFormatters,
});

const useLogger = createUseLogger(logger);
const WebVitals = createWebVitalsComponent(logger);

export { useLogger, WebVitals };
