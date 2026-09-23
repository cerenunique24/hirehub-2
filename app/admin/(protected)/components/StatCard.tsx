type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
};

/**
 * CollaCrew Admin — özet metrik kartı.
 * Değer gerçek veriden gelmiyorsa (hesaplanamıyorsa) çağıran taraf
 * "--" geçmelidir; bu bileşen mock veri üretmez.
 */
export default function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="border border-[#e5e7eb] bg-white p-5">
      <p className="text-sm text-[#6b7280]">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-[#111111]">{value}</p>
      {subtitle && <p className="mt-2 text-xs text-[#9ca3af]">{subtitle}</p>}
    </div>
  );
}
