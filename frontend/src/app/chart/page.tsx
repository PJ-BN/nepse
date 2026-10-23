import { ChartGrid } from "@/features/charting";

export default async function ChartPage({ searchParams }: { searchParams: Promise<{ symbol?: string; symbols?: string }> }) {
  const { symbol = "", symbols = symbol } = await searchParams;
  const initial = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 6);
  return (
    <main className="space-y-3 p-4">
      <h1 className="text-xl font-semibold">Chart</h1>
      <ChartGrid initial={initial} />
    </main>
  );
}
