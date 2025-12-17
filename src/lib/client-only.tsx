import { useSyncExternalStore } from "react";

function emptySubscribe() {
  return () => {
    // intentionally empty
  };
}

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const isServer = useSyncExternalStore(
    emptySubscribe,
    () => false,
    () => true
  );

  return isServer ? null : children;
}
