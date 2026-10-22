import { FloorsheetDashboard } from "@/features/floorsheet";

export default async function FloorsheetPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol = "" } = await searchParams;
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Floorsheet &amp; broker intelligence</h1>
      <FloorsheetDashboard initialSymbol={symbol.toUpperCase()} />
    </main>
  );
}
