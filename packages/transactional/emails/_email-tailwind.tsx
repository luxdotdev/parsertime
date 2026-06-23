import type { ComponentProps, ReactNode } from "react";
import { pixelBasedPreset, Tailwind } from "react-email";

type TailwindConfig = ComponentProps<typeof Tailwind>["config"];

// react-email v6's <Tailwind> needs `pixelBasedPreset` to reproduce the
// px conversion the old `@react-email/tailwind` produced. This wrapper
// applies it consistently and merges any per-template config/presets.
export function EmailTailwind({
  children,
  config,
}: {
  children: ReactNode;
  config?: TailwindConfig;
}) {
  return (
    <Tailwind
      config={{
        ...config,
        presets: [pixelBasedPreset, ...(config?.presets ?? [])],
      }}
    >
      {children}
    </Tailwind>
  );
}
