import Image from "next/image";

type HeroRatingProps = {
  heroRating: number;
  mapsPlayed: number;
  rank: number;
};

export function HeroRating({ heroRating, mapsPlayed, rank }: HeroRatingProps) {
  if (heroRating === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        <p className="text-muted-foreground text-xs">Unplaced</p>
        <p className="text-muted-foreground text-xs">({mapsPlayed}/10 maps)</p>
      </div>
    );
  }

  if (rank <= 5 && heroRating > 2500) {
    return (
      <div className="flex items-center gap-1">
        <Image src="/ranks/top-500.png" alt="Top 5" width={24} height={24} />
        <span className="text-sm font-bold text-amber-400">
          {heroRating} SR
        </span>
      </div>
    );
  }

  if (heroRating < 1500) {
    return (
      <div className="flex items-center gap-1">
        <Image src="/ranks/bronze.png" alt="Bronze" width={24} height={24} />
        <span className="text-sm font-bold text-amber-900">
          {heroRating} SR
        </span>
      </div>
    );
  }

  if (heroRating < 2000) {
    return (
      <div className="flex items-center gap-1">
        <Image src="/ranks/silver.png" alt="Silver" width={24} height={24} />
        <span className="text-sm font-bold text-gray-400">{heroRating} SR</span>
      </div>
    );
  }

  if (heroRating < 2500) {
    return (
      <div className="flex items-center gap-1">
        <Image src="/ranks/gold.png" alt="Gold" width={24} height={24} />
        <span className="text-sm font-bold text-amber-400">
          {heroRating} SR
        </span>
      </div>
    );
  }

  if (heroRating < 3000) {
    return (
      <div className="flex items-center gap-1">
        <Image
          src="/ranks/platinum.png"
          alt="Platinum"
          width={24}
          height={24}
        />
        <span className="text-sm font-bold text-gray-500 dark:text-gray-300">
          {heroRating} SR
        </span>
      </div>
    );
  }

  if (heroRating < 3500) {
    return (
      <div className="flex items-center gap-1">
        <Image src="/ranks/diamond.png" alt="Diamond" width={24} height={24} />
        <span className="text-sm font-bold text-sky-300">{heroRating} SR</span>
      </div>
    );
  }

  if (heroRating < 4000) {
    return (
      <div className="flex items-center gap-1">
        <Image src="/ranks/masters.png" alt="Master" width={24} height={24} />
        <span className="text-sm font-bold text-emerald-500">
          {heroRating} SR
        </span>
      </div>
    );
  }

  if (heroRating < 4500) {
    return (
      <div className="flex items-center gap-1">
        <Image
          src="/ranks/grandmaster.png"
          alt="Grandmaster"
          width={24}
          height={24}
        />
        <span className="text-sm font-bold text-indigo-400">
          {heroRating} SR
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Image src="/ranks/champion.png" alt="Champion" width={24} height={24} />
      <span className="text-sm font-bold text-violet-500">{heroRating} SR</span>
    </div>
  );
}
