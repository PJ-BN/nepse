import { ChartGrid } from "@/features/charting";
import { PageContainer, PageHeader } from "@/shared/ui";

export default async function ChartPage({ searchParams }: { searchParams: Promise<{ symbol?: string; symbols?: string }> }) {
  const { symbol = "", symbols = symbol } = await searchParams;
  const initial = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 6);

  return (
    <PageContainer maxWidth="full" className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 space-y-3">
      <PageHeader
        title="Interactive Technical Chart"
        description="High-performance K-Line charts with technical indicators, broker VWAP, drawings, and AGY AI analysis."
        icon="📈"
        className="pb-2.5 sm:pb-3"
      />
      <ChartGrid initial={initial} />
    </PageContainer>
  );
}
