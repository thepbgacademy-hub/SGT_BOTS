export function formatRemaining(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(
    2,
    "0",
  );
  const remainingSeconds = String(safeSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${remainingSeconds}`;
}
