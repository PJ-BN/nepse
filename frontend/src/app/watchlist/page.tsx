import { WatchlistView } from "@/features/watchlist";

export const metadata = {
  title: "AI Watchlist & Trade Agent | NEPSE Analytics",
  description:
    "Autonomous stock recommendation agent for the Nepal Stock Exchange. Identifies which stocks to watchlist, buy, or sell based on technicals, broker accumulation, and corporate news.",
};

export default function WatchlistPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
      <WatchlistView />
    </main>
  );
}
