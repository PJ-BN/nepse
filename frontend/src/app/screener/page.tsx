import { ScreenerView } from "@/features/screener";
import { PageContainer, PageHeader, ResponsiveCard } from "@/shared/ui";

export default function ScreenerPage() {
  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title="Quantitative Stock Screener"
          description="Filter 200+ listed NEPSE equities by custom technical indicators, moving averages, valuation multiples, and volume thresholds."
          icon="🔍"
        />

        <ResponsiveCard>
          <ScreenerView />
        </ResponsiveCard>
      </div>
    </PageContainer>
  );
}
