import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const isServer = useSyncExternalStore(
    emptySubscribe,
    () => false,
    () => true
  );

  return isServer ? null : children;
}
