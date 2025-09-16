import { useSyncExternalStore } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-function, func-style
const emptySubscribe = () => () => {};

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const isServer = useSyncExternalStore(
    emptySubscribe,
    () => false,
    () => true
  );

  return isServer ? null : children;
}
