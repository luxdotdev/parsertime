// Mock for next-axiom in test environment
const noop = (..._args: unknown[]) => {};

export const log = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};
