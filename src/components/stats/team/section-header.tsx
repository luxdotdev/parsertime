type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  rightSlot,
}: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}
