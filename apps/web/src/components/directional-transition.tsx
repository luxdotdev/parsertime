import { ViewTransition } from "react";

export function DirectionalTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        "expand-map": "expand-map",
        "contract-map": "contract-map",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        "expand-map": "expand-map",
        "contract-map": "contract-map",
        default: "none",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
