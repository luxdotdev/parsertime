import * as React from "react";

const emptySubscribe = () => () => {};

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const isServer = React.useSyncExternalStore(
    emptySubscribe,
    () => false,
    () => true
  );

  return isServer ? null : children;
}
