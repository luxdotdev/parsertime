export function RoutesEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
