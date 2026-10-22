/** Shown only inside the 90-day window before promoter lock-in expiry (server decides `daysLeft`). */
export function LockinBadge({ daysLeft, expiry }: { daysLeft: number | null; expiry: string | null }) {
  if (daysLeft == null) return null;
  return (
    <span
      className="inline-block rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-sm text-amber-800"
      title={`Promoter lock-in expires ${expiry}`}
    >
      Promoter lock-in ends {daysLeft === 0 ? "today" : `in ${daysLeft} days`}
    </span>
  );
}
