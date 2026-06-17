export function SectionHeader({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-5 flex flex-col gap-1">
      <h2
        id={id}
        className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
      >
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground text-xs">{description}</p>
      ) : null}
    </header>
  );
}
