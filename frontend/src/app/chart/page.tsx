import { ChartGrid } from "@/features/charting";

export default async function ChartPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; symbols?: string }>;
}) {
  const { symbol = "", symbols = symbol } = await searchParams;
  const initial = symbols
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 6);

  return (
    <main className="h-[calc(100dvh-49px)] md:h-screen w-full flex flex-col min-h-0 overflow-hidden bg-background">
      <ChartGrid initial={initial} />
    </main>
  );
}
