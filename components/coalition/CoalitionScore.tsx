interface CoalitionScoreProps {
  score: number;
}

export default function CoalitionScore({ score }: CoalitionScoreProps) {
  return (
    <div className="rounded-full bg-neutral-900 px-3 py-1 text-sm font-semibold text-white">
      {score}%
    </div>
  );
}
