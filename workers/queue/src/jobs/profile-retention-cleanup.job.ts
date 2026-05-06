export type RetentionProfileRow = {
  id: string;
  lastActivityAt: string;
};

export function findStaleProfiles(
  cutoffIso: string,
  rows: RetentionProfileRow[],
  retentionDays = 90,
) {
  const cutoff = new Date(cutoffIso).getTime();
  const retentionWindowMs = retentionDays * 24 * 60 * 60 * 1000;

  return rows.filter((row) => {
    const lastActivityAtMs = new Date(row.lastActivityAt).getTime();

    return cutoff - lastActivityAtMs > retentionWindowMs;
  });
}
