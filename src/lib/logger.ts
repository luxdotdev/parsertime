/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { log } from "next-axiom";

/**
 * To avoid using explicit console.log statements, we can use a logger to log messages to the console.
 * This allows us to easily search for and replace all console.log statements in the future.
 */

type LogLevel = "log" | "error" | "warn" | "info";

class Logger {
  static logLevel: LogLevel[] = ["log", "error", "warn", "info"];

  static isProduction = process.env.NODE_ENV === "production";

  static log(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("log")) {
      log.debug(message, ...optionalParams);
    }
    console.log(message, ...optionalParams);
  }

  static error(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("error")) {
      log.error(message, ...optionalParams);
    }
    console.error(message, ...optionalParams);
  }

  static warn(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("warn")) {
      log.warn(message, ...optionalParams);
    }
    console.warn(message, ...optionalParams);
  }

  static info(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("info")) {
      log.info(message, ...optionalParams);
    }
    console.info(message, ...optionalParams);
  }

  private static shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      return this.logLevel.includes(level);
    }
    return true;
  }
}

export default Logger;
