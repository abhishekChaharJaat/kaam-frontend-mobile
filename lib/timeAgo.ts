export function timeAgo(dateString?: string): string {
  if (!dateString) return "";
  const now = Date.now();
  const diff = now - new Date(dateString).getTime();
  if (diff < 0) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}
