import { cn } from "@/lib/utils";
import Image from "next/image";
import type { ReactNode } from "react";

export function StatPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ring-foreground/10 bg-card text-card-foreground overflow-hidden rounded-xl shadow-xs ring-1",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid",
        className ?? "grid-cols-2 lg:grid-cols-4"
      )}
    >
      {children}
    </div>
  );
}

type StatBlockProps = {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
} & Omit<React.ComponentProps<"div">, "children">;

export function StatBlock({
  label,
  value,
  sub,
  icon,
  className,
  ...rest
}: StatBlockProps) {
  return (
    <div
      {...rest}
      className={cn("flex min-w-0 flex-col px-5 py-4", className)}
    >
      <div className="text-muted-foreground flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {label}
        </span>
        {icon}
      </div>
      <span className="mt-2 font-mono text-2xl leading-tight font-semibold tabular-nums">
        {value}
      </span>
      {sub ? (
        <span className="text-muted-foreground mt-1.5 text-xs leading-snug">
          {sub}
        </span>
      ) : null}
    </div>
  );
}

export function HeroPortraitBlock({
  src,
  alt,
  caption,
  className,
}: {
  src: string;
  alt: string;
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-5 py-5",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={256}
        height={256}
        className="aspect-square w-full max-w-[160px] rounded-lg object-cover"
      />
      {caption ? (
        <span className="text-muted-foreground text-center font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {caption}
        </span>
      ) : null}
    </div>
  );
}
