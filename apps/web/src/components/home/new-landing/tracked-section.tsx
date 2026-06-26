"use client";

import { useSectionTracker } from "./use-section-tracker";

type TrackedSectionProps = {
  name: string;
  children: React.ReactNode;
};

export function TrackedSection({ name, children }: TrackedSectionProps) {
  const ref = useSectionTracker(name);
  return <div ref={ref}>{children}</div>;
}
