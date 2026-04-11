export function PremiumHighlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-lg border-2 border-amber-400/60 p-4 pt-5">
      <span className="absolute -top-2.5 left-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950">
        Premium
      </span>
      {children}
    </div>
  );
}