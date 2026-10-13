import Image from "next/image";

/** Stable brand meanings. Celebration and heart are reserved for feedback moments. */
export const MASCOT_POSES = {
  team: { src: "/images/mascots/team.png", meaning: "Koalisyon ve birlikte çalışma" },
  wave: { src: "/images/mascots/wave.png", meaning: "Karşılama" },
  pencil: { src: "/images/mascots/pencil.png", meaning: "Teklif ve profil hazırlama" },
  search: { src: "/images/mascots/search.png", meaning: "Keşif ve AI eşleşme" },
  laptop: { src: "/images/mascots/laptop.png", meaning: "Çalışmaya hazırlanma" },
  celebrate: { src: "/images/mascots/celebrate.png", meaning: "Başarı ve tamamlanma" },
  heart: { src: "/images/mascots/heart.png", meaning: "İş birliği ve teşekkür" },
} as const;

export function DashboardMascot({
  pose,
  size,
  className,
  eager = false,
}: {
  pose: keyof typeof MASCOT_POSES;
  size: number;
  className?: string;
  eager?: boolean;
}) {
  return (
    <Image
      src={MASCOT_POSES[pose].src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      sizes={`${size}px`}
      loading={eager ? "eager" : "lazy"}
      className={className}
    />
  );
}
