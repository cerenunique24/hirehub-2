type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-[#F3F4F6] text-[#4B5563]",
  info: "bg-[#EFF6FF] text-[#2563EB]",
  success: "bg-[#F0FDF4] text-[#16A34A]",
  warning: "bg-[#FFFBEB] text-[#B45309]",
  danger: "bg-[#FEF2F2] text-[#DC2626]",
};

export default function Badge({ children, variant = "neutral" }: { children: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${VARIANT_CLASS[variant]}`}>
      {children}
    </span>
  );
}
