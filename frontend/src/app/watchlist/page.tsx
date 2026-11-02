import { WatchlistView } from "@/features/watchlist";
import { PageContainer } from "@/shared/ui";

export const metadata = {
  title: "AI Watchlist & Trade Agent | NEPSE Analytics",
  description:
    "Autonomous stock recommendation agent for the Nepal Stock Exchange. Identifies which stocks to watchlist, buy, or sell based on technicals, broker accumulation, and corporate news.",
};

export default function WatchlistPage() {
  return (
    <PageContainer maxWidth="standard">
      <WatchlistView />
    </PageContainer>
  );
}
