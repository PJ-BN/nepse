import { SimulatorView } from "@/features/simulator";
import { PageContainer, PageHeader, ResponsiveCard } from "@/shared/ui";

export default async function SimulatorPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol = "" } = await searchParams;

  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title="Algorithmic Indicator Simulator"
          description="Test trade entry setups and indicator signals on historical NEPSE bars with statistical forward return distributions."
          icon="🎮"
        />

        <ResponsiveCard>
          <SimulatorView initialSymbol={symbol.trim().toUpperCase()} />
        </ResponsiveCard>
      </div>
    </PageContainer>
  );
}
