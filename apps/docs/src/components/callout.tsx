import { Callout as FumaCallout } from "fumadocs-ui/components/callout";
import type { ComponentProps, ReactNode } from "react";

type LegacyType = "info" | "warning" | "error" | "success" | "idea";

type Props = Omit<ComponentProps<typeof FumaCallout>, "type" | "title"> & {
  type?: LegacyType;
  /** Mono caps label rendered above the body. */
  eyebrow?: ReactNode;
  /** Legacy prop kept so existing MDX with `emoji=` compiles. Ignored. */
  emoji?: ReactNode;
  children: ReactNode;
};

const typeMap: Record<LegacyType, ComponentProps<typeof FumaCallout>["type"]> =
  {
    info: "info",
    warning: "warn",
    error: "error",
    success: "success",
    idea: "idea",
  };

export function Callout({
  type = "info",
  eyebrow,
  emoji: _emoji,
  children,
  ...rest
}: Props) {
  return (
    <FumaCallout
      type={typeMap[type]}
      title={
        eyebrow ? (
          <span className="text-fd-muted-foreground font-mono text-[0.7rem] font-medium tracking-[0.06em] uppercase">
            {eyebrow}
          </span>
        ) : undefined
      }
      {...rest}
    >
      {children}
    </FumaCallout>
  );
}
