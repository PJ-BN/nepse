import { MutualFundsView } from "@/features/mutual-funds";
import { PageContainer, PageHeader, ResponsiveCard } from "@/shared/ui";

export default function MutualFundsPage() {
  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title="Mutual Funds NAV Discount & Arbitrage"
          description="Track closed-end mutual fund Net Asset Values (NAV), trading discounts, maturities, and redemption arbitrage opportunities."
          icon="📊"
        />

        <ResponsiveCard>
          <MutualFundsView />
        </ResponsiveCard>
      </div>
    </PageContainer>
  );
}
