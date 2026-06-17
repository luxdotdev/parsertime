"use client";

import { AnimatedBeam } from "@/components/home/v3/animated-beam";
import { useReducedMotion } from "framer-motion";
import {
  FileText,
  Gauge,
  LayoutDashboard,
  Map,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

type DataPipelineProps = {
  eyebrow: string;
  title: string;
  description: string;
  sourcesLabel: string;
  processingLabel: string;
  outputsLabel: string;
  outputs: {
    dashboards: string;
    ratings: string;
    replays: string;
    trends: string;
  };
};

const sourceLogs = ["kings-row.log", "oasis.log", "suravasa.log", "samoa.log"];

function SourceNode({
  label,
  nodeRef,
}: {
  label: string;
  nodeRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={nodeRef}
      className="bg-card ring-foreground/10 z-10 flex items-center gap-2.5 rounded-lg px-3 py-2.5 ring-1"
    >
      <FileText
        className="text-muted-foreground h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <span className="text-muted-foreground hidden font-mono text-xs sm:inline">
        {label}
      </span>
    </div>
  );
}

function OutputNode({
  label,
  icon: Icon,
  nodeRef,
}: {
  label: string;
  icon: LucideIcon;
  nodeRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={nodeRef}
      className="bg-card ring-foreground/10 z-10 flex items-center gap-2.5 rounded-lg px-3 py-2.5 ring-1"
    >
      <Icon className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="hidden text-sm font-medium sm:inline">{label}</span>
    </div>
  );
}

export function DataPipeline({
  eyebrow,
  title,
  description,
  sourcesLabel,
  processingLabel,
  outputsLabel,
  outputs,
}: DataPipelineProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const source1 = useRef<HTMLDivElement>(null);
  const source2 = useRef<HTMLDivElement>(null);
  const source3 = useRef<HTMLDivElement>(null);
  const source4 = useRef<HTMLDivElement>(null);
  const output1 = useRef<HTMLDivElement>(null);
  const output2 = useRef<HTMLDivElement>(null);
  const output3 = useRef<HTMLDivElement>(null);
  const output4 = useRef<HTMLDivElement>(null);

  const sourceRefs = [source1, source2, source3, source4];
  const outputDefs = [
    { ref: output1, label: outputs.dashboards, icon: LayoutDashboard },
    { ref: output2, label: outputs.ratings, icon: Gauge },
    { ref: output3, label: outputs.replays, icon: Map },
    { ref: output4, label: outputs.trends, icon: TrendingUp },
  ];

  // The beams loop on a shared 6s cycle: logs flow in, results flow out.
  const beamProps = prefersReducedMotion
    ? { duration: 0, repeat: 0, pathOpacity: 0.8 }
    : { duration: 3, repeatDelay: 3 };

  return (
    <section aria-labelledby="pipeline-heading">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
            <span
              aria-hidden="true"
              className="bg-primary mr-3 inline-block h-px w-6 align-middle"
            />
            {eyebrow}
          </p>
          <h2
            id="pipeline-heading"
            className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            {title}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-balance">
            {description}
          </p>
        </div>

        {/* Pipeline diagram */}
        <div className="mt-16">
          <div className="text-muted-foreground flex justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
            <span>{sourcesLabel}</span>
            <span>{outputsLabel}</span>
          </div>

          <div
            ref={containerRef}
            className="relative mt-6 flex items-center justify-between gap-4 sm:gap-10"
          >
            {/* Sources */}
            <div className="flex flex-col gap-4">
              {sourceLogs.map((log, i) => (
                <SourceNode key={log} label={log} nodeRef={sourceRefs[i]} />
              ))}
            </div>

            {/* Hub */}
            <div className="relative z-10 shrink-0">
              <span className="text-muted-foreground absolute -top-9 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.18em] whitespace-nowrap uppercase">
                {processingLabel}
              </span>
              <div
                ref={hubRef}
                className="bg-card ring-primary/40 shadow-primary/30 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_0_32px_-4px] ring-1 sm:h-20 sm:w-20"
              >
                <Image
                  src="/parsertime.png"
                  alt="Parsertime"
                  width={36}
                  height={36}
                  className="h-8 w-8 sm:h-9 sm:w-9 dark:invert"
                />
              </div>
            </div>

            {/* Outputs */}
            <div className="flex flex-col items-end gap-4">
              {outputDefs.map((output) => (
                <OutputNode
                  key={output.label}
                  label={output.label}
                  icon={output.icon}
                  nodeRef={output.ref}
                />
              ))}
            </div>

            {/* Beams: logs in, results out */}
            {sourceRefs.map((ref, i) => (
              <AnimatedBeam
                // oxlint-disable-next-line react/no-array-index-key
                key={`in-${i}`}
                containerRef={containerRef}
                fromRef={ref}
                toRef={hubRef}
                curvature={[36, 12, -12, -36][i]}
                delay={i * 0.4}
                {...beamProps}
              />
            ))}
            {outputDefs.map((output, i) => (
              <AnimatedBeam
                // oxlint-disable-next-line react/no-array-index-key
                key={`out-${i}`}
                containerRef={containerRef}
                fromRef={hubRef}
                toRef={output.ref}
                curvature={[36, 12, -12, -36][i]}
                delay={1.6 + i * 0.4}
                {...beamProps}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
