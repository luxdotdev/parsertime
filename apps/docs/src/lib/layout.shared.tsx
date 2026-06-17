import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-baseline gap-2.5">
          <span className="text-[15px] font-semibold tracking-tight">
            {appName}
          </span>
          <span aria-hidden className="bg-fd-border h-3 w-px self-center" />
          <span className="text-fd-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
            v3 docs
          </span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
