/* eslint-disable @typescript-eslint/no-explicit-any */
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
      console.log(message, ...optionalParams);
    }
  }

  static error(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("error")) {
      console.error(message, ...optionalParams);
    }
  }

  static warn(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("warn")) {
      console.warn(message, ...optionalParams);
    }
  }

  static info(message: any, ...optionalParams: any[]) {
    if (this.shouldLog("info")) {
      console.info(message, ...optionalParams);
    }
  }

  private static shouldLog(level: LogLevel): boolean {
    // Since logging is required in all environments, including production,
    // this function now always returns true.
    return true;
  }
}

export default Logger;
