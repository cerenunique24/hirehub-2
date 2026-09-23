import Image from "next/image";

export type AvatarSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

function initialsFrom(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

/** CollaCrew Design System — Avatar. Renders an image when provided, otherwise initials on a brand-colored circle. */
export function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const base = [
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium",
    SIZE_CLASSES[size],
    className,
  ].join(" ");

  if (src) {
    return (
      <span className={base}>
        <Image src={src} alt={name ?? "Avatar"} fill sizes="48px" className="object-cover" />
      </span>
    );
  }

  return (
    <span className={[base, "bg-[var(--color-primary-600)] text-white"].join(" ")}>
      {initialsFrom(name)}
    </span>
  );
}
