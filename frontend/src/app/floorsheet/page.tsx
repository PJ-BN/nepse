import { FloorsheetDashboard } from "@/features/floorsheet";
import { PageContainer, PageHeader } from "@/shared/ui";

export default async function FloorsheetPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol = "" } = await searchParams;

  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title="Floorsheet & Broker Intelligence"
          description="Live whale block trades, broker-to-broker capital flow, smart money accumulation scans, and operator cost-basis matrices."
          icon="⚡"
        />
        <FloorsheetDashboard initialSymbol={symbol.toUpperCase()} />
      </div>
    </PageContainer>
  );
}
