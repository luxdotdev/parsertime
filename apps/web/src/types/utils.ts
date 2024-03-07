/* eslint-disable @typescript-eslint/no-explicit-any */

export type TODO = any;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & unknown;
