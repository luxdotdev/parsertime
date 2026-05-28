import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-baseline gap-2.5">
          <span className="text-[15px] font-semibold tracking-tight">
            {appName}
          </span>
          <span
            aria-hidden
            className="h-3 w-px self-center bg-fd-border"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fd-muted-foreground">
            v3 docs
          </span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
