export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;

  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long" }).format(date);
}
