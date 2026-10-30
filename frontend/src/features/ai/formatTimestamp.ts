/**
 * Format an ISO timestamp into a readable date-time string along with relative time.
 */
export function formatAiTimestamp(isoStr?: string | null): {
  formatted: string;
  relative: string;
  full: string;
} {
  if (!isoStr) {
    return {
      formatted: "Recently",
      relative: "Just now",
      full: "Recently generated",
    };
  }

  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    return {
      formatted: String(isoStr),
      relative: "",
      full: String(isoStr),
    };
  }

  const formatted = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = "just now";
  if (diffSec < 60) {
    relative = "just now";
  } else if (diffMin < 60) {
    relative = `${diffMin}m ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays === 1) {
    relative = "yesterday";
  } else {
    relative = `${diffDays}d ago`;
  }

  return {
    formatted,
    relative,
    full: `${formatted} (${relative})`,
  };
}
