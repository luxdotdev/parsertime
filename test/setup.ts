import { vi } from "vitest";

// Mock server-side modules that pull in next/server or other
// Node-only Next.js internals that Vitest cannot resolve.

vi.mock("@axiomhq/nextjs", () => ({
  createOnRequestError: () => () => {},
  createAxiomRouteHandler: () => () => {},
  nextJsFormatters: () => ({}),
  transformMiddlewareRequest: () => ({}),
}));

vi.mock("@/lib/logger", () => ({
  Logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/notifications", () => ({
  notifications: {
    createInAppNotification: vi.fn(),
  },
}));

vi.mock("@/lib/calculate-stats", () => ({
  calculateStats: vi.fn(),
}));

vi.mock("@/data/runtime", () => ({
  AppRuntime: {
    runPromise: vi.fn(),
  },
}));
