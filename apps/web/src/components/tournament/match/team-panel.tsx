import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type TeamPanelProps = {
  name: string;
  image?: string | null;
  score: number;
  isWinner: boolean;
  isLoser: boolean;
};

export function TeamPanel({
  name,
  image,
  score,
  isWinner,
  isLoser,
}: TeamPanelProps) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <Avatar className="size-12">
        {image && <AvatarImage src={image} alt={name} />}
        <AvatarFallback className="text-sm font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <h3
        className={cn(
          "text-center text-lg font-bold",
          isWinner && "text-emerald-600 dark:text-emerald-400",
          isLoser && "text-muted-foreground"
        )}
      >
        {name}
      </h3>
      <span
        className={cn(
          "text-4xl font-black tabular-nums leading-none",
          isWinner && "text-emerald-600 dark:text-emerald-400",
          isLoser && "text-muted-foreground"
        )}
      >
        {score}
      </span>
      {isWinner && (
        <span className="text-xs font-medium tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
          Winner
        </span>
      )}
    </div>
  );
}
