import Link from "next/link";

const LINKS = [
  ["/", "Dashboard"],
  ["/chart", "Chart"],
  ["/floorsheet", "Floorsheet"],
  ["/company", "Companies"],
  ["/broker", "Brokers"],
  ["/screener", "Screener"],
  ["/mutual-funds", "Mutual funds"],
  ["/macro", "Macro"],
  ["/portfolio", "Portfolio"],
] as const;

export function Nav() {
  return (
    <nav className="flex gap-4 border-b px-6 py-3 text-sm">
      <span className="font-semibold">NEPSE Analytics</span>
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className="hover:underline">
          {label}
        </Link>
      ))}
    </nav>
  );
}
