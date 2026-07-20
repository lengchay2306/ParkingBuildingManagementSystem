/** Display DB enum status as stored (uppercase). Shared by staff + customer UI. */
export function formatDbStatus(status: string | undefined | null, fallback = '—'): string {
  const trimmed = status?.trim();
  return trimmed ? trimmed.toUpperCase() : fallback;
}
