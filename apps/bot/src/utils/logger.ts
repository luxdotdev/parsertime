type LogLevel = "info" | "error";

const COMMIT_HASH = process.env.RAILWAY_GIT_COMMIT_SHA ?? "unknown";
const SERVICE = "discord-bot";
const ENVIRONMENT = process.env.RAILWAY_ENVIRONMENT ?? "development";

function emit(level: LogLevel, event: Record<string, unknown>) {
  const entry = {
    level,
    service: SERVICE,
    environment: ENVIRONMENT,
    commit_hash: COMMIT_HASH,
    timestamp: new Date().toISOString(),
    ...event,
  };

  if (ENVIRONMENT === "development") {
    const full: Record<string, unknown> = entry;
    const {
      timestamp,
      level: lvl,
      service,
      environment,
      commit_hash,
      type,
      ...rest
    } = full;
    const label = lvl === "error" ? "\x1b[31mERR\x1b[0m" : "\x1b[36mINF\x1b[0m";
    const typeStr = type ? ` \x1b[1m${type}\x1b[0m` : "";
    const details =
      Object.keys(rest).length > 0
        ? " " +
          Object.entries(rest)
            .map(
              ([k, v]) =>
                `\x1b[2m${k}=\x1b[0m${typeof v === "object" ? JSON.stringify(v) : v}`,
            )
            .join(" ")
        : "";
    console.log(`${label}${typeStr}${details}`);
    return;
  }

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info(event: Record<string, unknown>) {
    emit("info", event);
  },
  error(event: Record<string, unknown>) {
    emit("error", event);
  },
};
